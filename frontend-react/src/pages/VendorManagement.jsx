/**
 * Vendor Management Page (`/admin/vendors`)
 * Displays registered suppliers and GeM contractors.
 * Features nested list and count of specific assets purchased from each vendor.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  ChevronRight,
  ChevronDown,
  Search,
  Package,
  IndianRupee,
  Phone,
  Mail,
  Calendar,
  FileText,
  ExternalLink,
  Plus,
  ShieldCheck,
  Tag,
} from 'lucide-react';

const MOCK_VENDORS = [
  {
    vendor_id: 'V-101',
    vendor_name: 'Dell India Pvt Ltd (GeM OEM Direct)',
    gstin: '21AAACD1234F1Z8',
    category: 'IT Hardware & Compute',
    contact_person: 'Ananya Roy',
    phone: '+91 98450 11223',
    email: 'gem.orders@dell-railways.in',
    rating: '4.9 / 5.0',
    assets_purchased: [
      { asset_id: 'A-0034', asset_name: 'Dell Latitude 5520 Laptop', purchase_date: '2025-01-15', invoice_ref: 'GEM/2025/B/9482103', cost: 72500, warranty_expiry: '2028-01-14' },
      { asset_id: 'A-0104', asset_name: 'Dell OptiPlex 7090 Desktop', purchase_date: '2025-03-22', invoice_ref: 'GEM/2025/B/9581204', cost: 64000, warranty_expiry: '2028-03-21' },
      { asset_id: 'A-0182', asset_name: 'Dell UltraSharp U2722D Monitor', purchase_date: '2025-05-18', invoice_ref: 'GEM/2025/B/9643190', cost: 28500, warranty_expiry: '2028-05-17' },
      { asset_id: 'A-0219', asset_name: 'Dell PowerEdge R450 Rack Server', purchase_date: '2025-09-04', invoice_ref: 'GEM/2025/B/9782109', cost: 215000, warranty_expiry: '2028-09-03' },
    ],
  },
  {
    vendor_id: 'V-102',
    vendor_name: 'HP India Sales Private Limited',
    gstin: '21AABCH5678K1Z2',
    category: 'Printers & Imaging',
    contact_person: 'Vikram Joshi',
    phone: '+91 98110 33445',
    email: 'government.sales@hp-india.com',
    rating: '4.7 / 5.0',
    assets_purchased: [
      { asset_id: 'A-0112', asset_name: 'HP LaserJet Pro MFP M428fdw', purchase_date: '2025-04-10', invoice_ref: 'GEM/2025/B/9521890', cost: 48900, warranty_expiry: '2026-04-09' },
      { asset_id: 'A-0198', asset_name: 'HP LaserJet Pro M404dn Single-Function', purchase_date: '2025-06-12', invoice_ref: 'GEM/2025/B/9678123', cost: 32000, warranty_expiry: '2026-06-11' },
      { asset_id: 'A-0312', asset_name: 'HP ScanJet Pro 2500 f1 Flatbed', purchase_date: '2025-11-28', invoice_ref: 'GEM/2025/B/9812450', cost: 24500, warranty_expiry: '2026-11-27' },
    ],
  },
  {
    vendor_id: 'V-103',
    vendor_name: 'Godrej & Boyce Mfg. Co. Ltd.',
    gstin: '21AAACG9012L1Z5',
    category: 'Office Furniture & Security',
    contact_person: 'Subhashish Mohapatra',
    phone: '+91 94370 88990',
    email: 'bbsr.rail@godrej.com',
    rating: '4.8 / 5.0',
    assets_purchased: [
      { asset_id: 'A-0089', asset_name: 'Godrej Steel Almirah (6x3 ft)', purchase_date: '2024-11-20', invoice_ref: 'GEM/2024/B/8912301', cost: 18500, warranty_expiry: '2027-11-19' },
      { asset_id: 'A-0402', asset_name: 'Godrej Executive Ergonomic High-Back Chair', purchase_date: '2024-04-01', invoice_ref: 'GEM/2024/B/8412890', cost: 14200, warranty_expiry: '2026-03-31' },
      { asset_id: 'A-0455', asset_name: 'Godrej Fire-Resistant Filing Cabinet (4-Drawer)', purchase_date: '2024-08-15', invoice_ref: 'GEM/2024/B/8719201', cost: 42000, warranty_expiry: '2029-08-14' },
    ],
  },
  {
    vendor_id: 'V-104',
    vendor_name: 'Voltas Limited (A TATA Enterprise)',
    gstin: '21AAACV3456M1Z9',
    category: 'HVAC & Electrical Appliances',
    contact_person: 'Ramesh Senapati',
    phone: '+91 99370 44556',
    email: 'voltas.eastcoast@voltas.com',
    rating: '4.6 / 5.0',
    assets_purchased: [
      { asset_id: 'A-0142', asset_name: 'Voltas 1.5T 5-Star Inverter Split AC', purchase_date: '2025-05-10', invoice_ref: 'GEM/2025/B/9612093', cost: 42500, warranty_expiry: '2026-05-09' },
      { asset_id: 'A-0167', asset_name: 'Voltas 2.0T Cassette AC with Remote', purchase_date: '2025-06-02', invoice_ref: 'GEM/2025/B/9690124', cost: 68000, warranty_expiry: '2026-06-01' },
    ],
  },
  {
    vendor_id: 'V-105',
    vendor_name: 'Cisco Systems Capital India Pvt Ltd',
    gstin: '21AAACC7890N1Z3',
    category: 'Network & Telecom Equipment',
    contact_person: 'Deepak Nambiar',
    phone: '+91 98200 66778',
    email: 'cisco.railways@cisco.com',
    rating: '4.9 / 5.0',
    assets_purchased: [
      { asset_id: 'A-0220', asset_name: 'Cisco IP Phone 7841 Multi-line VoIP', purchase_date: '2025-08-12', invoice_ref: 'GEM/2025/B/9745102', cost: 15200, warranty_expiry: '2027-08-11' },
      { asset_id: 'A-0245', asset_name: 'Cisco SG350-28 Managed 28-Port PoE Switch', purchase_date: '2025-08-19', invoice_ref: 'GEM/2025/B/9761208', cost: 58000, warranty_expiry: '2028-08-18' },
    ],
  },
];

export default function VendorManagement() {
  const [search, setSearch] = useState('');
  const [expandedVendor, setExpandedVendor] = useState('V-101'); // Expanded by default

  const toggleExpand = (id) => {
    setExpandedVendor(expandedVendor === id ? null : id);
  };

  const filtered = MOCK_VENDORS.filter(
    (v) =>
      v.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
      v.vendor_id.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase()) ||
      v.contact_person.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link to="/dashboard" className="hover:text-[#1F4E79] transition-colors no-underline text-slate-500">
          Dashboard
        </Link>
        <ChevronRight size={14} className="text-slate-400" />
        <span className="text-slate-500">Administration</span>
        <ChevronRight size={14} className="text-slate-400" />
        <span className="text-slate-700 font-medium">Vendors Directory</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1F4E79]/10 flex items-center justify-center text-[#1F4E79]">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Vendors Directory & Procurement</h1>
            <p className="text-sm text-slate-500">
              Registered GeM suppliers and nested inventory purchased per vendor
            </p>
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#7B1113] text-white rounded-xl text-sm font-bold hover:bg-[#5A0B0D] transition-colors shadow-sm cursor-pointer self-start sm:self-auto">
          <Plus size={16} />
          <span>Add New Vendor</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors by name, GSTIN, category, or contact person..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition-all"
          />
        </div>
      </div>

      {/* Vendors List with Nested Assets List */}
      <div className="space-y-4">
        {filtered.map((vendor) => {
          const isExpanded = expandedVendor === vendor.vendor_id;
          const totalVal = vendor.assets_purchased.reduce((sum, a) => sum + a.cost, 0);

          return (
            <div
              key={vendor.vendor_id}
              className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                isExpanded ? 'border-[#1F4E79] shadow-md ring-1 ring-[#1F4E79]/20' : 'border-slate-200 shadow-sm hover:border-slate-300'
              }`}
            >
              {/* Vendor Header Row */}
              <div
                onClick={() => toggleExpand(vendor.vendor_id)}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1F4E79] to-[#2E86C1] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    {vendor.vendor_id}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900">{vendor.vendor_name}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#1F4E79] text-[11px] font-semibold border border-blue-100">
                        {vendor.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                      <span>GSTIN: <strong className="font-mono text-slate-700">{vendor.gstin}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Mail size={12} />
                        {vendor.email}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Phone size={12} />
                        {vendor.phone}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vendor Summary Metrics + Accordion Chevron */}
                <div className="flex items-center gap-5 shrink-0 self-end lg:self-auto">
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#1F4E79]">
                      ₹{totalVal.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-slate-400">Total Purchase Value</div>
                  </div>

                  {/* Asset Count Badge */}
                  <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
                    <Package size={14} className="text-amber-600" />
                    <span>{vendor.assets_purchased.length} Assets</span>
                  </div>

                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 ${
                      isExpanded ? 'rotate-180 bg-[#1F4E79] text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              {/* ── Nested Purchased Assets List ── */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Package size={14} className="text-[#1F4E79]" />
                      <span>Assets Procured from {vendor.vendor_name} ({vendor.assets_purchased.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono">GeM Verified Supplier</span>
                  </div>

                  <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100/70 border-b border-slate-200">
                          <th className="px-4 py-2.5 font-bold text-slate-600">Asset ID</th>
                          <th className="px-4 py-2.5 font-bold text-slate-600">Asset Name & Description</th>
                          <th className="px-4 py-2.5 font-bold text-slate-600">Purchase Date</th>
                          <th className="px-4 py-2.5 font-bold text-slate-600">GeM Invoice Reference</th>
                          <th className="px-4 py-2.5 font-bold text-slate-600">Warranty Expiry</th>
                          <th className="px-4 py-2.5 font-bold text-slate-600 text-right">Purchase Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {vendor.assets_purchased.map((asset) => (
                          <tr key={asset.asset_id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-[#1F4E79]">
                              #{asset.asset_id}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {asset.asset_name}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {asset.purchase_date}
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                              {asset.invoice_ref}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {asset.warranty_expiry}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900">
                              ₹{asset.cost.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
