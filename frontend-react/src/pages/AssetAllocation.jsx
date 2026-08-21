/**
 * Asset Assignment / Allocation Page (`/inventory/allocation`)
 * Displays asset custody tracking.
 * MUST show: Branch, Location, and Department columns where asset is deployed.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  ChevronRight,
  Search,
  Building,
  MapPin,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Filter,
  Download,
  Eye,
  ArrowRightLeft,
  UserCheck,
} from 'lucide-react';

const MOCK_ALLOCATIONS = [
  {
    allocation_id: 'AL-1001',
    asset_id: 'A-0034',
    asset_name: 'Dell Latitude 5520 Laptop',
    category: 'IT Equipment',
    custodian_name: 'Rajesh Kumar Panda',
    custodian_emp_id: 'ECoR-C-1001',
    branch: 'HQ Bhubaneswar',
    location: 'Rail Sadan, Block-B, Room 201',
    department: 'IT Cell',
    allocation_date: '2025-01-15',
    is_acknowledged: true,
  },
  {
    allocation_id: 'AL-1002',
    asset_id: 'A-0089',
    asset_name: 'Godrej Steel Almirah (6x3 ft)',
    category: 'Furniture',
    custodian_name: 'Suresh Chandra Mishra',
    custodian_emp_id: 'ECoR-C-1004',
    branch: 'Khurda Road Division',
    location: 'DRM Office Complex, Room 108',
    department: 'Civil Engineering',
    allocation_date: '2024-11-20',
    is_acknowledged: true,
  },
  {
    allocation_id: 'AL-1003',
    asset_id: 'A-0112',
    asset_name: 'HP LaserJet Pro MFP M428fdw',
    category: 'Office Equipment',
    custodian_name: 'Priya Sharma',
    custodian_emp_id: 'ECoR-IT-2001',
    branch: 'HQ Bhubaneswar',
    location: 'Accounts Building, 3rd Floor, Room 302',
    department: 'Accounts & Finance',
    allocation_date: '2025-04-10',
    is_acknowledged: true,
  },
  {
    allocation_id: 'AL-1004',
    asset_id: 'A-0167',
    asset_name: 'Voltas 2.0T Cassette AC',
    category: 'Electrical',
    custodian_name: 'Manoj Tripathy',
    custodian_emp_id: 'ECoR-C-1012',
    branch: 'Waltair Division',
    location: 'Station Main Building, Concourse Control',
    department: 'Electrical / Power',
    allocation_date: '2025-06-02',
    is_acknowledged: false,
  },
  {
    allocation_id: 'AL-1005',
    asset_id: 'A-0220',
    asset_name: 'Cisco IP Phone 7841 VoIP',
    category: 'IT Equipment',
    custodian_name: 'Meena Das',
    custodian_emp_id: 'ECoR-C-1025',
    branch: 'Sambalpur Division',
    location: 'Divisional Control Office, Desk 14',
    department: 'Signal & Telecom (S&T)',
    allocation_date: '2025-08-12',
    is_acknowledged: true,
  },
  {
    allocation_id: 'AL-1006',
    asset_id: 'A-0289',
    asset_name: 'Lenovo ThinkCentre M70q Tiny',
    category: 'IT Equipment',
    custodian_name: 'Amit Mohanty',
    custodian_emp_id: 'ECoR-A-3001',
    branch: 'HQ Bhubaneswar',
    location: 'Auditor General Suite, Room 410',
    department: 'Operating & Traffic',
    allocation_date: '2026-02-18',
    is_acknowledged: false,
  },
];

export default function AssetAllocation() {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const departments = ['ALL', 'IT Cell', 'Civil Engineering', 'Accounts & Finance', 'Electrical / Power', 'Signal & Telecom (S&T)', 'Operating & Traffic'];

  const filtered = MOCK_ALLOCATIONS.filter((item) => {
    const matchesSearch =
      item.asset_name.toLowerCase().includes(search.toLowerCase()) ||
      item.asset_id.toLowerCase().includes(search.toLowerCase()) ||
      item.custodian_name.toLowerCase().includes(search.toLowerCase()) ||
      item.branch.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase()) ||
      item.department.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || item.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link to="/dashboard" className="hover:text-[#1F4E79] transition-colors no-underline text-slate-500">
          Dashboard
        </Link>
        <ChevronRight size={14} className="text-slate-400" />
        <span className="text-slate-500">Inventory</span>
        <ChevronRight size={14} className="text-slate-400" />
        <span className="text-slate-700 font-medium">Asset Assignment</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1F4E79]/10 flex items-center justify-center text-[#1F4E79]">
            <ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Asset Assignment & Custody</h1>
            <p className="text-sm text-slate-500">
              Departmental deployment records with Branch, Location, and Custodian details
            </p>
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#7B1113] text-white rounded-xl text-sm font-bold hover:bg-[#5A0B0D] transition-colors shadow-sm cursor-pointer self-start sm:self-auto">
          <Plus size={16} />
          <span>New Allocation</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[280px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Branch, Location, Department, Custodian, or Asset ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'ALL' ? 'All Departments' : d}
              </option>
            ))}
          </select>

          <button className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Allocation Table containing Branch, Location, and Department columns */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Asset Details</th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Custodian</th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Branch</th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Location / Room</th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Department</th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Allocated On</th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5 text-center">Status</th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.allocation_id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Asset Details */}
                  <td className="px-5 py-4">
                    <div className="font-bold text-sm text-slate-900">{item.asset_name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs font-semibold text-[#1F4E79]">#{item.asset_id}</span>
                      <span className="text-[11px] text-slate-400">• {item.category}</span>
                    </div>
                  </td>

                  {/* Custodian */}
                  <td className="px-5 py-4">
                    <div className="text-xs font-bold text-slate-800">{item.custodian_name}</div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">ID: {item.custodian_emp_id}</div>
                  </td>

                  {/* Branch */}
                  <td className="px-5 py-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-[#1F4E79] text-xs font-semibold border border-blue-100">
                      <Building size={12} />
                      <span>{item.branch}</span>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                      <MapPin size={13} className="text-red-500 shrink-0" />
                      <span>{item.location}</span>
                    </div>
                  </td>

                  {/* Department */}
                  <td className="px-5 py-4">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-100">
                      <Briefcase size={12} />
                      <span>{item.department}</span>
                    </div>
                  </td>

                  {/* Allocation Date */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{item.allocation_date}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 text-center">
                    {item.is_acknowledged ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={11} />
                        Acknowledged
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock size={11} />
                        Pending Ack
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#1F4E79] transition-colors cursor-pointer" title="Transfer Asset">
                        <ArrowRightLeft size={14} />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer" title="View Details">
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing <strong>{filtered.length}</strong> allocated assets</span>
          <span>East Coast Railway Office Asset Management</span>
        </div>
      </div>
    </div>
  );
}
