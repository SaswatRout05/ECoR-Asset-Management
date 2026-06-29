"""
ECoR-OAMS  ·  Dashboard Routes (Module D)
Summary stats, warranty/AMC alerts, drill-down filters, depreciation schedule.
CR-2026-008: Dashboard filters out condemned assets from active counts/valuation.
"""
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Asset, AssetCategoryModel, ITEquipmentDetail, AssetAllocation, OperationalStatus, AssetLifecycleStatus
from ..auth import get_current_user
from ..schemas import (
    DashboardSummary, WarrantyAlert, DepreciationRow, AssetResponse,
)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def _asset_resp(a: Asset) -> AssetResponse:
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


# ═══════════════════════════════════════════════════════════
#  Dashboard Summary
# ═══════════════════════════════════════════════════════════

@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    SR-DSH-001: Total active assets, aggregate valuation, status/category breakdown.
    """
    all_assets = (
        db.query(Asset)
        .filter(Asset.asset_status != AssetLifecycleStatus.CONDEMNED)
        .all()
    )
    total = len(all_assets)

    # Status breakdown
    status_counts: dict[str, int] = {}
    category_counts: dict[str, int] = {}
    total_val = 0.0
    active_count = 0

    for a in all_assets:
        s = a.operational_status.value if hasattr(a.operational_status, "value") else a.operational_status
        c = a.category_rel.category_name if a.category_rel else "Unknown"
        # CR-2026-008: Lifecycle status for soft-delete filtering
        ls = a.asset_status.value if hasattr(a.asset_status, "value") else (a.asset_status or "Active")
        status_counts[s] = status_counts.get(s, 0) + 1
        category_counts[c] = category_counts.get(c, 0) + 1
        # CR-2026-008: Exclude condemned from valuation/active count
        if ls != "Condemned":
            total_val += float(a.purchase_cost)
        if s == "In-Use" and ls != "Condemned":
            active_count += 1

    return DashboardSummary(
        total_assets=total,
        active_assets=active_count,
        total_valuation=round(total_val, 2),
        status_breakdown=status_counts,
        category_breakdown=category_counts,
    )


# ═══════════════════════════════════════════════════════════
#  Warranty / AMC Alerts  (60-day window)
# ═══════════════════════════════════════════════════════════

@router.get("/warranty-alerts", response_model=list[WarrantyAlert])
def get_warranty_alerts(
    days: int = Query(60, ge=1, le=365),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    SR-DSH-001: Assets with warranty or AMC expiring within the specified window.
    """
    today = date.today()
    cutoff = today + timedelta(days=days)
    alerts: list[WarrantyAlert] = []

    # AMC expiry alerts
    amc_assets = (
        db.query(Asset)
        .filter(
            Asset.amc_expiry_date.isnot(None),
            Asset.amc_expiry_date <= cutoff,
            Asset.amc_expiry_date >= today,
            Asset.operational_status != "Condemned",
        )
        .all()
    )
    for a in amc_assets:
        remaining = (a.amc_expiry_date - today).days
        alerts.append(WarrantyAlert(
            asset_id=a.asset_id,
            asset_name=a.asset_name,
            category=a.category_rel.category_name if a.category_rel else "Unknown",
            expiry_type="amc",
            expiry_date=a.amc_expiry_date,
            days_remaining=remaining,
        ))

    # Warranty expiry alerts (from IT equipment details)
    warranty_items = (
        db.query(ITEquipmentDetail)
        .join(Asset)
        .filter(
            ITEquipmentDetail.warranty_expiry_date.isnot(None),
            ITEquipmentDetail.warranty_expiry_date <= cutoff,
            ITEquipmentDetail.warranty_expiry_date >= today,
            Asset.operational_status != "Condemned",
        )
        .all()
    )
    for item in warranty_items:
        remaining = (item.warranty_expiry_date - today).days
        asset = item.asset
        alerts.append(WarrantyAlert(
            asset_id=asset.asset_id,
            asset_name=asset.asset_name,
            category=asset.category_rel.category_name if asset.category_rel else "Unknown",
            expiry_type="warranty",
            expiry_date=item.warranty_expiry_date,
            days_remaining=remaining,
        ))

    # Sort by urgency (fewest days remaining first)
    alerts.sort(key=lambda x: x.days_remaining)
    return alerts


# ═══════════════════════════════════════════════════════════
#  Drill-Down Filters
# ═══════════════════════════════════════════════════════════

@router.get("/by-status/{status_value}", response_model=list[AssetResponse])
def drill_down_by_status(
    status_value: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    SR-DSH-005: Clicking a status segment returns matching assets.
    """
    allowed = {"In-Use", "Under Repair", "Surplus", "Condemned"}
    if status_value not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(sorted(allowed))}")

    q = db.query(Asset).filter(Asset.operational_status == status_value)
    if status_value != "Condemned":
        q = q.filter(Asset.asset_status != AssetLifecycleStatus.CONDEMNED)
    assets = q.all()
    return [_asset_resp(a) for a in assets]


@router.get("/by-category/{category_value}", response_model=list[AssetResponse])
def drill_down_by_category(
    category_value: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Drill-down filter by asset category."""
    # CR-2026-006: Dynamic category lookup
    cat = db.query(AssetCategoryModel).filter(
        AssetCategoryModel.category_name == category_value
    ).first()
    if not cat:
        raise HTTPException(status_code=400, detail=f"Unknown category: {category_value}")

    assets = (
        db.query(Asset)
        .filter(Asset.category_id == cat.category_id)
        .filter(Asset.asset_status != AssetLifecycleStatus.CONDEMNED)
        .all()
    )
    return [_asset_resp(a) for a in assets]


# ═══════════════════════════════════════════════════════════
#  Depreciation Schedule (Straight-Line, 5-Year)
# ═══════════════════════════════════════════════════════════

@router.get("/depreciation", response_model=list[DepreciationRow])
def get_depreciation_schedule(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Straight-line depreciation over 5 years (residual value = 0).
    Annual Depreciation = Purchase Cost / 5
    """
    assets = (
        db.query(Asset)
        .filter(Asset.asset_status != AssetLifecycleStatus.CONDEMNED)
        .order_by(Asset.purchase_date)
        .all()
    )
    today = date.today()
    rows: list[DepreciationRow] = []

    for a in assets:
        purchase = float(a.purchase_cost)
        age_days = (today - a.purchase_date).days
        age_years = round(age_days / 365.25, 2)
        annual_dep = round(purchase / 5, 2)
        accumulated = round(min(annual_dep * age_years, purchase), 2)
        book_value = round(max(purchase - accumulated, 0), 2)

        rows.append(DepreciationRow(
            asset_id=a.asset_id,
            asset_name=a.asset_name,
            purchase_cost=purchase,
            purchase_date=a.purchase_date,
            age_years=age_years,
            annual_depreciation=annual_dep,
            accumulated_depreciation=accumulated,
            book_value=book_value,
        ))

    return rows
