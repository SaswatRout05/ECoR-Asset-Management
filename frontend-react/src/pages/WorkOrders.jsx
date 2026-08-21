/**
 * Maintenance Page (`/maintenance/work-orders`)
 * Filter and display ONLY assets where asset_status === 'In Repair'.
 * Includes columns for Reported Date and Issue Description.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench,
  ChevronRight,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  Download,
  IndianRupee,
  Eye,
  FileText,
  UserCheck,
} from 'lucide-react';

const MOCK_REPAIR_ASSETS = [
  {
    asset_id: 'A-0056',
    asset_name: 'Canon IR-2525 Multi-Function Printer',
    category: 'Office Equipment',
    asset_status: 'In Repair',
    operational_status: 'Under Repair',
    reported_date: '2026-08-10',
    issue_description: 'Paper pickup roller failure and persistent error code E00024-0000 on main board.',
    estimated_cost: 14500,
    technician: 'East Coast Canon Services',
    priority: 'High',
    location: 'Bhubaneswar HQ, Room 105',
    days_open: 11,
  },
  {
    asset_id: 'A-0104',
    asset_name: 'Dell OptiPlex 7090 Desktop',
    category: 'IT Equipment',
    asset_status: 'In Repair',
    operational_status: 'Under Repair',
    reported_date: '2026-08-14',
    issue_description: 'SMPS Power Supply unit burnt out following substation power surge. No POST display.',
    estimated_cost: 4200,
    technician: 'ECoR IT Hardware Cell',
    priority: 'Critical',
    location: 'Operating Dept, Room 204',
    days_open: 7,
  },
  {
    asset_id: 'A-0142',
    asset_name: 'Voltas 1.5T Split Air Conditioner',
    category: 'Electrical',
    asset_status: 'In Repair',
    operational_status: 'Under Repair',
    reported_date: '2026-08-16',
    issue_description: 'Compressor refrigerant gas leakage (R32) and high vibration during cooling cycle.',
    estimated_cost: 6800,
    technician: 'Voltas Authorised Service Center',
    priority: 'Medium',
    location: 'Divisional Conference Hall',
    days_open: 5,
  },
  {
    asset_id: 'A-0198',
    asset_name: 'HP LaserJet Pro M404dn',
    category: 'IT Equipment',
    asset_status: 'In Repair',
    operational_status: 'Under Repair',
    reported_date: '2026-08-18',
    issue_description: 'Fuser unit worn out, producing repeated vertical toner smudges across printouts.',
    estimated_cost: 3500,
    technician: 'HP Care Logistics',
    priority: 'Low',
    location: 'Personnel Branch, Room 112',
    days_open: 3,
  },
  {
    asset_id: 'A-0245',
    asset_name: 'Cisco SG350-28 Managed Switch',
    category: 'IT Equipment',
    asset_status: 'In Repair',
    operational_status: 'Under Repair',
    reported_date: '2026-08-19',
    issue_description: 'PoE port controller module unresponsive; 8 ports not providing power to VoIP phones.',
    estimated_cost: 18000,
    technician: 'S&T Railway Telecom Team',
    priority: 'Critical',
    location: 'Server Room Rack 2',
    days_open: 2,
  },
];

export default function WorkOrders() {
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Hard filter: ONLY assets where asset_status === 'In Repair'
  const inRepairAssets = MOCK_REPAIR_ASSETS.filter(
    (a) => a.asset_status === 'In Repair'
  );

  const filtered = inRepairAssets.filter((a) => {
    const matchesSearch =
      a.asset_name.toLowerCase().includes(search.toLowerCase()) ||
      a.asset_id.toLowerCase().includes(search.toLowerCase()) ||
      a.issue_description.toLowerCase().includes(search.toLowerCase()) ||
      a.technician.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = priorityFilter === 'ALL' || a.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const totalEstCost = inRepairAssets.reduce((sum, a) => sum + a.estimated_cost, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link to="/dashboard" className="hover:text-[#1F4E79] transition-colors no-underline text-slate-500">
          Dashboard
        </Link>
        <ChevronRight size={14} className="text-slate-400" />
        <span className="text-slate-500">Maintenance</span>
        <ChevronRight size={14} className="text-slate-400" />
        <span className="text-slate-700 font-medium">Work Orders</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600">
            <Wrench size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Maintenance & Work Orders</h1>
            <p className="text-sm text-slate-500">
              Active workshop repair ticketing and asset breakdown tracking (<code>asset_status === 'In Repair'</code>)
            </p>
          </div>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-amber-50 rounded-xl border border-amber-200 text-xs">
            <span className="text-amber-700 font-bold block">{inRepairAssets.length} Active Repairs</span>
            <span className="text-amber-600/80 text-[10px]">Total in Workshop</span>
          </div>
          <div className="px-3.5 py-2 bg-blue-50 rounded-xl border border-blue-200 text-xs">
            <span className="text-[#1F4E79] font-bold block">₹{totalEstCost.toLocaleString('en-IN')}</span>
            <span className="text-blue-600/80 text-[10px]">Est. Repair Cost</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[260px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Asset ID, issue description, technician..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                priorityFilter === p
                  ? 'bg-[#1F4E79] text-white shadow-sm'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Table displaying ONLY assets in repair with Reported Date & Issue Description */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Asset Details</th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Reported Date</th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5 min-w-[320px]">
                  Issue Description
                </th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Assigned Service Provider</th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5 text-right">Est. Cost</th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5 text-center">Status</th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.asset_id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Asset Details */}
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        <Wrench size={14} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{item.asset_name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs font-semibold text-[#1F4E79]">#{item.asset_id}</span>
                          <span className="text-[11px] text-slate-400">• {item.category}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <span>📍 {item.location}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Reported Date */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{item.reported_date}</span>
                    </div>
                    <div className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
                      <Clock size={11} />
                      <span>{item.days_open} days in repair</span>
                    </div>
                  </td>

                  {/* Issue Description */}
                  <td className="px-5 py-4">
                    <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 text-xs text-slate-800 leading-relaxed font-medium">
                      {item.issue_description}
                    </div>
                  </td>

                  {/* Technician / Vendor */}
                  <td className="px-5 py-4">
                    <div className="text-xs font-semibold text-slate-800">{item.technician}</div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1.5 ${
                        item.priority === 'Critical'
                          ? 'bg-red-100 text-red-700'
                          : item.priority === 'High'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      <AlertCircle size={10} />
                      {item.priority} Priority
                    </span>
                  </td>

                  {/* Estimated Cost */}
                  <td className="px-5 py-4 text-right">
                    <div className="text-sm font-bold text-slate-900">
                      ₹{item.estimated_cost.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-slate-400">GST incl.</span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      In Repair
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-center">
                    <button
                      className="px-3 py-1.5 rounded-lg bg-[#1F4E79] text-white hover:bg-[#163B5C] text-xs font-semibold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1"
                      title="Log repair completion"
                    >
                      <CheckCircle2 size={13} />
                      Complete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong>{filtered.length}</strong> active repair tickets
          </span>
          <span>Compliance SLA: 14 business days turnaround</span>
        </div>
      </div>
    </div>
  );
}
