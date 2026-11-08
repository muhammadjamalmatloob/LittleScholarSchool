import React, { useState, useEffect } from "react";
import { X, Clock, Calendar, BookOpen, User, Building2, AlertTriangle, Trash2, Save, Loader2 } from "lucide-react";
import { GlassCard } from "./ui/GlassCard";
import { GlassButton } from "./ui/GlassButton";

const PERIOD_TIMES = {
  1: { normal: { start: "08:00 AM", end: "08:45 AM" }, friday: { start: "08:00 AM", end: "08:45 AM" } },
  2: { normal: { start: "08:45 AM", end: "09:30 AM" }, friday: { start: "08:45 AM", end: "09:30 AM" } },
  3: { normal: { start: "09:30 AM", end: "10:15 AM" }, friday: { start: "09:30 AM", end: "10:15 AM" } },
  4: { normal: { start: "10:45 AM", end: "11:30 AM" }, friday: { start: "10:35 AM", end: "11:20 AM" } },
  5: { normal: { start: "11:30 AM", end: "12:15 PM" }, friday: { start: "11:20 AM", end: "12:15 PM" } },
  6: { normal: { start: "12:15 PM", end: "01:00 PM" }, friday: { start: "12:15 PM", end: "01:00 PM" } },
};

export const TimetableSlotModal = ({
  isOpen,
  onClose,
  initialData = {},
  classes = [],
  teachers = [],
  subjects = [],
  onSave,
  onDelete,
}) => {
  const [form, setForm] = useState({
    slot_id: null,
    class_id: "",
    day_of_week: "Monday",
    period_number: 1,
    subject_id: "",
    teacher_id: "",
    room_number: "",
    start_time: "08:00 AM",
    end_time: "08:45 AM",
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setConfirmDelete(false);

      const pNum = initialData.period_number || 1;
      const day = initialData.day_of_week || "Monday";
      const times = day === "Friday" ? PERIOD_TIMES[pNum]?.friday : PERIOD_TIMES[pNum]?.normal;

      const fallbackClassId = classes.length > 0 ? classes[0].id : "";
      const classId = initialData.class_id || fallbackClassId;

      // Filter subjects for this class
      const classSubjects = subjects.filter((s) => !s.class_id || String(s.class_id) === String(classId));
      const fallbackSubjectId = classSubjects.length > 0 ? classSubjects[0].id : subjects[0]?.id || "";
      const fallbackTeacherId = teachers.length > 0 ? teachers[0].id : "";

      setForm({
        slot_id: initialData.slot_id || initialData.id || null,
        class_id: classId,
        day_of_week: day,
        period_number: pNum,
        subject_id: initialData.subject_id || fallbackSubjectId,
        teacher_id: initialData.teacher_id || fallbackTeacherId,
        room_number: initialData.room_number || (classId ? `Room ${100 + Number(classId)}` : "Room 101"),
        start_time: initialData.start_time || times?.start || "08:00 AM",
        end_time: initialData.end_time || times?.end || "08:45 AM",
      });
    }
  }, [isOpen, initialData, classes, teachers, subjects]);

  if (!isOpen) return null;

  // Filter subjects matching selected class, with fallback to all subjects
  const availableSubjects = subjects.filter(
    (s) => !s.class_id || String(s.class_id) === String(form.class_id)
  );
  const displaySubjects = availableSubjects.length > 0 ? availableSubjects : subjects;

  const handlePeriodOrDayChange = (newPeriod, newDay) => {
    const pNum = Number(newPeriod);
    const day = newDay;
    const times = day === "Friday" ? PERIOD_TIMES[pNum]?.friday : PERIOD_TIMES[pNum]?.normal;

    setForm((prev) => ({
      ...prev,
      period_number: pNum,
      day_of_week: day,
      start_time: times?.start || prev.start_time,
      end_time: times?.end || prev.end_time,
    }));
  };

  const handleClassChange = (newClassId) => {
    const classId = Number(newClassId);
    const classSubjects = subjects.filter((s) => !s.class_id || String(s.class_id) === String(classId));
    const nextSubjectId = classSubjects[0]?.id || subjects[0]?.id || form.subject_id;

    setForm((prev) => ({
      ...prev,
      class_id: classId,
      subject_id: nextSubjectId,
      room_number: `Room ${100 + classId}`,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!form.class_id) {
      setErrorMessage("Please select a valid class and section.");
      return;
    }
    if (!form.subject_id) {
      setErrorMessage("Please select an academic subject.");
      return;
    }
    if (!form.teacher_id) {
      setErrorMessage("Please select an assigned faculty member.");
      return;
    }

    try {
      setSaving(true);
      await onSave({
        slot_id: form.slot_id,
        class_id: Number(form.class_id),
        subject_id: Number(form.subject_id),
        teacher_id: Number(form.teacher_id),
        day_of_week: form.day_of_week,
        period_number: Number(form.period_number),
        room_number: form.room_number || "Room 101",
        start_time: form.start_time,
        end_time: form.end_time,
      });
      onClose();
    } catch (err) {
      console.error("Save timetable slot error:", err);
      const detail = err.response?.data?.detail || err.message || "Failed to schedule slot.";
      setErrorMessage(detail);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form.slot_id) return;
    try {
      setDeleting(true);
      await onDelete(form.slot_id);
      onClose();
    } catch (err) {
      console.error("Delete timetable slot error:", err);
      setErrorMessage(err.response?.data?.detail || err.message || "Failed to delete slot.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 text-white px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs uppercase tracking-wider font-semibold text-blue-100">
                Timetable Scheduler
              </span>
            </div>
            <h2 className="text-lg font-bold mt-0.5">
              {form.slot_id ? "Edit Period Slot" : "Schedule Class Period"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Schedule Conflict: </span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Row 1: Class & Day of Week */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Class & Section
              </label>
              <div className="relative">
                <select
                  value={form.class_id}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
                  required
                >
                  <option value="" disabled>
                    -- Select Class --
                  </option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - Section {c.section || "A"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Day of Week
              </label>
              <select
                value={form.day_of_week}
                onChange={(e) => handlePeriodOrDayChange(form.period_number, e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
              >
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => (
                  <option key={d} value={d}>
                    {d} {d === "Friday" ? "(Early Dismissal)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Period & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Period Number
              </label>
              <select
                value={form.period_number}
                onChange={(e) => handlePeriodOrDayChange(e.target.value, form.day_of_week)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
              >
                {[1, 2, 3, 4, 5, 6].map((p) => (
                  <option key={p} value={p}>
                    Period {p} {p === 1 ? "(Incharge)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Start Time
              </label>
              <input
                type="text"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="08:00 AM"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                End Time
              </label>
              <input
                type="text"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="08:45 AM"
              />
            </div>
          </div>

          {/* Row 3: Subject & Teacher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Subject / Course</span>
              </label>
              <select
                value={form.subject_id}
                onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
                required
              >
                <option value="" disabled>
                  -- Select Subject --
                </option>
                {displaySubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.course_name} {s.class_name ? `(${s.class_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Faculty Teacher</span>
              </label>
              <select
                value={form.teacher_id}
                onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
                required
              >
                <option value="" disabled>
                  -- Select Teacher --
                </option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} {t.specialization ? `(${t.specialization})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Room / Venue */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Room / Classroom Venue</span>
            </label>
            <input
              type="text"
              value={form.room_number}
              onChange={(e) => setForm({ ...form, room_number: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
              placeholder="e.g. Room 101, Science Lab, Hall A"
            />
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              {form.slot_id && (
                <>
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-rose-600 font-semibold">Confirm?</span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition"
                      >
                        {deleting ? "Deleting..." : "Yes, Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Slot</span>
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/30 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Slot</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimetableSlotModal;
