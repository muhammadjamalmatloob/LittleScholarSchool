import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Database,
  DownloadCloud,
  HardDrive,
  ShieldCheck,
  UploadCloud,
  RefreshCw,
  AlertTriangle,
  X,
  FileCheck2,
  Calendar,
} from "lucide-react";
import { getApiBaseUrl } from "../api/client";
import { useToast } from "../context/ToastContext";

export const DatabaseBackupModal = ({ isOpen, onClose }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreConfirmFile, setRestoreConfirmFile] = useState(null);

  const fetchSystemData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };
      const baseUrl = getApiBaseUrl();

      const [statusRes, snapRes] = await Promise.all([
        axios.get(`${baseUrl}/system/status`, { headers }),
        axios.get(`${baseUrl}/system/backup/snapshots`, { headers }),
      ]);

      setStatusData(statusRes.data);
      setSnapshots(snapRes.data || []);
    } catch (err) {
      console.error("Failed to fetch database status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSystemData();
      setRestoreConfirmFile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadBackup = async () => {
    try {
      setDownloading(true);
      const token = localStorage.getItem("access_token");
      const url = `${getApiBaseUrl()}/system/backup/download`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to generate backup.");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      link.download = `Little_Scholar_Database_${ts}.db`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Database backup downloaded successfully!");
    } catch (err) {
      toast.error(err.message || "Could not download database backup.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    try {
      setCreatingSnapshot(true);
      const token = localStorage.getItem("access_token");
      const baseUrl = getApiBaseUrl();

      const res = await axios.post(
        `${baseUrl}/system/backup/snapshot`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Disaster recovery snapshot saved: ${res.data.filename}`);
      fetchSystemData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create snapshot.");
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".db") && !file.name.endsWith(".sqlite")) {
      toast.error("Please select a valid SQLite database file (.db or .sqlite).");
      return;
    }

    setRestoreConfirmFile(file);
    e.target.value = "";
  };

  const handleExecuteRestore = async () => {
    if (!restoreConfirmFile) return;

    try {
      setRestoring(true);
      const token = localStorage.getItem("access_token");
      const baseUrl = getApiBaseUrl();

      const formData = new FormData();
      formData.append("file", restoreConfirmFile);

      const res = await axios.post(`${baseUrl}/system/backup/restore`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(res.data.message || "Database restored successfully!");
      setRestoreConfirmFile(null);
      fetchSystemData();

      // Trigger soft page refresh to reload data
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Restore failed. Verify file integrity.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="backup-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Database Backup &amp; Disaster Recovery
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Safeguard all school student, fee, and academic records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Restore Confirmation Alert Banner */}
        {restoreConfirmFile && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Confirm Database Restoration</span>
            </div>
            <p className="leading-relaxed">
              You are about to restore database from <strong>{restoreConfirmFile.name}</strong>.
              An emergency safety snapshot of your current database will be automatically archived before restoring.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRestoreConfirmFile(null)}
                disabled={restoring}
                className="px-3 py-1.5 rounded-lg border border-amber-400/60 font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={restoring}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {restoring ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                <span>Confirm &amp; Restore</span>
              </button>
            </div>
          </div>
        )}

        {/* Database Metrics Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-blue-500 shrink-0" />
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Database Size</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {statusData ? `${statusData.database.size_mb} MB` : "Checking..."}
              </p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Local Snapshots</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {snapshots.length} Snapshots
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={downloading}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-slate-800/80 text-left transition hover:shadow-xs cursor-pointer group disabled:opacity-50"
          >
            <DownloadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Download .db</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Save to USB / PC</p>
          </button>

          <button
            type="button"
            onClick={handleCreateSnapshot}
            disabled={creatingSnapshot}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 bg-white dark:bg-slate-800/80 text-left transition hover:shadow-xs cursor-pointer group disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Create Snapshot</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Archive on laptop</p>
          </button>

          <label className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 bg-white dark:bg-slate-800/80 text-left transition hover:shadow-xs cursor-pointer group">
            <input
              type="file"
              accept=".db,.sqlite"
              onChange={handleFileSelected}
              className="hidden"
            />
            <UploadCloud className="w-4 h-4 text-amber-600 dark:text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Restore .db</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Import past backup</p>
          </label>
        </div>

        {/* Existing Snapshots History */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Recent Disaster Recovery Snapshots
            </h4>
            <button
              type="button"
              onClick={fetchSystemData}
              disabled={loading}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {snapshots.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-2 italic text-center">
                No local snapshots created yet. Click "Create Snapshot" above.
              </p>
            ) : (
              snapshots.slice(0, 6).map((snap, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCheck2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate font-medium">
                      {snap.filename}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] shrink-0 font-medium pl-2">
                    {snap.size_mb} MB
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseBackupModal;

