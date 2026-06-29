"""
ECoR-OAMS  ·  Transfer Routes (Module B)
Transactional asset transfers with explicit ROLLBACK and acknowledgment flow.
CR-2026-008: Added transfer_status workflow (accept/reject/approve).
CR-2026-009: High-value transfer auto-routes to auditor approval.
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Asset, AssetAllocation, AssetLifecycleStatus, TransferApprovalStatus
from ..auth import get_current_user, require_role, require_auditor_only
from ..schemas import AllocationCreate, AllocationResponse, TransferAckRequest

router = APIRouter(prefix="/api/transfers", tags=["Transfers"])


@router.post("", response_model=AllocationResponse, status_code=status.HTTP_201_CREATED)
def initiate_transfer(
    data: AllocationCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("custodian", "it_admin")),
):
    """
    SR-TRF-001: Transfer an asset to a new room/custodian.

    Wrapped in a single SQL transaction. If any error occurs mid-transfer,
    an explicit ROLLBACK preserves baseline data.

    SR-TRF-002: The transfer is created with is_acknowledged=False.
    The asset's active custodian does NOT change until acknowledged.
    """
    try:
        # Validate asset exists
        asset = db.query(Asset).filter(Asset.asset_id == data.asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        # Validate asset is not condemned
        status_val = asset.operational_status.value if hasattr(asset.operational_status, "value") else asset.operational_status
        if status_val == "Condemned":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot transfer a condemned asset",
            )

        # Check for any pending (unacknowledged) transfers for this asset
        pending = (
            db.query(AssetAllocation)
            .filter(
                AssetAllocation.asset_id == data.asset_id,
                AssetAllocation.is_acknowledged == False,
            )
            .first()
        )
        if pending:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Asset has a pending transfer (allocation #{pending.allocation_id}) awaiting acknowledgment",
            )

        # Create new allocation (pending acknowledgment)
        allocation = AssetAllocation(
            asset_id=data.asset_id,
            building_block=data.building_block,
            room_number=data.room_number,
            custodian_emp_id=data.custodian_emp_id,
            allocation_date=data.allocation_date or date.today(),
            is_acknowledged=False,
        )
        db.add(allocation)

        # CR-2026-009: Auto-set transfer_status based on purchase_cost
        cost_val = float(asset.purchase_cost)
        if cost_val > 10000:
            asset.transfer_status = TransferApprovalStatus.PENDING_AUDITOR
        else:
            asset.transfer_status = TransferApprovalStatus.PENDING_CUSTODIAN

        db.commit()
        db.refresh(allocation)

        return AllocationResponse.model_validate(allocation)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transfer failed, ROLLBACK executed: {str(e)}",
        )


@router.post("/{allocation_id}/acknowledge", response_model=AllocationResponse)
def acknowledge_transfer(
    allocation_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("custodian", "it_admin")),
):
    """
    SR-TRF-002: Digital sign-off verification.
    Sets is_acknowledged = True, finalizing the custodian ownership change.
    """
    try:
        allocation = (
            db.query(AssetAllocation)
            .filter(AssetAllocation.allocation_id == allocation_id)
            .first()
        )
        if not allocation:
            raise HTTPException(status_code=404, detail="Allocation not found")

        if allocation.is_acknowledged:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transfer already acknowledged",
            )

        # Finalize: mark acknowledged
        allocation.is_acknowledged = True
        db.commit()
        db.refresh(allocation)

        return AllocationResponse.model_validate(allocation)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Acknowledgment failed, ROLLBACK executed: {str(e)}",
        )


@router.get("/pending", response_model=list[AllocationResponse])
def list_pending_transfers(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List all transfers awaiting acknowledgment."""
    pending = (
        db.query(AssetAllocation)
        .filter(AssetAllocation.is_acknowledged == False)
        .order_by(AssetAllocation.allocation_date.desc())
        .all()
    )
    return [AllocationResponse.model_validate(a) for a in pending]


@router.get("/history/{asset_id}", response_model=list[AllocationResponse])
def get_transfer_history(
    asset_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Full allocation / transfer history for an asset."""
    allocations = (
        db.query(AssetAllocation)
        .filter(AssetAllocation.asset_id == asset_id)
        .order_by(AssetAllocation.allocation_date.desc())
        .all()
    )
    return [AllocationResponse.model_validate(a) for a in allocations]


@router.get("", response_model=list[AllocationResponse])
def list_all_allocations(
    acknowledged: bool | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List all allocations with optional filter by acknowledgment status."""
    q = db.query(AssetAllocation)
    if acknowledged is not None:
        q = q.filter(AssetAllocation.is_acknowledged == acknowledged)
    q = q.order_by(AssetAllocation.allocation_date.desc())
    allocations = q.offset((page - 1) * page_size).limit(page_size).all()
    return [AllocationResponse.model_validate(a) for a in allocations]


# ═══════════════════════════════════════════════════════════
#  CR-2026-008: ACCEPT / REJECT TRANSFER (Custodian)
# ═══════════════════════════════════════════════════════════

@router.patch("/{allocation_id}/ack", response_model=AllocationResponse)
def ack_transfer(
    allocation_id: int,
    data: TransferAckRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("custodian", "it_admin")),
):
    """
    CR-2026-008: Accept or reject an inbound transfer.
    On accept: sets is_acknowledged=True and transfer_status='Accepted'.
    On reject: sets transfer_status='Rejected' (allocation stays unacknowledged).
    """
    try:
        allocation = (
            db.query(AssetAllocation)
            .filter(AssetAllocation.allocation_id == allocation_id)
            .first()
        )
        if not allocation:
            raise HTTPException(status_code=404, detail="Allocation not found")

        if allocation.is_acknowledged:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transfer already finalized",
            )

        asset = db.query(Asset).filter(Asset.asset_id == allocation.asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        if data.action == "accept":
            ts = asset.transfer_status.value if hasattr(asset.transfer_status, "value") else asset.transfer_status
            if ts == "Pending_Auditor":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="High-value transfer requires Auditor approval. Custodian cannot acknowledge/accept directly.",
                )
            allocation.is_acknowledged = True
            asset.transfer_status = TransferApprovalStatus.ACCEPTED
        else:  # reject
            asset.transfer_status = TransferApprovalStatus.REJECTED

        db.commit()
        db.refresh(allocation)
        return AllocationResponse.model_validate(allocation)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transfer acknowledgment failed: {str(e)}",
        )


# ═══════════════════════════════════════════════════════════
#  CR-2026-009: AUDITOR — APPROVE HIGH-VALUE TRANSFER
# ═══════════════════════════════════════════════════════════

@router.patch("/{allocation_id}/approve", response_model=AllocationResponse)
def approve_high_value_transfer(
    allocation_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_auditor_only()),
):
    """
    CR-2026-009: Auditor-only endpoint to finalize high-value transfers.
    Only works on assets with transfer_status='Pending_Auditor'.
    """
    try:
        allocation = (
            db.query(AssetAllocation)
            .filter(AssetAllocation.allocation_id == allocation_id)
            .first()
        )
        if not allocation:
            raise HTTPException(status_code=404, detail="Allocation not found")

        asset = db.query(Asset).filter(Asset.asset_id == allocation.asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        ts = asset.transfer_status.value if hasattr(asset.transfer_status, "value") else asset.transfer_status
        if ts != "Pending_Auditor":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transfer is not pending auditor approval (current: {ts})",
            )

        allocation.is_acknowledged = True
        asset.transfer_status = TransferApprovalStatus.ACCEPTED
        db.commit()
        db.refresh(allocation)
        return AllocationResponse.model_validate(allocation)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Approval failed: {str(e)}",
        )


# ── Singular Router for CR-2026-008 & CR-2026-009 ──────────
singular_router = APIRouter(prefix="/api/transfer", tags=["Transfers Singular"])

@singular_router.patch("/{allocation_id}/ack", response_model=AllocationResponse)
def singular_ack_transfer(
    allocation_id: int,
    data: TransferAckRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("custodian", "it_admin")),
):
    return ack_transfer(allocation_id=allocation_id, data=data, db=db, user=user)

@singular_router.patch("/{allocation_id}/approve", response_model=AllocationResponse)
def singular_approve_transfer(
    allocation_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_auditor_only()),
):
    return approve_high_value_transfer(allocation_id=allocation_id, db=db, user=user)
