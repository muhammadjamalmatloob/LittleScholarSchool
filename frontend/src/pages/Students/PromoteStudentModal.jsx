import React, { useState, useEffect } from "react";
import { X, GraduationCap, ArrowRight, Loader2, AlertCircle, CheckCircle2, Calendar, School } from "lucide-react";
import { studentApi } from "../../api/students";
import { useToast } from "../../context/ToastContext";

export const PromoteStudentModal = ({
  isOpen,
  onClose,
  student,
  classes = [],
  academicYears = [],
  onSuccess,
}) => {
  const toast = useToast();
  const [action, setAction] = useState("promote"); // 'promote', 'repeat', 'graduate'
  const [targetClassId, setTargetClassId] = useState("");
  const [targetYearId, setTargetYearId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Determine current active academic year
  const activeYear = academicYears.find((y) => y.is_current) || academicYears[0];

  useEffect(() => {
    if (student) {
      setError("");
      setNotes("");
      setAction("promote");

      // Default target session: student's current year or system active year
      if (student.academic_year_id) {
        setTargetYearId(student.academic_year_id.toString());
      } else if (activeYear) {
        setTargetYearId(activeYear.id.toString());
      }

      // Try to intelligently pick the "next class" by rank or order
      if (classes.length > 0 && student.class_id) {
        const currentIdx = classes.findIndex((c) => c.id === student.class_id);
        if (currentIdx !== -1 && currentIdx + 1 < classes.length) {
          setTargetClassId(classes[currentIdx + 1].id.toString());
        } else {
          // Fallback to first available or same
          setTargetClassId(classes[0].id.toString());
        }
      }
    }
  }, [student, classes, isOpen]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (action === "promote" && !targetClassId) {
      setError("Please select a target class for promotion.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        action,
        target_class_id: action === "promote" ? parseInt(targetClassId, 10) : null,
        target_academic_year_id: targetYearId ? parseInt(targetYearId, 10) : null,
        notes: notes.trim() || undefined,
      };

      const res = await studentApi.promote(student.id, payload);
      const actionLabel =
        action === "graduate"
          ? "graduated"
          : action === "repeat"
          ? "marked to repeat"
          : "promoted to next class";

      toast.success(`${student.name} successfully ${actionLabel}!`);
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to promote student.");
    } finally {
      setLoading(false);
    }
  };

  const selectedTargetClass = classes.find((c) => c.id.toString() === targetClassId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-blue-100 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Promote / Transfer Student
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                Advance student to the next class or session
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Summary Pill */}
        <div className="px-6 pt-5 pb-2">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                {student.name ? student.name.charAt(0).toUpperCase() : "S"}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                  {student.name}
                </h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                    {student.formatted_roll_number || student.roll_number || "No Roll"}
                  </span>
                  <span>•</span>
                  <span>{student.class_name || "Current Class"}</span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-xs border border-blue-200/60 dark:border-blue-800/40">
                {student.academic_year_name || "Current Session"}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Action Choice */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Promotion Action
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAction("promote")}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex flex-col items-center gap-1 ${
                  action === "promote"
                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-600 text-blue-700 dark:text-blue-300 shadow-2xs"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                }`}
              >
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Promote / Move</span>
              </button>

              <button
                type="button"
                onClick={() => setAction("repeat")}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex flex-col items-center gap-1 ${
                  action === "repeat"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-600 text-amber-700 dark:text-amber-300 shadow-2xs"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                }`}
              >
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>Repeat Year</span>
              </button>

              <button
                type="button"
                onClick={() => setAction("graduate")}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex flex-col items-center gap-1 ${
                  action === "graduate"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 text-emerald-700 dark:text-emerald-300 shadow-2xs"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Graduate / Alumni</span>
              </button>
            </div>
          </div>

          {/* Destination Class (for promote) */}
          {action === "promote" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Destination Class & Section</span>
                {selectedTargetClass && selectedTargetClass.total_strength && (
                  <span className="text-[11px] text-slate-400 font-normal">
                    Cap: {selectedTargetClass.total_strength} students
                  </span>
                )}
              </label>
              <div className="relative">
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500 shadow-2xs"
                >
                  <option value="">Select target class...</option>
                  {classes.map((cls) => {
                    const label = cls.section ? `${cls.name} - Section ${cls.section}` : cls.name;
                    return (
                      <option key={cls.id} value={cls.id.toString()}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          {/* Academic Session */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Target Academic Session
            </label>
            <select
              value={targetYearId}
              onChange={(e) => setTargetYearId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id.toString()}>
                  {ay.year_name} {ay.is_current ? "★ (Active Session)" : ""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Roll number will be automatically allocated sequentially in the target class.
            </p>
          </div>

          {/* Remarks / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Remarks / Reason (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Promoted on annual examination results"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Confirm Promotion</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromoteStudentModal;
