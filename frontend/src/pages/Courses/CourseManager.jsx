import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { courseApi } from "../../api/courses";
import { teacherApi } from "../../api/teachers";
import { classApi } from "../../api/classes";
import { useToast } from "../../context/ToastContext";
import { useLicense } from "../../context/LicenseContext";
import { validateEnrollmentLimit, validateCourseCode, validateName } from "../../utils/validation";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassButton } from "../../components/ui/GlassButton";
import {
  BookOpen,
  Users,
  UserCheck,
  Plus,
  Search,
  Filter,
  GraduationCap,
  Calendar,
  Clock,
  Layers,
  Award,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
  BookmarkCheck,
} from "lucide-react";

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

// Dedicated Teacher Assignment Modal with Escape keydown listener
export const TeacherAssignmentModal = ({
  isOpen = false,
  onClose,
  selectedCourse,
  teachers = [],
  selectedTeacherId,
  setSelectedTeacherId,
  onSubmit,
}) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          {/* Dismiss backdrop click */}
          <div
            className="absolute inset-0"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 max-w-md w-full"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Assign Subject Teacher</h3>
                <p className="text-xs text-slate-500">
                  {selectedCourse.course_name} • {selectedCourse.class_name} ({selectedCourse.section})
                </p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Faculty / Subject Teacher
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800"
                  required
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.teacher_code || "Faculty"})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1.5">
                  This teacher will be authorized to enter and submit marks for this subject during exams.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm font-bold shadow-xs"
                >
                  Confirm Assignment
                </GlassButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const CourseManager = () => {
  const { hasModule } = useLicense();
  const canManageTeachers = hasModule("teachers");
  const canManageClasses = hasModule("classes");

  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("all");

  const toast = useToast();

  // Assign Teacher Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  // Add / Edit Course Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [newCourseData, setNewCourseData] = useState({
    class_name: "Class 1",
    section: "A",
    course_name: "",
    max_marks: 100,
    teacher_id: 1,
    teacher_name: "Ms. Sana Tariq",
    enrollment_limit: 100,
    room: "Room 101",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const promises = [courseApi.getAll()];
      if (canManageTeachers) {
        promises.push(teacherApi.getAll().catch(() => []));
      } else {
        promises.push(Promise.resolve([]));
      }
      if (canManageClasses) {
        promises.push(classApi.getAll().catch(() => []));
      } else {
        promises.push(Promise.resolve([]));
      }

      const [cData, tData, clsData] = await Promise.all(promises);
      setCourses(cData || []);
      setTeachers(tData?.items || (Array.isArray(tData) ? tData : []));
      setClasses(clsData || []);
    } catch (err) {
      console.error("Error loading courses:", err);
      toast.error("Failed to load courses dataset.", "Loading Error");
    } finally {
      setLoading(false);
    }
  }, [canManageTeachers, canManageClasses, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group courses section-wise (Requirement: "Course Page should be divided into portions for sectionwise")
  const sectionPortions = useMemo(() => {
    const grouped = {};
    courses.forEach((c) => {
      const key = `${c.class_name} - Section ${c.section}`;
      if (!grouped[key]) {
        grouped[key] = {
          class_name: c.class_name,
          section: c.section,
          key,
          courses: [],
          isBoardClass: c.class_name.includes("9") || c.class_name.includes("10"),
        };
      }
      grouped[key].courses.push(c);
    });

    return Object.values(grouped);
  }, [courses]);

  // Filter portions by search and section selector
  const filteredPortions = useMemo(() => {
    return sectionPortions.filter((portion) => {
      if (selectedSectionFilter !== "all" && portion.key !== selectedSectionFilter) {
        return false;
      }
      if (!search.trim()) return true;

      const q = search.toLowerCase();
      const matchesSection = portion.key.toLowerCase().includes(q);
      const matchesCourse = portion.courses.some(
        (c) =>
          c.course_name.toLowerCase().includes(q) ||
          c.teacher_name?.toLowerCase().includes(q)
      );
      return matchesSection || matchesCourse;
    });
  }, [sectionPortions, selectedSectionFilter, search]);

  // Handle Teacher Assignment
  const handleOpenAssign = (course) => {
    setSelectedCourse(course);
    setSelectedTeacherId(course.teacher_id?.toString() || (teachers[0]?.id?.toString() || "1"));
    setAssignModalOpen(true);
  };

  const handleSaveTeacherAssignment = async (e) => {
    e.preventDefault();
    if (!selectedCourse) return;
    const tid = parseInt(selectedTeacherId, 10);
    const tObj = teachers.find((t) => t.id === tid);
    const teacherName = tObj ? tObj.full_name : "Assigned Faculty";

    try {
      await courseApi.assignTeacher(selectedCourse.id, tid, teacherName);
      setCourses((prev) =>
        prev.map((c) =>
          c.id === selectedCourse.id
            ? { ...c, teacher_id: tid, teacher_name: teacherName }
            : c
        )
      );
      toast.success(
        `Teacher ${teacherName} assigned to ${selectedCourse.course_name} (${selectedCourse.class_name} - Sec ${selectedCourse.section})`,
        "Assignment Confirmed"
      );
      setAssignModalOpen(false);
      loadData();
    } catch (err) {
      toast.error("Could not assign teacher to course.", "Assignment Error");
    }
  };

  // Handle Add / Edit Course
  const handleOpenAdd = (portion = null) => {
    setEditingCourseId(null);
    setNewCourseData({
      class_name: portion?.class_name || "Class 1",
      section: portion?.section || "A",
      course_name: "",
      max_marks: 100,
      teacher_id: teachers[0]?.id || 1,
      teacher_name: teachers[0]?.full_name || "Teacher",
      enrollment_limit: 100,
      room: "Room 101",
    });
    setAddModalOpen(true);
  };

  const handleOpenEdit = (course) => {
    setEditingCourseId(course.id);
    setNewCourseData({
      class_name: course.class_name || "Class 1",
      section: course.section || "A",
      course_name: course.course_name || course.name || "",
      max_marks: course.max_marks || 100,
      teacher_id: course.teacher_id || teachers[0]?.id || 1,
      teacher_name: course.teacher_name || "Teacher",
      enrollment_limit: course.enrollment_limit || 100,
      room: course.room || "Room 101",
    });
    setAddModalOpen(true);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();

    // 1. Validate course name
    const nameVal = validateName(newCourseData.course_name, "Course / Subject Name");
    if (!nameVal.isValid) {
      toast.warning(nameVal.message, "Validation Error");
      return;
    }

    // 2. Validate max marks
    const maxMarks = parseInt(newCourseData.max_marks, 10);
    if (!Number.isInteger(maxMarks) || maxMarks < 1) {
      toast.error("Maximum marks must be a whole number greater than 0.", "Invalid Max Marks");
      return;
    }

    // 3. Validate enrollment limit (Max 100)
    const limitVal = validateEnrollmentLimit(newCourseData.enrollment_limit);
    if (!limitVal.isValid) {
      toast.error(limitVal.message, "Invalid Enrollment Limit");
      return;
    }

    try {
      const selectedTeacher = teachers.find(
        (t) => t.id === parseInt(newCourseData.teacher_id, 10)
      );
      const matchingClass = classes.find(
        (c) =>
          c.name.toLowerCase() === newCourseData.class_name.toLowerCase() &&
          c.section?.toUpperCase() === newCourseData.section?.toUpperCase()
      );
      const payload = {
        ...newCourseData,
        name: newCourseData.course_name,
        course_name: newCourseData.course_name,
        class_id: matchingClass ? matchingClass.id : undefined,
        max_marks: maxMarks,
        enrollment_limit: parseInt(newCourseData.enrollment_limit, 10),
        teacher_name: selectedTeacher ? selectedTeacher.full_name : "Teacher",
      };
      if (editingCourseId) {
        await courseApi.update(editingCourseId, payload);
        toast.success(`${payload.course_name} updated successfully.`, "Course Updated");
      } else {
        await courseApi.create(payload);
        toast.success(
          `${payload.course_name} (Max Marks ${payload.max_marks}) successfully added to ${payload.class_name} - Sec ${payload.section}`,
          "Course Created"
        );
      }
      setAddModalOpen(false);
      setEditingCourseId(null);
      loadData();
    } catch (err) {
      // Handled via client.js toast dispatcher
    }
  };

  // Handle delete course
  const handleDeleteCourse = async (id, name, sectionKey) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from ${sectionKey}?`)) return;
    try {
      await courseApi.delete(id);
      toast.success(`${name} removed from section.`, "Course Deleted");
      loadData();
    } catch (err) {
      toast.error("Could not delete course.", "Action Failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Clean Operational Header (No large colored banners) */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-xs font-semibold text-slate-500">
              Courses &amp; Faculty
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Section-wise assignments
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Course Management
          </h1>
        </div>

        <GlassButton
          variant="primary"
          onClick={() => handleOpenAdd()}
          icon={Plus}
          className="px-4 py-2 text-xs shadow-xs self-start md:self-auto bg-blue-600 hover:bg-blue-700 text-white"
        >
          Add Course
        </GlassButton>
      </div>

      {/* Filter and Section Selector Toolbar */}
      <div className="p-4 bg-slate-50 border border-slate-200 shadow-xs rounded-2xl">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search course title, code, section, or teacher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl w-full pl-11 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Jump to Section:</span>
            <select
              value={selectedSectionFilter}
              onChange={(e) => setSelectedSectionFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">All Section Portions ({sectionPortions.length})</option>
              {sectionPortions.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.key} ({p.courses.length} Courses)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section-Wise Divided Portions */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-base font-medium text-slate-500">Loading course allocations...</p>
        </div>
      ) : filteredPortions.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Courses Found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            No courses match your active search or section filter.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredPortions.map((portion, pIdx) => (
            <div
              key={portion.key}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Section Portion Header */}
              <div className="bg-slate-50/90 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl ${getAvatarGradient(
                      portion.key,
                      pIdx
                    )} text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-2xs ring-1 ring-white dark:ring-slate-900`}
                  >
                    {portion.section}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{portion.key}</h2>
                      {portion.isBoardClass ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-500/10 text-amber-900 dark:text-amber-400 border border-amber-300 dark:border-amber-500/20 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          Board Examination Track
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                          Annual Term Track
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {portion.courses.length} Assigned Subjects in Class Curriculum
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAdd(portion)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Subject</span>
                  </button>
                </div>
              </div>

              {/* Course Table for This Section */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-blue-50/70 text-blue-950 text-xs uppercase font-bold tracking-wider border-b border-blue-200">
                      <th className="py-3 px-4 w-12 text-center">Sr.</th>
                      <th className="py-3 px-4">Subject / Course Name</th>
                      <th className="py-3 px-4 text-center">Max Marks</th>
                      <th className="py-3 px-4 text-center">Enrollment Limit</th>
                      <th className="py-3 px-4">Classroom / Lab</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {portion.courses.map((course, cIdx) => (
                      <tr key={course.id} className="hover:bg-slate-50/80 bg-white transition-colors">
                        <td className="py-3.5 px-4 text-center font-medium text-slate-400">
                          {cIdx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{course.course_name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {course.max_marks || 100}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            Max {course.enrollment_limit || 100}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                          {course.room || "Classroom"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(course)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Course"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCourse(course.id, course.course_name, portion.key)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Course"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Teacher Modal */}
      <TeacherAssignmentModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        selectedCourse={selectedCourse}
        teachers={teachers}
        selectedTeacherId={selectedTeacherId}
        setSelectedTeacherId={setSelectedTeacherId}
        onSubmit={handleSaveTeacherAssignment}
      />

      {/* Add New Course Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 relative">
            <button
              onClick={() => { setAddModalOpen(false); setEditingCourseId(null); }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingCourseId ? "Edit Course" : "Add Course to Section"}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingCourseId
                    ? "Update the subject name, maximum marks, and faculty allocation."
                    : "Configure curriculum subject, max marks, enrollment limit, and faculty allocation."}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Class Level
                  </label>
                  <select
                    value={newCourseData.class_name}
                    onChange={(e) => setNewCourseData({ ...newCourseData, class_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium focus:outline-none focus:border-blue-600 bg-white dark:bg-slate-800"
                  >
                    {[
                      "Playgroup",
                      "Nursery",
                      "Prep",
                      "Class 1",
                      "Class 2",
                      "Class 3",
                      "Class 4",
                      "Class 5",
                      "Class 6",
                      "Class 7",
                      "Class 8",
                      "Class 9",
                      "Class 10",
                    ].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Section
                  </label>
                  <select
                    value={newCourseData.section}
                    onChange={(e) => setNewCourseData({ ...newCourseData, section: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium focus:outline-none focus:border-blue-600 bg-white dark:bg-slate-800"
                  >
                    {["A", "B", "C", "D"].map((s) => (
                      <option key={s} value={s}>
                        Section {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Subject / Course Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics, English, Physics"
                  value={newCourseData.course_name}
                  onChange={(e) => setNewCourseData({ ...newCourseData, course_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium focus:outline-none focus:border-blue-600 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Max Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={newCourseData.max_marks}
                    onChange={(e) => setNewCourseData({ ...newCourseData, max_marks: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium focus:outline-none focus:border-blue-600 bg-white dark:bg-slate-800"
                    title="Admin-defined maximum marks for this course"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Used as the total for marksheets</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Enrollment Cap
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newCourseData.enrollment_limit}
                    onChange={(e) => setNewCourseData({ ...newCourseData, enrollment_limit: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium focus:outline-none focus:border-blue-600 bg-white dark:bg-slate-800"
                    title="Maximum enrollment limit is 100 students"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Max 100 limit</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Assign Subject Teacher
                </label>
                <select
                  value={newCourseData.teacher_id}
                  onChange={(e) => {
                    const tid = parseInt(e.target.value, 10);
                    const selected = teachers.find((t) => t.id === tid);
                    setNewCourseData({
                      ...newCourseData,
                      teacher_id: tid,
                      teacher_name: selected ? selected.full_name : "Teacher",
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium focus:outline-none focus:border-blue-600 bg-white dark:bg-slate-800"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.teacher_code || "Faculty"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={() => { setAddModalOpen(false); setEditingCourseId(null); }}
                  className="px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm font-bold shadow-xs"
                >
                  {editingCourseId ? "Update Course" : "Save Subject Allocation"}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManager;
