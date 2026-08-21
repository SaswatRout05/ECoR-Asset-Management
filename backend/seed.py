"""
ECoR-OAMS  ·  Massive Database Seeder (Scale to 1,200 Assets)
Generates:
- 15 Asset Categories
- 15 Railway Departments
- 10 Locations / Divisions
- 25 Registered Vendors
- 50 Portal Users (IT Admin, Custodian, Auditor)
- 1,200 Asset records with weighted lifecycle statuses:
    - 85% Active (In-Use / Surplus)
    - 10% In Repair (Under Repair)
    - 5% Condemned
    - purchase_cost: ₹5,000 to ₹5,00,000
    - purchase_date: spread over last 5 years
    - warranty_expiry: 1 to 3 years post purchase

Run:  python -m backend.seed
"""
import sys
import random
import string
from datetime import date, datetime, timedelta
from pathlib import Path

# Ensure project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import SessionLocal, init_db, engine
from backend.models import (
    Base, User, Asset, AssetCategoryModel, ITEquipmentDetail,
    AssetAllocation, RepairLog, UserRole, OperationalStatus,
    AssetLifecycleStatus, TransferApprovalStatus,
)
from backend.auth import hash_password
from faker import Faker

fake = Faker('en_IN')

# ── Reference Catalogs ────────────────────────────────────────

CATEGORIES = [
    "IT Equipment & Laptops",
    "Desktop Computers & Peripherals",
    "Enterprise Servers & Storage",
    "Network & Telecom Switches",
    "Printers & Multi-Function Scanners",
    "Office Furniture & Workstations",
    "Ergonomic Seating & Executive Chairs",
    "Steel Almirahs & Fireproof Safes",
    "Air Conditioning & HVAC Units",
    "Power Backup & Industrial UPS",
    "Electrical Fittings & Luminaires",
    "Security CCTV & Surveillance",
    "Audio-Visual & Conference Equipment",
    "Fire Safety & Emergency Systems",
    "General Office Machinery",
]

DEPARTMENTS = [
    "IT & Computer Cell",
    "Civil Engineering",
    "Electrical & Power",
    "Mechanical Engineering",
    "Signal & Telecommunication (S&T)",
    "Operating & Traffic",
    "Commercial & Ticketing",
    "Accounts & Finance",
    "Personnel & HR Administration",
    "Safety & Disaster Management",
    "Stores & Materials Management",
    "Medical & Health Services",
    "Railway Protection Force (RPF)",
    "Vigilance & Compliance Audit",
    "General Administration (GA)",
]

LOCATIONS = [
    ("Rail Sadan, Zonal HQ", "Bhubaneswar", "HQ-BBS"),
    ("DRM Office Complex", "Khurda Road", "DIV-KUR"),
    ("DRM Office Complex", "Sambalpur", "DIV-SBP"),
    ("DRM Office Complex", "Waltair (Visakhapatnam)", "DIV-WAT"),
    ("Carriage Repair Workshop", "Mancheswar", "WS-MCS"),
    ("Electric Loco Shed", "Angul", "ELS-ANGL"),
    ("Diesel Loco Shed", "Visakhapatnam", "DLS-VSKP"),
    ("Zonal Railway Training Institute", "Bhubaneswar", "ZRTI-BBS"),
    ("Central Railway Hospital", "Mancheswar", "CRH-MCS"),
    ("Central Materials Depot", "Cuttack", "CMD-CTC"),
]

VENDORS = [
    "Dell India Pvt Ltd",
    "HP India Sales Private Limited",
    "Lenovo India Pvt Ltd",
    "Cisco Systems India",
    "Godrej & Boyce Mfg. Co. Ltd.",
    "Voltas Limited (TATA)",
    "Blue Star India Ltd",
    "Havells India Limited",
    "Canon India Pvt Ltd",
    "Epson India Pvt Ltd",
    "APC by Schneider Electric",
    "Luminous Power Technologies",
    "Exide Industries Limited",
    "Featherlite Office Systems",
    "Wipro GE Healthcare",
    "D-Link India Limited",
    "TP-Link Technologies",
    "Samsung Electronics India",
    "LG Electronics India",
    "Xerox India Limited",
    "Konica Minolta Business Solutions",
    "Philips Lighting India",
    "Syska LED Lights",
    "Anchor Electricals (Panasonic)",
    "Nilkamal Furniture Ltd",
]

ASSET_CATALOG = {
    "IT Equipment & Laptops": [
        "Dell Latitude 5520 Laptop", "Lenovo ThinkPad E14 Laptop", "HP EliteBook 840 G8",
        "Acer Aspire 7 Professional", "MacBook Pro 14 M3 (Senior Official)", "Dell Vostro 3510 Laptop"
    ],
    "Desktop Computers & Peripherals": [
        "Dell OptiPlex 7090 Desktop Bundle", "HP ProDesk 400 G7 Mini", "Lenovo ThinkCentre M70q Tiny",
        "Dell UltraSharp 27 4K Monitor", "HP 24 P24v FHD Monitor", "Logitech MX Master Desktop Combo"
    ],
    "Enterprise Servers & Storage": [
        "Dell PowerEdge R750 2U Server", "HPE ProLiant DL380 Gen10", "Synology 8-Bay RackStation NAS",
        "Cisco UCS C220 M5 Server", "IBM FlashSystem 5200 Array"
    ],
    "Network & Telecom Switches": [
        "Cisco Catalyst 9300 48-Port Switch", "Cisco SG350-28P Managed PoE", "D-Link DGS-1210 Web Smart",
        "Cisco IP Phone 7841 Multi-line", "TP-Link JetStream 24-Port Gigabit"
    ],
    "Printers & Multi-Function Scanners": [
        "Canon imageRUNNER 2525 MFP", "HP LaserJet Pro M404dn", "Epson EcoTank L6270 Multi-Function",
        "Brother DCP-T520W Wireless Printer", "Canon DR-C225 II High-Speed Document Scanner", "Xerox B210 Laser Printer"
    ],
    "Office Furniture & Workstations": [
        "Executive Wooden Desk (5x3 ft)", "Modular Workstation Pod (4-Person)", "Conference Table (12-Seater Teak)",
        "Steel Filing Cabinet (4-Drawer)", "Steel Almirah (6x3 ft Industrial Grade)"
    ],
    "Ergonomic Seating & Executive Chairs": [
        "Godrej High-Back Ergonomic Chair", "Featherlite Helix Mesh Task Chair", "Visitor Waiting Chairs (Set of 3)",
        "Executive Leatherette Revolving Chair", "Heavy-Duty Draftsman Stool"
    ],
    "Steel Almirahs & Fireproof Safes": [
        "Godrej Fire-Resistant Filing Safe", "Heavy-Duty Steel Almirah with Locker", "Official Records Storage Cabinet"
    ],
    "Air Conditioning & HVAC Units": [
        "Voltas 1.5T 5-Star Inverter Split AC", "Blue Star 2.0T Cassette AC with Remote", "Carrier 1.5T Window AC Unit",
        "Daikin 2.0T Heavy-Duty Inverter AC"
    ],
    "Power Backup & Industrial UPS": [
        "APC Smart-UPS 3000VA On-Line", "Luminous 1500VA Office Inverter", "Microtek Maxi-Power 2KVA Online UPS",
        "Exide Tubular Battery 150Ah Bank"
    ],
    "Electrical Fittings & Luminaires": [
        "Syska 40W Recessed LED Panel Light", "Havells 1200mm Heavy-Duty Ceiling Fan", "Orient Electric High-Velocity Wall Fan",
        "Philips Smart LED Tube Fixture"
    ],
    "Security CCTV & Surveillance": [
        "Hikvision 4MP IP Dome Camera", "CP Plus 32-Channel NVR System", "Honeywell Biometric Access Control Terminal"
    ],
    "Audio-Visual & Conference Equipment": [
        "Sony 65 4K UHD Commercial Display", "Poly Studio USB Video Conference Bar", "Bose FreeSpace Wall Speaker System"
    ],
    "Fire Safety & Emergency Systems": [
        "Ceasefire 6KG Clean Agent Extinguisher", "Automated Smoke Detector & Alarm Panel", "Emergency LED Exit Lighting Array"
    ],
    "General Office Machinery": [
        "GBC CombBind Paper Binder Machine", "Fellowes Heavy-Duty Cross-Cut Paper Shredder", "Lamination Machine A3 Commercial"
    ],
}


def rand_date(days_back=1825):
    """Generate a random date within the last 5 years."""
    delta_days = random.randint(0, days_back)
    return date.today() - timedelta(days=delta_days)


def seed_massive_db():
    print("[*] Starting ECoR-OAMS database seeding (Target: 1,200 Assets)...")
    init_db()
    db = SessionLocal()

    try:
        # Wipe existing tables in clean order
        print("[*] Clearing existing data...")
        db.query(RepairLog).delete()
        db.query(AssetAllocation).delete()
        db.query(ITEquipmentDetail).delete()
        db.query(Asset).delete()
        db.query(AssetCategoryModel).delete()
        db.query(User).delete()
        db.commit()

        # ── 1. Create 15 Asset Categories ─────────────────────
        print(f"[*] Inserting {len(CATEGORIES)} Asset Categories...")
        category_objs = []
        for cat_name in CATEGORIES:
            cat = AssetCategoryModel(category_name=cat_name)
            category_objs.append(cat)
        db.add_all(category_objs)
        db.commit()

        # Map category names to IDs
        cat_map = {c.category_name: c.category_id for c in db.query(AssetCategoryModel).all()}

        # ── 2. Create 50 Users ───────────────────────────────
        print("[*] Inserting 50 Users (5 IT Admins, 40 Custodians, 5 Auditors)...")
        users = []
        default_pwd_hash = hash_password("ECoR@2026")

        # 5 IT Admins
        for i in range(1, 6):
            users.append(User(
                username=f"itadmin{i}",
                password_hash=default_pwd_hash,
                full_name=fake.name(),
                role=UserRole.IT_ADMIN,
                emp_id=f"ECoR-IT-{2000 + i}",
                is_active=True
            ))

        # 40 Custodians
        for i in range(1, 41):
            users.append(User(
                username=f"custodian{i}",
                password_hash=default_pwd_hash,
                full_name=fake.name(),
                role=UserRole.CUSTODIAN,
                emp_id=f"ECoR-C-{1000 + i}",
                is_active=True
            ))

        # 5 Auditors
        for i in range(1, 6):
            users.append(User(
                username=f"auditor{i}",
                password_hash=default_pwd_hash,
                full_name=fake.name(),
                role=UserRole.AUDITOR,
                emp_id=f"ECoR-A-{3000 + i}",
                is_active=True
            ))

        db.add_all(users)
        db.commit()

        custodian_emp_ids = [u.emp_id for u in users if u.role == UserRole.CUSTODIAN]

        # ── 3. Bulk Generate 1,200 Assets ────────────────────
        print("[*] Generating and inserting 1,200 Asset records...")
        assets = []
        it_details = []
        allocations = []
        repair_logs = []

        used_serials = set()
        used_ids = set()

        for idx in range(1, 1201):
            # Unique 12-char Asset ID
            asset_id = f"A-{idx:04d}"
            while asset_id in used_ids:
                asset_id = f"A-{random.randint(1000, 9999)}"
            used_ids.add(asset_id)

            # Category & Name
            cat_name = random.choice(CATEGORIES)
            cat_id = cat_map[cat_name]
            possible_names = ASSET_CATALOG.get(cat_name, ["Standard Office Equipment"])
            asset_name = random.choice(possible_names)

            # Purchase Cost: ₹5,000 to ₹5,00,000
            if "Server" in asset_name or "Array" in asset_name:
                cost = round(random.uniform(150000, 500000), 2)
            elif "Laptop" in asset_name or "Display" in asset_name or "Switch" in asset_name:
                cost = round(random.uniform(45000, 150000), 2)
            elif "AC" in asset_name or "UPS" in asset_name or "MFP" in asset_name:
                cost = round(random.uniform(25000, 85000), 2)
            else:
                cost = round(random.uniform(5000, 35000), 2)

            # Purchase Date: Spread randomly over last 5 years
            purch_date = rand_date(1825)

            # Warranty: 1 to 3 years after purchase date
            warranty_years = random.randint(1, 3)
            warranty_exp = purch_date + timedelta(days=warranty_years * 365)

            # Weighted status: 85% Active, 10% In Repair, 5% Condemned
            rand_roll = random.random()
            if rand_roll < 0.85:
                asset_status = AssetLifecycleStatus.ACTIVE
                op_status = OperationalStatus.IN_USE if random.random() < 0.9 else OperationalStatus.SURPLUS
            elif rand_roll < 0.95:
                asset_status = AssetLifecycleStatus.IN_REPAIR
                op_status = OperationalStatus.UNDER_REPAIR
            else:
                asset_status = AssetLifecycleStatus.CONDEMNED
                op_status = OperationalStatus.CONDEMNED

            # Auditor tags for special assets
            aud_tag = None
            aud_remarks = None
            if asset_status == AssetLifecycleStatus.CONDEMNED:
                aud_tag = "High Priority for Removal"
                aud_remarks = "Recommended for condemnation and auction; repair cost exceeds 50% threshold."
            elif asset_status == AssetLifecycleStatus.IN_REPAIR and random.random() < 0.3:
                aud_tag = "High Priority for Replacement"
                aud_remarks = "Recurring workshop breakdown; aging hardware beyond economic life."

            # GeM Invoice
            invoice_ref = f"GEM/{purch_date.year}/B/{random.randint(1000000, 9999999)}"

            asset_obj = Asset(
                asset_id=asset_id,
                pl_number=f"{random.randint(10000000, 99999999)}",
                asset_name=asset_name,
                category_id=cat_id,
                purchase_date=purch_date,
                purchase_cost=cost,
                gem_invoice_ref=invoice_ref,
                operational_status=op_status,
                amc_expiry_date=warranty_exp,
                auditor_remarks=aud_remarks,
                auditor_priority_tag=aud_tag,
                asset_status=asset_status,
                transfer_status=TransferApprovalStatus.NONE
            )
            assets.append(asset_obj)

            # IT Equipment Details (if IT category)
            if "IT" in cat_name or "Desktop" in cat_name or "Server" in cat_name or "Network" in cat_name:
                serial = f"SN-{cat_name[:2].upper()}-{random.randint(100000, 999999)}"
                while serial in used_serials:
                    serial = f"SN-{random.randint(1000000, 9999999)}"
                used_serials.add(serial)

                mac = ":".join(f"{random.randint(0, 255):02X}" for _ in range(6))
                ip = f"10.100.{random.randint(1, 254)}.{random.randint(1, 254)}"

                it_details.append(ITEquipmentDetail(
                    asset_id=asset_id,
                    serial_number=serial,
                    make_and_model=asset_name,
                    mac_address=mac,
                    ip_address=ip,
                    warranty_expiry_date=warranty_exp
                ))

            # Allocation Record (Location, Department, Custodian)
            loc_tuple = random.choice(LOCATIONS)
            dept = random.choice(DEPARTMENTS)
            custodian = random.choice(custodian_emp_ids)
            alloc_date = purch_date + timedelta(days=random.randint(1, 30))

            allocations.append(AssetAllocation(
                asset_id=asset_id,
                building_block=f"{loc_tuple[0]} ({dept})",
                room_number=f"Room {random.randint(101, 508)}",
                custodian_emp_id=custodian,
                allocation_date=alloc_date,
                is_acknowledged=True if random.random() < 0.88 else False
            ))

            # Repair Logs for In-Repair & Condemned assets
            if asset_status == AssetLifecycleStatus.IN_REPAIR or (asset_status == AssetLifecycleStatus.CONDEMNED):
                fail_date = purch_date + timedelta(days=random.randint(100, 1000))
                if fail_date > date.today():
                    fail_date = date.today() - timedelta(days=random.randint(1, 45))
                
                rep_cost = round(cost * random.uniform(0.15, 0.65), 2)
                repair_logs.append(RepairLog(
                    asset_id=asset_id,
                    failure_date=fail_date,
                    repair_start=datetime.combine(fail_date, datetime.min.time()),
                    repair_end=None if asset_status == AssetLifecycleStatus.IN_REPAIR else datetime.now(),
                    repair_cost=rep_cost,
                    description=fake.sentence(nb_words=12)
                ))

        # Bulk commit in batches
        print("[*] Saving 1,200 assets, allocations, IT details, and repair logs...")
        db.bulk_save_objects(assets)
        db.commit()

        if it_details:
            db.bulk_save_objects(it_details)
        if allocations:
            db.bulk_save_objects(allocations)
        if repair_logs:
            db.bulk_save_objects(repair_logs)
        db.commit()

        # Print summary
        total_assets = db.query(Asset).count()
        total_val = sum(float(a.purchase_cost) for a in db.query(Asset).all())
        in_repair = db.query(Asset).filter(Asset.asset_status == AssetLifecycleStatus.IN_REPAIR).count()
        condemned = db.query(Asset).filter(Asset.asset_status == AssetLifecycleStatus.CONDEMNED).count()
        active = db.query(Asset).filter(Asset.asset_status == AssetLifecycleStatus.ACTIVE).count()

        print("=" * 60)
        print("[SUCCESS] DATABASE SEEDING COMPLETED SUCCESSFULLY!")
        print(f"- Total Assets:      {total_assets:,}")
        print(f"- Active Assets:     {active:,} ({(active/total_assets)*100:.1f}%)")
        print(f"- In Repair Assets:  {in_repair:,} ({(in_repair/total_assets)*100:.1f}%)")
        print(f"- Condemned Assets:  {condemned:,} ({(condemned/total_assets)*100:.1f}%)")
        print(f"- Total Valuation:   INR {total_val:,.2f}")
        print(f"- Total Users:       {db.query(User).count()}")
        print(f"- Total Categories:  {db.query(AssetCategoryModel).count()}")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during seeding: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_massive_db()
