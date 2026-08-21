/**
 * Dashboard — Main overview with KPI metric cards, Recharts data visualizations,
 * Department-wise distribution chart, and Book Value over time Line Graph.
 */
import { useState } from 'react';
import {
  Package,
  CheckCircle2,
  IndianRupee,
  Wrench,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  Shield,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';

// ── Metric Cards Data ──────────────────────────────────────
const METRICS = [
  {
    label: 'Total Assets',
    value: '1,247',
    sub: '+23 this month',
    icon: Package,
    color: 'from-[#1F4E79] to-[#2E86C1]',
    trend: TrendingUp,
    trendColor: 'text-emerald-400',
  },
  {
    label: 'Active (In-Use)',
    value: '1,089',
    sub: '87.3% utilization',
    icon: CheckCircle2,
    color: 'from-emerald-600 to-emerald-500',
    trend: TrendingUp,
    trendColor: 'text-emerald-300',
  },
  {
    label: 'Total Valuation',
    value: '₹4.82 Cr',
    sub: 'Aggregate purchase cost',
    icon: IndianRupee,
    color: 'from-amber-600 to-amber-500',
    trend: TrendingUp,
    trendColor: 'text-amber-300',
  },
  {
    label: 'Under Repair',
    value: '34',
    sub: '2.7% of fleet',
    icon: Wrench,
    color: 'from-red-600 to-red-500',
    trend: TrendingDown,
    trendColor: 'text-red-300',
  },
];

// ── Department-Wise Distribution Chart Data ───────────────
const DEPARTMENT_DATA = [
  { department: 'IT Cell', count: 382, valuation: 14500000, active: 350, repair: 12 },
  { department: 'Civil Engg', count: 245, valuation: 11200000, active: 215, repair: 8 },
  { department: 'Electrical', count: 210, valuation: 9400000, active: 185, repair: 7 },
  { department: 'Mechanical', count: 168, valuation: 6800000, active: 152, repair: 4 },
  { department: 'S & T', count: 124, valuation: 5200000, active: 112, repair: 2 },
  { department: 'Operating', count: 72, valuation: 2400000, active: 68, repair: 1 },
  { department: 'Accounts', count: 46, valuation: 1700000, active: 44, repair: 0 },
];

const DEPT_COLORS = ['#1F4E79', '#2E86C1', '#7B1113', '#D4AF37', '#27AE60', '#8E44AD', '#E67E22'];

// ── Book Value Over Time (Depreciation / Trend) Data ──────
const BOOK_VALUE_TREND = [
  { month: 'Jan 2026', grossCost: 4.20, bookValue: 3.10, depreciation: 1.10 },
  { month: 'Feb 2026', grossCost: 4.35, bookValue: 3.18, depreciation: 1.17 },
  { month: 'Mar 2026', grossCost: 4.50, bookValue: 3.25, depreciation: 1.25 },
  { month: 'Apr 2026', grossCost: 4.55, bookValue: 3.22, depreciation: 1.33 },
  { month: 'May 2026', grossCost: 4.65, bookValue: 3.24, depreciation: 1.41 },
  { month: 'Jun 2026', grossCost: 4.70, bookValue: 3.21, depreciation: 1.49 },
  { month: 'Jul 2026', grossCost: 4.78, bookValue: 3.20, depreciation: 1.58 },
  { month: 'Aug 2026', grossCost: 4.82, bookValue: 3.16, depreciation: 1.66 },
];

const ALERTS = [
  { asset: 'Dell Latitude 5520 #A-0034', type: 'Warranty Expiring', days: 12, severity: 'warning' },
  { asset: 'HP LaserJet Pro #A-0112', type: 'AMC Renewal Due', days: 5, severity: 'danger' },
  { asset: 'Cisco IP Phone #A-0289', type: 'Warranty Expiring', days: 30, severity: 'info' },
];

export default function Dashboard() {
  const [deptChartType, setDeptChartType] = useState('bar'); // 'bar' | 'pie'

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard & Real-Time Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time asset telemetry, department allocations, and book value trends
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Overview
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend;
          return (
            <div
              key={metric.label}
              className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow group p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {metric.label}
                </span>
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center shadow-sm text-white`}
                >
                  <Icon size={20} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">{metric.value}</div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <TrendIcon size={13} className={metric.trendColor} />
                <span>{metric.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MAIN CHARTS SECTION (Recharts Visualizations) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ── Chart 1: Department-Wise Asset Distribution (Bar / Pie Chart) ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1F4E79]/10 flex items-center justify-center text-[#1F4E79]">
                <BarChart3 size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Department-Wise Asset Distribution
                </h2>
                <p className="text-[11px] text-slate-500">Total assets deployed across ECoR departments</p>
              </div>
            </div>

            {/* Toggle between Bar and Pie view */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setDeptChartType('bar')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  deptChartType === 'bar' ? 'bg-white text-[#1F4E79] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Bar
              </button>
              <button
                onClick={() => setDeptChartType('pie')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  deptChartType === 'pie' ? 'bg-white text-[#1F4E79] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pie
              </button>
            </div>
          </div>

          <div className="p-5 flex-1 min-h-[300px]">
            {deptChartType === 'bar' ? (
              <ResponsiveContainer width="100%" height={290}>
                <BarChart data={DEPARTMENT_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="department"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-800 space-y-1">
                            <div className="font-bold text-amber-300">{label}</div>
                            <div>Total Assets: <span className="font-bold">{data.count}</span></div>
                            <div>Active: <span className="text-emerald-400 font-bold">{data.active}</span> | In Repair: <span className="text-red-400 font-bold">{data.repair}</span></div>
                            <div>Valuation: <span className="text-blue-300 font-bold">₹{(data.valuation / 100000).toFixed(1)} Lakh</span></div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" fill="#1F4E79" radius={[6, 6, 0, 0]}>
                    {DEPARTMENT_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[290px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={DEPARTMENT_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="department"
                    >
                      {DEPARTMENT_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name, item) => [`${val} assets (₹${(item.payload.valuation / 100000).toFixed(1)}L)`, name]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ── Chart 2: Total Book Value & Depreciation Over Time (Line Graph) ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#7B1113]/10 flex items-center justify-center text-[#7B1113]">
                <LineChartIcon size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Total Book Value vs. Depreciation (SLM)
                </h2>
                <p className="text-[11px] text-slate-500">Historical acquisition vs. Straight-Line book value (₹ Crores)</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#1F4E79] border border-blue-100">
              FY 2026-27
            </span>
          </div>

          <div className="p-5 flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height={290}>
              <LineChart data={BOOK_VALUE_TREND} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `₹${val}Cr`} />
                <Tooltip
                  formatter={(value, name) => [`₹${value} Cr`, name]}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="grossCost"
                  name="Gross Historical Cost"
                  stroke="#1F4E79"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#1F4E79' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="bookValue"
                  name="Net Book Value"
                  stroke="#27AE60"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#27AE60' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="depreciation"
                  name="Accum. Depreciation"
                  stroke="#E74C3C"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#E74C3C' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── Bottom Section: Alerts & Compliance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Warranty / AMC Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              Warranty & AMC Alerts
            </h2>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
              {ALERTS.length} items
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {ALERTS.map((alert, idx) => (
              <div key={idx} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <div className="text-sm font-medium text-slate-800">{alert.asset}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        alert.severity === 'danger'
                          ? 'bg-red-100 text-red-700'
                          : alert.severity === 'warning'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {alert.type}
                    </span>
                    <span className="text-[11px] text-slate-400">{alert.days} days remaining</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-300" />
              </div>
            ))}
          </div>
        </div>

        {/* Auditor Priority Flags */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Shield size={16} className="text-[#7B1113]" />
              Auditor Priority Flags & TCO Alerts
            </h2>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">
              2 items
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="px-5 py-3.5 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-sm font-bold text-slate-800">Uneconomical Asset Flagged (TCO &gt; 50%)</span>
              </div>
              <p className="text-xs text-slate-500 ml-6 leading-relaxed">
                Canon IR-2525 Multi-function Printer (`#A-0056`) — Cumulative repair expenditures (₹98,500) have crossed 53.2% of purchase cost (₹1,85,000). Recommended for condemnation.
              </p>
            </div>
            <div className="px-5 py-3.5 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-amber-500" />
                <span className="text-sm font-bold text-slate-800">Pending Physical Verification</span>
              </div>
              <p className="text-xs text-slate-500 ml-6 leading-relaxed">
                12 assets deployed in BBS Building Block B (Room 203) pending custodian acknowledgment since June 2026.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
