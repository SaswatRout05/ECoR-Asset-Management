"""
ECoR-OAMS  ·  Asset Routes (Module A)
Intake, validation, parent-child bundling, CRUD operations.
CR-2026-005: Dynamic sorting, auditor review endpoint, RBAC write separation.
CR-2026-006: Switched from category enum to category_id FK.
CR-2026-008: Added asset_status/transfer_status to responses, filter condemned.
CR-2026-009: Added repair, condemn, bulk-condemn endpoints.
"""
import secrets
import string
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import (
    Asset, AssetCategoryModel, ITEquipmentDetail, AssetAllocation,
    OperationalStatus, RepairLog, AssetLifecycleStatus, TransferApprovalStatus,
)
from ..auth import get_current_user, require_role, require_auditor_only, validate_mac_address
from ..schemas import (
    AssetCreate, AssetResponse, AssetUpdate, AuditorReviewUpdate,
    ITDetailCreate, ITDetailResponse, ITDetailUpdate,
    DesktopBundleCreate, DesktopBundleResponse,
    AllocationResponse, RepairLogResponse, RepairLogCreate,
    AssetDetailResponse, BulkCondemnRequest,
)

router = APIRouter(prefix="/api/assets", tags=["Assets"])


# ── Helpers ───────────────────────────────────────────────

def _generate_asset_id() -> str:
    """SR-INT-001: Generate a unique 12-character alphanumeric identifier."""
    chars = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(12))


def _unique_asset_id(db: Session) -> str:
    """Generate an asset_id that doesn't collide with existing records."""
    for _ in range(100):
        aid = _generate_asset_id()
        if not db.query(Asset).filter(Asset.asset_id == aid).first():
            return aid
    raise HTTPException(status_code=500, detail="Failed to generate unique asset ID")


def _asset_to_response(a: Asset) -> AssetResponse:
    # CR-2026-006: Resolve category_name from the joined relationship
    cat_name = a.category_rel.category_name if a.category_rel else "Unknown"
    return AssetResponse(
        asset_id=a.asset_id,
        pl_number=a.pl_number,
        asset_name=a.asset_name,
        category_id=a.category_id,
        category_name=cat_name,
        purchase_date=a.purchase_date,
        purchase_cost=float(a.purchase_cost),
        gem_invoice_ref=a.gem_invoice_ref,
        operational_status=a.operational_status.value if hasattr(a.operational_status, "value") else a.operational_status,
        amc_expiry_date=a.amc_expiry_date,
        created_at=a.created_at,
        auditor_remarks=a.auditor_remarks,
        auditor_priority_tag=a.auditor_priority_tag,
        # CR-2026-008: Lifecycle & transfer status
        asset_status=a.asset_status.value if hasattr(a.asset_status, "value") else (a.asset_status or "Active"),
        transfer_status=a.transfer_status.value if hasattr(a.transfer_status, "value") else (a.transfer_status or "None"),
    )


def _it_to_response(d: ITEquipmentDetail) -> ITDetailResponse:
    return ITDetailResponse(
        detail_id=d.detail_id,
        asset_id=d.asset_id,
        serial_number=d.serial_number,
        make_and_model=d.make_and_model,
        mac_address=d.mac_address,
        ip_address=d.ip_address,
        warranty_expiry_date=d.warranty_expiry_date,
    )


# ── Sort column mapping ──────────────────────────────────
SORT_COLUMNS = {
    "asset_id": Asset.asset_id,
    "purchase_cost": Asset.purchase_cost,
    "purchase_date": Asset.purchase_date,
    "asset_name": Asset.asset_name,
    "category": AssetCategoryModel.category_name,  # CR-2026-006: sort via join
    "created_at": Asset.created_at,
}


# ═══════════════════════════════════════════════════════════
#  CREATE
# ═══════════════════════════════════════════════════════════

@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(
    data: AssetCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("custodian", "it_admin")),
):
    """SR-INT-001: Create a new asset with auto-generated 12-char ID."""
    # CR-2026-006: Validate category_id exists
    cat = db.query(AssetCategoryModel).filter(
        AssetCategoryModel.category_id == data.category_id
    ).first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid category_id: {data.category_id}. No such category.",
        )
    asset = Asset(
        asset_id=_unique_asset_id(db),
        pl_number=data.pl_number,
        asset_name=data.asset_name,
        category_id=data.category_id,
        purchase_date=data.purchase_date,
        purchase_cost=data.purchase_cost,
        gem_invoice_ref=data.gem_invoice_ref,
        operational_status=data.operational_status or "In-Use",
        amc_expiry_date=data.amc_expiry_date,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return _asset_to_response(asset)


# ═══════════════════════════════════════════════════════════
#  IT EQUIPMENT DETAILS
# ═══════════════════════════════════════════════════════════

@router.post(
    "/{asset_id}/it-details",
    response_model=ITDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_it_details(
    asset_id: str,
    data: ITDetailCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("custodian", "it_admin")),
):
    """SR-INT-003: Create IT equipment details with MAC address validation."""
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # MAC validation
    if data.mac_address and not validate_mac_address(data.mac_address):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid MAC address format: '{data.mac_address}'. Expected XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX",
        )

    # IP & MAC fields restricted to it_admin
    if user["role"] != "it_admin" and (data.mac_address or data.ip_address):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only IT Cell Admin can set MAC address and IP address fields",
        )

    # Check for duplicate serial
    existing = db.query(ITEquipmentDetail).filter(
        ITEquipmentDetail.serial_number == data.serial_number
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Serial number already registered")

    detail = ITEquipmentDetail(
        asset_id=asset_id,
        serial_number=data.serial_number,
        make_and_model=data.make_and_model,
        mac_address=data.mac_address,
        ip_address=data.ip_address,
        warranty_expiry_date=data.warranty_expiry_date,
    )
    db.add(detail)
    db.commit()
    db.refresh(detail)
    return _it_to_response(detail)


@router.put("/{asset_id}/it-details", response_model=ITDetailResponse)
def update_it_details(
    asset_id: str,
    data: ITDetailUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("custodian", "it_admin")),
):
    """Update IT details. MAC/IP fields locked to IT Admin only."""
    detail = db.query(ITEquipmentDetail).filter(
        ITEquipmentDetail.asset_id == asset_id
    ).first()
    if not detail:
        raise HTTPException(status_code=404, detail="IT details not found for this asset")

    # Lock network fields for non-admin
    if user["role"] != "it_admin":
        if data.mac_address is not None or data.ip_address is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only IT Cell Admin can modify MAC address and IP address",
            )

    if data.mac_address is not None:
        if not validate_mac_address(data.mac_address):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid MAC address format: '{data.mac_address}'",
            )
        detail.mac_address = data.mac_address

    if data.ip_address is not None:
        detail.ip_address = data.ip_address
    if data.serial_number is not None:
        detail.serial_number = data.serial_number
    if data.make_and_model is not None:
        detail.make_and_model = data.make_and_model
    if data.warranty_expiry_date is not None:
        detail.warranty_expiry_date = data.warranty_expiry_date

    db.commit()
    db.refresh(detail)
    return _it_to_response(detail)


# ═══════════════════════════════════════════════════════════
#  DESKTOP BUNDLE (Parent-Child)
# ═══════════════════════════════════════════════════════════

@router.post(
    "/desktop-bundle",
    response_model=DesktopBundleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_desktop_bundle(
    data: DesktopBundleCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("custodian", "it_admin")),
):
    """
    SR-INT-004: Parent-child bundling.
    Creates CPU + Monitor as separate assets linked via shared gem_invoice_ref.
    """
    # MAC validation for CPU if provided
    if data.cpu_mac_address and not validate_mac_address(data.cpu_mac_address):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid CPU MAC address: '{data.cpu_mac_address}'",
        )

    try:
        # ── CPU Asset ─────────────────────────────────
        cpu = Asset(
            asset_id=_unique_asset_id(db),
            pl_number=data.pl_number_cpu,
            asset_name=data.cpu_name,
            # CR-2026-006: Look up "IT Hardware" category by name
            category_id=db.query(AssetCategoryModel).filter(
                AssetCategoryModel.category_name == "IT Hardware"
            ).first().category_id,
            purchase_date=data.purchase_date,
            purchase_cost=data.purchase_cost_cpu,
            gem_invoice_ref=data.gem_invoice_ref,
            operational_status="In-Use",
            amc_expiry_date=data.amc_expiry_date,
        )
        db.add(cpu)
        db.flush()

        cpu_it = ITEquipmentDetail(
            asset_id=cpu.asset_id,
            serial_number=data.cpu_serial,
            make_and_model=data.cpu_make_model,
            mac_address=data.cpu_mac_address,
            ip_address=data.cpu_ip_address,
            warranty_expiry_date=data.warranty_expiry_date,
        )
        db.add(cpu_it)

        # ── Monitor Asset ─────────────────────────────
        monitor = Asset(
            asset_id=_unique_asset_id(db),
            pl_number=data.pl_number_monitor,
            asset_name=data.monitor_name,
            category_id=db.query(AssetCategoryModel).filter(
                AssetCategoryModel.category_name == "IT Hardware"
            ).first().category_id,
            purchase_date=data.purchase_date,
            purchase_cost=data.purchase_cost_monitor,
            gem_invoice_ref=data.gem_invoice_ref,
            operational_status="In-Use",
            amc_expiry_date=data.amc_expiry_date,
        )
        db.add(monitor)
        db.flush()

        monitor_it = ITEquipmentDetail(
            asset_id=monitor.asset_id,
            serial_number=data.monitor_serial,
            make_and_model=data.monitor_make_model,
            mac_address=None,
            ip_address=None,
            warranty_expiry_date=data.warranty_expiry_date,
        )
        db.add(monitor_it)

        db.commit()
        db.refresh(cpu)
        db.refresh(monitor)
        db.refresh(cpu_it)
        db.refresh(monitor_it)

        return DesktopBundleResponse(
            cpu=_asset_to_response(cpu),
            monitor=_asset_to_response(monitor),
            cpu_it_details=_it_to_response(cpu_it),
            monitor_it_details=_it_to_response(monitor_it),
            linked_by=data.gem_invoice_ref,
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Bundle creation failed: {str(e)}")


# ═══════════════════════════════════════════════════════════
#  READ / LIST  (with dynamic sorting — CR-2026-005)
# ═══════════════════════════════════════════════════════════

@router.get("", response_model=list[AssetResponse])
def list_assets(
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    invoice_ref: Optional[str] = Query(None),
    has_priority_tag: Optional[bool] = Query(None, description="Filter assets with auditor priority tags"),
    sort_by: Optional[str] = Query("created_at", description="Sort column: asset_id, purchase_cost, purchase_date, asset_name, category, created_at"),
    sort_order: Optional[str] = Query("desc", description="Sort direction: asc or desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List assets with optional filtering, search, sorting, and pagination."""
    q = db.query(Asset).join(Asset.category_rel)  # CR-2026-006: join for category filtering/sorting

    # CR-2026-008: Exclude condemned by default (unless explicitly filtering for them)
    if status_filter != "Condemned":
        q = q.filter(Asset.asset_status != AssetLifecycleStatus.CONDEMNED)

    if category:
        q = q.filter(AssetCategoryModel.category_name == category)
    if status_filter:
        q = q.filter(Asset.operational_status == status_filter)
    if search:
        pattern = f"%{search}%"
        q = q.filter(
            (Asset.asset_name.ilike(pattern))
            | (Asset.asset_id.ilike(pattern))
            | (Asset.gem_invoice_ref.ilike(pattern))
        )
    if invoice_ref:
        q = q.filter(Asset.gem_invoice_ref == invoice_ref)
    if has_priority_tag is True:
        q = q.filter(Asset.auditor_priority_tag.isnot(None))

    # CR-2026-005: Dynamic sorting
    sort_col = SORT_COLUMNS.get(sort_by, Asset.created_at)
    sort_fn = desc if sort_order == "desc" else asc
    q = q.order_by(sort_fn(sort_col))

    assets = q.offset((page - 1) * page_size).limit(page_size).all()
    return [_asset_to_response(a) for a in assets]


# ═══════════════════════════════════════════════════════════
#  CR-2026-008: ARCHIVE VIEW — List Condemned Only
# ═══════════════════════════════════════════════════════════

@router.get("/condemned", response_model=list[AssetResponse])
def list_condemned_assets(
    page: int = Query(1, ge=1),
    page_size: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List only condemned (soft-deleted) assets for the archive view."""
    assets = (
        db.query(Asset)
        .join(Asset.category_rel)
        .filter(Asset.asset_status == AssetLifecycleStatus.CONDEMNED)
        .order_by(Asset.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [_asset_to_response(a) for a in assets]


@router.get("/{asset_id}", response_model=AssetDetailResponse)
def get_asset_detail(
    asset_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Full asset detail: base info + IT details + allocation history + repairs."""
    asset = (
        db.query(Asset)
        .options(
            joinedload(Asset.it_details),
            joinedload(Asset.allocations),
            joinedload(Asset.repair_logs),
        )
        .filter(Asset.asset_id == asset_id)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Current allocation = latest acknowledged allocation
    current = None
    for alloc in asset.allocations:
        if alloc.is_acknowledged:
            current = alloc
            break

    return AssetDetailResponse(
        asset=_asset_to_response(asset),
        it_details=_it_to_response(asset.it_details) if asset.it_details else None,
        allocations=[
            AllocationResponse.model_validate(a) for a in asset.allocations
        ],
        repair_logs=[
            RepairLogResponse.model_validate(r) for r in asset.repair_logs
        ],
        current_allocation=AllocationResponse.model_validate(current) if current else None,
    )


# ═══════════════════════════════════════════════════════════
#  UPDATE
# ═══════════════════════════════════════════════════════════

@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: str,
    data: AssetUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("custodian", "it_admin")),
):
    """Update asset fields. Auditors are blocked. Auditor review fields are blocked for non-auditors."""
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if data.pl_number is not None:
        asset.pl_number = data.pl_number
    if data.asset_name is not None:
        asset.asset_name = data.asset_name
    if data.category_id is not None:
        cat = db.query(AssetCategoryModel).filter(
            AssetCategoryModel.category_id == data.category_id
        ).first()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid category_id: {data.category_id}",
            )
        asset.category_id = data.category_id
    if data.operational_status is not None:
        asset.operational_status = data.operational_status
    if data.amc_expiry_date is not None:
        asset.amc_expiry_date = data.amc_expiry_date

    db.commit()
    db.refresh(asset)
    return _asset_to_response(asset)


# ═══════════════════════════════════════════════════════════
#  AUDITOR REVIEW  (CR-2026-005)
# ═══════════════════════════════════════════════════════════

@router.put("/{asset_id}/auditor-review", response_model=AssetResponse)
def update_auditor_review(
    asset_id: str,
    data: AuditorReviewUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_auditor_only()),
):
    """
    CR-2026-005: Auditor-exclusive endpoint.
    Only users with 'auditor' role can update auditor_remarks and auditor_priority_tag.
    Custodians and IT Admins receive 403 Forbidden.
    """
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if data.auditor_remarks is not None:
        asset.auditor_remarks = data.auditor_remarks
    if data.auditor_priority_tag is not None:
        asset.auditor_priority_tag = data.auditor_priority_tag

    db.commit()
    db.refresh(asset)
    return _asset_to_response(asset)


# ═══════════════════════════════════════════════════════════
#  REPAIR LOG
# ═══════════════════════════════════════════════════════════

@router.post(
    "/{asset_id}/repairs",
    response_model=RepairLogResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_repair_log(
    asset_id: str,
    data: RepairLogCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("custodian", "it_admin")),
):
    """Add a repair log entry for an asset (feeds TCO/MTBF/MTTR)."""
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    log = RepairLog(
        asset_id=asset_id,
        failure_date=data.failure_date,
        repair_start=data.repair_start,
        repair_end=data.repair_end,
        repair_cost=data.repair_cost,
        description=data.description,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return RepairLogResponse.model_validate(log)


@router.get("/{asset_id}/bundle", response_model=list[AssetResponse])
def get_bundle_siblings(
    asset_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get all assets linked by the same gem_invoice_ref (bundle siblings)."""
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    siblings = (
        db.query(Asset)
        .filter(Asset.gem_invoice_ref == asset.gem_invoice_ref)
        .all()
    )
    return [_asset_to_response(a) for a in siblings]


# ═══════════════════════════════════════════════════════════
#  CR-2026-009: CUSTODIAN — REPORT DAMAGE
# ═══════════════════════════════════════════════════════════

@router.patch("/{asset_id}/repair", response_model=AssetResponse)
def report_damage(
    asset_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("custodian", "it_admin")),
):
    """
    CR-2026-009: Custodian reports asset damage.
    Sets asset_status to 'In Repair' and operational_status to 'Under Repair'.
    """
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    cur_status = asset.asset_status.value if hasattr(asset.asset_status, "value") else asset.asset_status
    if cur_status == "Condemned":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot report damage on a condemned asset",
        )

    asset.asset_status = AssetLifecycleStatus.IN_REPAIR
    asset.operational_status = OperationalStatus.UNDER_REPAIR
    db.commit()
    db.refresh(asset)
    return _asset_to_response(asset)


# ═══════════════════════════════════════════════════════════
#  CR-2026-009: AUDITOR — CONDEMN (Soft Delete)
# ═══════════════════════════════════════════════════════════

@router.patch("/{asset_id}/status", response_model=AssetResponse)
def condemn_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_auditor_only()),
):
    """
    CR-2026-009: Auditor-only. Sets asset_status to 'Condemned' (soft delete).
    Also sets operational_status to 'Condemned'.
    """
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset.asset_status = AssetLifecycleStatus.CONDEMNED
    asset.operational_status = OperationalStatus.CONDEMNED
    db.commit()
    db.refresh(asset)
    return _asset_to_response(asset)


@router.patch("/bulk-condemn")
def bulk_condemn_assets(
    data: BulkCondemnRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_auditor_only()),
):
    """
    CR-2026-009: Auditor-only. Accepts array of asset_ids and sets all to 'Condemned'.
    """
    updated = 0
    not_found = []
    for aid in data.asset_ids:
        asset = db.query(Asset).filter(Asset.asset_id == aid).first()
        if not asset:
            not_found.append(aid)
            continue
        asset.asset_status = AssetLifecycleStatus.CONDEMNED
        asset.operational_status = OperationalStatus.CONDEMNED
        updated += 1

    db.commit()
    return {
        "message": f"{updated} asset(s) condemned",
        "updated_count": updated,
        "not_found": not_found,
    }


@router.get("/{asset_id}/qrcode")
def get_asset_qrcode(
    asset_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Dynamically generates and returns a QR code image (PNG format) encoding
    a JSON object {"asset_id": id, "serial_number": serial}.
    """
    import io
    import json
    import qrcode
    from fastapi.responses import StreamingResponse

    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    serial = asset.it_details.serial_number if asset.it_details else "N/A"

    data = json.dumps({"asset_id": asset_id, "serial_number": serial})

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)

    return StreamingResponse(img_byte_arr, media_type="image/png")

