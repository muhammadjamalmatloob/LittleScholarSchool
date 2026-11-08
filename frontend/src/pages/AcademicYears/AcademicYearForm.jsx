import { useEffect, useState } from "react";
import { X, Calendar, AlertCircle } from "lucide-react";
import { academicYearService } from "../../services/api";
import { GlassButton } from "../../components/ui/GlassButton";

const emptyForm = { year_name: "", start_date: "", end_date: "" };

export const AcademicYearForm = ({ isOpen, initialYear, onClose, onSuccess }) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      initialYear
        ? {
            year_name: initialYear.year_name,
            start_date: initialYear.start_date,
            end_date: initialYear.end_date,
          }
        : emptyForm
    );
    setError("");
  }, [isOpen, initialYear]);

  if (!isOpen) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (!form.year_name.trim()) {
      setError("Please provide an academic session name (e.g. 2026-2027).");
      return;
    }
    if (form.end_date < form.start_date) {
      setError("End date must be on or after start date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (initialYear) await academicYearService.update(initialYear.id, form);
      else await academicYearService.create(form);
      onSuccess();
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not save academic year.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {initialYear ? "Edit Academic Session" : "Create Academic Session"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Session dates define student billing, enrollments, and promotions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl text-xs font-medium text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Academic Session Name <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={form.year_name}
              onChange={(event) => setForm({ ...form, year_name: event.target.value })}
              placeholder="e.g. 2026-2027"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition font-medium"
            />
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
              Standard format is YYYY-YYYY (e.g. 2026-2027)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="date"
                value={form.start_date}
                onChange={(event) => setForm({ ...form, start_date: event.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="date"
                value={form.end_date}
                onChange={(event) => setForm({ ...form, end_date: event.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <GlassButton
              type="submit"
              loading={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 text-sm shadow-md shadow-blue-600/20 active:scale-[0.98] transition cursor-pointer"
            >
              {initialYear ? "Save Changes" : "Create Session"}
            </GlassButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AcademicYearForm;
