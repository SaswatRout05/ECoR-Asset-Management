"""
ECoR-OAMS  ·  Global Search Routes (CR-2026-005 Module A: DATA-FILTER)
Parameterized search across asset_id, serial_number, mac_address, room_number.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Asset, AssetCategoryModel, ITEquipmentDetail, AssetAllocation
from ..auth import get_current_user
from ..schemas import AssetResponse

router = APIRouter(prefix="/api/search", tags=["Search"])


def _asset_to_response(a: Asset) -> AssetResponse:
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
        asset_status=a.asset_status.value if hasattr(a.asset_status, "value") else (a.asset_status or "Active"),
        transfer_status=a.transfer_status.value if hasattr(a.transfer_status, "value") else (a.transfer_status or "None"),
    )


@router.get("", response_model=list[AssetResponse])
def global_search(
    q: str = Query(..., min_length=1, description="Search query string"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    CR-2026-005 Module A: Global Search API.
    Searches across asset_id, serial_number, mac_address, and room_number
    using parameterized LIKE queries (no SQL injection risk).
    """
    pattern = f"%{q}%"

    # Find asset IDs matching via IT equipment details
    it_match_ids = (
        db.query(ITEquipmentDetail.asset_id)
        .filter(
            or_(
                ITEquipmentDetail.serial_number.ilike(pattern),
                ITEquipmentDetail.mac_address.ilike(pattern),
            )
        )
        .subquery()
    )

    # Find asset IDs matching via allocation room numbers
    alloc_match_ids = (
        db.query(AssetAllocation.asset_id)
        .filter(AssetAllocation.room_number.ilike(pattern))
        .distinct()
        .subquery()
    )

    # Combine: direct asset_id match OR IT details match OR allocation match
    # CR-2026-008: Exclude condemned assets
    from ..models import AssetLifecycleStatus
    query = (
        db.query(Asset)
        .filter(
            or_(
                Asset.asset_id.ilike(pattern),
                Asset.asset_id.in_(it_match_ids),
                Asset.asset_id.in_(alloc_match_ids),
            )
        )
        .filter(Asset.asset_status != AssetLifecycleStatus.CONDEMNED)
        .order_by(Asset.created_at.desc())
    )

    results = query.offset((page - 1) * page_size).limit(page_size).all()
    return [_asset_to_response(a) for a in results]
