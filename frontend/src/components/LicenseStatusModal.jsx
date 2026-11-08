import React, { useState } from "react";
import { useLicense } from "../context/LicenseContext";
import { useToast } from "../context/ToastContext";
import { openLicenseActivationModal } from "./LicenseActivationModal";
import {
  ShieldCheck,
  RefreshCw,
  Key,
  Cpu,
  Calendar,
  CheckCircle2,
  Lock,
  X,
  Building,
  Sparkles,
} from "lucide-react";

export const LicenseStatusModal = ({ isOpen, onClose }) => {
  const {
    license,
    schoolName,
    planName,
    isActivated,
    isExpired,
    syncLicense,
    deactivateLicense,
  } = useLicense();
  const toast = useToast();

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  if (!isOpen) return null;

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);

    const res = await syncLicense();
    setSyncing(false);

    if (res.success) {
      toast.success(
        `License updated from cloud! Plan: ${res.data.plan_name || "Active"}`
      );
    } else {
      setSyncError(res.error || "Could not connect to cloud licensing server.");
    }
  };

  const modulesList = [
    { key: "students", label: "Student Profiles & Admission" },
    { key: "classes", label: "Classes & Section Management" },
    { key: "fees", label: "Fee Accounts & Challan Printing" },
    { key: "exams", label: "Exams, Marks & Report Cards" },
    { key: "attendance", label: "Daily Student Attendance" },
    { key: "teachers", label: "Faculty Directory & Salaries" },
    { key: "courses", label: "Courses & Subjects" },
    { key: "timetable", label: "Class Timetable Schedules" },
    { key: "reports", label: "Administrative Reports & Audits" },
    { key: "promotion", label: "Year-End Student Promotion" },
    { key: "lan_mobile", label: "Wi-Fi LAN & Mobile App Access" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 ring-2 ring-white/20 shadow-md">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  License & Subscription
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  {isActivated && !isExpired ? "Active" : "Lockout"}
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Official institutional authorization & cloud registry status
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {syncError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <span className="font-bold shrink-0">Sync Failed:</span>
              <span>{syncError}</span>
            </div>
          )}

          {/* School & Plan Overview Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                <Building className="w-3.5 h-3.5 text-blue-500" />
                Licensed Institution
              </span>
              <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {schoolName || "Registered School"}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 text-xs font-semibold text-blue-700 dark:text-blue-300">
                <Sparkles className="w-3 h-3 text-blue-500" />
                <span>{planName || "Standard Plan"}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Subscription Period
              </span>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                {license?.expires_at
                  ? new Date(license.expires_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Perpetual Commercial License"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Status: {isExpired ? "Expired" : "Verified & Valid"}
              </p>
            </div>
          </div>

          {/* Machine & Registry Identifiers */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">Key:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {license?.license_key || "UNREGISTERED"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">Hardware ID:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {license?.hardware_id || "HARDWARE-LOCK"}
              </span>
            </div>
          </div>

          {/* Module Feature Access Matrix */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Plan Feature Scope ({Object.values(license?.modules || {}).filter(Boolean).length}/11 Active)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {modulesList.map(({ key, label }) => {
                const isUnlocked = Boolean(license?.modules?.[key]);
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      isUnlocked
                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 border-emerald-200/60 dark:border-emerald-800/40"
                        : "bg-slate-50/60 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500 border-slate-200/50 dark:border-slate-800"
                    }`}
                  >
                    <span className="truncate pr-2">{label}</span>
                    {isUnlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer with Sync Cloud Action */}
        <div className="p-4 px-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Updated a plan in Google Sheets? Sync to apply immediately.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={async () => {
                if (
                  window.confirm(
                    "Are you sure you want to unlink the license on this machine?\n\nThe software will lock and return to the License Activation screen."
                  )
                ) {
                  const res = await deactivateLicense();
                  if (res.success) {
                    toast.info("License unlinked. Enter a key to activate.");
                    onClose();
                    openLicenseActivationModal();
                  } else {
                    toast.error(res.error || "Failed to unlink license.");
                  }
                }
              }}
              className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-all cursor-pointer"
            >
              Unlink License
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "Connecting to Cloud..." : "Sync License from Cloud"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseStatusModal;

