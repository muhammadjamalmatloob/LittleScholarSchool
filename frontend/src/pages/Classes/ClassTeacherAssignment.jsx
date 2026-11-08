import { useCallback, useEffect, useState } from "react";
import { Check, Edit, Users } from "lucide-react";
import { academicYearService, classTeacherAssignmentService, teacherService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { GlassBadge } from "../../components/ui/GlassBadge";
import { GlassButton } from "../../components/ui/GlassButton";
import { GlassCard } from "../../components/ui/GlassCard";

export const ClassTeacherAssignment = () => {
  const { hasRole } = useAuth();
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [editing, setEditing] = useState(null);
  const [teacherId, setTeacherId] = useState("");
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    try {
      const [yearData, classData, teacherData] = await Promise.all([
        academicYearService.getAll(),
        classTeacherAssignmentService.getClasses(),
        teacherService.getAll({ is_active: true, limit: 100 }),
      ]);
      setYears(yearData);
      setClasses(classData);
      setTeachers(teacherData.items || []);
      const current = yearData.find((year) => year.is_current) || yearData[0];
      setSelectedYear(String(current?.id || ""));
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Failed to load assignment data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    if (!selectedYear) return;
    try {
      setAssignments(await classTeacherAssignmentService.getAll({ academic_year_id: selectedYear }));
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Failed to load assignments.");
    }
  }, [selectedYear]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBaseData();
  }, [loadBaseData]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAssignments();
  }, [loadAssignments]);

  const openEditor = (classItem) => {
    const current = assignments.find((assignment) => assignment.class_id === classItem.id);
    setEditing(classItem);
    setTeacherId(String(current?.teacher_id || ""));
    setAssignmentDate(current?.assignment_date || new Date().toISOString().slice(0, 10));
  };

  const saveAssignment = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const existing = assignments.find((assignment) => assignment.class_id === editing.id);
      const payload = {
        class_id: editing.id,
        teacher_id: Number(teacherId),
        academic_year_id: Number(selectedYear),
        assignment_date: assignmentDate,
      };
      if (existing) await classTeacherAssignmentService.update(existing.id, payload);
      else await classTeacherAssignmentService.create(payload);
      setSuccess(`Teacher assigned to ${editing.display_name || `${editing.name} ${editing.section || ""}`}.`);
      setEditing(null);
      loadAssignments();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not save class-teacher assignment.");
    } finally {
      setSaving(false);
    }
  };

  const admin = hasRole("admin");
  return (
    <div className="space-y-5">
      <GlassCard className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center"><Users className="w-5 h-5" /></div><div><h1 className="text-xl font-bold text-slate-900 dark:text-white">Class-Teacher Assignments</h1><p className="text-xs text-slate-500 mt-1">Assign one current class teacher for each class and academic year.</p></div></div>
        <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="px-3 py-2 text-xs glass-input">{years.map((year) => <option key={year.id} value={year.id}>{year.year_name}{year.is_current ? " Â· Current" : ""}</option>)}</select>
      </GlassCard>
      {error && <div className="p-3 rounded-xl text-xs text-rose-600 bg-rose-500/10 border border-rose-500/20">{error}</div>}
      {success && <div className="p-3 rounded-xl text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20">{success}</div>}
      <GlassCard padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-black/[0.03] dark:bg-white/[0.03] text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Class</th><th className="px-5 py-3">Students</th><th className="px-5 py-3">Current Teacher</th><th className="px-5 py-3">Assignment Date</th><th className="px-5 py-3">Action</th></tr></thead><tbody className="divide-y divide-[var(--border-glass)]">
          {loading ? <tr><td colSpan="5" className="p-12 text-center text-slate-400">Loading classes...</td></tr> : classes.map((classItem) => { const assignment = assignments.find((item) => item.class_id === classItem.id); return <tr key={classItem.id}><td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">{classItem.display_name || `${classItem.name}${classItem.section ? `-${classItem.section}` : ""}`}</td><td className="px-5 py-4 text-slate-500">{classItem.student_count ?? 0}</td><td className="px-5 py-4">{assignment ? <div><p className="font-semibold text-slate-800 dark:text-slate-200">{assignment.teacher.full_name}</p><p className="font-mono text-[10px] text-blue-500">{assignment.teacher.teacher_code}</p></div> : <GlassBadge variant="amber" size="sm">Unassigned</GlassBadge>}</td><td className="px-5 py-4 text-slate-500">{assignment?.assignment_date || "—"}</td><td className="px-5 py-4">{admin && <GlassButton variant="secondary" size="xs" icon={assignment ? Edit : Check} onClick={() => openEditor(classItem)}>{assignment ? "Change" : "Assign"}</GlassButton>}</td></tr>; })}
        </tbody></table></div>
      </GlassCard>

      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"><form onSubmit={saveAssignment} className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 shadow-2xl"><h2 className="font-bold text-slate-900">Assign teacher</h2><p className="text-xs text-slate-500">{editing.display_name || editing.name}</p><label className="block text-xs font-semibold text-slate-700">Teacher<select required value={teacherId} onChange={(event) => setTeacherId(event.target.value)} className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-200"><option value="">Select a teacher</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.teacher_code} Â· {teacher.full_name}</option>)}</select></label><label className="block text-xs font-semibold text-slate-700">Assignment Date<input required type="date" value={assignmentDate} onChange={(event) => setAssignmentDate(event.target.value)} className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-200" /></label><div className="flex justify-end gap-2"><GlassButton variant="secondary" onClick={() => setEditing(null)}>Cancel</GlassButton><GlassButton type="submit" loading={saving}>Save Assignment</GlassButton></div></form></div>}
    </div>
  );
};

