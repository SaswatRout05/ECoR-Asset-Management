import io
import pypdf
from pypdf import PdfWriter
from backend.invoice_parser import extract_invoice_data_from_pdf

def test_parser():
    # Generate a mock PDF in memory
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    
    # We can write text annotations or test regex parser directly
    sample_text = """
    TAX INVOICE
    Seller Name: Dell Technologies India Pvt Ltd
    Plot No 12, Industrial Area, Bangalore - 560066
    
    GeM Invoice No: GEM/2026/B/7891234
    Invoice Date: 18/02/2026
    
    Billed To: East Coast Railway, Bhubaneswar
    
    Item Description: Dell OptiPlex 7090 Desktop MT
    Serial No: SN-DELL-998822
    Quantity: 1
    
    Sub Total: INR 42,500.00
    GST (18%): INR 7,650.00
    Grand Total: INR 50,150.00
    """
    
    print("--- Testing PDF parser directly with sample invoice text ---")
    # Test parser with synthetic text
    from unittest.mock import patch
    
    with patch("pdfplumber.open") as mock_pdfplumber:
        class MockPage:
            def extract_text(self):
                return sample_text
        class MockPDF:
            def __enter__(self):
                return self
            def __exit__(self, *args):
                pass
            @property
            def pages(self):
                return [MockPage()]
                
        mock_pdfplumber.return_value = MockPDF()
        
        result = extract_invoice_data_from_pdf(b"%PDF-1.4...")
        print("Extraction Result:")
        print(result)
        
        assert result["date"] == "2026-02-18", f"Date mismatch: {result['date']}"
        assert result["total_cost"] == 50150.0, f"Cost mismatch: {result['total_cost']}"
        assert "Dell" in result["vendor_name"], f"Vendor mismatch: {result['vendor_name']}"
        assert result["gem_invoice_ref"] == "GEM/2026/B/7891234", f"Invoice ref mismatch: {result['gem_invoice_ref']}"
        print("[OK] All invoice extraction assertions passed!")

if __name__ == "__main__":
    test_parser()
