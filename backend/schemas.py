"""
ECoR-OAMS  ·  Pydantic Schemas (Request / Response Models)
CR-2026-005: Added AuditorReviewUpdate, auditor fields in AssetResponse
CR-2026-006: Added AssetCategory schemas, switched to category_id
CR-2026-008: Added asset_status, transfer_status to AssetResponse
CR-2026-009: Added TransferAckRequest, BulkCondemnRequest, User CRUD, LockdownStatus
"""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


# ═══════════════════════════════════════════════════════════
#  Auth
# ═══════════════════════════════════════════════════════════

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    role: str
    full_name: str


class UserInfo(BaseModel):
    sub: str
    username: str
    role: str
    full_name: str
    emp_id: str


# ═══════════════════════════════════════════════════════════
#  Asset Categories (CR-2026-006)
# ═══════════════════════════════════════════════════════════

class AssetCategoryCreate(BaseModel):
    category_name: str = Field(..., min_length=1, max_length=100)


class AssetCategoryUpdate(BaseModel):
    category_name: str = Field(..., min_length=1, max_length=100)


class AssetCategoryResponse(BaseModel):
    category_id: int
    category_name: str

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════
#  Assets
# ═══════════════════════════════════════════════════════════

class AssetCreate(BaseModel):
    pl_number: Optional[str] = Field(None, max_length=8)
    asset_name: str = Field(..., min_length=1, max_length=100)
    # CR-2026-006: category_id FK instead of category string
    category_id: int = Field(..., description="FK to asset_categories table")
    purchase_date: date
    purchase_cost: Decimal = Field(..., gt=0, decimal_places=2)
    gem_invoice_ref: str = Field(..., min_length=1, max_length=50)
    operational_status: Optional[str] = "In-Use"
    amc_expiry_date: Optional[date] = None

    @field_validator("operational_status")
    @classmethod
    def validate_status(cls, v):
        if v is None:
            return "In-Use"
        allowed = {"In-Use", "Under Repair", "Surplus", "Condemned"}
        if v not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(sorted(allowed))}")
        return v


class AssetUpdate(BaseModel):
    pl_number: Optional[str] = None
    asset_name: Optional[str] = None
    # CR-2026-006: category_id FK
    category_id: Optional[int] = None
    operational_status: Optional[str] = None
    amc_expiry_date: Optional[date] = None

    @field_validator("operational_status")
    @classmethod
    def validate_status(cls, v):
        if v is None:
            return v
        allowed = {"In-Use", "Under Repair", "Surplus", "Condemned"}
        if v not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(sorted(allowed))}")
        return v


class AuditorReviewUpdate(BaseModel):
    """CR-2026-005: Auditor-exclusive fields for asset review."""
    auditor_remarks: Optional[str] = None
    auditor_priority_tag: Optional[str] = None

    @field_validator("auditor_priority_tag")
    @classmethod
    def validate_priority_tag(cls, v):
        if v is None:
            return v
        allowed = {"High Priority for Removal", "High Priority for Replacement"}
        if v not in allowed:
            raise ValueError(f"Priority tag must be one of: {', '.join(sorted(allowed))}")
        return v


class AssetResponse(BaseModel):
    asset_id: str
    pl_number: Optional[str] = None
    asset_name: str
    # CR-2026-006: category as id + name
    category_id: int
    category_name: str
    purchase_date: date
    purchase_cost: float
    gem_invoice_ref: str
    operational_status: str
    amc_expiry_date: Optional[date] = None
    created_at: Optional[datetime] = None
    # CR-2026-005: Auditor fields
    auditor_remarks: Optional[str] = None
    auditor_priority_tag: Optional[str] = None
    # CR-2026-008: Soft-delete & transfer workflow
    asset_status: str = "Active"
    transfer_status: str = "None"

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════
#  IT Equipment Details
# ═══════════════════════════════════════════════════════════

class ITDetailCreate(BaseModel):
    serial_number: str = Field(..., min_length=1, max_length=100)
    make_and_model: str = Field(..., min_length=1, max_length=100)
    mac_address: Optional[str] = Field(None, max_length=17)
    ip_address: Optional[str] = Field(None, max_length=15)
    warranty_expiry_date: Optional[date] = None


class ITDetailUpdate(BaseModel):
    serial_number: Optional[str] = None
    make_and_model: Optional[str] = None
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    warranty_expiry_date: Optional[date] = None


class ITDetailResponse(BaseModel):
    detail_id: int
    asset_id: str
    serial_number: str
    make_and_model: str
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    warranty_expiry_date: Optional[date] = None

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════
#  Asset Allocation
# ═══════════════════════════════════════════════════════════

class AllocationCreate(BaseModel):
    asset_id: str
    building_block: str = Field(..., min_length=1, max_length=50)
    room_number: str = Field(..., min_length=1, max_length=20)
    custodian_emp_id: str = Field(..., min_length=1, max_length=20)
    allocation_date: Optional[date] = None


class AllocationResponse(BaseModel):
    allocation_id: int
    asset_id: str
    building_block: str
    room_number: str
    custodian_emp_id: str
    allocation_date: date
    is_acknowledged: bool

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════
#  Desktop Bundle (Parent-Child)
# ═══════════════════════════════════════════════════════════

class DesktopBundleCreate(BaseModel):
    """SR-INT-004: Creates CPU + Monitor as separate assets linked by gem_invoice_ref."""
    gem_invoice_ref: str = Field(..., min_length=1, max_length=50)
    purchase_date: date
    purchase_cost_cpu: Decimal = Field(..., gt=0)
    purchase_cost_monitor: Decimal = Field(..., gt=0)
    cpu_name: str = Field(default="Desktop CPU")
    monitor_name: str = Field(default="Desktop Monitor")
    pl_number_cpu: Optional[str] = None
    pl_number_monitor: Optional[str] = None
    amc_expiry_date: Optional[date] = None
    # IT details for CPU
    cpu_serial: str
    cpu_make_model: str
    cpu_mac_address: Optional[str] = None
    cpu_ip_address: Optional[str] = None
    warranty_expiry_date: Optional[date] = None
    # IT details for Monitor
    monitor_serial: str
    monitor_make_model: str


class DesktopBundleResponse(BaseModel):
    cpu: AssetResponse
    monitor: AssetResponse
    cpu_it_details: ITDetailResponse
    monitor_it_details: ITDetailResponse
    linked_by: str  # gem_invoice_ref


# ═══════════════════════════════════════════════════════════
#  Repair Log
# ═══════════════════════════════════════════════════════════

class RepairLogCreate(BaseModel):
    asset_id: str
    failure_date: date
    repair_start: datetime
    repair_end: Optional[datetime] = None
    repair_cost: Decimal = Field(default=0, ge=0)
    description: Optional[str] = None


class RepairLogResponse(BaseModel):
    id: int
    asset_id: str
    failure_date: date
    repair_start: datetime
    repair_end: Optional[datetime] = None
    repair_cost: float
    description: Optional[str] = None

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════
#  Metrics
# ═══════════════════════════════════════════════════════════

class TCOResponse(BaseModel):
    asset_id: str
    asset_name: str
    purchase_cost: float
    total_repair_cost: float
    tco: float
    tco_ratio: float  # tco_repair / purchase_cost
    is_uneconomical: bool  # True if tco_repair >= 50% purchase_cost


class MTBFResponse(BaseModel):
    asset_id: str
    asset_name: str
    total_operational_hours: float
    total_failures: int
    mtbf_hours: Optional[float] = None


class MTTRResponse(BaseModel):
    asset_id: str
    asset_name: str
    total_downtime_hours: float
    total_repairs: int
    mttr_hours: Optional[float] = None


class SLAAlertResponse(BaseModel):
    asset_id: str
    asset_name: str
    purchase_cost: float
    total_repair_cost: float
    tco_ratio_pct: float
    message: str


# ═══════════════════════════════════════════════════════════
#  Dashboard
# ═══════════════════════════════════════════════════════════

class DashboardSummary(BaseModel):
    total_assets: int
    active_assets: int
    total_valuation: float
    status_breakdown: dict  # {"In-Use": 10, "Under Repair": 2, ...}
    category_breakdown: dict


class WarrantyAlert(BaseModel):
    asset_id: str
    asset_name: str
    category: str
    expiry_type: str  # "warranty" or "amc"
    expiry_date: date
    days_remaining: int


class DepreciationRow(BaseModel):
    asset_id: str
    asset_name: str
    purchase_cost: float
    purchase_date: date
    age_years: float
    annual_depreciation: float
    accumulated_depreciation: float
    book_value: float


class AssetDetailResponse(BaseModel):
    """Full asset view with nested IT details, allocations, and repair log."""
    asset: AssetResponse
    it_details: Optional[ITDetailResponse] = None
    allocations: List[AllocationResponse] = []
    repair_logs: List[RepairLogResponse] = []
    current_allocation: Optional[AllocationResponse] = None


# ═══════════════════════════════════════════════════════════
#  CR-2026-008: Transfer Acknowledgment
# ═══════════════════════════════════════════════════════════

class TransferAckRequest(BaseModel):
    """CR-2026-008: Accept or reject an inbound transfer."""
    action: str = Field(..., description="Must be 'accept' or 'reject'")

    @field_validator("action")
    @classmethod
    def validate_action(cls, v):
        if v not in ("accept", "reject"):
            raise ValueError("action must be 'accept' or 'reject'")
        return v


class BulkCondemnRequest(BaseModel):
    """CR-2026-008: Bulk condemn multiple assets."""
    asset_ids: List[str] = Field(..., min_length=1, description="List of asset IDs to condemn")


# ═══════════════════════════════════════════════════════════
#  CR-2026-009: User Management (Admin)
# ═══════════════════════════════════════════════════════════

class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., description="One of: custodian, it_admin, auditor")
    emp_id: str = Field(..., min_length=1, max_length=20)

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        allowed = {"custodian", "it_admin", "auditor"}
        if v not in allowed:
            raise ValueError(f"role must be one of: {', '.join(sorted(allowed))}")
        return v


class UserUpdateRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    full_name: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v is None:
            return v
        allowed = {"custodian", "it_admin", "auditor"}
        if v not in allowed:
            raise ValueError(f"role must be one of: {', '.join(sorted(allowed))}")
        return v


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    emp_id: str
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LockdownStatusResponse(BaseModel):
    is_lockdown: bool
    message: str
