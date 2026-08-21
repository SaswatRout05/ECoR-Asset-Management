/**
 * PlaceholderPage — Reusable "Coming Soon" component for unimplemented routes.
 * Renders a page header, breadcrumb trail, and styled placeholder card.
 */
import { ChevronRight, Construction } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PlaceholderPage({
  title,
  breadcrumbs = [],
  icon: Icon = Construction,
  description = 'This module is under active development and will be available soon.',
}) {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500 mb-4">
        <Link to="/dashboard" className="hover:text-[#1F4E79] transition-colors no-underline text-slate-500">
          Dashboard
        </Link>
        {breadcrumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <ChevronRight size={14} className="text-slate-400" />
            {crumb.path ? (
              <Link to={crumb.path} className="hover:text-[#1F4E79] transition-colors no-underline text-slate-500">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-slate-700 font-medium">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#1F4E79]/10 flex items-center justify-center">
          <Icon size={22} className="text-[#1F4E79]" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      </div>

      {/* Coming Soon Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Decorative gradient bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#7B1113] via-[#1F4E79] to-[#D4AF37]"></div>

        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          {/* Animated icon */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1F4E79]/10 to-[#7B1113]/10 flex items-center justify-center mb-6 animate-pulse">
            <Icon size={36} className="text-[#1F4E79]" />
          </div>

          <h2 className="text-xl font-bold text-slate-800 mb-2">Coming Soon</h2>
          <p className="text-sm text-slate-500 max-w-md mb-8">{description}</p>

          {/* Skeleton table preview */}
          <div className="w-full max-w-lg space-y-3">
            <div className="h-10 bg-slate-100 rounded-lg animate-pulse"></div>
            <div className="h-8 bg-slate-50 rounded-lg animate-pulse delay-75"></div>
            <div className="h-8 bg-slate-50 rounded-lg animate-pulse delay-150"></div>
            <div className="h-8 bg-slate-50 rounded-lg animate-pulse delay-200"></div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
            <Construction size={14} />
            <span>Under active development</span>
          </div>
        </div>
      </div>
    </div>
  );
}
