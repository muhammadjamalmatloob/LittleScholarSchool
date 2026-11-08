import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = "info", title, message, duration = 4500 }) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      const newToast = { id, type, title, message };

      setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5 on screen

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = {
    success: (message, title = "Success") =>
      addToast({ type: "success", title, message }),
    error: (message, title = "Error") =>
      addToast({ type: "error", title, message }),
    warning: (message, title = "Warning") =>
      addToast({ type: "warning", title, message }),
    info: (message, title = "Notice") =>
      addToast({ type: "info", title, message }),
    dismiss: removeToast,
  };

  // Global event listener for API errors or non-React modules
  useEffect(() => {
    const handleGlobalToast = (event) => {
      if (event.detail) {
        const { type = "info", message, title } = event.detail;
        if (message) {
          addToast({ type, message, title: title || (type === "error" ? "Error" : "Notification") });
        }
      }
    };

    window.addEventListener("app:toast", handleGlobalToast);
    return () => window.removeEventListener("app:toast", handleGlobalToast);
  }, [addToast]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
  };

  const borders = {
    success: "border-emerald-500/30 bg-white/95 dark:bg-slate-900/95 text-emerald-900 dark:text-emerald-100",
    error: "border-rose-500/30 bg-white/95 dark:bg-slate-900/95 text-rose-900 dark:text-rose-100",
    warning: "border-amber-500/30 bg-white/95 dark:bg-slate-900/95 text-amber-900 dark:text-amber-100",
    info: "border-blue-500/30 bg-white/95 dark:bg-slate-900/95 text-blue-900 dark:text-blue-100",
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Fixed Toast Viewport */}
      <div
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none sm:max-w-md px-3 sm:px-0"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={`pointer-events-auto rounded-2xl p-4 shadow-xl backdrop-blur-md border ${
                borders[t.type] || borders.info
              } flex items-start gap-3 relative overflow-hidden`}
            >
              <div className="mt-0.5">{icons[t.type] || icons.info}</div>
              <div className="flex-1 pr-6 min-w-0">
                {t.title && (
                  <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                    {t.title}
                  </p>
                )}
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5 break-words leading-relaxed">
                  {t.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
