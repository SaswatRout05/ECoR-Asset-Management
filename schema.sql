-- ============================================================
-- ECoR-OAMS  ·  Database Schema (SQLite)
-- East Coast Railway Office Asset Management System
-- CR-2026-005: Added auditor_remarks, auditor_priority_tag
-- CR-2026-006: Added asset_categories table, assets.category_id FK
-- CR-2026-008: Added asset_status, transfer_status columns
-- CR-2026-009: Added is_active to users table
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    role            VARCHAR(20)  NOT NULL
                        CHECK (role IN ('custodian', 'it_admin', 'auditor')),
    emp_id          VARCHAR(20)  NOT NULL UNIQUE,
    -- CR-2026-009: Toggle for admin user management
    is_active       BOOLEAN      NOT NULL DEFAULT 1,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ── Asset Categories (CR-2026-006) ──────────────────────────────
CREATE TABLE IF NOT EXISTS asset_categories (
    category_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name   VARCHAR(100) NOT NULL UNIQUE
);

-- ── Assets ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
    asset_id            VARCHAR(12)    PRIMARY KEY,
    pl_number           VARCHAR(8),
    asset_name          VARCHAR(100)   NOT NULL,
    -- CR-2026-006: FK to dynamic categories table
    category_id         INTEGER        NOT NULL
                            REFERENCES asset_categories(category_id),
    purchase_date       DATE           NOT NULL,
    purchase_cost       DECIMAL(12,2)  NOT NULL CHECK (purchase_cost > 0),
    gem_invoice_ref     VARCHAR(50)    NOT NULL,
    operational_status  VARCHAR(20)    NOT NULL DEFAULT 'In-Use'
                            CHECK (operational_status IN (
                                'In-Use',
                                'Under Repair',
                                'Surplus',
                                'Condemned'
                            )),
    amc_expiry_date     DATE,
    created_at          DATETIME       DEFAULT CURRENT_TIMESTAMP,

    -- CR-2026-005: Auditor Override Fields
    auditor_remarks      TEXT,
    auditor_priority_tag VARCHAR(50)
                            CHECK (auditor_priority_tag IS NULL OR auditor_priority_tag IN (
                                'High Priority for Removal',
                                'High Priority for Replacement'
                            )),

    -- CR-2026-008: Soft-delete lifecycle & transfer workflow
    asset_status        VARCHAR(20)    NOT NULL DEFAULT 'Active'
                            CHECK (asset_status IN (
                                'Active',
                                'In Repair',
                                'Condemned'
                            )),
    transfer_status     VARCHAR(20)    NOT NULL DEFAULT 'None'
                            CHECK (transfer_status IN (
                                'None',
                                'Pending_Custodian',
                                'Pending_Auditor',
                                'Accepted',
                                'Rejected'
                            ))
);

CREATE INDEX IF NOT EXISTS ix_asset_category_id   ON assets(category_id);
CREATE INDEX IF NOT EXISTS ix_asset_status         ON assets(operational_status);
CREATE INDEX IF NOT EXISTS ix_asset_invoice        ON assets(gem_invoice_ref);
-- CR-2026-005: B-Tree indexes for sort optimization
CREATE INDEX IF NOT EXISTS ix_asset_purchase_cost  ON assets(purchase_cost);
CREATE INDEX IF NOT EXISTS ix_asset_purchase_date  ON assets(purchase_date);

-- ── IT Equipment Details (extension for IT Hardware) ─────
CREATE TABLE IF NOT EXISTS it_equipment_details (
    detail_id           INTEGER        PRIMARY KEY AUTOINCREMENT,
    asset_id            VARCHAR(12)    NOT NULL
                            REFERENCES assets(asset_id) ON DELETE CASCADE,
    serial_number       VARCHAR(100)   NOT NULL UNIQUE,
    make_and_model      VARCHAR(100)   NOT NULL,
    mac_address         VARCHAR(17),
    ip_address          VARCHAR(15),
    warranty_expiry_date DATE
);

-- ── Asset Allocation (movement / custody tracking) ──────
CREATE TABLE IF NOT EXISTS asset_allocation (
    allocation_id       INTEGER        PRIMARY KEY AUTOINCREMENT,
    asset_id            VARCHAR(12)    NOT NULL
                            REFERENCES assets(asset_id) ON DELETE CASCADE,
    building_block      VARCHAR(50)    NOT NULL,
    room_number         VARCHAR(20)    NOT NULL,
    custodian_emp_id    VARCHAR(20)    NOT NULL,
    allocation_date     DATE           NOT NULL DEFAULT (DATE('now')),
    is_acknowledged     BOOLEAN        NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_alloc_custodian ON asset_allocation(custodian_emp_id);
CREATE INDEX IF NOT EXISTS ix_alloc_date      ON asset_allocation(allocation_date);

-- ── Repair Log (supports TCO / MTBF / MTTR metrics) ────
CREATE TABLE IF NOT EXISTS repair_log (
    id                  INTEGER        PRIMARY KEY AUTOINCREMENT,
    asset_id            VARCHAR(12)    NOT NULL
                            REFERENCES assets(asset_id) ON DELETE CASCADE,
    failure_date        DATE           NOT NULL,
    repair_start        DATETIME       NOT NULL,
    repair_end          DATETIME,
    repair_cost         DECIMAL(12,2)  NOT NULL DEFAULT 0,
    description         TEXT
);

CREATE INDEX IF NOT EXISTS ix_repair_asset ON repair_log(asset_id);
