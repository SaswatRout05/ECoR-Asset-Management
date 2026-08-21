/**
 * QR Scanner — Live camera viewfinder placeholder with scan UI.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  QrCode,
  Camera,
  Flashlight,
  RotateCcw,
  ChevronRight,
  ScanLine,
  CheckCircle2,
} from 'lucide-react';

export default function QRScanner() {
  const [scanning, setScanning] = useState(false);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500 mb-4">
        <Link to="/dashboard" className="hover:text-[#1F4E79] transition-colors no-underline text-slate-500">Dashboard</Link>
        <ChevronRight size={14} className="text-slate-400" />
        <span className="text-slate-700 font-medium">QR Code Scanner</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#1F4E79]/10 flex items-center justify-center">
          <QrCode size={22} className="text-[#1F4E79]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">QR Code Scanner</h1>
          <p className="text-sm text-slate-500">Scan asset QR codes for instant lookup</p>
        </div>
      </div>

      {/* Scanner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#7B1113] via-[#1F4E79] to-[#D4AF37]"></div>

        <div className="p-8">
          {/* Viewfinder */}
          <div className="relative w-full max-w-md mx-auto aspect-square bg-slate-900 rounded-2xl overflow-hidden mb-6">
            {/* Corner markers */}
            <div className="absolute top-4 left-4 w-12 h-12 border-t-3 border-l-3 border-amber-400 rounded-tl-lg"></div>
            <div className="absolute top-4 right-4 w-12 h-12 border-t-3 border-r-3 border-amber-400 rounded-tr-lg"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-3 border-l-3 border-amber-400 rounded-bl-lg"></div>
            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-3 border-r-3 border-amber-400 rounded-br-lg"></div>

            {/* Scanning line */}
            {scanning && (
              <div className="absolute inset-x-8 top-8 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce"></div>
            )}

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
              {scanning ? (
                <>
                  <ScanLine size={48} className="text-emerald-400 animate-pulse mb-3" />
                  <span className="text-sm font-medium text-emerald-400">Scanning...</span>
                </>
              ) : (
                <>
                  <Camera size={48} className="mb-3 text-white/30" />
                  <span className="text-sm">Camera viewfinder</span>
                  <span className="text-xs text-white/40 mt-1">Position QR code within the frame</span>
                </>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setScanning(!scanning)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer
                ${scanning
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30'
                  : 'bg-[#1F4E79] text-white hover:bg-[#163B5C] shadow-lg shadow-[#1F4E79]/30'
                }
              `}
            >
              {scanning ? (
                <>
                  <RotateCcw size={16} />
                  Stop Scanning
                </>
              ) : (
                <>
                  <Camera size={16} />
                  Start Scan
                </>
              )}
            </button>
            <button className="p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer" title="Toggle flashlight">
              <Flashlight size={18} />
            </button>
          </div>

          {/* Recent Scans */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Recent Scans</h3>
            <div className="space-y-2">
              {[
                { id: 'A-0034', name: 'Dell Latitude 5520', time: '2 min ago' },
                { id: 'A-0112', name: 'HP LaserJet Pro MFP', time: '15 min ago' },
              ].map((scan) => (
                <div key={scan.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <div>
                      <span className="text-sm font-medium text-slate-800">{scan.name}</span>
                      <span className="text-xs text-slate-400 ml-2">#{scan.id}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{scan.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
