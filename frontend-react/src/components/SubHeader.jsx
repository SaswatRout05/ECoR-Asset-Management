/**
 * SubHeader — White branding bar with ECoR-AMP title, date, and user actions.
 */
import { LogOut } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

export default function SubHeader() {
  const { fullName, role, logout } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="w-full bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-xs sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#7B1113] text-white flex items-center justify-center font-bold text-xl shadow-sm ring-2 ring-amber-400/60">
          🚆
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
            <span>Asset Management Platform</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-[#1F4E79] border border-blue-200">
              ECoR-AMP
            </span>
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">
            Headquarter Office, Chandrasekharpur, Bhubaneswar — 751017
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-slate-500 hidden sm:inline">{today}</span>
        {fullName && (
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 border-r border-slate-200 pr-4">
            <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-900 font-bold flex items-center justify-center text-xs">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-slate-800">{fullName}</div>
              <div className="text-[10px] text-amber-600 uppercase font-mono">{role?.replace('_', ' ')}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200 cursor-pointer"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </div>
  );
}
