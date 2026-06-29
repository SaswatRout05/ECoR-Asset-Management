"""
ECoR-OAMS  ·  SQLAlchemy ORM Models
All tables: users, asset_categories, assets, it_equipment_details, asset_allocation, repair_log
CR-2026-006: Replaced AssetCategory enum with dynamic asset_categories table.
CR-2026-008: Added asset_status (soft delete) and transfer_status columns.
CR-2026-009: Added is_active to User for admin user management.
"""
import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean, CheckConstraint, Column, Date, DateTime, Enum as SQLEnum,
    ForeignKey, Index, Integer, Numeric, String, Text,
)
from sqlalchemy.orm import relationship

from .database import Base


# ═══════════════════════════════════════════════════════════
#  Enumerations
# ═══════════════════════════════════════════════════════════

class UserRole(str, enum.Enum):
    CUSTODIAN = "custodian"
    IT_ADMIN = "it_admin"
    AUDITOR = "auditor"


# CR-2026-006: AssetCategory enum removed — replaced by AssetCategoryModel table below.


class OperationalStatus(str, enum.Enum):
    IN_USE = "In-Use"
    UNDER_REPAIR = "Under Repair"
    SURPLUS = "Surplus"
    CONDEMNED = "Condemned"


class AuditorPriorityTag(str, enum.Enum):
    """CR-2026-005: Auditor-exclusive priority classification."""
    HIGH_PRIORITY_REMOVAL = "High Priority for Removal"
    HIGH_PRIORITY_REPLACEMENT = "High Priority for Replacement"


class AssetLifecycleStatus(str, enum.Enum):
    """CR-2026-008: Soft-delete lifecycle status."""
    ACTIVE = "Active"
    IN_REPAIR = "In Repair"
    CONDEMNED = "Condemned"


class TransferApprovalStatus(str, enum.Enum):
    """CR-2026-008: Multi-tier transfer approval workflow."""
    NONE = "None"
    PENDING_CUSTODIAN = "Pending_Custodian"
    PENDING_AUDITOR = "Pending_Auditor"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"


# ═══════════════════════════════════════════════════════════
#  Users
# ═══════════════════════════════════════════════════════════

class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    username      = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name     = Column(String(100), nullable=False)
    role          = Column(SQLEnum(UserRole), nullable=False)
    emp_id        = Column(String(20), unique=True, nullable=False)
    # CR-2026-009: Toggle for admin user management
    is_active     = Column(Boolean, default=True, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)


# ═══════════════════════════════════════════════════════════
#  Asset Categories  (CR-2026-006: dynamic, auditor-managed)
# ═══════════════════════════════════════════════════════════

class AssetCategoryModel(Base):
    __tablename__ = "asset_categories"

    category_id   = Column(Integer, primary_key=True, autoincrement=True)
    category_name = Column(String(100), unique=True, nullable=False)

    # Back-reference to assets in this category
    assets = relationship("Asset", back_populates="category_rel", lazy="dynamic")


# ═══════════════════════════════════════════════════════════
#  Assets  (core entity)
# ═══════════════════════════════════════════════════════════

class Asset(Base):
    __tablename__ = "assets"

    asset_id           = Column(String(12), primary_key=True)
    pl_number          = Column(String(8), nullable=True)
    asset_name         = Column(String(100), nullable=False)
    # CR-2026-006: FK to dynamic asset_categories table
    category_id        = Column(
        Integer,
        ForeignKey("asset_categories.category_id"),
        nullable=False,
    )
    purchase_date      = Column(Date, nullable=False)
    purchase_cost      = Column(Numeric(12, 2), nullable=False)
    gem_invoice_ref    = Column(String(50), nullable=False)
    operational_status = Column(
        SQLEnum(OperationalStatus),
        nullable=False,
        default=OperationalStatus.IN_USE,
    )
    amc_expiry_date    = Column(Date, nullable=True)
    created_at         = Column(DateTime, default=datetime.utcnow)

    # ── CR-2026-005: Auditor Override Fields ──────────────
    auditor_remarks      = Column(Text, nullable=True)
    auditor_priority_tag = Column(String(50), nullable=True)

    # ── CR-2026-008: Soft-delete lifecycle & transfer workflow ──
    asset_status = Column(
        SQLEnum(AssetLifecycleStatus),
        nullable=False,
        default=AssetLifecycleStatus.ACTIVE,
        server_default="Active",
    )
    transfer_status = Column(
        SQLEnum(TransferApprovalStatus),
        nullable=False,
        default=TransferApprovalStatus.NONE,
        server_default="None",
    )

    __table_args__ = (
        CheckConstraint("purchase_cost > 0", name="ck_positive_cost"),
        CheckConstraint(
            "auditor_priority_tag IS NULL OR auditor_priority_tag IN "
            "('High Priority for Removal', 'High Priority for Replacement')",
            name="ck_auditor_priority_tag",
        ),
        Index("ix_asset_category_id", "category_id"),
        Index("ix_asset_status", "operational_status"),
        Index("ix_asset_invoice", "gem_invoice_ref"),
        # CR-2026-005: B-Tree indexes for sort optimization
        Index("ix_asset_purchase_cost", "purchase_cost"),
        Index("ix_asset_purchase_date", "purchase_date"),
        # CR-2026-008: Index for soft-delete filtering
        Index("ix_asset_lifecycle_status", "asset_status"),
    )

    # ── Relationships ─────────────────────────────────────
    # CR-2026-006: Relationship to dynamic category
    category_rel = relationship("AssetCategoryModel", back_populates="assets", lazy="joined")

    it_details  = relationship(
        "ITEquipmentDetail",
        back_populates="asset",
        uselist=False,
        cascade="all, delete-orphan",
    )
    allocations = relationship(
        "AssetAllocation",
        back_populates="asset",
        order_by="desc(AssetAllocation.allocation_date)",
        cascade="all, delete-orphan",
    )
    repair_logs = relationship(
        "RepairLog",
        back_populates="asset",
        order_by="desc(RepairLog.failure_date)",
        cascade="all, delete-orphan",
    )


# ═══════════════════════════════════════════════════════════
#  IT Equipment Details  (1-to-1 extension for IT Hardware)
# ═══════════════════════════════════════════════════════════

class ITEquipmentDetail(Base):
    __tablename__ = "it_equipment_details"

    detail_id          = Column(Integer, primary_key=True, autoincrement=True)
    asset_id           = Column(
        String(12),
        ForeignKey("assets.asset_id", ondelete="CASCADE"),
        nullable=False,
    )
    serial_number      = Column(String(100), unique=True, nullable=False)
    make_and_model     = Column(String(100), nullable=False)
    mac_address        = Column(String(17), nullable=True)
    ip_address         = Column(String(15), nullable=True)
    warranty_expiry_date = Column(Date, nullable=True)

    asset = relationship("Asset", back_populates="it_details")


# ═══════════════════════════════════════════════════════════
#  Asset Allocation  (movement / custody tracking)
# ═══════════════════════════════════════════════════════════

class AssetAllocation(Base):
    __tablename__ = "asset_allocation"

    allocation_id    = Column(Integer, primary_key=True, autoincrement=True)
    asset_id         = Column(
        String(12),
        ForeignKey("assets.asset_id", ondelete="CASCADE"),
        nullable=False,
    )
    building_block   = Column(String(50), nullable=False)
    room_number      = Column(String(20), nullable=False)
    custodian_emp_id = Column(String(20), nullable=False)
    allocation_date  = Column(Date, nullable=False, default=date.today)
    is_acknowledged  = Column(Boolean, default=False, nullable=False)

    __table_args__ = (
        Index("ix_alloc_custodian", "custodian_emp_id"),
        Index("ix_alloc_date", "allocation_date"),
    )

    asset = relationship("Asset", back_populates="allocations")


# ═══════════════════════════════════════════════════════════
#  Repair Log  (supports TCO / MTBF / MTTR computations)
# ═══════════════════════════════════════════════════════════

class RepairLog(Base):
    __tablename__ = "repair_log"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    asset_id      = Column(
        String(12),
        ForeignKey("assets.asset_id", ondelete="CASCADE"),
        nullable=False,
    )
    failure_date  = Column(Date, nullable=False)
    repair_start  = Column(DateTime, nullable=False)
    repair_end    = Column(DateTime, nullable=True)
    repair_cost   = Column(Numeric(12, 2), nullable=False, default=0)
    description   = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_repair_asset", "asset_id"),
    )

    asset = relationship("Asset", back_populates="repair_logs")
