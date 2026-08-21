/**
 * Audit History & Compliance Logs (`/admin/audit-logs`)
 * Displays chronological audit trails.
 * Details column MUST show specific Reason and exact Calculations executed.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ScrollText,
  ChevronRight,
  Search,
  ShieldAlert,
  Calculator,
  User,
  Calendar,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';

const MOCK_AUDIT_LOGS = [
  {
    log_id: 'LOG-2026-0891',
    timestamp: '2026-08-20 14:32:15',
    action_type: 'ASSET_CONDEMNATION',
    asset_id: 'A-0056',
    asset_name: 'Canon IR-2525 Multi-Function Printer',
    performed_by: 'Amit Mohanty (Auditor, ECoR-A-3001)',
    reason: 'Condemned due to severe water damage following roof seepage in Section Room 105; irreparable electronic main board corrosion.',
    calculations: 'TCO Uneconomical Ratio = (Cumulative Repair ₹98,500 / Historical Cost ₹1,85,000) = 53.24% (> 50% Threshold). Net Salvage Value assessed at ₹4,500.',
    status: 'Approved',
  },
  {
    log_id: 'LOG-2026-0884',
    timestamp: '2026-08-19 11:15:40',
    action_type: 'DEPRECIATION_RECOGNITION',
    asset_id: 'A-0034',
    asset_name: 'Dell Latitude 5520 Laptop',
    performed_by: 'System Batch Process (Depreciation Engine)',
    reason: 'Fiscal year straight-line depreciation scheduled posting for Q2 FY 2026-27.',
    calculations: 'SLM Calculation: Annual Dep = (Acquisition Cost ₹72,500 - Residual ₹0) / 5.0 Years = ₹14,500.00/yr. Monthly Run Rate = ₹1,208.33/mo. Book Value: ₹72,500 - ₹24,166.66 = ₹48,333.34.',
    status: 'Verified',
  },
  {
    log_id: 'LOG-2026-0872',
    timestamp: '2026-08-18 16:45:00',
    action_type: 'CUSTODIAL_TRANSFER',
    asset_id: 'A-0112',
    asset_name: 'HP LaserJet Pro MFP M428fdw',
    performed_by: 'Rajesh Kumar Panda (Custodian, ECoR-C-1001)',
    reason: 'Transferred due to departmental restructuring from Personnel Branch to Accounts & Finance Suite (Room 302).',
    calculations: 'Transfer Verification: Zero transit degradation. Re-allocation book value balance verified at ₹36,675.00 against General Ledger Account 410-08.',
    status: 'Acknowledged',
  },
  {
    log_id: 'LOG-2026-0865',
    timestamp: '2026-08-17 09:20:10',
    action_type: 'MAINTENANCE_TCO_OVERFLOW',
    asset_id: 'A-0104',
    asset_name: 'Dell OptiPlex 7090 Desktop',
    performed_by: 'Priya Sharma (IT Admin, ECoR-IT-2001)',
    reason: 'Emergency power surge repair; replacement of internal SMPS supply and surge suppressor bypass.',
    calculations: 'Post-Repair TCO Analysis: Baseline Cost ₹64,000 + Prior Repairs ₹12,000 + Current Invoice ₹4,200 = Cumulative TCO ₹80,200 (TCO/Cost Ratio = 25.31% < 50.00% safe limit).',
    status: 'Logged',
  },
  {
    log_id: 'LOG-2026-0850',
    timestamp: '2026-08-15 17:00:22',
    action_type: 'AUDITOR_PRIORITY_FLAG',
    asset_id: 'A-0341',
    asset_name: 'HP 24" Monitor P24v G4',
    performed_by: 'Amit Mohanty (Auditor, ECoR-A-3001)',
    reason: 'Marked with "High Priority for Replacement" due to expired warranty and failing backlight inverter circuit.',
    calculations: 'Remaining Life Assessment: Age 3.6 Years (72% expired). Replacement ROI estimate: New unit cost ₹9,500 vs repair quote ₹5,800 yields 38.9% cost efficiency.',
    status: 'Flagged',
  },
];

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const actionTypes = ['ALL', 'ASSET_CONDEMNATION', 'DEPRECIATION_RECOGNITION', 'CUSTODIAL_TRANSFER', 'MAINTENANCE_TCO_OVERFLOW', 'AUDITOR_PRIORITY_FLAG'];

  const filtered = MOCK_AUDIT_LOGS.filter((log) => {
    const matchesSearch =
      log.asset_id.toLowerCase().includes(search.toLowerCase()) ||
      log.asset_name.toLowerCase().includes(search.toLowerCase()) ||
      log.performed_by.toLowerCase().includes(search.toLowerCase()) ||
      log.reason.toLowerCase().includes(search.toLowerCase()) ||
      log.calculations.toLowerCase().includes(search.toLowerCase()) ||
      log.log_id.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'ALL' || log.action_type === actionFilter;
    return matchesSearch && matchesAction;
  });

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
        <span className="text-slate-700 font-medium">Compliance Audit Logs</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7B1113]/10 flex items-center justify-center text-[#7B1113]">
            <ScrollText size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Compliance Audit & Transaction History</h1>
            <p className="text-sm text-slate-500">
              Immutable audit trails showing specific Reason and exact Calculations executed
            </p>
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#1F4E79] text-white rounded-xl text-sm font-bold hover:bg-[#163B5C] transition-colors shadow-sm cursor-pointer self-start sm:self-auto">
          <Download size={16} />
          <span>Export Audit Dossier</span>
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
            placeholder="Search audit records, calculation formulas, reasons, or Asset IDs..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
          >
            {actionTypes.map((a) => (
              <option key={a} value={a}>
                {a === 'ALL' ? 'All Action Types' : a.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table with Expanded Details Column (Reason & Calculations) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5 w-48">Timestamp & Event</th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5 w-52">Target Asset</th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5 min-w-[420px]">
                  Expanded Details (Reason &amp; Calculations Executed)
                </th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5 w-48">Logged By</th>
                <th className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <tr key={log.log_id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Timestamp & Event */}
                  <td className="px-5 py-4 align-top">
                    <div className="font-mono text-xs font-bold text-slate-900">{log.log_id}</div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                      <Calendar size={11} className="text-slate-400" />
                      <span>{log.timestamp}</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200">
                      {log.action_type}
                    </span>
                  </td>

                  {/* Target Asset */}
                  <td className="px-5 py-4 align-top">
                    <div className="text-sm font-bold text-slate-900">{log.asset_name}</div>
                    <span className="font-mono text-xs font-semibold text-[#1F4E79] block mt-0.5">
                      #{log.asset_id}
                    </span>
                  </td>

                  {/* ── Expanded Details: Reason & Exact Calculations ── */}
                  <td className="px-5 py-4 align-top space-y-2">
                    {/* Reason */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7B1113]"></span>
                        <span>Reason for Action:</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {log.reason}
                      </p>
                    </div>

                    {/* Exact Calculations */}
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F4E79] mb-1">
                        <Calculator size={13} className="text-[#1F4E79]" />
                        <span>Calculations Executed:</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-mono bg-white/70 p-2 rounded-lg border border-blue-200/60">
                        {log.calculations}
                      </p>
                    </div>
                  </td>

                  {/* Logged By */}
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-start gap-1.5 text-xs font-semibold text-slate-800">
                      <User size={13} className="text-slate-400 mt-0.5 shrink-0" />
                      <span>{log.performed_by}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 align-top text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        log.status === 'Approved' || log.status === 'Verified'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : log.status === 'Flagged'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      <CheckCircle size={11} />
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing <strong>{filtered.length}</strong> immutable audit records</span>
          <span>Indian Railways Asset Verification Standard (IR-AVS)</span>
        </div>
      </div>
    </div>
  );
}
