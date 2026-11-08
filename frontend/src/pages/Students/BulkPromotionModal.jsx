import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  GraduationCap,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Users,
  ChevronRight,
  Filter,
} from "lucide-react";
import { promotionApi } from "../../api/promotion";
import { getClassRank } from "../../api/students";
import { useToast } from "../../context/ToastContext";

export const BulkPromotionModal = ({
  isOpen,
  onClose,
  classes = [],
  academicYears = [],
  initialSelectedClassId = null,
  onSuccess,
}) => {
  const toast = useToast();

  // Mode: "all" or "single"
  const [scopeMode, setScopeMode] = useState(initialSelectedClassId ? "single" : "all");
  const [selectedClassId, setSelectedClassId] = useState(
    initialSelectedClassId ? initialSelectedClassId.toString() : ""
  );

  const [fromYearId, setFromYearId] = useState("");
  const [toYearId, setToYearId] = useState("");
  const [unconditional, setUnconditional] = useState(true);
  const [makeDestinationCurrent, setMakeDestinationCurrent] = useState(false);

  // Mapping state: { [classId]: targetClassId | "graduate" }
  const [classMapping, setClassMapping] = useState({});

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("configure"); // 'configure' | 'preview'

  // Sort classes logically
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const rankA = getClassRank(a.name);
      const rankB = getClassRank(b.name);
      if (rankA !== rankB) return rankA - rankB;
      const secA = (a.section || "A").toUpperCase();
      const secB = (b.section || "A").toUpperCase();
      return secA.localeCompare(secB);
    });
  }, [classes]);

  // Compute default academic years & mapping on open
  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setPreviewData(null);
    setStep("configure");

    // Scope selection
    if (initialSelectedClassId) {
      setScopeMode("single");
      setSelectedClassId(initialSelectedClassId.toString());
    } else {
      setScopeMode("all");
      if (sortedClasses.length > 0) {
        setSelectedClassId(sortedClasses[0].id.toString());
      }
    }

    // Set academic years:
    // If we have years, pick destination as the current active year, and from as the one right before it (or vice versa)
    if (academicYears.length > 0) {
      const activeIdx = academicYears.findIndex((y) => y.is_current);
      if (activeIdx > 0) {
        setFromYearId(academicYears[activeIdx - 1].id.toString());
        setToYearId(academicYears[activeIdx].id.toString());
      } else if (activeIdx === 0 && academicYears.length > 1) {
        setFromYearId(academicYears[0].id.toString());
        setToYearId(academicYears[1].id.toString());
      } else {
        const active = academicYears.find((y) => y.is_current) || academicYears[0];
        setFromYearId(active.id.toString());
        const other = academicYears.find((y) => y.id !== active.id) || active;
        setToYearId(other.id.toString());
      }
    }

    // Generate intelligent default mapping
    // Group classes by section so Class 1-A -> Class 2-A, Class 1-B -> Class 2-B
    const newMap = {};
    for (let i = 0; i < sortedClasses.length; i++) {
      const curr = sortedClasses[i];
      const sec = (curr.section || "").toUpperCase();

      // Find next class in the list with matching section
      let nextMatch = null;
      for (let j = i + 1; j < sortedClasses.length; j++) {
        const cand = sortedClasses[j];
        if (
          getClassRank(cand.name) > getClassRank(curr.name) &&
          (cand.section || "").toUpperCase() === sec
        ) {
          nextMatch = cand;
          break;
        }
      }

      // Fallback: any class with higher rank
      if (!nextMatch && i + 1 < sortedClasses.length) {
        nextMatch = sortedClasses[i + 1];
      }

      // If at terminal class (e.g. Class 10), graduate
      if (getClassRank(curr.name) >= 20 || !nextMatch) {
        newMap[curr.id] = "graduate";
      } else {
        newMap[curr.id] = nextMatch.id.toString();
      }
    }
    setClassMapping(newMap);
  }, [isOpen, initialSelectedClassId, classes, academicYears, sortedClasses]);

  if (!isOpen) return null;

  const handleScopeChange = (mode) => {
    setScopeMode(mode);
    setPreviewData(null);
    setStep("configure");
    if (mode === "single" && !selectedClassId && sortedClasses.length > 0) {
      setSelectedClassId(sortedClasses[0].id.toString());
    }
  };

  const handleMappingChange = (fromClassId, targetVal) => {
    setClassMapping((prev) => ({
      ...prev,
      [fromClassId]: targetVal,
    }));
    setPreviewData(null);
  };

  const buildPayload = () => {
    const fromId = parseInt(fromYearId, 10);
    const toId = parseInt(toYearId, 10);

    const promotion_mapping = {};

    if (scopeMode === "single") {
      const clsId = parseInt(selectedClassId, 10);
      const targetVal = classMapping[clsId];
      promotion_mapping[clsId] = targetVal === "graduate" || !targetVal ? null : parseInt(targetVal, 10);
    } else {
      Object.entries(classMapping).forEach(([k, v]) => {
        promotion_mapping[k] = v === "graduate" || !v ? null : parseInt(v, 10);
      });
    }

    return {
      from_academic_year_id: fromId,
      to_academic_year_id: toId,
      promotion_mapping,
      min_attendance: unconditional ? 0.0 : 75.0,
      min_marks: unconditional ? 0.0 : 40.0,
      student_overrides: {},
      make_destination_current: makeDestinationCurrent,
      class_id: scopeMode === "single" ? parseInt(selectedClassId, 10) : null,
    };
  };

  const handleGeneratePreview = async () => {
    setError("");
    setPreviewLoading(true);
    try {
      const payload = buildPayload();
      const res = await promotionApi.preview(payload);
      setPreviewData(res);
      setStep("preview");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not generate promotion preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecutePromotion = async () => {
    setError("");
    setExecutionLoading(true);
    try {
      const payload = buildPayload();
      const res = await promotionApi.execute(payload);
      toast.success(
        `Successfully promoted ${res.promoted_count || 0} students! (${res.graduated_count || 0} graduated)`
      );
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to execute student promotion.");
    } finally {
      setExecutionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-blue-100 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Promote Students to Next Class</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-white/20 text-white border border-white/30">
                  Bulk Advance
                </span>
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                Advance an entire class or the whole school to their next grade level
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

        {/* Navigation Step Tabs */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep("configure")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                step === "configure"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>1. Configure Scope & Progression</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button
              type="button"
              onClick={() => {
                if (previewData) setStep("preview");
                else handleGeneratePreview();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                step === "preview"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>2. Review Preview</span>
              {previewData && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-extrabold">
                  {previewData.total_students || 0}
                </span>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 font-medium shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {step === "configure" ? (
            <>
              {/* Scope Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  Promotion Scope
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleScopeChange("all")}
                    className={`p-3.5 rounded-2xl text-left border transition cursor-pointer flex items-start gap-3 ${
                      scopeMode === "all"
                        ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 text-blue-950 dark:text-blue-200 shadow-xs ring-1 ring-blue-600"
                        : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">Whole School (All Classes)</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Promote all active students across all classes (PG to Class 10) simultaneously
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleScopeChange("single")}
                    className={`p-3.5 rounded-2xl text-left border transition cursor-pointer flex items-start gap-3 ${
                      scopeMode === "single"
                        ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-600 text-emerald-950 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-600"
                        : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Filter className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">Selected Class Only</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Promote students of one specific class to their next grade
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* If Single Class Mode: Class Selection */}
              {scopeMode === "single" && (
                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Targeted Class to Promote:
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Source Class
                      </label>
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-2xs"
                      >
                        {sortedClasses.map((cls) => (
                          <option key={cls.id} value={cls.id.toString()}>
                            {cls.name} {cls.section ? `- Section ${cls.section}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Destination Next Class
                      </label>
                      <select
                        value={classMapping[selectedClassId] || "graduate"}
                        onChange={(e) => handleMappingChange(selectedClassId, e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-900 dark:text-emerald-300 focus:outline-none focus:border-emerald-500 shadow-2xs"
                      >
                        {sortedClasses.map((cls) => (
                          <option key={cls.id} value={cls.id.toString()}>
                            {cls.name} {cls.section ? `- Section ${cls.section}` : ""}
                          </option>
                        ))}
                        <option value="graduate">🎓 Graduate / Mark Alumni</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Academic Sessions Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Origin Session (Promoting From)</span>
                  </label>
                  <select
                    value={fromYearId}
                    onChange={(e) => setFromYearId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-2xs"
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id.toString()}>
                        {ay.year_name} {ay.is_current ? "★ (Active)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Destination Session (Promoting To)</span>
                  </label>
                  <select
                    value={toYearId}
                    onChange={(e) => setToYearId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-semibold text-emerald-950 dark:text-emerald-300 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id.toString()}>
                        {ay.year_name} {ay.is_current ? "★ (Active)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Class Progression Matrix (Whole School) */}
              {scopeMode === "all" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Grade Progression Mapping
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Auto-mapped sequentially (modify as needed)
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                    {sortedClasses.map((cls) => {
                      const currLabel = cls.section ? `${cls.name} - Sec ${cls.section}` : cls.name;
                      const targetVal = classMapping[cls.id] || "graduate";

                      return (
                        <div
                          key={cls.id}
                          className="px-4 py-2 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="font-bold text-slate-800 dark:text-slate-200 min-w-[140px]">
                            {currLabel}
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div className="flex-1 max-w-xs">
                            <select
                              value={targetVal}
                              onChange={(e) => handleMappingChange(cls.id, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            >
                              {sortedClasses.map((tc) => (
                                <option key={tc.id} value={tc.id.toString()}>
                                  {tc.name} {tc.section ? `- Sec ${tc.section}` : ""}
                                </option>
                              ))}
                              <option value="graduate">🎓 Graduate (Alumni)</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Promotion Options */}
              <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={unconditional}
                    onChange={(e) => setUnconditional(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>
                    Promote all enrolled students unconditionally (Standard Academic Transition)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={makeDestinationCurrent}
                    onChange={(e) => setMakeDestinationCurrent(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Set destination session as current active session after promotion</span>
                </label>
              </div>
            </>
          ) : (
            /* Step 2: Preview Results */
            <div className="space-y-4">
              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center">
                  <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                    {previewData?.total_students || 0}
                  </div>
                  <div className="text-[11px] font-bold text-blue-900 dark:text-blue-200 mt-0.5">
                    Students to Process
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {previewData?.eligible_for_promotion || 0}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">
                    Advancing to Next Grade
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-center">
                  <div className="text-xl font-black text-purple-600 dark:text-purple-400">
                    {previewData?.graduating || 0}
                  </div>
                  <div className="text-[11px] font-bold text-purple-900 dark:text-purple-200 mt-0.5">
                    Graduating / Alumni
                  </div>
                </div>
              </div>

              {/* Student Roster Preview Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-1">
                    <tr>
                      <th className="px-3.5 py-2.5">Student</th>
                      <th className="px-3.5 py-2.5">Current Class</th>
                      <th className="px-3.5 py-2.5">Target Destination</th>
                      <th className="px-3.5 py-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(previewData?.students || []).map((st) => (
                      <tr key={st.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3.5 py-2 font-bold text-slate-900 dark:text-white">
                          <div>{st.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {st.formatted_roll_number || st.roll_number}
                          </div>
                        </td>
                        <td className="px-3.5 py-2 text-slate-600 dark:text-slate-400">
                          {st.current_class_name}
                        </td>
                        <td className="px-3.5 py-2 font-semibold text-emerald-600 dark:text-emerald-400">
                          {st.new_class_name}
                        </td>
                        <td className="px-3.5 py-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              st.action === "promote"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : st.action === "graduate"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {st.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!previewData?.students || previewData.students.length === 0) && (
                      <tr>
                        <td colSpan="4" className="px-4 py-8 text-center text-slate-400">
                          No active students found in the selected origin class and session.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={previewLoading || executionLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {step === "configure" ? (
              <button
                type="button"
                onClick={handleGeneratePreview}
                disabled={previewLoading}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                {previewLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Calculating Preview...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Preview Promotion</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep("configure")}
                  disabled={executionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Back to Settings
                </button>
                <button
                  type="button"
                  onClick={handleExecutePromotion}
                  disabled={executionLoading || !previewData || previewData.total_students === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                >
                  {executionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Executing Promotion...</span>
                    </>
                  ) : (
                    <>
                      <GraduationCap className="w-4 h-4" />
                      <span>Confirm & Promote Students</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkPromotionModal;
