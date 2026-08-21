/**
 * My Assets — Employee-specific view of assigned assets.
 */
import { Link } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import {
  Briefcase,
  ChevronRight,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Calendar,
} from 'lucide-react';

const MY_ASSETS = [
  {
    id: 'A-0034',
    name: 'Dell Latitude 5520 Laptop',
    category: 'IT Equipment',
    status: 'In-Use',
    location: 'Room 201, Desk 3',
    assignedDate: '15 Jan 2025',
    warrantyExpiry: '14 Jan 2028',
    warrantyOk: true,
  },
  {
    id: 'A-0289',
    name: 'Cisco IP Phone 7841',
    category: 'IT Equipment',
    status: 'In-Use',
    location: 'Room 201, Desk 3',
    assignedDate: '20 Mar 2025',
    warrantyExpiry: '19 Mar 2027',
    warrantyOk: true,
  },
  {
    id: 'A-0341',
    name: 'HP 24" Monitor P24v G4',
    category: 'IT Equipment',
    status: 'In-Use',
    location: 'Room 201, Desk 3',
    assignedDate: '15 Jan 2025',
    warrantyExpiry: '14 Jan 2026',
    warrantyOk: false,
  },
  {
    id: 'A-0402',
    name: 'Godrej Executive Chair',
    category: 'Furniture',
    status: 'In-Use',
    location: 'Room 201',
    assignedDate: '01 Apr 2024',
    warrantyExpiry: '—',
    warrantyOk: true,
  },
];

export default function MyAssets() {
  const fullName = useAppStore((s) => s.fullName);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500 mb-4">
        <Link to="/dashboard" className="hover:text-[#1F4E79] transition-colors no-underline text-slate-500">Dashboard</Link>
        <ChevronRight size={14} className="text-slate-400" />
        <Link to="/assets/registry" className="hover:text-[#1F4E79] transition-colors no-underline text-slate-500">Assets</Link>
        <ChevronRight size={14} className="text-slate-400" />
        <span className="text-slate-700 font-medium">My Assets</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Briefcase size={22} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Assets</h1>
            <p className="text-sm text-slate-500">
              Assets assigned to <span className="font-medium text-slate-700">{fullName || 'you'}</span>
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
          {MY_ASSETS.length} items assigned
        </div>
      </div>

      {/* Asset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MY_ASSETS.map((asset) => (
          <div
            key={asset.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group"
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-[#1F4E79]">#{asset.id}</span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">{asset.name}</h3>
                  <span className="text-xs text-slate-500">{asset.category}</span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={10} />
                  {asset.status}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <MapPin size={12} className="text-slate-400" />
                  <span>{asset.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-slate-400" />
                  <span>Assigned: {asset.assignedDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  {asset.warrantyOk ? (
                    <CheckCircle2 size={12} className="text-emerald-500" />
                  ) : (
                    <AlertTriangle size={12} className="text-red-500" />
                  )}
                  <span className={asset.warrantyOk ? '' : 'text-red-600 font-medium'}>
                    Warranty: {asset.warrantyExpiry}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
              <button className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-[#1F4E79] transition-colors cursor-pointer">
                <QrCode size={12} />
                View QR
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
