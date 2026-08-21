/**
 * Sidebar — Collapsible navigation using Zustand-persisted state.
 * Uses useLocation() for active-state highlighting.
 */
import { useLocation, Link } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import {
  LayoutDashboard,
  QrCode,
  FileText,
  Bot,
  Package,
  Briefcase,
  Wrench,
  ClipboardList,
  RotateCcw,
  Users,
  Building2,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'QR Code Scanner', icon: QrCode, path: '/qr-scanner' },
      { label: 'Invoice OCR', icon: FileText, path: '/invoice-ocr' },
      { label: 'AI Assistant', icon: Bot, path: '/ai-assistant' },
    ],
  },
  {
    title: 'ASSETS',
    items: [
      { label: 'Assets Registry', icon: Package, path: '/assets/registry' },
      { label: 'My Assets', icon: Briefcase, path: '/assets/my-assets' },
    ],
  },
  {
    title: 'MAINTENANCE',
    items: [
      { label: 'Work Orders', icon: Wrench, path: '/maintenance/work-orders' },
    ],
  },
  {
    title: 'INVENTORY',
    items: [
      { label: 'Asset Assignment', icon: ClipboardList, path: '/inventory/allocation' },
      { label: 'Return Assets', icon: RotateCcw, path: '/inventory/return' },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { label: 'User Accounts', icon: Users, path: '/admin/users' },
      { label: 'Vendors Directory', icon: Building2, path: '/admin/vendors' },
      { label: 'Audit History', icon: ScrollText, path: '/admin/audit-logs' },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      { label: 'System Settings', icon: Settings, path: '/settings' },
    ],
  },
];

export default function Sidebar() {
  const { isCollapsed, toggleSidebar, fullName, role } = useAppStore();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      className={`
        h-full bg-[#0B1A30] text-slate-300 flex flex-col
        transition-all duration-300 ease-in-out overflow-hidden
        ${isCollapsed ? 'w-[68px]' : 'w-[260px]'}
      `}
    >
      {/* Brand + Toggle */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-slate-800">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-9 h-9 rounded-lg bg-[#7B1113] text-amber-300 font-bold flex items-center justify-center text-sm shrink-0 shadow-sm">
            ECoR
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h2 className="text-white font-bold tracking-wider text-sm leading-tight">
                ECoR-AMP
              </h2>
              <span className="text-[11px] text-amber-400 font-medium">
                Railway Portal
              </span>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Collapse sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Collapse toggle when collapsed */}
      {isCollapsed && (
        <button
          onClick={toggleSidebar}
          className="mx-auto my-2 p-1.5 rounded-md hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Expand sidebar"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2 space-y-1 sidebar-scrollbar">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-1">
            {!isCollapsed && (
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold px-4 py-1.5 select-none">
                {section.title}
              </div>
            )}
            {isCollapsed && (
              <div className="w-6 mx-auto my-2 border-t border-slate-700/60"></div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.label : undefined}
                  className={`
                    flex items-center gap-3 mx-2 rounded-lg text-sm font-medium
                    transition-all duration-200 group relative no-underline
                    ${isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'}
                    ${
                      active
                        ? 'bg-[#7B1113] text-white font-bold shadow-md shadow-[#7B1113]/30'
                        : 'text-slate-400 hover:bg-slate-700/40 hover:text-white'
                    }
                  `}
                >
                  <Icon
                    size={isCollapsed ? 20 : 18}
                    className={`shrink-0 transition-colors ${
                      active ? 'text-amber-300' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  {!isCollapsed && <span>{item.label}</span>}

                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <span className="
                      absolute left-full ml-2 px-2 py-1 rounded-md bg-slate-800 text-white text-xs font-medium
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible
                      transition-all duration-200 whitespace-nowrap z-50 pointer-events-none
                      shadow-lg border border-slate-700
                    ">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer — User Info */}
      <div className="border-t border-slate-800 p-3">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-bold flex items-center justify-center text-xs shrink-0">
            {fullName ? fullName.charAt(0).toUpperCase() : '?'}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <div className="text-white font-semibold text-xs truncate">
                {fullName || 'Unknown User'}
              </div>
              <div className="text-[10px] text-amber-400 uppercase font-mono truncate">
                {role?.replace('_', ' ') || 'user'}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
