/**
 * Invoice OCR — Drag-and-drop file upload zone with processing UI.
 */
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Upload,
  ChevronRight,
  File,
  X,
  CheckCircle2,
  Loader2,
  Eye,
} from 'lucide-react';

export default function InvoiceOCR() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === 'application/pdf'
    );
    if (droppedFiles.length > 0) {
      setFiles((prev) => [...prev, ...droppedFiles.map((f) => ({ file: f, status: 'pending' }))]);
    }
  }, []);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected.map((f) => ({ file: f, status: 'pending' }))]);
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const processFiles = () => {
    setProcessing(true);
    // Simulate processing
    setTimeout(() => {
      setFiles((prev) => prev.map((f) => ({ ...f, status: 'done' })));
      setProcessing(false);
    }, 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500 mb-4">
        <Link to="/dashboard" className="hover:text-[#1F4E79] transition-colors no-underline text-slate-500">Dashboard</Link>
        <ChevronRight size={14} className="text-slate-400" />
        <span className="text-slate-700 font-medium">Invoice OCR</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#1F4E79]/10 flex items-center justify-center">
          <FileText size={22} className="text-[#1F4E79]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoice OCR</h1>
          <p className="text-sm text-slate-500">Upload invoices for automatic data extraction</p>
        </div>
      </div>

      {/* Upload Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#7B1113] via-[#1F4E79] to-[#D4AF37]"></div>

        <div className="p-8">
          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-2xl p-12 text-center transition-all
              ${dragActive
                ? 'border-[#1F4E79] bg-[#1F4E79]/5'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/50'
              }
            `}
          >
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                dragActive ? 'bg-[#1F4E79]/10' : 'bg-slate-200/60'
              }`}>
                <Upload size={28} className={dragActive ? 'text-[#1F4E79]' : 'text-slate-400'} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                {dragActive ? 'Drop files here' : 'Upload Invoice PDFs'}
              </h3>
              <p className="text-sm text-slate-500">
                Drag and drop PDF files here, or click to browse
              </p>
              <span className="text-xs text-slate-400 mt-2">Supports: PDF files only</span>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-700">{files.length} file(s) selected</span>
                <button
                  onClick={processFiles}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1F4E79] text-white rounded-lg text-sm font-medium hover:bg-[#163B5C] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {processing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <Eye size={14} />
                      Extract Data
                    </>
                  )}
                </button>
              </div>
              {files.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    {item.status === 'done' ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : (
                      <File size={18} className="text-slate-400" />
                    )}
                    <div>
                      <span className="text-sm font-medium text-slate-800">{item.file.name}</span>
                      <span className="text-xs text-slate-400 ml-2">
                        {(item.file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                  <button onClick={() => removeFile(idx)} className="p-1 hover:bg-slate-200 rounded transition-colors cursor-pointer">
                    <X size={14} className="text-slate-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
