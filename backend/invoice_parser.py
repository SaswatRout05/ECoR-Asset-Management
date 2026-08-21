"""
ECoR-OAMS  ·  Invoice PDF Extraction Service (CR-2026-011)
Extracts Date, Total Cost, Vendor Name, GeM Invoice Reference, and Item Details from uploaded PDF invoices.
"""
import io
import re
from datetime import datetime
from typing import Dict, Any, Optional
import pdfplumber
from pypdf import PdfReader


def parse_date_string(date_str: str) -> Optional[str]:
    """Normalize various date formats into YYYY-MM-DD."""
    date_str = date_str.strip()
    # Normalize delimiters
    cleaned = re.sub(r"[\./]", "-", date_str)
    
    formats = [
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%m-%d-%Y",
        "%d-%b-%Y",
        "%d-%B-%Y",
        "%d %b %Y",
        "%d %B %Y",
        "%b %d, %Y",
        "%B %d, %Y",
        "%Y%m%d",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(cleaned if "%" in fmt and " " not in fmt else date_str, fmt)
            return dt.strftime("%Y-%m-%d")
        except Exception:
            continue
    return None


def extract_invoice_data_from_pdf(pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Extract structured invoice data from PDF bytes.
    Returns:
        {
            "date": "YYYY-MM-DD" or None,
            "total_cost": float or None,
            "vendor_name": str or None,
            "gem_invoice_ref": str or None,
            "asset_name": str or None,
            "make_and_model": str or None,
            "serial_number": str or None,
            "raw_text_snippet": str
        }
    """
    full_text = ""
    
    # 1. Primary extraction with pdfplumber
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                txt = page.extract_text()
                if txt:
                    full_text += txt + "\n"
    except Exception:
        pass

    # 2. Fallback to pypdf if pdfplumber extracted nothing
    if not full_text.strip():
        try:
            reader = PdfReader(io.BytesIO(pdf_bytes))
            for page in reader.pages:
                txt = page.extract_text()
                if txt:
                    full_text += txt + "\n"
        except Exception:
            pass

    extracted = {
        "date": None,
        "total_cost": None,
        "vendor_name": None,
        "gem_invoice_ref": None,
        "asset_name": None,
        "make_and_model": None,
        "serial_number": None,
        "raw_text_snippet": full_text[:500] if full_text else "",
    }

    if not full_text:
        return extracted

    lines = [line.strip() for line in full_text.splitlines() if line.strip()]

    # ── 1. Extract GeM Invoice Ref / Invoice Number ─────────────
    # Check GeM pattern first (e.g. GEM/2026/B/1234567 or GEM/2024/...)
    gem_match = re.search(r"\b(GEM/\d{4}/[A-Za-z0-9/_-]+)\b", full_text, re.IGNORECASE)
    if gem_match:
        extracted["gem_invoice_ref"] = gem_match.group(1).upper()
    else:
        # Generic invoice number pattern
        inv_match = re.search(
            r"(?:GeM\s*Invoice\s*No|Invoice\s*No\.?|Invoice\s*#|Bill\s*No\.?|Invoice\s*Number)[:\s]*([A-Za-z0-9/_-]+)",
            full_text,
            re.IGNORECASE,
        )
        if inv_match:
            extracted["gem_invoice_ref"] = inv_match.group(1).strip()

    # ── 2. Extract Date ─────────────────────────────────────────
    # First look for date near keywords
    date_context_matches = re.findall(
        r"(?:Invoice\s*Date|Bill\s*Date|Dated|Date\s*of\s*Issue|Date)[:\s]*(\d{1,2}[-/. ]\d{1,2}[-/. ]\d{2,4}|\d{4}[-/. ]\d{1,2}[-/. ]\d{1,2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})",
        full_text,
        re.IGNORECASE,
    )
    for dm in date_context_matches:
        parsed = parse_date_string(dm)
        if parsed:
            extracted["date"] = parsed
            break

    # Fallback to any standalone date in text
    if not extracted["date"]:
        all_dates = re.findall(
            r"\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b",
            full_text,
            re.IGNORECASE,
        )
        for dm in all_dates:
            parsed = parse_date_string(dm)
            if parsed:
                extracted["date"] = parsed
                break

    # ── 3. Extract Total Cost ───────────────────────────────────
    # Look for Total / Grand Total / Net Amount lines
    cost_patterns = [
        r"(?:Grand\s*Total|Total\s*Amount|Invoice\s*Total|Total\s*Price|Net\s*Amount|Total\s*Value|Total\s*INR|Total\s*Cost|Amount\s*Payable)[:\s]*(?:₹|Rs\.?|INR)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)",
        r"(?:Total|Amount)[:\s]*(?:₹|Rs\.?|INR)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)",
        r"(?:₹|Rs\.?|INR)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)",
    ]

    for pat in cost_patterns:
        matches = re.findall(pat, full_text, re.IGNORECASE)
        if matches:
            # Pick highest reasonable value among matches or the first direct total match
            for m in reversed(matches):
                val_str = m.replace(",", "").strip()
                try:
                    val = float(val_str)
                    if val > 0:
                        extracted["total_cost"] = round(val, 2)
                        break
                except ValueError:
                    continue
        if extracted["total_cost"] is not None:
            break

    # ── 4. Extract Vendor / Supplier Name ───────────────────────
    vendor_match = re.search(
        r"(?:Seller\s*Name|Vendor\s*Name|Sold\s*By|Supplier|Seller|Vendor|M/s|Billed\s*By|Company\s*Name)[:\s]+([^\n\r,]+)",
        full_text,
        re.IGNORECASE,
    )
    if vendor_match:
        v_name = vendor_match.group(1).strip()
        # Clean extra characters
        v_name = re.sub(r"^(M/s\.?|M/S\.?)\s*", "", v_name).strip()
        if len(v_name) > 2:
            extracted["vendor_name"] = v_name

    # If no vendor prefix found, check top lines for Company identifiers (Pvt Ltd, LLC, Corp, Technologies)
    if not extracted["vendor_name"]:
        for line in lines[:8]:
            if re.search(r"\b(Pvt\.?\s*Ltd|Private\s*Limited|Technologies|Solutions|Enterprises|Corporation|Systems|Infotech|Services|India)\b", line, re.IGNORECASE):
                extracted["vendor_name"] = line.strip()
                break

    # ── 5. Extract Item / Product / Asset Name ───────────────────
    # Look for common item descriptions
    item_match = re.search(
        r"(?:Item\s*Description|Product\s*Name|Description\s*of\s*Goods|Item\s*Name|Particulars|Product)[:\s]+([^\n\r]+)",
        full_text,
        re.IGNORECASE,
    )
    if item_match:
        extracted["asset_name"] = item_match.group(1).strip()

    # Look for popular equipment keywords if asset_name is still not found
    if not extracted["asset_name"]:
        equip_keywords = [
            r"(Dell\s+[A-Za-z0-9\s]+(?:Desktop|Laptop|Monitor|Workstation|Server))",
            r"(HP\s+[A-Za-z0-9\s]+(?:Desktop|Laptop|Printer|Scanner|Server))",
            r"(Lenovo\s+[A-Za-z0-9\s]+(?:Desktop|Laptop|ThinkPad|ThinkCentre))",
            r"(Cisco\s+[A-Za-z0-9\s]+(?:Switch|Router))",
            r"(Canon\s+[A-Za-z0-9\s]+(?:Printer|Scanner|Copier))",
            r"(Epson\s+[A-Za-z0-9\s]+(?:Printer|Scanner))",
            r"(Voltas\s+[A-Za-z0-9\s]+(?:AC|Split AC|Air Conditioner))",
            r"(Executive\s+Desk[A-Za-z0-9\s]*)",
            r"(Revolving\s+Chair[A-Za-z0-9\s]*)",
        ]
        for ek in equip_keywords:
            m = re.search(ek, full_text, re.IGNORECASE)
            if m:
                extracted["asset_name"] = m.group(1).strip()
                break

    # Set make & model if matched
    if extracted["asset_name"]:
        extracted["make_and_model"] = extracted["asset_name"]
    elif extracted["vendor_name"]:
        extracted["asset_name"] = f"Equipment - {extracted['vendor_name']}"
        extracted["make_and_model"] = extracted["vendor_name"]

    # ── 6. Serial Number ────────────────────────────────────────
    serial_match = re.search(
        r"(?:Serial\s*No\.?|Serial\s*#|S/N|Serial\s*Number)[:\s]*([A-Za-z0-9-]+)",
        full_text,
        re.IGNORECASE,
    )
    if serial_match:
        extracted["serial_number"] = serial_match.group(1).strip()

    return extracted
