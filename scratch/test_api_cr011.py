import io
import requests
from pypdf import PdfWriter

BASE_URL = "http://127.0.0.1:8000"

def run_cr011_tests():
    print("==================================================")
    print("  RUNNING CR-2026-011 INTEGRATION TESTS")
    print("==================================================")

    # 1. Test Login by emp_id
    print("\n--- 1. Login with emp_id 'ECoR-C-1001' ---")
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "emp_id": "ECoR-C-1001",
        "password": "ECoR@2026"
    })
    assert r.status_code == 200, f"Login by emp_id failed ({r.status_code}): {r.text}"
    data = r.json()
    assert "access_token" in data, "access_token missing in response"
    assert data["role"] == "custodian", f"Unexpected role: {data['role']}"
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[OK] Login by emp_id successful! Role: {data['role']}, Name: {data['full_name']}")

    # 2. Test Login by username
    print("\n--- 2. Login with username 'itadmin1' ---")
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "itadmin1",
        "password": "ECoR@2026"
    })
    assert r.status_code == 200, f"Login by username failed ({r.status_code}): {r.text}"
    print(f"[OK] Login by username successful! Role: {r.json()['role']}")

    # 3. Test Login with invalid password
    print("\n--- 3. Login with invalid password (expecting 401) ---")
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "emp_id": "ECoR-C-1001",
        "password": "WrongPassword123"
    })
    assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
    print("[OK] Invalid credentials correctly rejected with 401 Unauthorized")

    # 4. Test POST /api/assets/upload-bill with PDF
    print("\n--- 4. Generating sample invoice PDF and uploading ---")
    
    # Create sample PDF using pypdf
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    
    # Add text using pypdf annotations or write raw PDF stream
    # A valid minimal PDF with text content stream
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
        b"4 0 obj << /Length 280 >> stream\n"
        b"BT\n"
        b"/F1 12 Tf\n"
        b"50 700 Td (TAX INVOICE) Tj\n"
        b"0 -20 Td (Seller Name: Dell Technologies India Pvt Ltd) Tj\n"
        b"0 -20 Td (GeM Invoice No: GEM/2026/B/8821943) Tj\n"
        b"0 -20 Td (Invoice Date: 2026-02-20) Tj\n"
        b"0 -20 Td (Item Description: Dell OptiPlex 7090 Desktop) Tj\n"
        b"0 -20 Td (Serial No: SN-DELL-883921) Tj\n"
        b"0 -20 Td (Grand Total: INR 58,400.00) Tj\n"
        b"ET\n"
        b"endstream\n"
        b"endobj\n"
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
        b"xref\n"
        b"0 6\n"
        b"0000000000 65535 f \n"
        b"0000000010 00000 n \n"
        b"0000000060 00000 n \n"
        b"0000000117 00000 n \n"
        b"0000000247 00000 n \n"
        b"0000000578 00000 n \n"
        b"trailer << /Size 6 /Root 1 0 R >>\n"
        b"startxref\n"
        b"655\n"
        b"%%EOF\n"
    )

    files = {
        "file": ("gem_invoice_sample.pdf", pdf_content, "application/pdf")
    }
    
    r = requests.post(f"{BASE_URL}/api/assets/upload-bill", headers=headers, files=files)
    assert r.status_code == 200, f"Upload bill failed ({r.status_code}): {r.text}"
    upload_res = r.json()
    print("[OK] PDF upload response received:")
    print(f"  - Filename: {upload_res['filename']}")
    ext = upload_res["extracted_data"]
    print(f"  - Date: {ext['date']}")
    print(f"  - Total Cost: {ext['total_cost']}")
    print(f"  - Vendor: {ext['vendor_name']}")
    print(f"  - GeM Invoice Ref: {ext['gem_invoice_ref']}")
    print(f"  - Asset Name: {ext['asset_name']}")
    print(f"  - Serial Number: {ext['serial_number']}")

    assert ext["date"] == "2026-02-20", f"Unexpected date: {ext['date']}"
    assert ext["total_cost"] == 58400.0, f"Unexpected cost: {ext['total_cost']}"
    assert "Dell" in ext["vendor_name"], f"Unexpected vendor: {ext['vendor_name']}"
    assert ext["gem_invoice_ref"] == "GEM/2026/B/8821943", f"Unexpected invoice ref: {ext['gem_invoice_ref']}"

    # 5. Non-PDF upload rejection check
    print("\n--- 5. Upload non-PDF file (expecting 400) ---")
    files_bad = {
        "file": ("test.txt", b"plain text content", "text/plain")
    }
    r = requests.post(f"{BASE_URL}/api/assets/upload-bill", headers=headers, files=files_bad)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    print("[OK] Non-PDF file correctly rejected with 400 Bad Request")

    print("\n==================================================")
    print("  ALL CR-2026-011 TESTS PASSED SUCCESSFULLY! ")
    print("==================================================")

if __name__ == "__main__":
    run_cr011_tests()
