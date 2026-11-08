import React from "react";
import { useLicense } from "../context/LicenseContext";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export const ModuleRoute = ({ module, children }) => {
  const { hasModule, planName } = useLicense();

  if (module && !hasModule(module)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Module Not Included
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            The <strong className="text-slate-800 dark:text-slate-200 uppercase">{module}</strong> module is not included in your current plan{" "}
            {planName ? `(${planName})` : ""}. Please contact your system provider to activate this feature.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

