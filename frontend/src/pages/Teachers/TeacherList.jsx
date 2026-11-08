import { useCallback, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Edit,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  Briefcase,
  GraduationCap,
  Clock,
  Sparkles,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  CheckCircle,
  X,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import { teacherService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { GlassButton } from "../../components/ui/GlassButton";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { TeacherForm } from "./TeacherForm";

// Distinct Tailwind gradient palettes for teacher avatars
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

export const TeacherList = () => {
  const { hasPermission } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [specFilter, setSpecFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [teacherToDeactivate, setTeacherToDeactivate] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (statusFilter !== "") params.is_active = statusFilter === "true";
      const response = await teacherService.getAll(params);
      const items = response.items || [];
      setTeachers(items);
      setTotal(response.total || items.length);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Failed to load teachers.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const handleConfirmDeactivate = async () => {
    if (!teacherToDeactivate) return;
    try {
      await teacherService.delete(teacherToDeactivate.id);
      setSuccess(`${teacherToDeactivate.full_name} was deactivated.`);
      loadTeachers();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Failed to deactivate teacher.");
    } finally {
      setIsDeleteModalOpen(false);
      setTeacherToDeactivate(null);
    }
  };

  const handleReactivate = async (teacher) => {
    try {
      await teacherService.update(teacher.id, { is_active: true });
      setSuccess(`${teacher.full_name} has been reactivated.`);
      loadTeachers();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Failed to reactivate teacher.");
    }
  };

  // Specializations set
  const specializations = useMemo(() => {
    const set = new Set();
    teachers.forEach((t) => {
      if (t.specialization && t.specialization.trim()) {
        set.add(t.specialization.trim());
      }
    });
    return Array.from(set).sort();
  }, [teachers]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        `${teacher.full_name} ${teacher.teacher_code} ${teacher.email || ""} ${teacher.specialization || ""}`
          .toLowerCase()
          .includes(q);

      if (!matchSearch) return false;

      if (specFilter !== "all" && teacher.specialization !== specFilter) {
        return false;
      }

      return true;
    });
  }, [teachers, search, specFilter]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, specFilter, statusFilter, pageSize]);

  // Paginated slice
  const paginatedTeachers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTeachers.slice(startIndex, startIndex + pageSize);
  }, [filteredTeachers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTeachers.length / pageSize) || 1;

  // KPI Metrics
  const activeCount = useMemo(() => teachers.filter((t) => t.is_active).length, [teachers]);
  const inactiveCount = useMemo(() => teachers.filter((t) => !t.is_active).length, [teachers]);
  const avgLoad = useMemo(() => {
    const valid = teachers.filter((t) => t.total_periods_per_week && t.total_periods_per_week > 0);
    if (!valid.length) return 0;
    const sum = valid.reduce((acc, t) => acc + t.total_periods_per_week, 0);
    return Math.round((sum / valid.length) * 10) / 10;
  }, [teachers]);

  const canWrite = hasPermission("teachers", "create");

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-950/40 dark:to-blue-900/30 border border-blue-100 dark:border-blue-800/50 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/90 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/60 flex items-center justify-center shadow-xs shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Faculty & Staff Directory
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Manage teacher profiles, teaching workloads, subject allocations, and credentials
            </p>
          </div>
        </div>

        {canWrite && (
          <GlassButton
            variant="primary"
            onClick={() => {
              setEditingTeacher(null);
              setFormOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 shadow-sm shadow-blue-600/20 active:scale-[0.98] transition flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Faculty Member</span>
          </GlassButton>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-sm text-rose-800 dark:text-rose-200 font-medium">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError("")}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between text-sm text-emerald-800 dark:text-emerald-200 font-medium">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button
            onClick={() => setSuccess("")}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Faculty</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{total}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Registered teaching staff</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Instructors</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{activeCount}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Currently on active duty</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Average Load</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {avgLoad} <span className="text-xs font-semibold text-slate-400 font-normal">periods/wk</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Weekly teaching schedule</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subject Domains</span>
            <GraduationCap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">{specializations.length}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Academic disciplines</p>
        </div>
      </div>

      {/* Control Bar: Search, Filters, and View Switcher */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap flex-1 items-center gap-2.5 w-full">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search faculty by name, code, subject, or email..."
              className="w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs shrink-0 cursor-pointer"
          >
            <option value="">All Statuses ({total})</option>
            <option value="true">Active Only ({activeCount})</option>
            <option value="false">Inactive / On Leave ({inactiveCount})</option>
          </select>

          {/* Specialization Filter */}
          <select
            value={specFilter}
            onChange={(e) => setSpecFilter(e.target.value)}
            className="px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs shrink-0 cursor-pointer max-w-[180px]"
          >
            <option value="all">All Disciplines</option>
            {specializations.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          {/* Per Page Selector */}
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-2xs">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                viewMode === "grid"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <GlassButton
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={loadTeachers}
            className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs px-3 shadow-2xs cursor-pointer"
          >
            Refresh
          </GlassButton>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 dark:text-slate-500 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="text-sm">Loading faculty directory...</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
          <Users className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Faculty Members Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, status filters, or academic discipline.
          </p>
          {canWrite && (
            <button
              onClick={() => {
                setEditingTeacher(null);
                setFormOpen(true);
              }}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Faculty Member</span>
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* Detailed Table View */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-800/50">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Showing {paginatedTeachers.length} of {filteredTeachers.length} Faculty Records
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/90 dark:bg-slate-800/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Faculty Member</th>
                  <th className="px-5 py-3.5 font-bold">Contact</th>
                  <th className="px-5 py-3.5 font-bold">Qualification</th>
                  <th className="px-5 py-3.5 font-bold">Discipline</th>
                  <th className="px-5 py-3.5 font-bold text-center">Weekly Load</th>
                  <th className="px-5 py-3.5 font-bold text-right">Salary (PKR)</th>
                  <th className="px-5 py-3.5 font-bold text-center">Status</th>
                  <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {paginatedTeachers.map((teacher, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx;
                  const periods = teacher.total_periods_per_week || 0;
                  const loadPercent = Math.min(Math.round((periods / 30) * 100), 100);

                  return (
                    <tr
                      key={teacher.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-2xl ${getAvatarGradient(
                              teacher.full_name,
                              globalIdx
                            )} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                          >
                            {teacher.full_name ? teacher.full_name.charAt(0).toUpperCase() : "T"}
                          </div>
                          <div>
                            <Link
                              to={`/teachers/${teacher.id}`}
                              className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-sm transition block"
                            >
                              {teacher.full_name}
                            </Link>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                              {teacher.teacher_code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-3.5 text-xs">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">
                          {teacher.email || "—"}
                        </div>
                        <div className="text-slate-400 dark:text-slate-500 text-[11px] font-mono mt-0.5">
                          {teacher.phone_number || "—"}
                        </div>
                      </td>

                      {/* Qualification */}
                      <td className="px-5 py-3.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {teacher.qualification || "—"}
                      </td>

                      {/* Discipline */}
                      <td className="px-5 py-3.5">
                        {teacher.specialization ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            {teacher.specialization}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Workload */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {periods > 0 ? `${periods} Periods` : "—"}
                          </span>
                          {periods > 0 && (
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  loadPercent >= 90
                                    ? "bg-amber-500"
                                    : loadPercent >= 60
                                    ? "bg-emerald-500"
                                    : "bg-blue-500"
                                }`}
                                style={{ width: `${loadPercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Salary */}
                      <td className="px-5 py-3.5 text-right font-mono text-xs">
                        {teacher.salary != null && teacher.salary > 0 ? (
                          <span className="font-bold text-slate-900 dark:text-white">
                            Rs. {Number(teacher.salary).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            teacher.is_active
                              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              teacher.is_active ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span>{teacher.is_active ? "Active" : "Inactive"}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/teachers/${teacher.id}`}
                            title="View Faculty Profile"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          {canWrite && (
                            <>
                              <button
                                type="button"
                                title="Edit Faculty"
                                onClick={() => {
                                  setEditingTeacher(teacher);
                                  setFormOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {teacher.is_active ? (
                                <button
                                  type="button"
                                  title="Deactivate Faculty"
                                  onClick={() => {
                                    setTeacherToDeactivate(teacher);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  title="Reactivate Faculty"
                                  onClick={() => handleReactivate(teacher)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-800/40">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredTeachers.length)} of {filteredTeachers.length} faculty
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                // Only show a window of pages if there are many
                if (
                  totalPages > 7 &&
                  Math.abs(pageNum - currentPage) > 2 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages
                ) {
                  if (Math.abs(pageNum - currentPage) === 3) {
                    return (
                      <span key={pageNum} className="px-1 text-slate-400 text-xs">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-7 h-7 rounded-lg text-xs font-bold transition ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedTeachers.map((teacher, idx) => {
              const globalIdx = (currentPage - 1) * pageSize + idx;
              const periods = teacher.total_periods_per_week || 0;
              const loadPercent = Math.min(Math.round((periods / 30) * 100), 100);

              return (
                <div
                  key={teacher.id}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition flex flex-col justify-between"
                >
                  <div>
                    {/* Top Avatar & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl ${getAvatarGradient(
                            teacher.full_name,
                            globalIdx
                          )} text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs`}
                        >
                          {teacher.full_name ? teacher.full_name.charAt(0).toUpperCase() : "T"}
                        </div>
                        <div>
                          <Link
                            to={`/teachers/${teacher.id}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-base transition block"
                          >
                            {teacher.full_name}
                          </Link>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                            {teacher.teacher_code}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          teacher.is_active
                            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            teacher.is_active ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        <span>{teacher.is_active ? "Active" : "Inactive"}</span>
                      </span>
                    </div>

                    {/* Discipline & Qualification Badges */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {teacher.specialization && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {teacher.specialization}
                        </span>
                      )}
                      {teacher.qualification && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50/60 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                          {teacher.qualification}
                        </span>
                      )}
                    </div>

                    {/* Workload Meter */}
                    <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          Teaching Load
                        </span>
                        <strong className="text-slate-900 dark:text-white font-mono">
                          {periods > 0 ? `${periods} Periods/wk` : "Unassigned"}
                        </strong>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            loadPercent >= 90
                              ? "bg-amber-500"
                              : loadPercent >= 60
                              ? "bg-emerald-500"
                              : "bg-blue-500"
                          }`}
                          style={{ width: `${loadPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Contact Snippets */}
                    <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {teacher.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{teacher.email}</span>
                        </div>
                      )}
                      {teacher.phone_number && (
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{teacher.phone_number}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      {teacher.salary != null && teacher.salary > 0 ? (
                        <div className="text-xs">
                          <span className="text-slate-400 block text-[10px]">Monthly Salary</span>
                          <strong className="font-mono text-slate-900 dark:text-white font-bold">
                            Rs. {Number(teacher.salary).toLocaleString()}
                          </strong>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Salary Unassigned</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/teachers/${teacher.id}`}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition"
                      >
                        Profile
                      </Link>

                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTeacher(teacher);
                            setFormOpen(true);
                          }}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid View Pagination Footer */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredTeachers.length)} of {filteredTeachers.length} faculty
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Form Modal */}
      <TeacherForm
        isOpen={formOpen}
        initialTeacher={editingTeacher}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          setSuccess(editingTeacher ? "Teacher updated successfully." : "Teacher added successfully.");
          loadTeachers();
        }}
      />

      {/* Deactivation Confirm Modal */}
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
            ? `Are you sure you want to deactivate ${teacherToDeactivate.full_name}? This will suspend their portal and timetable teaching assignments.`
            : "Are you sure you want to deactivate this faculty member?"
        }
        confirmText="Deactivate Faculty"
        cancelText="Cancel"
      />
    </div>
  );
};

export default TeacherList;
