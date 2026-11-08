import React, { useState, useEffect, useMemo, useCallback } from "react";
import { academicYearApi } from "../../api/academicYears";
import { classApi } from "../../api/classes";
import { promotionApi } from "../../api/promotion";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassButton } from "../../components/ui/GlassButton";
import { GlassBadge } from "../../components/ui/GlassBadge";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import {
  TrendingUp,
  GraduationCap,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Search,
  Download,
  RefreshCw,
  History,
  ShieldAlert,
  Loader2,
  Sparkles,
  Sliders,
  Award,
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

export const StudentPromotion = () => {
  const [activeTab, setActiveTab] = useState("promotion"); // "promotion" | "history"
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [fromYearId, setFromYearId] = useState("");
  const [toYearId, setToYearId] = useState("");
  const [promotionMapping, setPromotionMapping] = useState({});
  const [minAttendance, setMinAttendance] = useState(75);
  const [minMarks, setMinMarks] = useState(40);
  const [makeDestinationCurrent, setMakeDestinationCurrent] = useState(false);

  // Preview & overrides state
  const [previewData, setPreviewData] = useState(null);
  const [studentOverrides, setStudentOverrides] = useState({});
  const [studentSearch, setStudentSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  // Loading & feedback
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingExecute, setLoadingExecute] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [successReport, setSuccessReport] = useState(null);
  const [error, setError] = useState("");

  // Load initial data
  useEffect(() => {
    const fetchPrerequisites = async () => {
      try {
        setLoadingInitial(true);
        setError("");
        const [years, classList] = await Promise.all([
          academicYearApi.getAll(true),
          classApi.getAll(),
        ]);
        const yList = Array.isArray(years) ? years : [];
        const cList = Array.isArray(classList) ? classList : [];
        setAcademicYears(yList);
        setClasses(cList);

        // Auto-select origin (current) and next year
        const currentYear = yList.find((y) => y.is_current) || yList[0];
        if (currentYear) {
          setFromYearId(currentYear.id);
          const nextYear = yList.find((y) => y.id !== currentYear.id && y.start_date > currentYear.start_date);
          if (nextYear) {
            setToYearId(nextYear.id);
          } else if (yList.length > 1) {
            setToYearId(yList[1].id);
          }
        }
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load academic sessions and classes.");
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchPrerequisites();
  }, []);

  // Smart auto-generate class promotion mapping
  const autoMapClasses = useCallback(() => {
    if (!classes.length) return;
    const newMapping = {};

    // Sort classes by numeric level if present
    const parseClassNumber = (name) => {
      const match = name.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    classes.forEach((c) => {
      const name = c.name.toLowerCase();
      const currentNum = parseClassNumber(c.name);

      if (name.includes("playgroup")) {
        const nursery = classes.find((other) => other.name.toLowerCase().includes("nursery"));
        newMapping[c.id] = nursery ? nursery.id : null;
      } else if (name.includes("nursery")) {
        const prep = classes.find((other) => other.name.toLowerCase().includes("prep"));
        newMapping[c.id] = prep ? prep.id : null;
      } else if (name.includes("prep")) {
        const class1 = classes.find((other) => parseClassNumber(other.name) === 1);
        newMapping[c.id] = class1 ? class1.id : null;
      } else if (currentNum >= 10 || currentNum >= 12) {
        // Terminal grade: graduate
        newMapping[c.id] = null;
      } else if (currentNum > 0) {
        // Next class number with same section if possible
        const nextClass = classes.find(
          (other) =>
            parseClassNumber(other.name) === currentNum + 1 &&
            (!c.section || (other.section || "").toUpperCase() === (c.section || "").toUpperCase())
        ) || classes.find((other) => parseClassNumber(other.name) === currentNum + 1);

        newMapping[c.id] = nextClass ? nextClass.id : null;
      } else {
        newMapping[c.id] = null;
      }
    });

    setPromotionMapping(newMapping);
  }, [classes]);

  // Initial auto-mapping when classes load
  useEffect(() => {
    if (classes.length && Object.keys(promotionMapping).length === 0) {
      autoMapClasses();
    }
  }, [classes, autoMapClasses, promotionMapping]);

  // Load history tab
  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const data = await promotionApi.getHistory();
      setHistoryList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load promotion history.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Fetch Preview
  const handlePreview = async () => {
    if (!fromYearId || !toYearId) {
      setError("Please select both Origin and Destination academic sessions.");
      return;
    }
    if (fromYearId === toYearId) {
      setError("Origin and Destination sessions cannot be identical.");
      return;
    }
    try {
      setLoadingPreview(true);
      setError("");
      setSuccessReport(null);
      const data = await promotionApi.preview({
        from_academic_year_id: parseInt(fromYearId, 10),
        to_academic_year_id: parseInt(toYearId, 10),
        promotion_mapping: promotionMapping,
        min_attendance: parseFloat(minAttendance) || 75.0,
        min_marks: parseFloat(minMarks) || 40.0,
      });
      setPreviewData(data);
      setStudentOverrides({});
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to generate promotion preview.");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Toggle student override action
  const handleStudentOverride = (studentId, action) => {
    setStudentOverrides((prev) => ({
      ...prev,
      [studentId]: action,
    }));
  };

  // Execute promotion
  const handleExecute = async () => {
    try {
      setLoadingExecute(true);
      setError("");
      setConfirmModalOpen(false);
      const res = await promotionApi.execute({
        from_academic_year_id: parseInt(fromYearId, 10),
        to_academic_year_id: parseInt(toYearId, 10),
        promotion_mapping: promotionMapping,
        min_attendance: parseFloat(minAttendance) || 75.0,
        min_marks: parseFloat(minMarks) || 40.0,
        student_overrides: studentOverrides,
        make_destination_current: makeDestinationCurrent,
      });
      setSuccessReport(res);
      setPreviewData(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Promotion execution encountered an error.");
    } finally {
      setLoadingExecute(false);
    }
  };

  // Download CSV report
  const downloadReportCsv = () => {
    if (!previewData || !previewData.students) return;
    const headers = [
      "Student ID",
      "Student Name",
      "Current Roll",
      "Current Class",
      "New Class",
      "Attendance %",
      "Exam Avg %",
      "Eligibility",
      "Action Assigned",
      "Reason",
    ];
    const rows = previewData.students.map((s) => {
      const effectiveAction = studentOverrides[s.student_id] || s.action;
      return [
        s.student_id,
        `"${s.name}"`,
        s.formatted_roll_number,
        `"${s.current_class_name}"`,
        `"${s.new_class_name}"`,
        s.attendance_percentage,
        s.exam_average,
        s.eligible ? "Eligible" : "Failed",
        effectiveAction.toUpperCase(),
        `"${s.reason}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `promotion_preview_${fromYearId}_to_${toYearId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter students in preview
  const filteredStudents = useMemo(() => {
    if (!previewData || !previewData.students) return [];
    return previewData.students.filter((s) => {
      const q = studentSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.student_id.toLowerCase().includes(q) ||
        (s.formatted_roll_number || "").toLowerCase().includes(q) ||
        s.current_class_name.toLowerCase().includes(q);

      const effectiveAction = studentOverrides[s.student_id] || s.action;
      const matchesAction = actionFilter === "all" || effectiveAction === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [previewData, studentSearch, actionFilter, studentOverrides]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Page Header */}
      <GlassCard className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Annual Student Promotion
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Transition students between academic sessions, graduate terminal classes, and resequence class roll numbers.
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab("promotion")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "promotion"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Promotion Console
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Promotion Logs
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Global Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center gap-3 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Execution Success Card */}
      {successReport && (
        <GlassCard className="p-6 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Student Promotion Executed Successfully!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Session transition from <strong>{successReport.from_academic_year_name}</strong> to{" "}
                <strong>{successReport.to_academic_year_name}</strong> has been finalized. Roll numbers were sequentially reset starting at 1.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-white/70 dark:bg-slate-800/70 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-xs text-slate-500">Processed</div>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{successReport.total_processed}</div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">Promoted</div>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{successReport.promoted}</div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
                  <div className="text-xs text-amber-600 dark:text-amber-400">Repeated / Retained</div>
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{successReport.failed}</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 dark:border-blue-800/60">
                  <div className="text-xs text-blue-600 dark:text-blue-400">Graduated Alumni</div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{successReport.graduated}</div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Main Tab 1: Promotion Console */}
      {activeTab === "promotion" && (
        <div className="space-y-6">
          {/* Step 1: Configuration Form */}
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white uppercase">
                  Step 1: Session & Promotion Criteria
                </h2>
              </div>
              <GlassButton
                size="sm"
                variant="outline"
                onClick={autoMapClasses}
                className="text-xs gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Auto-Suggest Class Mappings
              </GlassButton>
            </div>

            {/* Sessions & Criteria Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Origin Academic Session */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Origin Session (From)
                </label>
                <select
                  value={fromYearId}
                  onChange={(e) => setFromYearId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium"
                >
                  <option value="">Select Origin Session</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.year_name} {y.is_current ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Academic Session */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Session (To)
                </label>
                <select
                  value={toYearId}
                  onChange={(e) => setToYearId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium"
                >
                  <option value="">Select Target Session</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.year_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min Attendance Threshold */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Passing Attendance Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minAttendance}
                  onChange={(e) => setMinAttendance(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  placeholder="e.g. 75"
                />
              </div>

              {/* Min Marks Threshold */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Passing Marks Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minMarks}
                  onChange={(e) => setMinMarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  placeholder="e.g. 40"
                />
              </div>
            </div>

            {/* Class Promotion Map Matrix */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Class Progression Matrix ({classes.length} active classes)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {classes.map((cls) => {
                  const targetVal = promotionMapping[cls.id] === undefined ? "" : (promotionMapping[cls.id] === null ? "graduate" : promotionMapping[cls.id]);
                  const sec = cls.section ? `-${cls.section}` : "";
                  return (
                    <div
                      key={cls.id}
                      className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                          {cls.name}{sec}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </div>
                      <select
                        value={targetVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPromotionMapping((prev) => ({
                            ...prev,
                            [cls.id]: val === "graduate" ? null : parseInt(val, 10),
                          }));
                        }}
                        className="px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                      >
                        <option value="">Select target</option>
                        <option value="graduate">ðŸŽ“ Graduate (Alumni)</option>
                        {classes.map((tgt) => (
                          <option key={tgt.id} value={tgt.id}>
                            {tgt.name} {tgt.section ? `(${tgt.section})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 1 Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/60 dark:border-slate-800/60">
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={makeDestinationCurrent}
                  onChange={(e) => setMakeDestinationCurrent(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Mark Target Session as Active/Current upon execution
              </label>

              <GlassButton
                onClick={handlePreview}
                disabled={loadingPreview || loadingInitial}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold gap-2"
              >
                {loadingPreview ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Evaluating Cohort...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Preview Student Progression
                  </>
                )}
              </GlassButton>
            </div>
          </GlassCard>

          {/* Step 2: Evaluation & Cohort Preview */}
          {previewData && (
            <GlassCard className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white uppercase">
                    Step 2: Promotion Cohort Evaluation
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review automated eligibility decisions and apply administrative overrides before final commitment.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <GlassButton
                    size="sm"
                    variant="outline"
                    onClick={downloadReportCsv}
                    className="text-xs gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    onClick={() => setConfirmModalOpen(true)}
                    className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-md shadow-blue-600/20"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Execute Promotion
                  </GlassButton>
                </div>
              </div>

              {/* KPI Metrics Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-xs font-medium text-slate-500">Evaluated Cohort</span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {previewData.total_students}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Eligible (Promote)</span>
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                    {previewData.eligible_for_promotion}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60">
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Retained (Repeat)</span>
                  <div className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                    {previewData.failed_students}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Graduating Alumni</span>
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                    {previewData.graduating}
                  </div>
                </div>
              </div>

              {/* Search & Action Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by student name or roll..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  {["all", "promote", "repeat", "graduate"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActionFilter(filter)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                        actionFilter === filter
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Students Table */}
              <div className="overflow-x-auto border border-slate-200/70 dark:border-slate-800/70 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 font-semibold border-b border-slate-200/70 dark:border-slate-800/70">
                    <tr>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Current Class</th>
                      <th className="py-2.5 px-3">Attendance</th>
                      <th className="py-2.5 px-3">Exam Avg</th>
                      <th className="py-2.5 px-3">Evaluation</th>
                      <th className="py-2.5 px-3">Target Progression</th>
                      <th className="py-2.5 px-3 text-right">Admin Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-slate-400">
                          No students match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s, idx) => {
                        const effectiveAction = studentOverrides[s.student_id] || s.action;
                        return (
                          <tr key={s.student_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-7 h-7 rounded-lg ${getAvatarGradient(
                                    s.name,
                                    idx
                                  )} text-white font-bold flex items-center justify-center text-[10px] shadow-sm`}
                                >
                                  {s.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200">{s.name}</div>
                                  <div className="text-[10px] text-slate-400">{s.formatted_roll_number || s.student_id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{s.current_class_name}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`font-semibold ${
                                  s.attendance_percentage >= minAttendance
                                    ? "text-emerald-600"
                                    : "text-rose-600"
                                }`}
                              >
                                {s.attendance_percentage}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`font-semibold ${
                                  s.exam_average >= minMarks
                                    ? "text-emerald-600"
                                    : "text-rose-600"
                                }`}
                              >
                                {s.exam_average}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {s.eligible ? (
                                <GlassBadge variant="success" className="text-[10px] py-0.5">
                                  Eligible
                                </GlassBadge>
                              ) : (
                                <GlassBadge variant="danger" className="text-[10px] py-0.5" title={s.reason}>
                                  Failed Criteria
                                </GlassBadge>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1 font-bold ${
                                  effectiveAction === "promote"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : effectiveAction === "repeat"
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-blue-600 dark:text-blue-400"
                                }`}
                              >
                                {effectiveAction === "promote" && "→ Promote to "}
                                {effectiveAction === "repeat" && "↺ Retain in "}
                                {effectiveAction === "graduate" && "ðŸŽ“ "}
                                {s.new_class_name}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <select
                                value={effectiveAction}
                                onChange={(e) => handleStudentOverride(s.student_id, e.target.value)}
                                className="px-2 py-1 text-[11px] rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                              >
                                <option value="promote">Force Promote</option>
                                <option value="repeat">Force Repeat</option>
                                <option value="graduate">Graduate</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Main Tab 2: Promotion History */}
      {activeTab === "history" && (
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white uppercase">
                Promotion Audit Timeline
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chronological log of session upgrades executed by school administrators.
              </p>
            </div>
            <GlassButton size="sm" variant="outline" onClick={fetchHistory} className="text-xs gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
              Refresh
            </GlassButton>
          </div>

          <div className="space-y-3">
            {historyList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No promotion sessions have been recorded yet.
              </div>
            ) : (
              historyList.map((log) => {
                let parsed = {};
                try {
                  parsed = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
                } catch {
                  parsed = {};
                }
                const formattedDate = log.created_at
                  ? new Date(log.created_at).toLocaleString()
                  : "N/A";
                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                          {log.record_id ? log.record_id.replace("_", " ") : "Annual Promotion"}
                        </span>
                        <GlassBadge variant="default" className="text-[10px]">
                          Executed by {log.user_name}
                        </GlassBadge>
                      </div>
                      <div className="text-xs text-slate-500">
                        {parsed.promoted || 0} Promoted • {parsed.repeated || 0} Repeated • {parsed.graduated || 0} Graduated
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium sm:text-right">
                      {formattedDate}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>
      )}

      {/* Double Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleExecute}
        title="Execute Annual Student Promotion?"
        message={`This action will finalize the student cohort progression, advance ${previewData?.eligible_for_promotion || 0} students to their next classes, and reset roll numbers starting at 1. This change updates live records across the database.`}
        confirmText={loadingExecute ? "Promoting..." : "Yes, Execute Promotion"}
        confirmVariant="danger"
      />
    </div>
  );
};

export default StudentPromotion;
