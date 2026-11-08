import React, { useState, useEffect } from "react";
import { useLicense } from "../context/LicenseContext";
import { KeyRound, CheckCircle2, AlertCircle, Loader2, Cpu, Copy, Check, X } from "lucide-react";

export const openLicenseActivationModal = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app:open-license-modal"));
  }
};

export const LicenseActivationModal = () => {
  const { isActivated, isExpired, schoolName, planName, hardwareId, activateLicense } = useLicense();
  const [forceOpen, setForceOpen] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      setError(null);
      setSuccess(null);
      setForceOpen(true);
    };
    window.addEventListener("app:open-license-modal", handleOpen);
    return () => window.removeEventListener("app:open-license-modal", handleOpen);
  }, []);

  // If already activated and not expired, and not manually opened, don't show modal
  if (isActivated && !isExpired && !forceOpen) {
    return null;
  }

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await activateLicense(licenseKey.trim());
    setLoading(false);

    if (res.success) {
      setSuccess(`Activated successfully for ${res.data.school_name}!`);
      setTimeout(() => {
        setForceOpen(false);
      }, 1500);
    } else {
      setError(res.error || "Failed to activate license.");
    }
  };

  const handleCopyHardwareId = () => {
    if (!hardwareId) return;
    navigator.clipboard.writeText(hardwareId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white text-center relative">
          {/* Optional Close Button if already activated */}
          {isActivated && !isExpired && (
            <button
              type="button"
              onClick={() => setForceOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {forceOpen && isActivated
              ? "Switch School License"
              : isExpired
              ? "License Expired"
              : "License Activation Required"}
          </h2>
          <p className="text-xs text-blue-100 mt-1">
            {forceOpen && isActivated
              ? `Currently active: ${schoolName} (${planName || "Active"}). Enter a different key to switch.`
              : isExpired
              ? `Your subscription for ${schoolName || "this school"} has expired.`
              : "Please enter your school license key to unlock your system."}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-3 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3 text-emerald-700 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                License Key
              </label>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="e.g. SCH-2026-XXXX-XXXX"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !licenseKey.trim()}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying License...</span>
                </>
              ) : (
                <span>Activate Software</span>
              )}
            </button>
          </form>

          {hardwareId && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-mono truncate mr-2">
                <Cpu className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Device ID: <strong className="text-slate-700 dark:text-slate-300 font-bold">{hardwareId}</strong></span>
              </span>
              <button
                type="button"
                onClick={handleCopyHardwareId}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium transition-colors cursor-pointer shrink-0"
                title="Copy Device ID"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

