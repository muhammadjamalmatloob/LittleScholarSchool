import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { studentApi, deleteStudent, restoreStudent } from "../../api/students";
import { useAuth } from "../../context/AuthContext";
import { useLicense } from "../../context/LicenseContext";
import { useToast } from "../../context/ToastContext";
import { StudentForm } from "./StudentForm";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { GlassButton } from "../../components/ui/GlassButton";
import { StudentFeeDiscountModal } from "../../components/StudentFeeDiscountModal";
import { academicYearApi } from "../../api/academicYears";
import { getClasses } from "../../api/classes";
import { PromoteStudentModal } from "./PromoteStudentModal";
import {
  ArrowLeft,
  Edit,
  Trash2,
  RotateCcw,
  Calendar,
  Phone,
  Mail,
  MapPin,
  User,
  AlertCircle,
  CreditCard,
  Clock,
  GraduationCap,
  Loader2,
  Percent,
} from "lucide-react";

export const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { hasModule } = useLicense();
  const hasAttendance = false;
  const hasFees = hasModule("fees");

  const toast = useToast();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [feeStatus, setFeeStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [currentYearId, setCurrentYearId] = useState(null);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const promises = [studentApi.getById(id)];
      if (hasAttendance) {
        promises.push(studentApi.getAttendanceSummary(id));
      } else {
        promises.push(Promise.resolve(null));
      }
      if (hasFees) {
        promises.push(studentApi.getFeeStatus(id));
      } else {
        promises.push(Promise.resolve(null));
      }

      const [studentData, attData, feeData] = await Promise.all(promises);
      setStudent(studentData);
      setAttendance(attData);
      setFeeStatus(feeData);
    } catch (err) {
      setError("Failed to load student details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    academicYearApi
      .getAll()
      .then((years) => {
        const list = years || [];
        setAcademicYears(list);
        const cur = list.find((y) => y.is_current) || list[0];
        if (cur) setCurrentYearId(cur.id);
      })
      .catch((err) => console.error(err));

    getClasses()
      .then((cls) => setClasses(cls || []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    fetchStudentData();
  }, [id]);

  const handleRestoreStudent = async () => {
    try {
      await restoreStudent(id);
      toast.success(`${student.name} restored to active students!`);
      fetchStudentData();
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to restore student.";
      toast.error(msg);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteStudent(id);
      toast.success(`Student record removed successfully.`);
      navigate("/students");
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to remove student.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading student profile...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="max-w-lg mx-auto my-12 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-sm text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Unable to Load Student</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{error || "Student record not found."}</p>
        <Link to="/students" className="inline-block mt-4">
          <GlassButton variant="secondary" size="sm">
            Back to Directory
          </GlassButton>
        </Link>
      </div>
    );
  }

  const rollNumberDisplay =
    student.formatted_roll_number ||
    student.roll_number ||
    `2024-${student.class_name || "PG"}-${student.id}`;

  const canEdit = hasRole ? hasRole("admin", "principal") : true;
  const canDelete = hasRole ? hasRole("admin") : true;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Refined Frosted Back Button */}
      <div className="flex items-center">
        <Link
          to="/students"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition active:scale-[0.98] group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-transform duration-150" />
          <span>Back to Students Roster</span>
        </Link>
      </div>

      {/* Premium Compact Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        {/* Left: Avatar & Identity Details */}
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-xl sm:text-2xl flex items-center justify-center shrink-0 ring-2 ring-white dark:ring-slate-900 shadow-2xs">
            {student.name.charAt(0)}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {student.name}
              </h1>
              {student.is_active ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Active Enrolled
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Inactive
                </span>
              )}
            </div>

            <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-900/60">
                Roll #{rollNumberDisplay}
              </span>
              <span>•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {student.class_name || ""} {student.section ? `• Sec ${student.section}` : ""}
              </span>
              {student.gender && (
                <>
                  <span>•</span>
                  <span>
                    {student.gender === "M" ? "Male" : student.gender === "F" ? "Female" : student.gender}
                  </span>
                </>
              )}
              {student.admission_date && (
                <>
                  <span>•</span>
                  <span>Admitted: {student.admission_date}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Aligned Edit, Restore & Delete Actions */}
        {(canEdit || canDelete) && (
          <div className="flex items-center gap-2.5 sm:self-center shrink-0">
            {student.is_active && canEdit && (
              <button
                type="button"
                onClick={() => setIsPromoteModalOpen(true)}
                className="inline-flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl px-3.5 py-2 text-xs font-semibold transition active:scale-[0.98] cursor-pointer shadow-2xs"
                title="Promote or transfer this student to another class"
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Promote Student</span>
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold transition active:scale-[0.98] cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Edit Student</span>
              </button>
            )}

            {!student.is_active && canEdit && (
              <button
                type="button"
                onClick={handleRestoreStudent}
                className="inline-flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl px-3.5 py-2 text-xs font-semibold transition active:scale-[0.98] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Student</span>
              </button>
            )}

            {student.is_active && canDelete && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl px-3.5 py-2 text-xs font-semibold transition active:scale-[0.98] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: Dynamically adapted based on licensed modules */}
      <div className={`grid grid-cols-1 ${hasAttendance && hasFees ? "lg:grid-cols-3" : "lg:grid-cols-2"} gap-5`}>
        {/* Card 1: Personal & Guardian Info */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Personal & Guardian Info</span>
          </h3>

          <div className="space-y-3.5 text-xs">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-0.5 font-medium">
                Parent / Guardian Name
              </span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {student.parent_name || "Not provided"}
              </span>
            </div>

            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-0.5 font-medium">
                Contact Number
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-mono text-sm">
                <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                {student.contact_number || "Not provided"}
              </span>
            </div>

            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-0.5 font-medium">
                Email Address
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-sm">
                <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                {student.email || "Not provided"}
              </span>
            </div>

            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-0.5 font-medium">
                Residential Address
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200 flex items-start gap-1.5 text-sm">
                <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                <span>
                  {student.address ? `${student.address}${student.city ? `, ${student.city}` : ""}` : "Not provided"}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Attendance Status (Only rendered if attendance module is licensed) */}
        {hasAttendance && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Attendance Summary</span>
            </h3>

            <div className="text-center py-2">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {attendance && attendance.total_days > 0 ? `${attendance.percentage}%` : "—"}
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1 block">
                {attendance && attendance.total_days > 0 ? "Term Average Presence" : "No Attendance Marked Yet"}
              </span>
            </div>

            {/* Badges */}
            <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                <span>{attendance?.present ?? 0} Present</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400" />
                <span>{attendance?.absent ?? 0} Absent</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                <span>{attendance?.leave ?? 0} Leave</span>
              </div>
            </div>
          </div>
        )}

        {/* Card 3: Financial & Fee Status (Only rendered if fees module is licensed) */}
        {hasFees && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Tuition & Fees</span>
            </h3>

            <div className="text-center py-2">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Rs. {feeStatus?.total_due !== undefined ? Number(feeStatus.total_due).toLocaleString() : "0"}
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1 block">
                Pending Balance Due
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Account Status</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  (feeStatus?.status || "no_records").toLowerCase() === "paid"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : (feeStatus?.status || "").toLowerCase() === "overdue"
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                    : (feeStatus?.status || "").toLowerCase() === "no_records"
                    ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                }`}
              >
                {feeStatus?.status === "no_records"
                  ? "NO VOUCHERS"
                  : (feeStatus?.status || "PAID").toUpperCase()}
              </span>
            </div>

            {canEdit && (
              <button
                onClick={() => setIsDiscountModalOpen(true)}
                className="w-full mt-2 py-2 px-3 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Percent className="w-3.5 h-3.5" />
                <span>Configure Fee Concession / Discount</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit Student Modal */}
      <StudentForm
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={fetchStudentData}
        initialStudent={student}
      />

      {/* Confirm Deletion Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Move Student to Inactive"
        message={`Move ${student?.name} to inactive students? Their attendance, fees, and enrollment history will be preserved.`}
        confirmText="Move to Inactive"
      />

      {/* Student Fee Discount / Concession Modal */}
      <StudentFeeDiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        student={student}
        academicYearId={currentYearId}
        onSuccess={fetchStudentData}
      />

      {/* Promote Student Modal */}
      <PromoteStudentModal
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        student={student}
        classes={classes}
        academicYears={academicYears}
        onSuccess={fetchStudentData}
      />
    </div>
  );
};

export default StudentDetail;
