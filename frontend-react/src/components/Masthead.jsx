/**
 * Masthead — Official Government of India / Ministry of Railways banner.
 * Bilingual (Hindi + English) top bar matching the ECoR official template.
 */
export default function Masthead() {
  return (
    <header className="w-full bg-[#7B1113] text-white py-1 px-4 shadow-sm z-50 text-center tracking-wide text-xs font-semibold select-none flex items-center justify-between border-b border-amber-500/30">
      <div className="flex items-center gap-2">
        <span className="text-amber-400">🏛️</span>
        <span className="hidden sm:inline text-amber-100">सत्यमेव जयते</span>
      </div>
      <div className="text-center font-medium leading-tight">
        <span className="font-bold text-amber-200">
          भारत सरकार • GOVERNMENT OF INDIA
        </span>
        <span className="mx-2 text-amber-400/70">|</span>
        <span>रेल मंत्रालय • MINISTRY OF RAILWAYS</span>
        <span className="mx-2 text-amber-400/70">|</span>
        <span className="text-amber-200 font-semibold">
          पूर्व तट रेलवे • EAST COAST RAILWAY
        </span>
      </div>
      <div className="text-right text-[11px] text-amber-200 hidden md:flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>SECURE INTRANET</span>
      </div>
    </header>
  );
}
