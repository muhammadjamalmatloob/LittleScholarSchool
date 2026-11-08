import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { downloadCustomPdf, printCustomPdf } from "../../utils/customPdfGenerator";
import { Loader2 } from "lucide-react";
import {
  ArrowLeft,
  X,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  ShieldCheck,
  FileDown,
} from "lucide-react";

/**
 * Custom in-app PDF report viewer modal with Fullscreen Portal.
 * - Replaces browser default print and hides the app's global navbar/search/theme toggle.
 * - Dedicated Top Bar featuring Back, Save as PDF, Print, and Zoom controls.
 * - Supports both Portrait and Landscape (e.g. 3-column Fee Chalan) orientations.
 * - Formatted with Bierstadt typography, official school logo, and precision margins.
 */
export const CustomPdfViewerModal = ({
  isOpen,
  onClose,
  title = "Academic Document",
  subtitle = "Little Scholar School System",
  refNumber = `DOC-${Date.now().toString().slice(-6)}`,
  documentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }),
  orientation = "portrait", // "portrait" | "landscape"
  hideDefaultHeaderFooter = false,
  children,
}) => {
  const [zoom, setZoom] = useState(100);
  const [isGenerating, setIsGenerating] = useState(false);
  const printAreaRef = useRef(null);

  // Lock body scroll and listen for Escape key when open
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 65));
  const handleZoomReset = () => setZoom(100);

  const printViaIsolatedIframe = () => {
    if (!printAreaRef.current) return;
    const content = printAreaRef.current.innerHTML;
    const isLandscape = orientation === "landscape";
    
    // Create an isolated hidden iframe so browser print excludes URL header/footer
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title} - Little Scholar School System</title>
  <style>
    @font-face {
      font-family: 'Bierstadt';
      src: local('Bierstadt'), local('Aptos'), local('Segoe UI'), local('Calibri');
    }
    @page {
      size: ${isLandscape ? "A4 landscape" : "A4 portrait"};
      margin: 10mm;
    }
    body {
      font-family: 'Bierstadt', 'Aptos', 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
      margin-top: 8px;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    thead {
      display: table-header-group;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      font-size: 11px;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .no-print { display: none !important; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error("Iframe print error:", err);
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 60000);
    }, 400);
  };

  const handlePrint = async () => {
    if (!printAreaRef.current || isGenerating) return;
    setIsGenerating(true);
    try {
      await printCustomPdf(printAreaRef.current, {
        title,
        orientation,
      });
    } catch (err) {
      console.warn("Custom PDF print fallback:", err);
      printViaIsolatedIframe();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePdf = async () => {
    if (!printAreaRef.current || isGenerating) return;
    setIsGenerating(true);
    try {
      await downloadCustomPdf(printAreaRef.current, {
        title,
        orientation,
        filename: `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      });
    } catch (err) {
      console.warn("Direct PDF download fallback to clean print-to-PDF:", err);
      printViaIsolatedIframe();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadHtml = () => {
    if (!printAreaRef.current) return;
    const content = printAreaRef.current.innerHTML;
    const isLandscape = orientation === "landscape";
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title} - Little Scholar School System</title>
  <style>
    @font-face {
      font-family: 'Bierstadt';
      src: local('Bierstadt'), local('Aptos'), local('Segoe UI'), local('Calibri');
    }
    @page {
      size: ${isLandscape ? "A4 landscape" : "A4 portrait"};
      margin: ${isLandscape ? "6mm" : "12mm"};
    }
    body {
      font-family: 'Bierstadt', 'Aptos', 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: ${isLandscape ? "10mm" : "15mm"};
      background: #f8fafc;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      max-width: ${isLandscape ? "280mm" : "210mm"};
      margin: 0 auto;
      background: #fff;
      padding: ${isLandscape ? "8mm" : "15mm"};
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
      box-sizing: border-box;
    }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; color: #1e293b; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    @media print {
      body { background: transparent; padding: 0; }
      .sheet { box-shadow: none; border: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="sheet">${content}</div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isLandscape = orientation === "landscape";

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-blue-50/95 backdrop-blur-md text-slate-900 select-none animate-in fade-in duration-200">
      {/* Dynamic Print Styles for exact page sizing & orientation */}
      <style>{`
        @page {
          size: ${isLandscape ? "A4 landscape" : "A4 portrait"} !important;
          margin: ${isLandscape ? "5mm 5mm 5mm 5mm" : "10mm 10mm 10mm 10mm"} !important;
        }
        .printable-report-canvas,
        .printable-report-canvas * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .printable-report-canvas::-webkit-scrollbar,
        .printable-report-canvas *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
          background: transparent !important;
        }
        @media print {
          body {
            background: transparent !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-report-canvas {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* Top PDF Controls & Toolbar (Replaces global search & theme) */}
      {/* ========================================================================= */}
      <header className="no-print bg-white border-b border-blue-200 text-blue-950 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm relative z-20">
        {/* Left: Back Button & Document Identity */}
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-semibold text-xs sm:text-sm border border-blue-200 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Go back to application view"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600" />
            <span>Back</span>
          </button>

          <div className="h-6 w-px bg-blue-200 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-blue-950 tracking-tight truncate max-w-xs md:max-w-md">
                  {title}
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider shrink-0">
                  {isLandscape ? "A4 Landscape" : "A4 Portrait"}
                </span>
              </div>
              <p className="text-xs text-blue-900/70 truncate hidden sm:block">
                {subtitle} • Ref: <span className="font-mono text-blue-800">{refNumber}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Center: Interactive Zoom Controls */}
        <div className="hidden lg:flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-xl px-2 py-1 text-xs">
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 hover:bg-blue-100 text-blue-700 hover:text-blue-950 rounded-lg transition cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-blue-800 px-2 min-w-[50px] text-center font-semibold">
            {zoom}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 hover:bg-blue-100 text-blue-700 hover:text-blue-950 rounded-lg transition cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomReset}
            title="Fit to Default"
            className="ml-1 p-1.5 hover:bg-blue-100 text-blue-700 hover:text-blue-950 rounded-lg transition cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Save PDF & Print Action Suite */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSavePdf}
            disabled={isGenerating}
            title="Save cleanly divided A4 PDF report to disk without browser headers"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isGenerating ? "Dividing Pages..." : "Save as PDF"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="Print document directly"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white border border-amber-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadHtml}
            title="Download Standalone Offline HTML Report"
            className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-950 border border-blue-200 transition cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Preview"
            title="Close"
            className="p-2 rounded-xl bg-blue-50 hover:bg-rose-600 text-blue-700 hover:text-white border border-blue-200 transition cursor-pointer ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* Main Document Canvas Viewport */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start bg-blue-100/60 custom-pdf-scrollbar">
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            transition: "transform 150ms ease-out",
          }}
          className="shrink-0"
        >
          {/* A4 Sheet Container: Exact physical A4 proportions (210mm x 297mm) */}
          <div
            ref={printAreaRef}
            style={{
              width: isLandscape ? "297mm" : "210mm",
              minHeight: isLandscape ? "210mm" : "297mm",
              boxSizing: "border-box",
            }}
            className={`printable-report-canvas pdf-document-sheet bg-white text-slate-900 rounded-none shadow-2xl border border-slate-300 mb-12 font-bierstadt print:p-0 print:border-none print:shadow-none ${
              isLandscape ? "p-6" : "p-8"
            }`}
          >
            {/* Conditional Standard Academic Letterhead */}
            {!hideDefaultHeaderFooter && (
              <div className="border-b-2 border-blue-900 pb-5 mb-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <img
                      src="/logo-transparent.png"
                      alt="Little Scholar School System Logo"
                      className="w-16 h-16 object-contain shrink-0 rounded-lg p-1 bg-blue-50/50 border border-blue-100"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight uppercase font-bierstadt">
                        Little Scholar School System
                      </h1>
                      <p className="text-xs font-semibold text-blue-800 mt-0.5">
                        Directorate of Academic Records, Quality & Financial Audit
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Main Academic Campus • Contact: +92 42 3588 9000 • Email: records@littlescholar.edu.pk
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 min-w-[190px]">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-900 font-bold text-[11px] uppercase tracking-wider border border-blue-200 whitespace-nowrap">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span>Official Academic Document</span>
                    </div>
                    <div className="mt-2 text-xs space-y-0.5">
                      <p className="text-slate-600 whitespace-nowrap">
                        Date: <span className="font-bold text-slate-800">{documentDate}</span>
                      </p>
                      <p className="text-slate-500 whitespace-nowrap">
                        Ref No: <span className="font-mono font-bold text-slate-700">{refNumber}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Document Subject Strip */}
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-4 text-xs">
                  <div className="min-w-0 flex-1">
                    <span className="text-slate-500 font-medium">Document Subject: </span>
                    <span className="font-bold text-blue-950 uppercase font-bierstadt tracking-wide">
                      {title}
                    </span>
                  </div>
                  <div className="shrink-0 text-slate-600 font-semibold bg-slate-100 px-3 py-1 rounded-md border border-slate-200 text-[11px] whitespace-nowrap">
                    {subtitle}
                  </div>
                </div>
              </div>
            )}

            {/* Document Content Rendered Here */}
            <div className="document-body min-h-[300px]">{children}</div>

            {/* Conditional Official Academic Verification & Signatures Footer */}
            {!hideDefaultHeaderFooter && (
              <div className="mt-12 pt-6 border-t-2 border-slate-200 text-xs text-slate-500">
                <div className="flex justify-end pt-2">
                  <div className="text-center w-64">
                    <div className="h-10 border-b border-dashed border-slate-400 mx-auto w-48"></div>
                    <p className="font-bold text-slate-800 mt-1">Head of Institution</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Principal Signature & Stamp</p>
                  </div>
                </div>

                <div className="mt-8 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                  <span>
                    Official Academic Document • Validated by School Management System (SMS)
                  </span>
                  <span className="font-mono">
                    Official Institutional Record • Ref: {refNumber}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
