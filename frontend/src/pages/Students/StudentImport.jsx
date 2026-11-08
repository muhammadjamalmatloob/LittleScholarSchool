import React, { useState, useRef } from "react";
import { downloadStudentTemplate, importStudentsCSV } from "../../api/students";
import { getClasses } from "../../api/classes";
import {
  UploadCloud,
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { GlassButton } from "../../components/ui/GlassButton";

export const StudentImport = ({ isOpen, onClose, onSuccess }) => {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [section, setSection] = useState("");
  const [rollMode, setRollMode] = useState("new");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const selectedClass = classes.find((item) => String(item.id) === String(classId));
  const classOptions = [...new Map(classes.map((item) => [item.name, item])).values()];
  const sectionOptions = classes
    .filter((item) => item.name === selectedClass?.name)
    .map((item) => item.section)
    .filter(Boolean);

  React.useEffect(() => {
    if (isOpen) {
      getClasses().then(setClasses).catch(() => setError("Unable to load classes."));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selected = e.dataTransfer.files[0];
      if (selected.name.endsWith(".csv") || selected.name.endsWith(".txt")) {
        setFile(selected);
        setError("");
        setReport(null);
      } else {
        setError("Please drop a valid .csv file.");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError("");
      setReport(null);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!classId || !section) {
      setError("Select a class and section before downloading the template.");
      return;
    }
    try {
      await downloadStudentTemplate({ classId, section, rollMode });
    } catch (err) {
      setError("Failed to download template.");
    }
  };

  const handleUpload = async () => {
    if (!classId || !section) {
      setError("Select a class and section before uploading a CSV.");
      return;
    }
    if (!file) {
      setError("Please select a file to import.");
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);

    try {
      const res = await importStudentsCSV(file, { classId, section, rollMode });
      setReport(res);
      if (res.imported > 0) {
        onSuccess();
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || "An error occurred while uploading file."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setReport(null);
    setError("");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
        {/* Header in Blue Gradient */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">
              Bulk Student Enrollment Import
            </h3>
            <p className="text-xs text-blue-100 mt-0.5">
              Upload an Excel/CSV spreadsheet to batch enroll students into classes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:bg-white/10 p-1.5 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Download Template Banner */}
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-slate-800/70 border border-blue-200 dark:border-slate-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                Class
                <select value={selectedClass?.name || ""} onChange={(e) => {
                  const first = classes.find((item) => item.name === e.target.value);
                  setClassId(first?.id || "");
                  setSection(first?.section || "");
                  setFile(null);
                }} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-2 text-xs font-medium">
                  <option value="">Select class</option>
                  {classOptions.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                Section
                <select value={section} onChange={(e) => {
                  const selectedSection = e.target.value;
                  const matchingClass = classes.find(
                    (item) => item.name === selectedClass?.name && item.section === selectedSection
                  );
                  setClassId(matchingClass?.id || "");
                  setSection(selectedSection);
                  setFile(null);
                }} disabled={!selectedClass} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-2 text-xs font-medium disabled:bg-slate-100 dark:disabled:bg-slate-800">
                  <option value="">Select section</option>
                  {sectionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                Roll numbers
                <select value={rollMode} onChange={(e) => { setRollMode(e.target.value); setFile(null); }} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-2 text-xs font-medium">
                  <option value="new">Assign new roll numbers</option>
                  <option value="existing">Use existing roll numbers</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(150px,0.8fr)_minmax(0,2fr)] items-start gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Standard Student CSV Template
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Choose the options above, then download the template.
                  </p>
                </div>
              </div>

              <div className="min-w-0 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-[11px] text-amber-900 dark:text-amber-200">
                <p className="font-bold mb-1">CSV format for {selectedClass?.name || "the selected class"}{section ? ` - Section ${section}` : ""}</p>
                <p>Required: <strong>Student Name</strong>{rollMode === "existing" && <>, Roll Number</>}.</p>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-white/70 dark:bg-slate-900/70 p-2 font-mono">{
                  rollMode === "existing"
                    ? "Student Name,Roll Number,Date of Birth,Gender,Parent Name\nBilal Hassan,25,2016-03-15,M,Hassan Raza"
                    : "Student Name,Date of Birth,Gender,Parent Name\nBilal Hassan,2016-03-15,M,Hassan Raza"
                }</pre>
              </div>
            </div>
            <GlassButton
              variant="secondary"
              size="xs"
              icon={Download}
              onClick={handleDownloadTemplate}
              disabled={!classId || !section}
              className="text-xs font-semibold px-3 py-1.5"
            >
              Template
            </GlassButton>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Upload Dropzone */}
          {!report && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : file
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-slate-300 hover:border-blue-400 bg-slate-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <UploadCloud
                className={`w-10 h-10 mx-auto mb-2 ${
                  file ? "text-emerald-600" : "text-slate-400"
                }`}
              />
              {file ? (
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB • Click or drop again to change file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    Drag and drop your .csv file here, or{" "}
                    <span className="text-blue-600 font-bold underline">
                      browse
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Accepts CSV format up to 5MB
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Import Results Report */}
          {report && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Processing Complete
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Processed {report.total_processed} rows from CSV
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-emerald-700">
                    +{report.imported} Enrolled
                  </span>
                  {report.failed > 0 && (
                    <span className="text-rose-600">
                      • {report.failed} Failed
                    </span>
                  )}
                </div>
              </div>

              {report.errors?.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 max-h-36 overflow-y-auto text-[11px] space-y-1">
                  <p className="font-bold text-rose-700 mb-1">
                    Validation Issues:
                  </p>
                  {report.errors.map((err, idx) => (
                    <p key={idx} className="text-rose-600">
                      Row {err.row}: {err.error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          {report ? (
            <GlassButton variant="secondary" size="sm" icon={RefreshCw} onClick={resetForm} className="text-xs font-semibold">
              Upload Another
            </GlassButton>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <GlassButton variant="ghost" size="sm" onClick={onClose} className="text-xs font-semibold">
              {report ? "Close" : "Cancel"}
            </GlassButton>
            {!report && (
              <GlassButton
                variant="primary"
                size="sm"
                disabled={!file}
                loading={loading}
                icon={UploadCloud}
                onClick={handleUpload}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 shadow-xs"
              >
                Import Records
              </GlassButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
