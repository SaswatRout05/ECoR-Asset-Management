/**
 * User Accounts Administration (`/admin/users`)
 * Manage portal users, roles, and authorization status.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ChevronRight,
  Search,
  Plus,
  Shield,
  CheckCircle2,
  XCircle,
  UserCheck,
  Edit,
  Lock,
} from 'lucide-react';

const MOCK_USERS = [
  { id: 1, username: 'itadmin1', full_name: 'Priya Sharma', role: 'it_admin', emp_id: 'ECoR-IT-2001', is_active: true, created_at: '2025-01-01' },
  { id: 2, username: 'custodian1', full_name: 'Rajesh Kumar Panda', role: 'custodian', emp_id: 'ECoR-C-1001', is_active: true, created_at: '2025-01-05' },
  { id: 3, username: 'auditor1', full_name: 'Amit Mohanty', role: 'auditor', emp_id: 'ECoR-A-3001', is_active: true, created_at: '2025-01-10' },
  { id: 4, username: 'custodian2', full_name: 'Suresh Chandra Mishra', role: 'custodian', emp_id: 'ECoR-C-1004', is_active: true, created_at: '2025-02-15' },
  { id: 5, username: 'custodian3', full_name: 'Meena Das', role: 'custodian', emp_id: 'ECoR-C-1025', is_active: true, created_at: '2025-03-01' },
];

export default function UserAdmin() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_USERS.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.emp_id.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

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
        <span className="text-slate-700 font-medium">User Accounts</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1F4E79]/10 flex items-center justify-center text-[#1F4E79]">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">User Administration</h1>
            <p className="text-sm text-slate-500">Manage user accounts, RBAC roles, and authorization status</p>
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#7B1113] text-white rounded-xl text-sm font-bold hover:bg-[#5A0B0D] transition-colors shadow-sm cursor-pointer self-start sm:self-auto">
          <Plus size={16} />
          <span>Add New User</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name, employee ID, or username..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee ID</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Role</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-900 font-bold flex items-center justify-center text-xs">
                        {user.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">{user.full_name}</div>
                        <div className="text-xs text-slate-400 font-mono">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-[#1F4E79]">
                    {user.emp_id}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-[#1F4E79] border border-blue-100 uppercase">
                      <Shield size={12} />
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 size={12} />
                      Active
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#1F4E79] transition-colors cursor-pointer" title="Edit Permissions">
                        <Edit size={14} />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer" title="Reset Password">
                        <Lock size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
