/**
 * System Settings — Simple UI card containing ONLY Theme Toggle & Font Size Selector.
 * Preferences are saved and applied globally via Zustand & LocalStorage.
 */
import { Link } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import {
  Settings,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Type,
  Check,
} from 'lucide-react';

export default function SystemSettings() {
  const { theme, fontSize, setTheme, setFontSize } = useAppStore();

  const THEME_OPTIONS = [
    { value: 'light', label: 'Light', icon: Sun, desc: 'Clean white appearance' },
    { value: 'dark', label: 'Dark', icon: Moon, desc: 'Rail navy dark mode' },
    { value: 'system', label: 'System', icon: Monitor, desc: 'Sync with OS preference' },
  ];

  const FONT_SIZE_OPTIONS = [
    { value: 'small', label: 'Small', sizeClass: 'text-xs', preview: '13px font scale' },
    { value: 'medium', label: 'Medium', sizeClass: 'text-sm', preview: '14px standard scale' },
    { value: 'large', label: 'Large', sizeClass: 'text-base', preview: '16px comfortable scale' },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500 mb-4">
        <Link to="/dashboard" className="hover:text-[#1F4E79] transition-colors no-underline text-slate-500">
          Dashboard
        </Link>
        <ChevronRight size={14} className="text-slate-400" />
        <span className="text-slate-700 font-medium">System Settings</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#1F4E79]/10 flex items-center justify-center">
          <Settings size={22} className="text-[#1F4E79]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-sm text-slate-500">Customize interface appearance and font preferences</p>
        </div>
      </div>

      {/* Settings Card containing ONLY two options */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#7B1113] via-[#1F4E79] to-[#D4AF37]"></div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* ── Option 1: Theme Toggle (Light / Dark / System) ── */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sun size={18} className="text-[#1F4E79]" />
              <h2 className="text-base font-bold text-slate-900">Theme Preference</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Select your interface color scheme (Light, Dark, or System Sync).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`
                      relative p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer
                      ${
                        isSelected
                          ? 'border-[#1F4E79] bg-[#1F4E79]/5 ring-2 ring-[#1F4E79]/20'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 hover:border-slate-300'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-[#1F4E79] text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#1F4E79] text-white flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-sm text-slate-800">{opt.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100"></div>

          {/* ── Option 2: Font Size Selector (Small / Medium / Large) ── */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Type size={18} className="text-[#1F4E79]" />
              <h2 className="text-base font-bold text-slate-900">Font Size Scaling</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Adjust typography size for comfortable reading across all portal tables and records.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {FONT_SIZE_OPTIONS.map((opt) => {
                const isSelected = (fontSize || 'medium') === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFontSize(opt.value)}
                    className={`
                      relative p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer
                      ${
                        isSelected
                          ? 'border-[#1F4E79] bg-[#1F4E79]/5 ring-2 ring-[#1F4E79]/20'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 hover:border-slate-300'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-mono font-bold ${opt.sizeClass} text-[#1F4E79]`}>
                        Aa
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#1F4E79] text-white flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-sm text-slate-800">{opt.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{opt.preview}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer status */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Active Preferences: Theme (<strong>{theme}</strong>) • Font Size (<strong>{fontSize || 'medium'}</strong>)</span>
          <span className="text-emerald-600 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Saved to LocalStorage
          </span>
        </div>
      </div>
    </div>
  );
}
