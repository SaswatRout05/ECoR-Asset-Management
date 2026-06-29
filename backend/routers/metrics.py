"""
ECoR-OAMS  ·  Metrics Routes (Module C)
TCO, MTBF, MTTR computations and SLA alert logic.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Asset, RepairLog
from ..auth import get_current_user
from ..schemas import TCOResponse, MTBFResponse, MTTRResponse, SLAAlertResponse

router = APIRouter(prefix="/api/metrics", tags=["Metrics"])


# ═══════════════════════════════════════════════════════════
#  Total Cost of Ownership
# ═══════════════════════════════════════════════════════════

@router.get("/tco/{asset_id}", response_model=TCOResponse)
def get_tco(
    asset_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    TCO = Purchase Cost + Sum of All Cumulative Workshop Repair Expenditures
    """
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    total_repair = (
        db.query(func.coalesce(func.sum(RepairLog.repair_cost), 0))
        .filter(RepairLog.asset_id == asset_id)
        .scalar()
    )
    total_repair = float(total_repair)
    purchase = float(asset.purchase_cost)
    tco = purchase + total_repair
    ratio = total_repair / purchase if purchase > 0 else 0

    return TCOResponse(
        asset_id=asset_id,
        asset_name=asset.asset_name,
        purchase_cost=purchase,
        total_repair_cost=total_repair,
        tco=tco,
        tco_ratio=round(ratio, 4),
        is_uneconomical=ratio >= 0.5,
    )


# ═══════════════════════════════════════════════════════════
#  Mean Time Between Failures
# ═══════════════════════════════════════════════════════════

@router.get("/mtbf/{asset_id}", response_model=MTBFResponse)
def get_mtbf(
    asset_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    MTBF = Total Operational Time / Total Number of System Failures

    Total Operational Time = (now - purchase_date) - total downtime
    Total downtime = sum of (repair_end - repair_start) for completed repairs
    """
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    repairs = (
        db.query(RepairLog)
        .filter(RepairLog.asset_id == asset_id)
        .all()
    )

    now = datetime.utcnow()
    total_life_hours = (now - datetime.combine(asset.purchase_date, datetime.min.time())).total_seconds() / 3600

    # Calculate total downtime
    total_downtime_hours = 0.0
    failure_count = len(repairs)
    for r in repairs:
        if r.repair_end and r.repair_start:
            delta = (r.repair_end - r.repair_start).total_seconds() / 3600
            total_downtime_hours += max(0, delta)

    operational_hours = max(0, total_life_hours - total_downtime_hours)

    mtbf = operational_hours / failure_count if failure_count > 0 else None

    return MTBFResponse(
        asset_id=asset_id,
        asset_name=asset.asset_name,
        total_operational_hours=round(operational_hours, 2),
        total_failures=failure_count,
        mtbf_hours=round(mtbf, 2) if mtbf is not None else None,
    )


# ═══════════════════════════════════════════════════════════
#  Mean Time To Repair
# ═══════════════════════════════════════════════════════════

@router.get("/mttr/{asset_id}", response_model=MTTRResponse)
def get_mttr(
    asset_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    MTTR = Total Maintenance Down Time / Total Number of Executed Repairs
    """
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    repairs = (
        db.query(RepairLog)
        .filter(
            RepairLog.asset_id == asset_id,
            RepairLog.repair_end.isnot(None),
        )
        .all()
    )

    total_downtime_hours = 0.0
    for r in repairs:
        delta = (r.repair_end - r.repair_start).total_seconds() / 3600
        total_downtime_hours += max(0, delta)

    repair_count = len(repairs)
    mttr = total_downtime_hours / repair_count if repair_count > 0 else None

    return MTTRResponse(
        asset_id=asset_id,
        asset_name=asset.asset_name,
        total_downtime_hours=round(total_downtime_hours, 2),
        total_repairs=repair_count,
        mttr_hours=round(mttr, 2) if mttr is not None else None,
    )


# ═══════════════════════════════════════════════════════════
#  SLA Alerts
# ═══════════════════════════════════════════════════════════

@router.get("/sla-alerts", response_model=list[SLAAlertResponse])
def get_sla_alerts(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    SLA Alert Logic: Flag assets where cumulative repair cost >= 50% of purchase_cost.
    """
    # Subquery: total repair cost per asset
    repair_totals = (
        db.query(
            RepairLog.asset_id,
            func.coalesce(func.sum(RepairLog.repair_cost), 0).label("total_repair"),
        )
        .group_by(RepairLog.asset_id)
        .subquery()
    )

    from ..models import AssetLifecycleStatus
    results = (
        db.query(Asset, repair_totals.c.total_repair)
        .join(repair_totals, Asset.asset_id == repair_totals.c.asset_id)
        .filter(
            Asset.operational_status != "Condemned",
            Asset.asset_status != AssetLifecycleStatus.CONDEMNED,
        )
        .all()
    )

    alerts = []
    for asset, total_repair in results:
        purchase = float(asset.purchase_cost)
        repair = float(total_repair)
        if purchase > 0 and repair >= (purchase * 0.5):
            ratio_pct = round((repair / purchase) * 100, 1)
            alerts.append(
                SLAAlertResponse(
                    asset_id=asset.asset_id,
                    asset_name=asset.asset_name,
                    purchase_cost=purchase,
                    total_repair_cost=repair,
                    tco_ratio_pct=ratio_pct,
                    message=f"⚠ Highly Uneconomical to Maintain — repair costs at {ratio_pct}% of purchase price",
                )
            )

    return alerts
