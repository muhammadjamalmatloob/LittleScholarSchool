import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { classApi } from "../../api/classes";
import { teacherApi } from "../../api/teachers";
import { useToast } from "../../context/ToastContext";
import { useLicense } from "../../context/LicenseContext";
import { validateClassCapacity, validateName } from "../../utils/validation";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassButton } from "../../components/ui/GlassButton";
import {
  GraduationCap,
  Users,
  UserCheck,
  Plus,
  Search,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Edit2,
  Trash2,
  Award,
} from "lucide-react";

const SECTIONS = ["A", "B", "C", "D"];

const AVATAR_GRADIENTS = [
  "bg-blue-600 text-white",
  "bg-blue-700 text-white",
  "bg-blue-800 text-white",
  "bg-blue-600 text-white",
  "bg-blue-600 text-white",
  "bg-blue-700 text-white",
  "bg-blue-900 text-white",
  "bg-blue-700 text-white",
];

const getAvatarGradient = (identifier = "", index = 0) => {
  const text = String(identifier || "");
  const code =
    text.length > 0
      ? text.charCodeAt(0) + (text.charCodeAt(text.length - 1) || 0) + index
      : index;
  return AVATAR_GRADIENTS[Math.abs(code) % AVATAR_GRADIENTS.length];
};

export const ClassManager = () => {
  const { hasModule } = useLicense();
  const canManageTeachers = hasModule("teachers");

  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("all");

  const toast = useToast();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [customClass, setCustomClass] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: "Class 1",
    section: "",
    class_teacher_id: null,
    teacher_name: "",
    capacity: 40,
    monthly_fee: 3500,
    academic_year: "2024-2025",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const promises = [classApi.getAll()];
      if (canManageTeachers) {
        promises.push(
          teacherApi.getAll().catch(() => ({ items: [] }))
        );
      }
      const [classList, teacherRes] = await Promise.all(promises);
      setClasses(classList || []);
      if (teacherRes) {
        setTeachers(teacherRes?.items || (Array.isArray(teacherRes) ? teacherRes : []));
      } else {
        setTeachers([]);
      }
    } catch (err) {
      console.error("Error loading class data:", err);
      toast.error("Failed to load classes list.", "Loading Error");
    } finally {
      setLoading(false);
    }
  }, [canManageTeachers, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingClass(null);
    setCustomClass(false);
    setFormData({
      name: "Class 1",
      section: "A",
      class_teacher_id: null,
      teacher_name: "",
      capacity: 40,
      monthly_fee: 3500,
      academic_year: "2024-2025",
    });
    setModalOpen(true);
  };

  const handleOpenNewClass = () => {
    setEditingClass(null);
    setCustomClass(true);
    setFormData({
      name: "",
      section: "A",
      class_teacher_id: canManageTeachers ? (teachers[0]?.id || "") : null,
      teacher_name: canManageTeachers ? (teachers[0]?.full_name || "") : "",
      capacity: 40,
      monthly_fee: 3500,
      academic_year: "2024-2025",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (cls) => {
    setEditingClass(cls);
    setCustomClass(false);
    setFormData({
      name: cls.name,
      section: cls.section,
      class_teacher_id: cls.class_teacher_id || (teachers[0]?.id || 1),
      teacher_name: cls.teacher_name || teachers[0]?.full_name || "Faculty Member",
      capacity: cls.capacity || 40,
      monthly_fee: cls.monthly_fee || 3500,
      academic_year: cls.academic_year || "2024-2025",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validate name
    const nameVal = validateName(formData.name, "Class Grade Level");
    if (!nameVal.isValid) {
      toast.warning(nameVal.message, "Validation Error");
      return;
    }

    // 2. Validate capacity (1 to 60)
    const capVal = validateClassCapacity(formData.capacity);
    if (!capVal.isValid) {
      toast.error(capVal.message, "Invalid Capacity");
      return;
    }

    setSubmitting(true);
    try {
      const usedSections = new Set(
        classes
          .filter((cls) => cls.name.toLowerCase() === formData.name.trim().toLowerCase())
          .map((cls) => cls.section.toUpperCase())
      );
      const nextSection = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index))
        .find((candidate) => !usedSections.has(candidate)) || "A";
      const payload = {
        name: formData.name.trim(),
        section: customClass || editingClass ? formData.section : nextSection,
        capacity: parseInt(formData.capacity, 10) || 40,
        class_teacher_id: formData.class_teacher_id ? parseInt(formData.class_teacher_id, 10) : undefined,
        monthly_fee: formData.monthly_fee ? parseFloat(formData.monthly_fee) : 3500,
      };

      if (editingClass) {
        await classApi.update(editingClass.id, payload);
        toast.success(`${payload.name} (Sec ${payload.section}) updated successfully!`, "Section Updated");
      } else {
        await classApi.create(payload);
        toast.success(
          customClass ? `${payload.name} created successfully!` : `New section ${payload.section} added!`,
          "Class Saved"
        );
      }

      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error("Error saving class:", err);
      toast.error(err.response?.data?.detail || "Could not save class details.", "Save Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!classToDelete) return;
    try {
      await classApi.delete(classToDelete.id);
      toast.success(`${classToDelete.name} Sec ${classToDelete.section} deleted.`, "Class Deleted");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not delete class section.", "Action Failed");
    } finally {
      setDeleteModalOpen(false);
      setClassToDelete(null);
    }
  };

  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const matchesSearch =
        cls.name.toLowerCase().includes(search.toLowerCase()) ||
        cls.section.toLowerCase().includes(search.toLowerCase()) ||
        (cls.teacher_name && cls.teacher_name.toLowerCase().includes(search.toLowerCase()));

      const matchesClass =
        selectedClassFilter === "all" ||
        cls.name.toLowerCase() === selectedClassFilter.toLowerCase();

      const matchesSection =
        selectedSectionFilter === "all" ||
        cls.section.toUpperCase() === selectedSectionFilter.toUpperCase();

      return matchesSearch && matchesClass && matchesSection;
    });
  }, [classes, search, selectedClassFilter, selectedSectionFilter]);

  const existingClassOptions = useMemo(
    () => [...new Set(classes.map((cls) => cls.name).filter(Boolean))],
    [classes]
  );

  const stats = useMemo(() => {
    const totalClasses = classes.length;
    const totalStudents = classes.reduce((sum, c) => sum + (c.student_count || 0), 0);
    const totalCapacity = classes.reduce((sum, c) => sum + (c.capacity || 40), 0);
    const avgCapacityRate = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;
    return { totalClasses, totalStudents, totalCapacity, avgCapacityRate };
  }, [classes]);

  return (
    <div className="space-y-6">
      {/* Clean Operational Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Academic Structure
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Playgroup to Class 10
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Classes &amp; Sections
          </h1>
        </div>

        <div className="flex gap-2 self-start md:self-auto">
          <GlassButton
            variant="secondary"
            onClick={handleOpenNewClass}
            icon={Plus}
            className="px-4 py-2 text-xs shadow-xs"
          >
            Add Class
          </GlassButton>
          <GlassButton
            variant="primary"
            onClick={handleOpenCreate}
            icon={Plus}
            className="px-4 py-2 text-xs shadow-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            Add Section
          </GlassButton>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 shadow-sm rounded-2xl">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search class, section, teacher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">All Grades</option>
              {existingClassOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={selectedSectionFilter}
              onChange={(e) => setSelectedSectionFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">All Sections</option>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  Section {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Class Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading academic classes...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Classes Found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or add a new class section.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls, idx) => (
            <GlassCard key={cls.id} className="p-5 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${getAvatarGradient(
                        cls.name,
                        idx
                      )} text-white font-bold text-base flex items-center justify-center shadow-2xs`}
                    >
                      {cls.section || "A"}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {cls.name} - Sec {cls.section || "A"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Class Incharge: {cls.teacher_name || "Unassigned"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cls)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Edit Class Section"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if ((cls.student_count || 0) > 0) {
                          toast.error(
                            `Cannot delete ${cls.name} (Sec ${cls.section || "A"}) because ${cls.student_count} student(s) are currently enrolled in it. Transfer or reassign students first.`,
                            "Class Not Empty"
                          );
                          return;
                        }
                        setClassToDelete(cls);
                        setDeleteModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Delete Class Section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs font-semibold">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Students Enrolled:</span>
                    <span className="text-slate-900 dark:text-white font-bold">
                      {cls.student_count || 0} / {cls.capacity || 40}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Monthly Tuition Fee:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      Rs. {(cls.monthly_fee || 3500).toLocaleString()}/mo
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Link
                  to={`/students?class=${encodeURIComponent(cls.name)}&section=${encodeURIComponent(cls.section || "A")}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-blue-400 text-xs font-bold transition border border-slate-200/60 dark:border-slate-700/60"
                >
                  <span>View Student Register</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Add / Edit Class Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              {editingClass ? "Edit Class Section" : customClass ? "Add New Class" : "Add New Section"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className={customClass ? "" : "grid grid-cols-2 gap-4"}>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Grade Level
                  </label>
                  {customClass ? (
                    <input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Grade 11 or A-Level"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  ) : (
                    <select
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {existingClassOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {editingClass && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Section
                    </label>
                    <select
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {SECTIONS.map((sec) => (
                        <option key={sec} value={sec}>
                          Section {sec}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Class Incharge / Teacher
                </label>
                {canManageTeachers ? (
                  <select
                    value={formData.class_teacher_id || ""}
                    onChange={(e) => {
                      const tid = e.target.value ? parseInt(e.target.value, 10) : null;
                      const sel = teachers.find((t) => t.id === tid);
                      setFormData({
                        ...formData,
                        class_teacher_id: tid,
                        teacher_name: sel ? sel.full_name : "",
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Select Class Teacher</option>
                    {teachers.map((t) => {
                      const assignedCls = classes.find(
                        (c) => c.class_teacher_id === t.id && c.id !== editingClass?.id
                      );
                      return (
                        <option key={t.id} value={t.id} disabled={Boolean(assignedCls)}>
                          {t.full_name}
                          {assignedCls
                            ? ` (Already Incharge of ${assignedCls.name} - ${assignedCls.section || "A"})`
                            : ""}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.teacher_name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, teacher_name: e.target.value })
                    }
                    placeholder="e.g. Ms. Sana Tariq (or leave blank)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Seat Capacity (Max 100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">Maximum 100 seats.</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Monthly Fee (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={formData.monthly_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">Standard monthly tuition.</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm font-bold shadow-xs"
                >
                  {submitting ? "Saving..." : editingClass ? "Update Section" : customClass ? "Save Class" : "Save Section"}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setClassToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Class Section"
        message={`Are you sure you want to delete ${classToDelete?.name} (Section ${classToDelete?.section})? This action cannot be undone.`}
        confirmText="Delete Section"
      />
    </div>
  );
};

export default ClassManager;
