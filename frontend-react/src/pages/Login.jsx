/**
 * Login Page — Clean, minimal split-screen design.
 * Stripped of demo credentials, government slogans, and intranet tags.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import Masthead from '../components/Masthead';
import {
  Shield,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Bell,
  Clock,
  AlertTriangle,
  ChevronRight,
  Lock,
} from 'lucide-react';

const MOCK_CIRCULARS = [
  {
    id: 'CIRC-2026-087',
    title: 'Annual Physical Verification of Office Assets — FY 2026-27',
    date: '18 Aug 2026',
    priority: 'high',
  },
  {
    id: 'CIRC-2026-045',
    title: 'Migration to ECoR-AMP Digital Platform — Phase II Rollout',
    date: '12 Aug 2026',
    priority: 'normal',
  },
  {
    id: 'CIRC-2026-032',
    title: 'Revised Depreciation Norms for IT Equipment (Computer & Peripherals)',
    date: '05 Aug 2026',
    priority: 'normal',
  },
  {
    id: 'CIRC-2026-029',
    title: 'QR Code Tagging Compliance — Deadline Extension to 30 Sept 2026',
    date: '28 Jul 2026',
    priority: 'high',
  },
];

export default function Login() {
  const [activeTab, setActiveTab] = useState('admin');
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAppStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emp_id: empId.trim(),
          username: empId.trim(),
          password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Authentication failed');
      }

      const data = await res.json();
      login({
        token: data.access_token,
        role: data.role,
        fullName: data.full_name,
        empId: data.emp_id || empId.trim(),
      });

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F0F2F5]">
      <Masthead />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* ════ LEFT PANEL — Clean Navy Branding + Circulars ════ */}
        <div className="lg:w-[55%] bg-gradient-to-br from-[#0B1A30] via-[#0F2440] to-[#163B5C] text-white p-8 lg:p-12 flex flex-col justify-center relative overflow-hidden">
          {/* Decorative subtle background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#1F4E79]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#7B1113]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative z-10 max-w-lg mx-auto lg:mx-0">
            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-3">
              Asset Management
              <br />
              <span className="text-amber-400">Platform</span>
            </h1>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm font-bold px-3 py-1 rounded-lg bg-[#7B1113] text-white border border-[#7B1113]/60 shadow-xs">
                ECoR-AMP
              </span>
              <span className="text-xs text-slate-400">v2.0</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Digital platform for lifecycle tracking, depreciation modeling, and asset maintenance across all divisions.
            </p>

            {/* ── Circulars ── */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bell size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider">
                  Latest Circulars &amp; Notices
                </h3>
              </div>

              <div className="space-y-3">
                {MOCK_CIRCULARS.map((circular) => (
                  <div
                    key={circular.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-default group"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                      circular.priority === 'high' ? 'bg-red-400' : 'bg-blue-400'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-amber-400/70">
                          {circular.id}
                        </span>
                        {circular.priority === 'high' && (
                          <AlertTriangle size={12} className="text-red-400" />
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed group-hover:text-white transition-colors">
                        {circular.title}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-500">
                        <Clock size={10} />
                        <span>{circular.date}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 mt-1 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ════ RIGHT PANEL — Clean Login Card ════ */}
        <div className="lg:w-[45%] flex items-center justify-center p-8 lg:p-12 bg-[#F0F2F5]">
          <div className="w-full max-w-md">
            {/* Card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-[#7B1113] via-[#1F4E79] to-[#D4AF37]"></div>

              <div className="p-8">
                {/* Title */}
                <div className="text-center mb-6">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#7B1113] to-[#5A0B0D] text-white flex items-center justify-center text-2xl shadow-md shadow-[#7B1113]/30 mb-4">
                    🚆
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Sign In</h2>
                  <p className="text-sm text-slate-500 mt-1">Access your ECoR-AMP account</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                      activeTab === 'admin'
                        ? 'bg-white text-[#7B1113] shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Shield size={14} />
                    ADMINISTRATOR
                  </button>
                  <button
                    onClick={() => setActiveTab('employee')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                      activeTab === 'employee'
                        ? 'bg-white text-[#1F4E79] shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <User size={14} />
                    EMPLOYEE
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-500 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {activeTab === 'admin' ? 'Admin Username' : 'Employee ID'}
                    </label>
                    <input
                      type="text"
                      value={empId}
                      onChange={(e) => setEmpId(e.target.value)}
                      placeholder={
                        activeTab === 'admin'
                          ? 'e.g. itadmin1 or auditor1'
                          : 'e.g. ECoR-C-1001 or custodian1'
                      }
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79] transition-all"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79] transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`
                      w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2
                      transition-all duration-200 cursor-pointer
                      ${loading
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-[#7B1113] hover:bg-[#5A0B0D] shadow-md shadow-[#7B1113]/30 hover:shadow-lg active:scale-[0.98]'
                      }
                    `}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Signing in…
                      </>
                    ) : (
                      <>
                        <Lock size={16} />
                        Sign In
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-[11px] text-slate-400 mt-6">
              ECoR-AMP Portal © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
