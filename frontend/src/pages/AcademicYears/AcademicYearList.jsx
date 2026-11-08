import { useCallback, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Edit,
  Plus,
  Power,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Star,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  LayoutGrid,
  List,
  Layers,
  ShieldCheck,
  X,
} from "lucide-react";
import { academicYearService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { GlassButton } from "../../components/ui/GlassButton";
import { AcademicYearForm } from "./AcademicYearForm";

export const AcademicYearList = () => {
  const { hasRole } = useAuth();
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  const loadYears = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await academicYearService.getAll(true);
      // Sort: current first, then active by start_date desc, then inactive by start_date desc
      const sorted = [...(data || [])].sort((a, b) => {
        if (a.is_current) return -1;
        if (b.is_current) return 1;
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        return new Date(b.start_date) - new Date(a.start_date);
      });
      setYears(sorted);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Failed to load academic years.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadYears();
  }, [loadYears]);

  const setCurrent = async (year) => {
    try {
      await academicYearService.setCurrent(year.id);
      setSuccess(`Session "${year.year_name}" is now designated as the Active Academic Year.`);
      loadYears();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not switch academic year.");
    }
  };

  const deactivate = async (year) => {
    if (!window.confirm(`Deactivate academic year ${year.year_name}?`)) return;
    try {
      await academicYearService.deactivate(year.id);
      setSuccess(`Academic year "${year.year_name}" was archived.`);
      loadYears();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not deactivate academic year.");
    }
  };

  const reactivate = async (year) => {
    try {
      await academicYearService.update(year.id, { is_active: true });
      setSuccess(`Academic year "${year.year_name}" has been reactivated.`);
      loadYears();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not reactivate academic year.");
    }
  };

  // Metrics
  const currentYear = useMemo(() => years.find((y) => y.is_current), [years]);
  const activeCount = useMemo(() => years.filter((y) => y.is_active).length, [years]);
  const inactiveCount = useMemo(() => years.filter((y) => !y.is_active).length, [years]);

  // Filtered list
  const filteredYears = useMemo(() => {
    return years.filter((year) => {
      const matchSearch =
        !search.trim() ||
        (year.year_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (year.start_date || "").includes(search) ||
        (year.end_date || "").includes(search);

      if (!matchSearch) return false;

      if (filterStatus === "active") return year.is_active;
      if (filterStatus === "current") return year.is_current;
      if (filterStatus === "archived") return !year.is_active;
      return true;
    });
  }, [years, search, filterStatus]);

  const admin = hasRole("admin");

  return (
    <div className="space-y-6">
      {/* Top Page Header Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-950/40 dark:to-blue-900/30 border border-blue-100 dark:border-blue-800/50 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/90 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/60 flex items-center justify-center shadow-xs shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Academic Sessions & Years
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Configure school calendar terms, activate enrollment periods, and manage session archives
            </p>
          </div>
        </div>

        {admin && (
          <GlassButton
            variant="primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 shadow-sm shadow-blue-600/20 active:scale-[0.98] transition flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Academic Year</span>
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

      {/* Active Session Hero Card */}
      {currentYear && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 text-white p-6 sm:p-7 shadow-lg border border-blue-700/50">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Currently Active Academic Session</span>
              </div>
              <div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                  <span>Session {currentYear.year_name}</span>
                  <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                </h2>
                <p className="text-blue-200/80 text-sm mt-1 max-w-xl">
                  This academic term governs active fee chalans, class enrollments, and teacher workloads across the entire school.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-blue-100">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10">
                  <Calendar className="w-3.5 h-3.5 text-blue-300" />
                  <span>Start: <strong className="text-white font-mono">{currentYear.start_date}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-blue-300" />
                  <span>Concludes: <strong className="text-white font-mono">{currentYear.end_date}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
              <Link
                to="/student-promotion"
                className="px-4 py-2.5 rounded-xl bg-white text-blue-950 font-bold text-xs hover:bg-blue-50 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Student Promotions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/class-teacher-assignments"
                className="px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/20 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Teacher Assignments</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Sessions</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{years.length}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Recorded historical & future</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Terms</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{activeCount}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Eligible for operations</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Archived</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-2">{inactiveCount}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Closed academic years</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Session</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-2.5 truncate">
            {currentYear?.year_name || "None Set"}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Active school year</p>
        </div>
      </div>

      {/* Control Bar: Search, Filters, and View Mode */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by session name or date..."
              className="w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs shrink-0 cursor-pointer"
          >
            <option value="all">All Sessions ({years.length})</option>
            <option value="active">Active Sessions ({activeCount})</option>
            <option value="archived">Archived ({inactiveCount})</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* View Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-2xs">
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
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
              title="Detailed Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <GlassButton
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={loadYears}
            className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs px-3 shadow-2xs cursor-pointer"
          >
            Refresh
          </GlassButton>
        </div>
      </div>

      {/* Main Content: Grid View or Table View */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 dark:text-slate-500 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="text-sm">Loading academic sessions...</p>
        </div>
      ) : filteredYears.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
          <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Academic Sessions Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            No academic sessions match the current search or filter query.
          </p>
          {admin && (
            <button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Academic Year</span>
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredYears.map((year) => {
            const isCurrent = year.is_current;
            const isActive = year.is_active;

            return (
              <div
                key={year.id}
                className={`relative rounded-3xl p-6 transition-all duration-200 flex flex-col justify-between ${
                  isCurrent
                    ? "bg-gradient-to-b from-blue-50/80 to-white dark:from-blue-950/40 dark:to-slate-900 border-2 border-blue-500 shadow-md ring-4 ring-blue-500/10"
                    : isActive
                    ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm"
                    : "bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 opacity-80 hover:opacity-100"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                          {year.year_name || `Session #${year.id}`}
                        </h3>
                        {isCurrent && (
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                        ID: AY-{year.id}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        isCurrent
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                          : isActive
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCurrent
                            ? "bg-emerald-500 animate-pulse"
                            : isActive
                            ? "bg-blue-500"
                            : "bg-slate-400"
                        }`}
                      />
                      <span>
                        {isCurrent
                          ? "Current Active"
                          : isActive
                          ? "Active Session"
                          : "Archived"}
                      </span>
                    </span>
                  </div>

                  {/* Dates Box */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Term Start</span>
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        {year.start_date}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Term End</span>
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        {year.end_date}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                {admin && (
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isActive ? (
                        <>
                          <button
                            type="button"
                            title="Edit Session Dates"
                            onClick={() => {
                              setEditing(year);
                              setFormOpen(true);
                            }}
                            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {!isCurrent && (
                            <button
                              type="button"
                              title="Archive Session"
                              onClick={() => deactivate(year)}
                              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => reactivate(year)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reactivate</span>
                        </button>
                      )}
                    </div>

                    {isActive && !isCurrent && (
                      <button
                        type="button"
                        onClick={() => setCurrent(year)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs active:scale-[0.98] transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>Set Active</span>
                      </button>
                    )}

                    {isCurrent && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Active System Year</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed Table View */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-bold">Session Name</th>
                  <th className="px-6 py-4 font-bold">Start Date</th>
                  <th className="px-6 py-4 font-bold">End Date</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredYears.map((year) => {
                  const isCurrent = year.is_current;
                  const isActive = year.is_active;

                  return (
                    <tr
                      key={year.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isCurrent
                          ? "bg-blue-50/40 dark:bg-blue-950/20 font-semibold"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-base">
                            {year.year_name || `Session #${year.id}`}
                          </span>
                          {isCurrent && (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300 text-xs">
                        {year.start_date}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300 text-xs">
                        {year.end_date}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isCurrent
                              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                              : isActive
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCurrent
                                ? "bg-emerald-500 animate-pulse"
                                : isActive
                                ? "bg-blue-500"
                                : "bg-slate-400"
                            }`}
                          />
                          <span>
                            {isCurrent
                              ? "Current Active"
                              : isActive
                              ? "Active Session"
                              : "Archived"}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {admin && isActive && (
                            <>
                              <button
                                type="button"
                                title="Edit Dates"
                                onClick={() => {
                                  setEditing(year);
                                  setFormOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {!isCurrent && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setCurrent(year)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs active:scale-[0.98] transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <Star className="w-3.5 h-3.5" />
                                    <span>Set Active</span>
                                  </button>
                                  <button
                                    type="button"
                                    title="Archive Session"
                                    onClick={() => deactivate(year)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                                  >
                                    <Power className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </>
                          )}

                          {admin && !isActive && (
                            <button
                              type="button"
                              onClick={() => reactivate(year)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reactivate</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <AcademicYearForm
        isOpen={formOpen}
        initialYear={editing}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          setSuccess(editing ? "Academic year updated." : "Academic year created.");
          loadYears();
        }}
      />
    </div>
  );
};

export default AcademicYearList;
