/**
 * Masthead — Clean, minimal top branding bar.
 * Stripped of government/intranet badges and clutter.
 */
export default function Masthead() {
  return (
    <header className="w-full bg-[#7B1113] text-white py-1.5 px-4 sm:px-6 shadow-xs z-50 select-none flex items-center justify-between text-xs font-medium border-b border-amber-500/20">
      <div className="flex items-center gap-2">
        <span className="font-bold text-amber-300">East Coast Railway</span>
        <span className="text-amber-400/50">•</span>
        <span className="text-slate-100">Asset Management Platform (ECoR-AMP)</span>
      </div>
      <div className="text-right text-[11px] text-amber-200/80 hidden sm:flex items-center gap-2">
        <span>Bhubaneswar Zonal HQ</span>
      </div>
    </header>
  );
}
