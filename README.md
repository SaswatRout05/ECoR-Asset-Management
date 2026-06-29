# ECoR-OAMS — East Coast Railway Office Asset Management System

A production-ready, full-stack asset tracking system built for Indian Railways office asset management with role-based access control, transactional transfers, and real-time KPI metrics.

## Tech Stack

| Layer     | Technology                     |
|-----------|--------------------------------|
| Backend   | Python 3.12 · FastAPI · SQLAlchemy 2.0 |
| Database  | SQLite (ACID, WAL mode)         |
| Auth      | JWT (python-jose) + bcrypt      |
| Frontend  | HTML5 · CSS3 · Vanilla JS (ES6+) |

## Setup and Running the System

> [!IMPORTANT]
> **Working Directory**: Always ensure your terminal is opened in the repository root directory (`ecor-oams/`) before running any commands. If you are in the parent directory, change directories:
> ```bash
> cd ecor-oams
> ```

### 1. Install Dependencies
Install all required package dependencies globally on your system:
```bash
pip install -r requirements.txt
```
> [!NOTE]
> ECoR-OAMS runs on the global Python environment. There is no need to set up or troubleshoot virtual environments (`.venv`).

### 2. Initialize and Seed the Database
Initialize the database tables and seed test data. This script deletes any existing database files and seeds a fresh SQLite instance containing 3 default users (one for each role), default dynamic asset categories, 16 sample assets, allocation logs, and repair histories.

**In PowerShell / Command Prompt:**
```bash
# Delete existing db files if starting fresh
Remove-Item -Path ecor_oams.db, ecor_oams.db-shm, ecor_oams.db-wal -ErrorAction SilentlyContinue

# Seed database
python -m backend.seed
```

### 3. Start the Backend Server
Run the FastAPI application locally using uvicorn:
```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Run Automated API Tests
To verify all CRUD operations, dynamic category permissions, global searches, and category deletion constraints, execute the automated integration test script in a separate terminal:
```bash
python test_api.py
```

### 5. Access the Frontend App
- **Web App Interface**: [http://localhost:8000](http://localhost:8000) (Served directly from the FastAPI static folder)
- **Interactive Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

## Login Credentials

| Username     | Password   | Role          | Permissions |
|-------------|------------|---------------|-------------|
| `custodian1` | `ECoR@2026` | Asset Custodian | Create, view, transfer |
| `itadmin1`   | `ECoR@2026` | IT Cell Admin   | All + MAC/IP fields |
| `auditor1`   | `ECoR@2026` | Accounts Auditor | Read-only + Auditor review fields |

## Project Structure

```
ecor-oams/
├── backend/
│   ├── main.py              # FastAPI entry point & router registrations
│   ├── config.py             # Global configurations & paths
│   ├── database.py           # SQLAlchemy engine & session maker
│   ├── models.py             # ORM models (Asset, AssetCategoryModel, etc.)
│   ├── schemas.py            # Pydantic request/response validation models
│   ├── auth.py               # JWT tokens, password hashing, and RBAC policies
│   ├── seed.py               # Database seeder with mock data
│   ├── requirements.txt
│   └── routers/
│       ├── auth_routes.py    # Login & Auth endpoints
│       ├── assets.py         # Asset CRUD & Parent-Child desktop bundling
│       ├── categories.py     # Dynamic Category CRUD endpoints (Auditor restricted)
│       ├── transfers.py      # Transactional transfers with explicit rollback
│       ├── metrics.py        # TCO, MTBF, MTTR computation
│       ├── dashboard.py      # Summary metrics & warranty alerts
│       └── search.py         # Global search API
├── frontend/
│   ├── index.html            # Auth gate (Login page)
│   ├── dashboard.html        # Main dashboard page (with Help Bot chat sidebar)
│   ├── assets.html           # Dynamic asset register (sorting & filters)
│   ├── transfer.html         # Custody transfer logs & action panels
│   ├── faq.html              # Dedicated full-page Help Bot FAQ interface
│   ├── css/style.css         # Custom layout, themes, and Help Bot bubble styles
│   └── js/
│       ├── app.js            # Shared core UI logic & API wrapper
│       ├── dashboard.js      # Dashboard charts and metrics
│       ├── assets.js         # Asset form handlers & dynamic filter loader
│       ├── helpbot.js        # Rule-based chatbot FAQ engine (CR-2026-006)
│       └── transfer.js       # Custody transfer request workflows
├── schema.sql                # Raw SQL DDL structure
├── test_api.py               # Automated integration testing script
└── README.md
```

## Key Features

- **Auto-generated 12-char Asset IDs** (SR-INT-001)
- **Dynamic Asset Categories**: Categories are stored in their own database table and managed at runtime via protected CRUD endpoints, restricting creation, updating, and deletion to the Accounts Auditor role (CR-2026-006)
- **MAC Address Regex Validation** (SR-INT-003)
- **Desktop Bundle Pattern**: CPU + Monitor linked by shared GeM invoice (SR-INT-004)
- **Transactional Transfers**: Multi-step transfers with explicit DB savepoints and rollback recovery on failure (SR-TRF-001)
- **Acknowledgment-based Custody**: Transfers remain pending until signed off by the receiving custodian (SR-TRF-002)
- **TCO / MTBF / MTTR**: Real-time asset performance metrics
- **SLA Alerts**: Flagging assets with cumulative repair costs exceeding 50% of original value
- **Warranty/AMC 60-day Alert Window**
- **Straight-line Depreciation Schedule**: Standard 5-year calculations
- **Theme Support**: Seamless light and dark themes with fully styled input filters
- **AI Help Bot**: Rule-based chatbot with keyword parsing to answer FAQs instantly from the floating menu or full-page screen (CR-2026-006)
- **RBAC**: Strict Custodian, IT Cell Admin, and Accounts Auditor permissions with field-level write protections (CR-2026-005)
