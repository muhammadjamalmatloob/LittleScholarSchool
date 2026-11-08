import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BriefcaseBusiness, CalendarDays, Edit, Mail, MapPin, Phone, Wallet, Trash2 } from "lucide-react";
import { teacherService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { GlassBadge } from "../../components/ui/GlassBadge";
import { GlassButton } from "../../components/ui/GlassButton";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { TeacherForm } from "./TeacherForm";

// Dynamic Tailwind gradient palettes for teacher avatars
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

const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

export const TeacherDetail = () => {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const [teacher, setTeacher] = useState(null);
  const [classes, setClasses] = useState([]);
  const [salary, setSalary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [teacherToDeactivate, setTeacherToDeactivate] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const loadTeacher = async () => {
    setLoading(true);
    try {
      const [teacherData, classData, salaryData] = await Promise.all([
        teacherService.getById(id),
        teacherService.getClasses(id),
        teacherService.getSalarySummary(id, currentMonth, currentYear),
      ]);
      setTeacher(teacherData);
      setClasses(classData.classes || []);
      setSalary(salaryData);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Failed to load teacher details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeacher();
  }, [id]);

  const handleConfirmDeactivate = async () => {
    if (!teacherToDeactivate) return;
    try {
      await teacherService.delete(teacherToDeactivate.id);
      loadTeacher();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Failed to deactivate teacher.");
    } finally {
      setIsDeleteModalOpen(false);
      setTeacherToDeactivate(null);
    }
  };

  if (loading) return <div className="py-20 text-center text-sm text-slate-400">Loading teacher profile...</div>;
  if (error || !teacher) return (
    <div className="bg-white rounded-2xl border border-slate-200 max-w-lg mx-auto p-10 text-center shadow-xs">
      <p className="text-sm text-rose-500 font-medium">{error || "Teacher not found."}</p>
      <Link to="/teachers" className="inline-block mt-4">
        <GlassButton variant="secondary" size="sm">
          Back to Faculty Directory
        </GlassButton>
      </Link>
    </div>
  );

  const canWrite = hasPermission("teachers", "update");
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to="/teachers"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition active:scale-[0.98] group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-transform duration-150" />
          <span>Back to Faculty Directory</span>
        </Link>
        <div className="flex items-center gap-2">
          {canWrite && teacher.is_active && (
            <button
              type="button"
              onClick={() => {
                setTeacherToDeactivate(teacher);
                setIsDeleteModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl px-3.5 py-2 text-xs font-semibold transition active:scale-[0.98] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Deactivate</span>
            </button>
          )}
          {canWrite && (
            <GlassButton
              variant="secondary"
              size="md"
              icon={Edit}
              onClick={() => setFormOpen(true)}
              className="text-sm px-4"
            >
              Edit Profile
            </GlassButton>
          )}
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className={`w-16 h-16 rounded-2xl ${getAvatarGradient(
              teacher.full_name,
              teacher.id
            )} flex items-center justify-center text-white text-2xl font-bold ring-2 ring-white dark:ring-slate-900 shadow-sm shrink-0`}
          >
            {teacher.full_name ? teacher.full_name.charAt(0).toUpperCase() : "T"}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{teacher.full_name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                teacher.is_active
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80"
                  : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
              }`}>
                {teacher.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 mt-0.5">{teacher.teacher_code}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {teacher.qualification || "Qualification not provided"}
              {teacher.specialization ? ` Â· ${teacher.specialization}` : ""}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <span className="text-slate-500 dark:text-slate-400">Weekly Load</span>
          <strong className="text-slate-800 dark:text-slate-200 font-bold">{teacher.total_periods_per_week ? `${teacher.total_periods_per_week} periods` : "—"}</strong>
          <span className="text-slate-500 dark:text-slate-400">Date Joined</span>
          <strong className="text-slate-800 dark:text-slate-200 font-bold">{teacher.date_of_joining || "—"}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 lg:col-span-2 space-y-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BriefcaseBusiness className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Contact & Employment Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2.5 text-slate-600">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{teacher.email || "Email not provided"}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{teacher.phone_number || "Phone not provided"}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{[teacher.address, teacher.city].filter(Boolean).join(", ") || "Address not provided"}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
              <span>DOB: {teacher.date_of_birth || "Not provided"}</span>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Assigned Classes & Sections</h3>
            {classes.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classes.map((classItem) => (
                  <div key={classItem.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="font-bold text-sm text-slate-900">{classItem.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{classItem.strength} active students</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Class teaching assignments are configured via Timetable & Courses.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Salary Summary
          </h2>
          <p className="text-xs text-slate-500">{salary?.month || "Current month"}</p>
          <div className="text-3xl font-bold text-slate-900 dark:text-white">
            Rs. {Number(salary?.net_salary || 0).toLocaleString()}
            <span className="text-xs font-medium text-slate-400 ml-1">/ month</span>
          </div>
          <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Base Salary</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">Rs. {Number(salary?.base_salary || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Deductions</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">Rs. {Number(salary?.deductions || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Payment Status</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 capitalize">
                {salary?.payment_status || "Pending"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <TeacherForm
        isOpen={formOpen}
        initialTeacher={teacher}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          setFormOpen(false);
          loadTeacher();
        }}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTeacherToDeactivate(null);
        }}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Faculty Member"
        message={
          teacherToDeactivate
            ? `Are you sure you want to deactivate ${teacherToDeactivate.full_name}? This will suspend their portal and teaching access.`
            : "Are you sure you want to deactivate this faculty member?"
        }
        confirmText="Deactivate Faculty"
        cancelText="Cancel"
      />
    </div>
  );
};
