import requests
import time

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    # 1. Login as custodian
    print("--- Logging in as custodian1 ---")
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "custodian1",
        "password": "ECoR@2026"
    })
    assert r.status_code == 200, f"Login failed: {r.text}"
    custodian_token = r.json()["access_token"]
    custodian_headers = {"Authorization": f"Bearer {custodian_token}"}
    print("[OK] Custodian login successful")

    # 2. Login as auditor
    print("\n--- Logging in as auditor1 ---")
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "auditor1",
        "password": "ECoR@2026"
    })
    assert r.status_code == 200, f"Login failed: {r.text}"
    auditor_token = r.json()["access_token"]
    auditor_headers = {"Authorization": f"Bearer {auditor_token}"}
    print("[OK] Auditor login successful")

    # 3. GET /api/categories
    print("\n--- Getting categories list ---")
    r = requests.get(f"{BASE_URL}/api/categories", headers=custodian_headers)
    assert r.status_code == 200, f"Get categories failed: {r.text}"
    categories = r.json()
    print(f"[OK] Categories retrieved: {[c['category_name'] for c in categories]}")
    
    # Store dynamic category map
    cat_map = {c["category_name"]: c["category_id"] for c in categories}
    assert "IT Hardware" in cat_map, "IT Hardware category missing"

    # 4. POST /api/categories as custodian (should fail)
    print("\n--- Creating category as custodian (expecting 403) ---")
    r = requests.post(f"{BASE_URL}/api/categories", headers=custodian_headers, json={
        "category_name": f"New Category By Custodian {int(time.time())}"
    })
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
    print("[OK] Access correctly denied (403 Forbidden)")

    # 5. POST /api/categories as auditor (should succeed)
    test_cat_name = f"Auditor Test Category {int(time.time())}"
    print(f"\n--- Creating category '{test_cat_name}' as auditor (expecting 201) ---")
    r = requests.post(f"{BASE_URL}/api/categories", headers=auditor_headers, json={
        "category_name": test_cat_name
    })
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    new_cat = r.json()
    new_cat_id = new_cat["category_id"]
    print(f"[OK] Category created successfully: {new_cat}")

    # 6. GET /api/assets to verify category name works
    print("\n--- Listing assets ---")
    r = requests.get(f"{BASE_URL}/api/assets", headers=custodian_headers)
    assert r.status_code == 200, f"Get assets failed: {r.text}"
    assets = r.json()
    assert len(assets) > 0, "No assets found"
    first_asset = assets[0]
    assert "category_id" in first_asset, "category_id missing in asset response"
    assert "category_name" in first_asset, "category_name missing in asset response"
    print(f"[OK] First asset: name={first_asset['asset_name']}, category_id={first_asset['category_id']}, category_name={first_asset['category_name']}")

    # 7. POST /api/assets with category_id
    print("\n--- Creating asset as custodian ---")
    r = requests.post(f"{BASE_URL}/api/assets", headers=custodian_headers, json={
        "asset_name": "Test Asset Category",
        "category_id": new_cat_id,
        "purchase_date": "2026-01-01",
        "purchase_cost": 5000.00,
        "gem_invoice_ref": "GEM/2026/TEST/123",
        "operational_status": "In-Use"
    })
    assert r.status_code == 201, f"Create asset failed: {r.text}"
    created_asset = r.json()
    created_asset_id = created_asset["asset_id"]
    print(f"[OK] Asset created successfully: {created_asset}")

    # 8. GET /api/search to check global search router fix
    print("\n--- Running Global Search to verify search router does not crash ---")
    r = requests.get(f"{BASE_URL}/api/search?q=Test", headers=custodian_headers)
    assert r.status_code == 200, f"Search failed: {r.text}"
    search_results = r.json()
    print(f"[OK] Search returned {len(search_results)} result(s)")
    for res in search_results:
        print(f"  - ID: {res['asset_id']}, Name: {res['asset_name']}, Category Name: {res['category_name']}")

    # 9. GET /api/dashboard/summary
    print("\n--- Verifying Dashboard Summary ---")
    r = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=custodian_headers)
    assert r.status_code == 200, f"Dashboard summary failed: {r.text}"
    summary = r.json()
    print(f"[OK] Dashboard Summary category breakdown: {summary['category_breakdown']}")

    # 10. GET /api/dashboard/warranty-alerts
    print("\n--- Verifying Warranty Alerts ---")
    r = requests.get(f"{BASE_URL}/api/dashboard/warranty-alerts", headers=custodian_headers)
    assert r.status_code == 200, f"Warranty alerts failed: {r.text}"
    alerts = r.json()
    print(f"[OK] Warranty alerts count: {len(alerts)}")

    # 11. DELETE category as auditor (should fail because of asset referencing it)
    print("\n--- Deleting category while referenced by asset (expecting 409) ---")
    r = requests.delete(f"{BASE_URL}/api/categories/{new_cat_id}", headers=auditor_headers)
    assert r.status_code == 409, f"Expected 409, got {r.status_code}: {r.text}"
    print("[OK] Correctly blocked deletion of referenced category")

    # 12. Update asset to a different category so category is unreferenced
    print("\n--- Updating asset category to Office Furniture ---")
    office_furniture_id = cat_map["Office Furniture"]
    r = requests.put(f"{BASE_URL}/api/assets/{created_asset_id}", headers=custodian_headers, json={
        "category_id": office_furniture_id
    })
    assert r.status_code == 200, f"Update asset failed: {r.text}"
    print("[OK] Asset updated successfully")

    # 13. DELETE category as auditor (should now succeed)
    print("\n--- Deleting category now that it's unreferenced (expecting 204) ---")
    r = requests.delete(f"{BASE_URL}/api/categories/{new_cat_id}", headers=auditor_headers)
    assert r.status_code == 204, f"Expected 204, got {r.status_code}: {r.text}"
    print("[OK] Category deleted successfully")

    print("\n==============================================")
    print("      ALL API TESTS PASSED SUCCESSFULLY!       ")
    print("==============================================")

if __name__ == "__main__":
    run_tests()
