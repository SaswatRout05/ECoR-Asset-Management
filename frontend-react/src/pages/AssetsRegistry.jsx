/**
 * Assets Registry — Table with search, filter, and Add Asset CTA.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Search,
  Plus,
  Filter,
  ChevronRight,
  Download,
  ChevronDown,
  Eye,
  Edit3,
  QrCode,
} from 'lucide-react';

const MOCK_ASSETS = [
  { id: 'A-0034', name: 'Dell Latitude 5520', category: 'IT Equipment', status: 'In-Use', custodian: 'Rajesh Kumar', location: 'Room 201', value: '₹72,500' },
  { id: 'A-0056', name: 'Canon IR-2525 Printer', category: 'IT Equipment', status: 'Under Repair', custodian: 'Suresh Patel', location: 'Room 105', value: '₹1,85,000' },
  { id: 'A-0112', name: 'HP LaserJet Pro MFP', category: 'IT Equipment', status: 'In-Use', custodian: 'Priya Sharma', location: 'Room 302', value: '₹48,900' },
  { id: 'A-0189', name: 'Godrej Steel Almirah', category: 'Furniture', status: 'In-Use', custodian: 'Anil Mishra', location: 'Room 108', value: '₹18,500' },
  { id: 'A-0201', name: 'Samsung Split AC 1.5T', category: 'Electrical', status: 'In Stock', custodian: '—', location: 'Store Room', value: '₹42,000' },
  { id: 'A-0289', name: 'Cisco IP Phone 7841', category: 'IT Equipment', status: 'In-Use', custodian: 'Meena Das', location: 'Room 201', value: '₹15,200' },
];

const STATUS_COLORS = {
  'In-Use': 'bg-emerald-100 text-emerald-700',
  'In Stock': 'bg-blue-100 text-blue-700',
  'Under Repair': 'bg-amber-100 text-amber-700',
  'Condemned': 'bg-red-100 text-red-700',
};

export default function AssetsRegistry() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_ASSETS.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.custodian.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500 mb-4">
        <Link to="/dashboard" className="hover:text-[#1F4E79] transition-colors no-underline text-slate-500">Dashboard</Link>
        <ChevronRight size={14} className="text-slate-400" />
        <span className="text-slate-700 font-medium">Assets Registry</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1F4E79]/10 flex items-center justify-center">
            <Package size={22} className="text-[#1F4E79]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Assets Registry</h1>
            <p className="text-sm text-slate-500">Centralized register of all office assets</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#7B1113] text-white rounded-xl text-sm font-bold hover:bg-[#5A0B0D] transition-colors shadow-lg shadow-[#7B1113]/20 cursor-pointer">
          <Plus size={16} />
          Add Asset
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4">
        <div className="p-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[250px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, or custodian..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
            <Filter size={14} />
            Filters
            <ChevronDown size={14} />
          </button>
          <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Asset ID</th>
                <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Name</th>
                <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Category</th>
                <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Custodian</th>
                <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Location</th>
                <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Value</th>
                <th className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-xs font-mono font-bold text-[#1F4E79]">{asset.id}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-medium text-slate-800">{asset.name}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-slate-500">{asset.category}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[asset.status]}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-slate-600">{asset.custodian}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-slate-500">{asset.location}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-sm font-medium text-slate-800">{asset.value}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#1F4E79] transition-colors cursor-pointer" title="View">
                        <Eye size={14} />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer" title="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer" title="QR Code">
                        <QrCode size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Table footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs text-slate-500">Showing {filtered.length} of {MOCK_ASSETS.length} assets</span>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1 text-xs rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">Previous</button>
            <button className="px-3 py-1 text-xs rounded bg-[#1F4E79] text-white font-bold cursor-pointer">1</button>
            <button className="px-3 py-1 text-xs rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
