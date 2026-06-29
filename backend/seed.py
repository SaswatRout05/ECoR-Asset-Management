"""
ECoR-OAMS  ·  Database Seeder
CR-2026-008: Generates exactly 100 randomized mock assets with varied costs/dates.
CR-2026-009: Adds is_active field to users.

Run:  python -m backend.seed
"""
import sys
import random
import string
from datetime import date, datetime, timedelta
from pathlib import Path

# Ensure project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import SessionLocal, init_db
from backend.models import (
    User, Asset, AssetCategoryModel, ITEquipmentDetail, AssetAllocation, RepairLog,
    UserRole, OperationalStatus, AssetLifecycleStatus, TransferApprovalStatus,
)
from backend.auth import hash_password
from faker import Faker

# ── Randomization data pools ────────────────────────────────

IT_NAMES = [
    "Dell OptiPlex 7090 Desktop", "Dell P2422H Monitor", "HP LaserJet Pro M404dn",
    "Lenovo ThinkPad E14 Laptop", "Cisco SG350 Network Switch", "HP ProDesk 400 G7",
    "Lenovo ThinkCentre M70q", "Dell Latitude 5520", "HP EliteBook 840 G8",
    "Canon LBP6030w Printer", "Epson WorkForce Scanner", "TP-Link TL-SG108 Switch",
    "Dell Vostro 3510", "Acer Aspire 7 Laptop", "HP LaserJet M140we",
    "APC Back-UPS 1100VA", "D-Link DGS-1016D Switch", "Zebra ZD220 Label Printer",
    "Logitech C920 Webcam", "Dell UltraSharp U2722D Monitor",
]

OA_NAMES = [
    "Epson L3250 Multifunction Printer", "Canon DR-C225 II Scanner",
    "Brother DCP-T520W Printer", "HP ScanJet Pro 2500 f1", "Xerox B210 Printer",
    "Ricoh SP 210 Laser Printer", "Konica Minolta Bizhub C224e",
    "Samsung SL-M2876ND Printer", "Canon imageCLASS MF643Cdw",
    "Epson EcoTank L6270",
]

EA_NAMES = [
    "Voltas 1.5T Split AC", "Havells Ceiling Fan 1200mm", "Luminous 1500VA UPS",
    "Bajaj Room Heater 2000W", "Blue Star 2T Window AC", "Crompton Greaves Fan 48in",
    "Microtek UPS SEBz 1100VA", "Orient Electric Wall Fan", "Havells 25L Water Heater",
    "Syska LED Panel Light 40W", "Philips TL5 Tube Light", "V-Guard Stabilizer 5KVA",
    "Exide Inverter Battery 150Ah", "Crompton SES2 Geyser 15L",
    "Anchor Roma Modular Switch Board",
]

OF_NAMES = [
    "Executive Desk (Teak, 5x3 ft)", "Revolving Chair (High-Back)",
    "Steel Almirah (6x3 ft)", "Visitor Chairs (Set of 4)",
    "Filing Cabinet (4-Drawer)", "Conference Table (8-Seater)",
    "Office Bookshelf (5-Tier)", "Wooden Cupboard (6x3 ft)",
    "Ergonomic Mesh Chair", "Modular Workstation (L-Shape)",
    "Notice Board (4x3 ft)", "Whiteboard (5x3 ft, Magnetic)",
    "Reception Sofa Set (3+1+1)", "Wooden Stool (Standard)",
    "Steel Rack (6-Shelf)",
]

BUILDINGS = [
    "Administrative Block", "IT Cell Block", "Accounts Block",
    "Engineering Block", "Signal & Telecom Block", "Personnel Block",
    "Stores Block", "GM Office Block",
]

ROOMS = [
    "A-101", "A-201", "A-301", "IT-102", "IT-103", "IT-201",
    "ACC-305", "ACC-201", "ENG-101", "ENG-202", "S&T-101",
    "PER-201", "STR-101", "GM-101", "GM-201",
]

CUSTODIAN_EMPS = ["ECoR-C-1001", "ECoR-IT-2001", "ECoR-A-3001"]

OPERATIONAL_STATUSES = ["In-Use", "Under Repair", "Surplus", "Condemned"]
OP_STATUS_WEIGHTS = [65, 12, 13, 10]  # Weighted distribution

LIFECYCLE_STATUSES = [
    AssetLifecycleStatus.ACTIVE,
    AssetLifecycleStatus.IN_REPAIR,
    AssetLifecycleStatus.CONDEMNED,
]
LIFECYCLE_WEIGHTS = [75, 12, 13]

TRANSFER_STATUSES = [
    TransferApprovalStatus.NONE,
    TransferApprovalStatus.PENDING_CUSTODIAN,
    TransferApprovalStatus.PENDING_AUDITOR,
    TransferApprovalStatus.ACCEPTED,
    TransferApprovalStatus.REJECTED,
]
TRANSFER_WEIGHTS = [60, 10, 10, 15, 5]


def _rand_date(start_year=2018, end_year=2026):
    """Generate a random date between start_year and end_year."""
    start = date(start_year, 1, 1)
    end = date(end_year, 6, 28)
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))


def _rand_cost(low=1000, high=150000):
    """Generate a random cost rounded to 2 decimals."""
    return round(random.uniform(low, high), 2)


def _rand_asset_id():
    """Generate a 12-char alphanumeric ID."""
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choice(chars) for _ in range(12))


def _rand_invoice(purchase_date):
    """Generate a GEM-style invoice reference."""
    year = purchase_date.year
    suffix = random.randint(1000000, 9999999)
    return f"GEM/{year}/B/{suffix}"


def _rand_serial(prefix="SN"):
    """Generate a random serial number."""
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=10))
    return f"{prefix}-{suffix}"


def _rand_mac():
    """Generate a random MAC address."""
    return ":".join(f"{random.randint(0, 255):02X}" for _ in range(6))


def _rand_ip():
    """Generate a random private IP address."""
    return f"10.100.{random.randint(1, 254)}.{random.randint(1, 254)}"


def seed():
    init_db()
    db = SessionLocal()

    try:
        # Skip if already seeded
        if db.query(User).first():
            print("[!] Database already seeded. Skipping.")
            return

        # ══════════════════════════════════════════════
        #  USERS
        # ══════════════════════════════════════════════
        users = [
            User(
                username="custodian1",
                password_hash=hash_password("ECoR@2026"),
                full_name="Rajesh Kumar Panda",
                role=UserRole.CUSTODIAN,
                emp_id="ECoR-C-1001",
                is_active=True,
            ),
            User(
                username="itadmin1",
                password_hash=hash_password("ECoR@2026"),
                full_name="Priya Sharma",
                role=UserRole.IT_ADMIN,
                emp_id="ECoR-IT-2001",
                is_active=True,
            ),
            User(
                username="auditor1",
                password_hash=hash_password("ECoR@2026"),
                full_name="Amit Mohanty",
                role=UserRole.AUDITOR,
                emp_id="ECoR-A-3001",
                is_active=True,
            ),
        ]
        db.add_all(users)
        db.flush()
        print("[OK] Users created (custodian1, itadmin1, auditor1)")

        # ══════════════════════════════════════════════
        #  ASSET CATEGORIES (CR-2026-006)
        # ══════════════════════════════════════════════
        categories = [
            AssetCategoryModel(category_name="IT Hardware"),
            AssetCategoryModel(category_name="Office Automation"),
            AssetCategoryModel(category_name="Electrical Appliances"),
            AssetCategoryModel(category_name="Office Furniture"),
        ]
        db.add_all(categories)
        db.flush()
        cat_map = {c.category_name: c.category_id for c in categories}
        print(f"[OK] {len(categories)} asset categories created")

        # ══════════════════════════════════════════════
        #  CR-2026-008: 100 RANDOMIZED ASSETS
        # ══════════════════════════════════════════════
        category_pools = {
            "IT Hardware":           IT_NAMES,
            "Office Automation":     OA_NAMES,
            "Electrical Appliances": EA_NAMES,
            "Office Furniture":      OF_NAMES,
        }
        # Distribution: ~30 IT, ~20 OA, ~25 EA, ~25 OF
        category_distribution = (
            ["IT Hardware"] * 30 +
            ["Office Automation"] * 20 +
            ["Electrical Appliances"] * 25 +
            ["Office Furniture"] * 25
        )
        random.shuffle(category_distribution)

        fake = Faker()
        Faker.seed(12345)
        used_ids = set()
        assets_data = []
        it_assets = []  # Track IT assets for IT details later

        for i in range(100):
            cat_name = category_distribution[i]
            name_pool = category_pools[cat_name]
            asset_name = random.choice(name_pool)

            # Generate unique asset ID
            while True:
                aid = _rand_asset_id()
                if aid not in used_ids:
                    used_ids.add(aid)
                    break

            # Use Faker to generate purchase date within past 8 years
            purchase_date = fake.date_between(start_date='-8y', end_date='today')

            # Vary cost ranges by category using Faker
            if cat_name == "IT Hardware":
                cost = round(fake.pyfloat(min_value=8000, max_value=150000), 2)
            elif cat_name == "Office Automation":
                cost = round(fake.pyfloat(min_value=5000, max_value=80000), 2)
            elif cat_name == "Electrical Appliances":
                cost = round(fake.pyfloat(min_value=1000, max_value=60000), 2)
            else:  # Furniture
                cost = round(fake.pyfloat(min_value=2000, max_value=50000), 2)

            op_status = random.choices(OPERATIONAL_STATUSES, weights=OP_STATUS_WEIGHTS, k=1)[0]
            lifecycle = random.choices(LIFECYCLE_STATUSES, weights=LIFECYCLE_WEIGHTS, k=1)[0]
            transfer_st = random.choices(TRANSFER_STATUSES, weights=TRANSFER_WEIGHTS, k=1)[0]

            # Sync: if operational is Condemned, lifecycle should be too
            if op_status == "Condemned":
                lifecycle = AssetLifecycleStatus.CONDEMNED
            elif op_status == "Under Repair":
                lifecycle = AssetLifecycleStatus.IN_REPAIR

            # If lifecycle is condemned, operational should match
            if lifecycle == AssetLifecycleStatus.CONDEMNED:
                op_status = "Condemned"
            elif lifecycle == AssetLifecycleStatus.IN_REPAIR:
                op_status = "Under Repair"

            # AMC expiry (50% chance for IT/OA, 20% for others)
            amc_chance = 0.5 if cat_name in ("IT Hardware", "Office Automation") else 0.2
            amc_date = None
            if fake.boolean(chance_of_getting_true=int(amc_chance * 100)):
                amc_date = purchase_date + timedelta(days=fake.random_int(365, 1095))

            # PL number (30% chance)
            pl_number = f"PL-{fake.random_int(10000, 99999)}" if fake.boolean(chance_of_getting_true=30) else None

            # Generate GEM invoice reference using Faker
            gem_ref = f"GEM/{purchase_date.year}/B/{fake.random_number(digits=7)}"

            # Auditor remarks (10% chance)
            auditor_remarks = None
            auditor_priority_tag = None
            if fake.boolean(chance_of_getting_true=10):
                remarks_pool = [
                    "Repair costs approaching uneconomical threshold. Recommend replacement.",
                    "Obsolete equipment. No spare parts available.",
                    "Multiple failures recorded. Recommend disposal per Railway Board guidelines.",
                    "Asset nearing end-of-life. Schedule for next procurement cycle replacement.",
                    "Frequent breakdowns. TCO ratio exceeds acceptable limits.",
                ]
                auditor_remarks = fake.random_element(remarks_pool)
                auditor_priority_tag = fake.random_element([
                    "High Priority for Removal",
                    "High Priority for Replacement",
                ])

            asset = Asset(
                asset_id=aid,
                pl_number=pl_number,
                asset_name=asset_name,
                category_id=cat_map[cat_name],
                purchase_date=purchase_date,
                purchase_cost=cost,
                gem_invoice_ref=gem_ref,
                operational_status=op_status,
                amc_expiry_date=amc_date,
                auditor_remarks=auditor_remarks,
                auditor_priority_tag=auditor_priority_tag,
                asset_status=lifecycle,
                transfer_status=transfer_st,
            )
            assets_data.append(asset)

            if cat_name == "IT Hardware":
                it_assets.append(asset)

        db.add_all(assets_data)
        db.flush()
        print(f"[OK] {len(assets_data)} assets created (100 randomized)")

        # ══════════════════════════════════════════════
        #  IT EQUIPMENT DETAILS (for first 15 IT assets)
        # ══════════════════════════════════════════════
        it_detail_count = min(15, len(it_assets))
        it_details = []
        used_serials = set()
        for it_asset in it_assets[:it_detail_count]:
            while True:
                serial = f"IT-{fake.bothify(text='##########')}"
                if serial not in used_serials:
                    used_serials.add(serial)
                    break

            detail = ITEquipmentDetail(
                asset_id=it_asset.asset_id,
                serial_number=serial,
                make_and_model=it_asset.asset_name,
                mac_address=fake.mac_address() if fake.boolean(chance_of_getting_true=70) else None,
                ip_address=fake.ipv4_private() if fake.boolean(chance_of_getting_true=60) else None,
                warranty_expiry_date=(
                    it_asset.purchase_date + timedelta(days=fake.random_int(730, 1825))
                    if fake.boolean(chance_of_getting_true=80) else None
                ),
            )
            it_details.append(detail)

        db.add_all(it_details)
        db.flush()
        print(f"[OK] {len(it_details)} IT equipment detail records created")

        # ══════════════════════════════════════════════
        #  ASSET ALLOCATIONS (20 random allocations)
        # ══════════════════════════════════════════════
        alloc_assets = random.sample(assets_data, min(20, len(assets_data)))
        allocations = []
        for asset in alloc_assets:
            alloc = AssetAllocation(
                asset_id=asset.asset_id,
                building_block=random.choice(BUILDINGS),
                room_number=random.choice(ROOMS),
                custodian_emp_id=random.choice(CUSTODIAN_EMPS),
                allocation_date=asset.purchase_date + timedelta(days=random.randint(5, 60)),
                is_acknowledged=random.random() < 0.75,
            )
            allocations.append(alloc)

        # Add 3 pending transfers explicitly
        pending_assets = random.sample(
            [a for a in assets_data if a not in alloc_assets], min(3, len(assets_data) - 20)
        )
        for asset in pending_assets:
            alloc = AssetAllocation(
                asset_id=asset.asset_id,
                building_block=random.choice(BUILDINGS),
                room_number=random.choice(ROOMS),
                custodian_emp_id=random.choice(CUSTODIAN_EMPS),
                allocation_date=date.today(),
                is_acknowledged=False,
            )
            allocations.append(alloc)

        db.add_all(allocations)
        db.flush()
        pending_count = sum(1 for a in allocations if not a.is_acknowledged)
        print(f"[OK] {len(allocations)} allocation records created ({pending_count} pending)")

        # ══════════════════════════════════════════════
        #  REPAIR LOGS (12 random repair entries)
        # ══════════════════════════════════════════════
        repair_pool = random.sample(assets_data, min(12, len(assets_data)))
        repairs = []
        repair_descriptions = [
            "Fuser unit replacement due to paper jam damage",
            "Formatter board failure - replaced with OEM part",
            "Display panel cracked - awaiting spare part",
            "Battery cells replaced",
            "Inverter board malfunction - under diagnosis",
            "Compressor gas refill and condenser cleaning",
            "Hard drive failure - data recovery attempted",
            "Power supply unit burned out - replaced",
            "Keyboard and trackpad replacement",
            "Fan motor seized - replaced with compatible unit",
            "Cooling coil leak repair",
            "Motherboard capacitor replacement",
        ]
        for idx, asset in enumerate(repair_pool):
            failure_date = asset.purchase_date + timedelta(days=random.randint(90, 800))
            repair_start = datetime.combine(failure_date, datetime.min.time().replace(hour=random.randint(8, 16)))
            repair_end = None
            if random.random() < 0.7:
                repair_end = repair_start + timedelta(hours=random.randint(8, 120))
            repair_cost = round(random.uniform(500, 15000), 2) if repair_end else 0

            repair = RepairLog(
                asset_id=asset.asset_id,
                failure_date=failure_date,
                repair_start=repair_start,
                repair_end=repair_end,
                repair_cost=repair_cost,
                description=repair_descriptions[idx % len(repair_descriptions)],
            )
            repairs.append(repair)

        db.add_all(repairs)
        db.commit()
        print(f"[OK] {len(repairs)} repair log entries created")

        print("\n==============================================")
        print("  ECoR-OAMS Database Seeded Successfully!")
        print(f"  Total Assets: {len(assets_data)}")
        print("==============================================")
        print("\n  Login Credentials:")
        print("  +==============+==============+=============+")
        print("  | Username     | Password     | Role        |")
        print("  +==============+==============+=============+")
        print("  | custodian1   | ECoR@2026    | Custodian   |")
        print("  | itadmin1     | ECoR@2026    | IT Admin    |")
        print("  | auditor1     | ECoR@2026    | Auditor     |")
        print("  +==============+==============+=============+")

    except Exception as e:
        db.rollback()
        print(f"[FAIL] Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
