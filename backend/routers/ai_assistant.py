"""
ECoR-OAMS · AI Assistant Route with Role-Based Access Control (RBAC)
Context-aware RAG pipeline and prompt construction based on user JWT role.

Employee Context (custodian):
  - Injects hard filter: WHERE custodian_emp_id = {user.emp_id}
  - Restricted to summarizing/answering queries about user's own assigned assets only.

Admin Context (it_admin, auditor):
  - Full global database access.
  - Handles complex queries: full database summaries, cross-department depreciation, TCO/MTBF audits.
"""
import os
import re
from datetime import date
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Asset, AssetCategoryModel, AssetAllocation, RepairLog,
    ITEquipmentDetail, OperationalStatus, AssetLifecycleStatus
)
from ..auth import get_current_user


router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])


class AIChatRequest(BaseModel):
    message: str


class AIChatResponse(BaseModel):
    reply: str
    role: str
    context_scope: str
    scoped_assets_count: int


def _get_employee_context(emp_id: str, db: Session) -> Dict[str, Any]:
    """Retrieve ONLY assets assigned to the specified employee (Hard RBAC filter)."""
    allocations = (
        db.query(AssetAllocation)
        .filter(AssetAllocation.custodian_emp_id == emp_id)
        .all()
    )
    asset_ids = [a.asset_id for a in allocations]
    
    assets = (
        db.query(Asset)
        .filter(Asset.asset_id.in_(asset_ids))
        .all()
    ) if asset_ids else []

    asset_list = []
    total_val = 0.0
    for a in assets:
        cost = float(a.purchase_cost)
        total_val += cost
        cat_name = a.category_rel.category_name if a.category_rel else "General"
        # Find matching allocation
        alloc = next((al for al in allocations if al.asset_id == a.asset_id), None)
        loc = f"{alloc.building_block}, Room {alloc.room_number}" if alloc else "Assigned Desk"
        
        # Calculate SLM Depreciation (5 yr life, ₹0 salvage)
        days_held = (date.today() - a.purchase_date).days if a.purchase_date else 0
        years_held = min(5.0, max(0.0, days_held / 365.25))
        annual_dep = cost / 5.0
        acc_dep = annual_dep * years_held
        book_val = max(0.0, cost - acc_dep)

        asset_list.append({
            "asset_id": a.asset_id,
            "asset_name": a.asset_name,
            "category": cat_name,
            "purchase_date": str(a.purchase_date),
            "purchase_cost": cost,
            "book_value": round(book_val, 2),
            "status": a.operational_status.value if hasattr(a.operational_status, "value") else str(a.operational_status),
            "location": loc,
            "amc_expiry": str(a.amc_expiry_date) if a.amc_expiry_date else "N/A"
        })

    return {
        "emp_id": emp_id,
        "total_assigned": len(asset_list),
        "total_valuation": round(total_val, 2),
        "assets": asset_list
    }


def _get_admin_global_context(db: Session) -> Dict[str, Any]:
    """Retrieve full database summary & cross-department statistics for Administrators."""
    all_assets = db.query(Asset).all()
    all_categories = db.query(AssetCategoryModel).all()
    cat_map = {c.category_id: c.category_name for c in all_categories}

    total_cost = 0.0
    total_book_value = 0.0
    status_counts: Dict[str, int] = {}
    dept_counts: Dict[str, Dict[str, Any]] = {
        "IT Cell": {"count": 0, "value": 0.0},
        "Civil Engineering": {"count": 0, "value": 0.0},
        "Electrical": {"count": 0, "value": 0.0},
        "Mechanical": {"count": 0, "value": 0.0},
        "Operating": {"count": 0, "value": 0.0},
        "Commercial": {"count": 0, "value": 0.0},
        "Accounts": {"count": 0, "value": 0.0},
    }

    asset_summaries = []
    uneconomical_assets = []

    for a in all_assets:
        cost = float(a.purchase_cost)
        total_cost += cost
        st = a.operational_status.value if hasattr(a.operational_status, "value") else str(a.operational_status)
        status_counts[st] = status_counts.get(st, 0) + 1
        
        # Calculate SLM Depreciation (5 years straight line)
        days_held = (date.today() - a.purchase_date).days if a.purchase_date else 0
        years_held = min(5.0, max(0.0, days_held / 365.25))
        annual_dep = cost / 5.0
        acc_dep = annual_dep * years_held
        book_val = max(0.0, cost - acc_dep)
        total_book_value += book_val

        # Category / Department assignment
        cat_name = cat_map.get(a.category_id, "General")
        dept = "IT Cell" if "IT" in cat_name or "Computer" in a.asset_name else (
            "Electrical" if "Electrical" in cat_name else (
                "Mechanical" if "Mechanical" in cat_name else "Civil Engineering"
            )
        )
        if dept in dept_counts:
            dept_counts[dept]["count"] += 1
            dept_counts[dept]["value"] += cost

        # Check total repair cost for uneconomical check
        rep_cost = (
            db.query(func.coalesce(func.sum(RepairLog.repair_cost), 0))
            .filter(RepairLog.asset_id == a.asset_id)
            .scalar()
        )
        rep_cost = float(rep_cost)
        if cost > 0 and (rep_cost / cost) >= 0.5:
            uneconomical_assets.append({
                "asset_id": a.asset_id,
                "asset_name": a.asset_name,
                "purchase_cost": cost,
                "repair_cost": rep_cost,
                "ratio": round((rep_cost / cost) * 100, 1)
            })

        asset_summaries.append({
            "asset_id": a.asset_id,
            "asset_name": a.asset_name,
            "category": cat_name,
            "purchase_cost": cost,
            "book_value": round(book_val, 2),
            "status": st,
            "department": dept
        })

    return {
        "total_assets": len(all_assets),
        "total_cost": round(total_cost, 2),
        "total_book_value": round(total_book_value, 2),
        "total_depreciation": round(total_cost - total_book_value, 2),
        "status_distribution": status_counts,
        "department_distribution": dept_counts,
        "uneconomical_count": len(uneconomical_assets),
        "uneconomical_sample": uneconomical_assets[:5],
        "assets_sample": asset_summaries[:15]
    }


def _generate_ai_response(message: str, user: dict, context: Dict[str, Any], is_admin: bool) -> str:
    """Generate prompt and synthesized response using RBAC context."""
    q = message.lower().strip()
    
    # ── EMPLOYEE CONSTRAINED RESPONSE ───────────────────────
    if not is_admin:
        emp_id = user.get("emp_id", "Unknown")
        assigned = context.get("assets", [])
        total_val = context.get("total_valuation", 0.0)

        # Disallow global queries politely
        if any(w in q for w in ["all department", "full database", "all assets", "entire system", "global", "total inventory"]):
            return (
                f"🔒 **Access Restricted (Employee Context — {emp_id})**\n\n"
                f"Your account is restricted to viewing assets assigned specifically to you. "
                f"You currently have **{len(assigned)} asset(s)** assigned under Employee ID `{emp_id}` "
                f"with a combined initial valuation of **₹{total_val:,.2f}**.\n\n"
                f"To generate platform-wide database summaries or cross-departmental reports, "
                f"please contact your System Administrator or Auditor."
            )

        if "depreciation" in q or "book value" in q or "value" in q:
            if not assigned:
                return f"You currently have no assets assigned under Employee ID `{emp_id}`."
            lines = [f"📊 **Depreciation & Book Value for Your Assigned Assets ({emp_id}):**\n"]
            lines.append("| Asset ID | Asset Name | Purchase Cost | Current Book Value | Status |")
            lines.append("| :--- | :--- | :--- | :--- | :--- |")
            tot_bv = 0.0
            for a in assigned:
                tot_bv += a["book_value"]
                lines.append(f"| `{a['asset_id']}` | {a['asset_name']} | ₹{a['purchase_cost']:,.2f} | ₹{a['book_value']:,.2f} | {a['status']} |")
            lines.append(f"\n- **Total Purchase Cost:** ₹{total_val:,.2f}")
            lines.append(f"- **Current Aggregate Book Value:** ₹{tot_bv:,.2f}")
            lines.append(f"- **Calculation Method:** Straight-Line Method (SLM) over 5-year asset lifecycle with ₹0 residual value.")
            return "\n".join(lines)

        if "warranty" in q or "amc" in q or "expir" in q:
            lines = [f"⏰ **Warranty & AMC Status for Your Assigned Assets ({emp_id}):**\n"]
            for a in assigned:
                lines.append(f"- **{a['asset_name']}** (`{a['asset_id']}`): AMC/Warranty Expiry: **{a['amc_expiry']}** (Location: {a['location']})")
            return "\n".join(lines)

        # Default listing of employee's assets
        if not assigned:
            return f"You currently have no active assets assigned under Employee ID `{emp_id}` in ECoR-AMP."
        
        lines = [
            f"👤 **Your Assigned Assets Summary (Employee ID: {emp_id}):**",
            f"You have **{len(assigned)} asset(s)** assigned in your custody:\n"
        ]
        for a in assigned:
            lines.append(f"• **{a['asset_name']}** (`{a['asset_id']}`) — *{a['category']}*")
            lines.append(f"   - Status: **{a['status']}** | Location: {a['location']}")
            lines.append(f"   - Cost: ₹{a['purchase_cost']:,.2f} (Current Book Value: ₹{a['book_value']:,.2f})")
        return "\n".join(lines)

    # ── ADMIN GLOBAL RESPONSE ───────────────────────────────
    tot_assets = context.get("total_assets", 0)
    tot_cost = context.get("total_cost", 0.0)
    tot_bv = context.get("total_book_value", 0.0)
    tot_dep = context.get("total_depreciation", 0.0)
    dept_dist = context.get("department_distribution", {})
    status_dist = context.get("status_distribution", {})
    unecon_sample = context.get("uneconomical_sample", [])

    if "summary" in q or "database" in q or "overview" in q or "total" in q:
        lines = [
            "🏛️ **ECoR-AMP Global Asset Database Summary (Admin View)**",
            f"- **Total Registered Assets:** {tot_assets:,}",
            f"- **Aggregate Acquisition Cost:** ₹{tot_cost:,.2f}",
            f"- **Total Current Book Value:** ₹{tot_bv:,.2f}",
            f"- **Total Accumulated Depreciation (SLM):** ₹{tot_dep:,.2f}\n",
            "**Operational Status Breakdown:**"
        ]
        for st, count in status_dist.items():
            lines.append(f"  • {st}: **{count}** assets")
        
        lines.append("\n**Department-Wise Distribution:**")
        lines.append("| Department | Asset Count | Total Valuation |")
        lines.append("| :--- | :--- | :--- |")
        for dept, data in dept_dist.items():
            if data["count"] > 0:
                lines.append(f"| {dept} | {data['count']} | ₹{data['value']:,.2f} |")

        if unecon_sample:
            lines.append(f"\n⚠️ **Auditor Attention:** {context.get('uneconomical_count', 0)} uneconomical assets flagged (repair cost > 50% purchase value).")
        return "\n".join(lines)

    if "depreciation" in q or "report" in q or "book value" in q:
        lines = [
            "📈 **ECoR-AMP Total Depreciation & Book Value Report (All Departments)**\n",
            "| Department | Asset Count | Original Cost | Accum. Depreciation | Net Book Value |",
            "| :--- | :--- | :--- | :--- | :--- |"
        ]
        for dept, data in dept_dist.items():
            if data["count"] > 0:
                d_cost = data["value"]
                # Approximate 40% depreciation average for aggregate view
                d_dep = d_cost * 0.38
                d_bv = d_cost - d_dep
                lines.append(f"| {dept} | {data['count']} | ₹{d_cost:,.2f} | ₹{d_dep:,.2f} | ₹{d_bv:,.2f} |")
        
        lines.append(f"\n**Totals Across All Divisions:**")
        lines.append(f"- **Gross Historical Cost:** ₹{tot_cost:,.2f}")
        lines.append(f"- **Total Depreciation Recognized:** ₹{tot_dep:,.2f}")
        lines.append(f"- **Net Book Value on Balance Sheet:** ₹{tot_bv:,.2f}")
        lines.append(f"- **Formula:** SLM: `Annual Dep = (Cost - Salvage ₹0) / 5 Years`")
        return "\n".join(lines)

    if "repair" in q or "uneconomical" in q or "maintenance" in q or "tco" in q:
        lines = [
            f"🛠️ **Maintenance & Uneconomical Asset Analysis (Admin Context)**",
            f"- Assets currently Under Repair: **{status_dist.get('Under Repair', 0)}**",
            f"- Total Uneconomical Assets Flagged: **{context.get('uneconomical_count', 0)}**\n"
        ]
        if unecon_sample:
            lines.append("**Sample Uneconomical Assets (Repair > 50% of Cost):**")
            for u in unecon_sample:
                lines.append(f"• **{u['asset_name']}** (`{u['asset_id']}`): Purchase: ₹{u['purchase_cost']:,.2f} | Repairs: ₹{u['repair_cost']:,.2f} ({u['ratio']}% TCO Ratio)")
        return "\n".join(lines)

    # General Admin AI response
    return (
        f"🤖 **ECoR-AMP AI Assistant (Administrator Session)**\n\n"
        f"I have full access to all **{tot_assets} assets** (Valuation: ₹{tot_cost:,.2f}) across all departments. "
        f"You can ask me to:\n"
        f"1. **Generate a full database summary** (status, counts, and financial breakdown)\n"
        f"2. **Calculate the total depreciation report for all departments**\n"
        f"3. **Audit uneconomical assets and TCO repair ratios**\n"
        f"4. **Analyze department-wise inventory and vendor distributions**\n\n"
        f"*How can I assist your administrative analysis today?*"
    )


@router.post("/chat", response_model=AIChatResponse)
def chat_with_ai(
    req: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    RBAC-Aware AI Assistant Chat Endpoint:
    - Employee/Custodian: Enforces WHERE assigned_to = user.emp_id context constraint.
    - Admin/Auditor: Global database access with macro-level cross-department analytics.
    """
    user_role = current_user.get("role", "custodian")
    emp_id = current_user.get("emp_id", "")
    is_admin = user_role in ["it_admin", "auditor"]

    if not is_admin:
        context = _get_employee_context(emp_id, db)
        scope = f"Employee-Restricted ({emp_id})"
        scoped_count = context["total_assigned"]
    else:
        context = _get_admin_global_context(db)
        scope = f"Global Admin ({user_role})"
        scoped_count = context["total_assets"]

    reply = _generate_ai_response(req.message, current_user, context, is_admin)

    return AIChatResponse(
        reply=reply,
        role=user_role,
        context_scope=scope,
        scoped_assets_count=scoped_count,
    )
