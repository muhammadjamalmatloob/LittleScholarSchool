import React, { useState, useEffect, useMemo, useCallback } from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { GlassButton } from "../components/ui/GlassButton";
import { CustomPdfViewerModal } from "../components/ui/CustomPdfViewerModal";
import { useToast } from "../context/ToastContext";
import { timetableApi, DAYS_OF_WEEK, DAILY_PERIODS, FRIDAY_PERIODS } from "../api/timetable";
import { TimetableSlotModal } from "../components/TimetableSlotModal";
import { classApi } from "../api/classes";
import { teacherApi } from "../api/teachers";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  Calendar,
  Clock,
  Printer,
  UserCheck,
  Building2,
  BookOpen,
  Coffee,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  Award,
  Layers,
  Loader2,
  Plus,
  Edit2,
  Trash2,
} from "lucide-react";

// Gradient palette for class section avatars
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

export const Timetable = () => {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = !user || ["admin", "principal"].includes(user?.role);

  const [viewMode, setViewMode] = useState("daily"); // 'daily' (Daily List) or 'weekly' (Weekly Grid)
  const [dailyRoutineType, setDailyRoutineType] = useState("daily"); // 'daily' or 'friday'
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [printScope, setPrintScope] = useState("all"); // 'all' or 'single'
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  // Modal and Supporting Entities State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSlotData, setModalSlotData] = useState({});
  const [allClasses, setAllClasses] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [toastMessage, setToastMessage] = useState("");

  const fetchTimetables = useCallback(async () => {
    try {
      setLoading(true);
      const data = await timetableApi.getSectionTimetables();
      const list = Array.isArray(data) ? data : [];
      setSections(list);
      if (list.length > 0 && !selectedClass) {
        setSelectedClass(list[0].class_name);
        setSelectedSection(list[0].section);
      }
    } catch (err) {
      console.error("Failed to load section timetables:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    fetchTimetables();
  }, [fetchTimetables]);

  useEffect(() => {
    const loadSupportingData = async () => {
      try {
        const [clsRes, tchRes, subRes] = await Promise.allSettled([
          classApi.getAll(),
          teacherApi.getAll({ limit: 100 }),
          client.get("/subjects"),
        ]);
        if (clsRes.status === "fulfilled" && Array.isArray(clsRes.value)) {
          setAllClasses(clsRes.value);
        }
        if (tchRes.status === "fulfilled") {
          const tItems = tchRes.value?.items || (Array.isArray(tchRes.value) ? tchRes.value : []);
          setAllTeachers(tItems);
        }
        if (subRes.status === "fulfilled" && Array.isArray(subRes.value?.data)) {
          setAllSubjects(subRes.value.data);
        }
      } catch (err) {
        console.warn("Failed to load supporting timetable data:", err);
      }
    };
    loadSupportingData();
  }, []);

  const effectiveClasses = useMemo(() => {
    if (allClasses.length > 0) return allClasses;
    return sections.map((s) => ({
      id: s.id,
      name: s.class_name,
      section: s.section,
    }));
  }, [allClasses, sections]);

  const handleOpenSlotModal = (slotData = {}) => {
    let targetClassId = slotData.class_id;
    if (!targetClassId) {
      const foundClass = sections.find(
        (s) =>
          s.class_name.toLowerCase() === selectedClass.toLowerCase() &&
          s.section.toUpperCase() === selectedSection.toUpperCase()
      ) || sections[0];
      targetClassId = foundClass?.id || (effectiveClasses[0]?.id || "");
    }
    setModalSlotData({
      ...slotData,
      class_id: targetClassId,
    });
    setIsModalOpen(true);
  };

  const handleSaveSlot = async (payload) => {
    await timetableApi.create(payload);
    setToastMessage(`Period ${payload.period_number} on ${payload.day_of_week} updated successfully.`);
    setTimeout(() => setToastMessage(""), 4000);
    await fetchTimetables();
  };

  const handleDeleteSlot = async (slotId) => {
    await timetableApi.delete(slotId);
    setToastMessage("Period slot removed successfully.");
    setTimeout(() => setToastMessage(""), 4000);
    await fetchTimetables();
  };

  // Unique class list
  const classList = useMemo(() => {
    return Array.from(new Set(sections.map((s) => s.class_name))).filter(Boolean);
  }, [sections]);

  // Available sections for the currently selected class
  const availableSections = useMemo(() => {
    if (!selectedClass || selectedClass === "all") return [];
    return Array.from(
      new Set(
        sections
          .filter((s) => s.class_name.toLowerCase() === selectedClass.toLowerCase())
          .map((s) => s.section)
      )
    ).filter(Boolean);
  }, [sections, selectedClass]);

  // Cascading handler for Class selection
  const handleClassChange = (e) => {
    const val = e.target.value;
    setSelectedClass(val);
    if (val === "all") {
      setSelectedSection("all");
      return;
    }
    const secs = sections
      .filter((s) => s.class_name.toLowerCase() === val.toLowerCase())
      .map((s) => s.section);
    if (viewMode === "weekly") {
      setSelectedSection(secs[0] || "");
    } else {
      if (selectedSection !== "all" && secs.includes(selectedSection)) {
        // Keep section if valid for new class
      } else {
        setSelectedSection("all");
      }
    }
  };

  // Handler for Section selection
  const handleSectionChange = (e) => {
    setSelectedSection(e.target.value);
  };

  // Seamless view mode switcher between Daily List and Weekly Grid
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === "weekly") {
      let targetClass = selectedClass;
      if (!targetClass || targetClass === "all") {
        targetClass = classList[0] || (sections[0] ? sections[0].class_name : "");
        setSelectedClass(targetClass);
      }
      const secs = sections
        .filter((s) => s.class_name.toLowerCase() === targetClass.toLowerCase())
        .map((s) => s.section);
      if (!selectedSection || selectedSection === "all" || !secs.includes(selectedSection)) {
        setSelectedSection(secs[0] || "");
      }
    }
  };

  // Filtered sections for Daily List view
  const filteredDailySections = useMemo(() => {
    if (selectedClass === "all" || !selectedClass) return sections;
    return sections.filter((s) => {
      const matchClass = s.class_name.toLowerCase() === selectedClass.toLowerCase();
      const matchSec =
        selectedSection === "all" ||
        !selectedSection ||
        s.section.toUpperCase() === selectedSection.toUpperCase();
      return matchClass && matchSec;
    });
  }, [sections, selectedClass, selectedSection]);

  // Specific single section for Weekly Grid view (since grid inspects one class at a time)
  const activeWeeklySection = useMemo(() => {
    if (!sections || sections.length === 0) return null;
    const match = sections.find(
      (s) =>
        s.class_name.toLowerCase() === selectedClass.toLowerCase() &&
        s.section.toUpperCase() === selectedSection.toUpperCase()
    );
    return match || sections[0];
  }, [sections, selectedClass, selectedSection]);

  const handlePrint = (scope = "all") => {
    setPrintScope(scope);
    setPdfModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold">Loading section routines & master timetables...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-xl shadow-emerald-600/30 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header (Clean Minimalist Operational Header) */}
      <div className="print:hidden pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Academic Routines
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Period 1 designates official Class Incharge
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Section-Wise Timetable
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canManage && (
            <button
              type="button"
              onClick={() => handleOpenSlotModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98] transition shadow-xs shadow-emerald-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add / Schedule Slot</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handlePrint("all")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:white hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition shadow-2xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>
              Print All ({viewMode === "weekly" ? "Weekly Grid" : dailyRoutineType === "friday" ? "Friday" : "Daily"})
            </span>
          </button>
          <button
            type="button"
            onClick={() => handlePrint("single")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98] transition shadow-xs shadow-blue-600/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Current Section</span>
          </button>
        </div>
      </div>

      {/* Screen Toolbar: Established Soft Indigo Control Bar */}
      <div className="print:hidden bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-3 sm:p-4 flex flex-wrap justify-between items-center gap-4">
        {/* Sleek Segmented Button: Seamlessly Flip Between "Daily List" and "Weekly Grid" */}
        <div className="bg-blue-200/50 dark:bg-blue-950/60 p-1 rounded-xl inline-flex flex-wrap items-center gap-1 border border-blue-200/60 dark:border-blue-800/50">
          <button
            type="button"
            onClick={() => handleViewModeChange("daily")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition active:scale-[0.98] flex items-center gap-2 cursor-pointer ${
              viewMode === "daily"
                ? "bg-white text-blue-700 shadow-sm rounded-lg"
                : "text-blue-900/70 hover:text-blue-900 hover:bg-white/50 dark:text-blue-300 dark:hover:text-white dark:hover:bg-blue-900/50"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily List</span>
          </button>

          <button
            type="button"
            onClick={() => handleViewModeChange("weekly")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition active:scale-[0.98] flex items-center gap-2 cursor-pointer ${
              viewMode === "weekly"
                ? "bg-white text-blue-700 shadow-sm rounded-lg"
                : "text-blue-900/70 hover:text-blue-900 hover:bg-white/50 dark:text-blue-300 dark:hover:text-white dark:hover:bg-blue-900/50"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Weekly Grid</span>
          </button>
        </div>

        {/* Cascading Dropdowns: "Select Class" and "Select Section" */}
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === "daily" && (
            <div className="bg-blue-200/50 dark:bg-blue-950/60 p-1 rounded-xl inline-flex items-center gap-1 border border-blue-200/60 dark:border-blue-800/50 mr-1">
              <button
                type="button"
                onClick={() => setDailyRoutineType("daily")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  dailyRoutineType === "daily"
                    ? "bg-white text-blue-700 shadow-sm rounded-lg"
                    : "text-blue-900/70 hover:text-blue-900 hover:bg-white/50 dark:text-blue-300 dark:hover:text-white dark:hover:bg-blue-900/50"
                }`}
              >
                Mon–Thu, Sat
              </button>
              <button
                type="button"
                onClick={() => setDailyRoutineType("friday")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  dailyRoutineType === "friday"
                    ? "bg-white text-blue-700 shadow-sm rounded-lg"
                    : "text-blue-900/70 hover:text-blue-900 hover:bg-white/50 dark:text-blue-300 dark:hover:text-white dark:hover:bg-blue-900/50"
                }`}
              >
                Friday
              </button>
            </div>
          )}

          {/* 1. Select Class */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-950 dark:text-blue-200 shrink-0">
              Select Class:
            </span>
            <select
              value={selectedClass}
              onChange={handleClassChange}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs transition"
            >
              {viewMode === "daily" && <option value="all">All Classes</option>}
              {classList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Select Section (Cascading, dependent on Class) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-950 dark:text-blue-200 shrink-0">
              Select Section:
            </span>
            <select
              value={selectedSection}
              onChange={handleSectionChange}
              disabled={selectedClass === "all" || availableSections.length === 0}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {viewMode === "daily" && <option value="all">All Sections</option>}
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TIMETABLE CONTENT DISPLAY */}
      {/* ========================================================================= */}
      <div className="space-y-8">
        {/* VIEW MODE 1: WEEKLY GRID */}
        {viewMode === "weekly" ? (
          activeWeeklySection ? (
            <div
              key={activeWeeklySection.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden"
            >
              {/* Section Header with Gradient Avatar and Brand Incharge Badge */}
              <div className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl ${getAvatarGradient(
                      activeWeeklySection.class_name + activeWeeklySection.section,
                      activeWeeklySection.id
                    )} text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-2xs`}
                  >
                    {activeWeeklySection.section}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {activeWeeklySection.class_name} - Section {activeWeeklySection.section}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                        Weekly Master Grid
                      </span>
                      {activeWeeklySection.isBoardExam && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          Board Matriculation Track
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Venue: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeWeeklySection.room}</span> • Academic Session 2024-2025
                    </p>
                  </div>
                </div>

                {/* Class Incharge Badge */}
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 rounded-md px-2.5 py-0.5 text-xs font-semibold">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Class Incharge (Period 1):</span>
                  <span className="font-bold text-blue-950 dark:text-blue-100">
                    {activeWeeklySection.first_lecture_teacher}
                  </span>
                </div>
              </div>

              {/* Unified Border System Weekly Grid Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse border border-slate-200 dark:border-slate-700">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs uppercase font-bold tracking-wider">
                      <th className="py-3.5 px-4 border border-slate-200 dark:border-slate-700 w-40 text-center shrink-0">
                        Time Slots
                      </th>
                      {DAYS_OF_WEEK.map((day) => (
                        <th
                          key={day}
                          className="py-3.5 px-4 border border-slate-200 dark:border-slate-700 text-center min-w-[175px]"
                        >
                          <span className="font-extrabold">{day}</span>
                          {day === "Friday" && (
                            <span className="block text-[10px] font-medium text-blue-600 dark:text-blue-400 lowercase">
                              (early dismissal)
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                    {(activeWeeklySection.weekly_matrix || []).map((row, rIdx) => {
                      if (row.isBreak) {
                        return (
                          <tr
                            key={rIdx}
                            className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium"
                          >
                            <td className="py-3 px-4 border border-slate-200 dark:border-slate-700 text-center text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                              <div className="flex items-center justify-center gap-1.5 font-semibold">
                                <Coffee className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                                <span>{row.period}</span>
                              </div>
                              <span className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                                {row.time}
                              </span>
                            </td>
                            <td
                              colSpan={DAYS_OF_WEEK.length}
                              className="py-3 px-4 border border-slate-200 dark:border-slate-700 text-center font-medium text-xs tracking-wide text-slate-600 dark:text-slate-300"
                            >
                              School Recess & Refreshment Break
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={rIdx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition-colors">
                          {/* First Column: Time Slot */}
                          <td className="py-3 px-4 border border-slate-200 dark:border-slate-700 text-center bg-slate-50/40 dark:bg-slate-800/40 shrink-0">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs uppercase tracking-wide">
                              {row.period}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium mt-0.5 block">
                              {row.time}
                            </span>
                          </td>

                          {/* Subsequent Columns: Days of the Week */}
                          {DAYS_OF_WEEK.map((day) => {
                            const slot = row.slots?.[day];
                            if (!slot) {
                              return (
                                <td
                                  key={day}
                                  onClick={() =>
                                    canManage &&
                                    handleOpenSlotModal({
                                      class_id: activeWeeklySection.id,
                                      class_name: activeWeeklySection.class_name,
                                      section: activeWeeklySection.section,
                                      day_of_week: day,
                                      period_number: parseInt(row.period.replace(/\D/g, ""), 10) || 1,
                                      room_number: activeWeeklySection.room,
                                    })
                                  }
                                  className={`p-3 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400 italic bg-slate-50/20 dark:bg-slate-900/20 ${
                                    canManage
                                      ? "hover:bg-blue-50/50 hover:text-blue-600 dark:hover:bg-slate-800/60 cursor-pointer transition"
                                      : ""
                                  }`}
                                  title={canManage ? `Click to schedule ${day} ${row.period}` : undefined}
                                >
                                  {canManage ? "+ Add" : "-"}
                                </td>
                              );
                            }

                            if (slot.isDismissal) {
                              return (
                                <td
                                  key={day}
                                  className="p-2.5 border border-slate-200 dark:border-slate-700 text-center bg-slate-50/40 dark:bg-slate-800/30 align-middle"
                                >
                                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 italic block">
                                    {slot.subject}
                                  </span>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={day}
                                onClick={() =>
                                  canManage &&
                                  handleOpenSlotModal({
                                    slot_id: slot.slot_id || slot.id,
                                    class_id: activeWeeklySection.id,
                                    class_name: activeWeeklySection.class_name,
                                    section: activeWeeklySection.section,
                                    day_of_week: day,
                                    period_number: slot.period_number || parseInt(row.period.replace(/\D/g, ""), 10) || 1,
                                    subject_id: slot.subject_id,
                                    subject_name: slot.subject,
                                    teacher_id: slot.teacher_id,
                                    teacher_name: slot.teacher,
                                    room_number: slot.room,
                                    start_time: slot.start_time,
                                    end_time: slot.end_time,
                                  })
                                }
                                className={`p-2.5 border border-slate-200 dark:border-slate-700 align-top bg-slate-50/10 dark:bg-slate-900/10 min-w-[175px] ${
                                  canManage ? "cursor-pointer group" : ""
                                }`}
                                title={canManage ? "Click to edit slot" : undefined}
                              >
                                {/* Tactile Class Session Card */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full group-hover:border-blue-300 dark:group-hover:border-blue-700">
                                  <div className="flex items-start justify-between gap-1">
                                    <div>
                                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug block">
                                        {slot.subject}
                                      </span>
                                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 block">
                                        {slot.teacher}
                                      </span>
                                    </div>
                                    {canManage && (
                                      <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition shrink-0 opacity-0 group-hover:opacity-100" />
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-2 pt-1 border-t border-slate-50 dark:border-slate-800">
                                    <span>{slot.room}</span>
                                    {slot.isIncharge && (
                                      <span className="bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 rounded-md px-1.5 py-0.2 text-[10px] font-semibold">
                                        Incharge
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold">No section timetable found for the selected class.</p>
            </div>
          )
        ) : (
          /* VIEW MODE 2: DAILY LIST */
          filteredDailySections.map((sec) => {
            const scheduleList =
              dailyRoutineType === "daily" ? sec.daily_schedule : sec.friday_schedule;

            return (
              <div
                key={sec.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden"
              >
                {/* Section Header */}
                <div className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl ${getAvatarGradient(
                        sec.class_name + sec.section,
                        sec.id
                      )} text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      {sec.section}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {sec.class_name} - Section {sec.section}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                          {dailyRoutineType === "daily" ? "Daily Routine (Mon - Thu, Sat)" : "Friday Routine (Early Dismissal)"}
                        </span>
                        {sec.isBoardExam && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            Board Matriculation Track
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Venue: <span className="font-semibold text-slate-700 dark:text-slate-300">{sec.room}</span> • Academic Session 2024-2025
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Class Incharge Badge */}
                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 rounded-md px-2.5 py-0.5 text-xs font-semibold">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>Class Incharge (Period 1):</span>
                      <span className="font-bold text-blue-950 dark:text-blue-100">
                        {sec.first_lecture_teacher}
                      </span>
                    </div>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenSlotModal({
                            class_id: sec.id,
                            class_name: sec.class_name,
                            section: sec.section,
                            room_number: sec.room,
                            day_of_week: dailyRoutineType === "daily" ? "Monday" : "Friday",
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Add Slot</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Table for this Section */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-700">
                        <th className="py-3 px-4 w-32">Period Slot</th>
                        <th className="py-3 px-4 w-44 text-center">Time</th>
                        <th className="py-3 px-4">Subject / Activity</th>
                        <th className="py-3 px-4">Subject Teacher</th>
                        <th className="py-3 px-4 text-center">Classroom / Lab</th>
                        <th className="py-3 px-4 text-center">Status / Tag</th>
                        {canManage && <th className="py-3 px-4 text-center w-20">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {scheduleList.map((item, pIdx) => {
                        if (item.isBreak) {
                          return (
                            <tr key={pIdx} className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                              <td className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                <Coffee className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                                <span>{item.period}</span>
                              </td>
                              <td className="py-3 px-4 text-center text-xs font-mono text-slate-500 dark:text-slate-400">{dailyRoutineType === "daily" ? "10:15 - 10:45 AM" : "10:15 - 10:35 AM"}</td>
                              <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{item.subject}</td>
                              <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">{item.teacher}</td>
                              <td className="py-3 px-4 text-center text-slate-500 dark:text-slate-400 text-xs">{item.room}</td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  Break
                                </span>
                              </td>
                              {canManage && <td className="py-3 px-4 text-center text-slate-400">-</td>}
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={pIdx}
                            className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                              item.isIncharge ? "bg-blue-50/30 dark:bg-blue-950/30" : ""
                            }`}
                          >
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <span>{item.period}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {dailyRoutineType === "daily"
                                ? DAILY_PERIODS[pIdx]?.time
                                : FRIDAY_PERIODS[pIdx]?.time}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                              {item.subject}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {item.teacher}
                                </span>
                                {item.isIncharge && (
                                  <span className="bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 rounded-md px-2 py-0.5 text-[11px] font-semibold">
                                    Class Incharge
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-400 text-xs font-medium">
                              {item.room}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                Academic Lecture
                              </span>
                            </td>
                            {canManage && (
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenSlotModal({
                                      slot_id: item.slot_id || item.id,
                                      class_id: sec.id,
                                      class_name: sec.class_name,
                                      section: sec.section,
                                      day_of_week: dailyRoutineType === "daily" ? "Monday" : "Friday",
                                      period_number:
                                        item.period_number ||
                                        (pIdx >= 3 ? pIdx : pIdx + 1),
                                      subject_id: item.subject_id,
                                      subject_name: item.subject,
                                      teacher_id: item.teacher_id,
                                      teacher_name: item.teacher,
                                      room_number: item.room,
                                      start_time: item.start_time,
                                      end_time: item.end_time,
                                    })
                                  }
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                  title="Edit Slot"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Timetable Slot Management Modal */}
      <TimetableSlotModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={modalSlotData}
        classes={effectiveClasses}
        teachers={allTeachers}
        subjects={allSubjects}
        onSave={handleSaveSlot}
        onDelete={handleDeleteSlot}
      />

      {/* ========================================================================= */}
      {/* BEAUTIFUL PRINTABLE TIMETABLE FORMAT */}
      {/* ========================================================================= */}
      <div className="hidden print:block bg-white p-6 max-w-5xl mx-auto space-y-10">
        {/* Print Letterhead */}
        <div className="border-b-2 border-blue-900 pb-5 mb-5 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-blue-900 text-white font-black text-2xl flex items-center justify-center">
              SMS
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-blue-950 uppercase tracking-tight">
                Little Scholar School System
              </h1>
              <p className="text-sm font-semibold text-slate-600">
                Official Section-Wise Class Routine & Master Timetable
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Main Campus • Tel: +92 42 3588 9000 • timetable@littlescholar.edu.pk
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="px-3 py-1 rounded bg-blue-50 text-blue-900 font-bold text-xs uppercase tracking-wider border border-blue-200">
              Official Schedule
            </span>
            <p className="text-xs text-slate-600 mt-2 font-bold">
              Schedule Type: {viewMode === "weekly" ? "Weekly Master Grid" : dailyRoutineType === "friday" ? "Friday Routine" : "Daily (Mon – Thu, Sat)"}
            </p>
            <p className="text-xs font-mono text-slate-500">Academic Year: 2024-2025</p>
          </div>
        </div>

        {/* Section Tables: One table for each section */}
        {(printScope === "all" ? sections : (viewMode === "weekly" && activeWeeklySection ? [activeWeeklySection] : filteredDailySections)).map((sec) => {
          if (viewMode === "weekly") {
            const matrix = sec.weekly_matrix || [];
            return (
              <div key={sec.id} className="break-inside-avoid border border-slate-300 rounded-lg p-4 mb-8">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-lg font-bold text-blue-950 uppercase">
                      {sec.class_name} - Section {sec.section} (Weekly Master Grid)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Room: {sec.room} • {sec.isBoardExam ? "Board Exam Candidate Section" : "Regular Curriculum"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                      Class Incharge (Period 1): {sec.first_lecture_teacher}
                    </span>
                  </div>
                </div>

                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                      <th className="py-2 px-3 border border-slate-300 w-28 text-center">Period / Time</th>
                      {DAYS_OF_WEEK.map((d) => (
                        <th key={d} className="py-2 px-3 border border-slate-300 text-center">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {matrix.map((row, rIdx) => {
                      if (row.isBreak) {
                        return (
                          <tr key={rIdx} className="bg-slate-100 text-slate-500 font-medium text-center">
                            <td className="py-2 px-3 border border-slate-300">{row.period}</td>
                            <td colSpan={DAYS_OF_WEEK.length} className="py-2 px-3 border border-slate-300 uppercase">
                              Recess & Refreshment Break ({row.time})
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={rIdx}>
                          <td className="py-2 px-3 border border-slate-300 font-bold text-center bg-slate-50">
                            <div>{row.period}</div>
                            <div className="text-[10px] font-mono text-slate-500">{row.time}</div>
                          </td>
                          {DAYS_OF_WEEK.map((d) => {
                            const slot = row.slots?.[d];
                            return (
                              <td key={d} className="py-2 px-2.5 border border-slate-300 align-top">
                                {slot ? (
                                  <div>
                                    <div className="font-bold text-slate-900">{slot.subject}</div>
                                    <div className="text-[11px] text-slate-600">{slot.teacher}</div>
                                    <div className="text-[10px] text-slate-400">{slot.room}</div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          }

          const scheduleList =
            dailyRoutineType === "daily" ? sec.daily_schedule : sec.friday_schedule;

          return (
            <div key={sec.id} className="break-inside-avoid border border-slate-300 rounded-lg p-4 mb-8">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-bold text-blue-950 uppercase">
                    {sec.class_name} - Section {sec.section}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Room: {sec.room} • {sec.isBoardExam ? "Board Exam Candidate Section" : "Regular Curriculum"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                    Class Incharge (Period 1): {sec.first_lecture_teacher}
                  </span>
                </div>
              </div>

              <table className="w-full text-left text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                    <th className="py-2 px-3 border border-slate-300">Period</th>
                    <th className="py-2 px-3 border border-slate-300 text-center">Timing</th>
                    <th className="py-2 px-3 border border-slate-300">Subject</th>
                    <th className="py-2 px-3 border border-slate-300">Faculty Teacher</th>
                    <th className="py-2 px-3 border border-slate-300 text-center">Venue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {scheduleList.map((item, pIdx) => (
                    <tr key={pIdx} className={item.isBreak ? "bg-slate-100 text-slate-500 font-medium" : ""}>
                      <td className="py-2 px-3 border border-slate-300 font-bold">
                        {item.period}
                      </td>
                      <td className="py-2 px-3 border border-slate-300 font-mono text-center">
                        {dailyRoutineType === "daily" ? DAILY_PERIODS[pIdx]?.time : FRIDAY_PERIODS[pIdx]?.time}
                      </td>
                      <td className="py-2 px-3 border border-slate-300 font-semibold">
                        {item.subject}
                      </td>
                      <td className="py-2 px-3 border border-slate-300">
                        {item.teacher} {item.isIncharge && "(Class Incharge)"}
                      </td>
                      <td className="py-2 px-3 border border-slate-300 text-center">
                        {item.room}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Timetable Signatures - Principal Only */}
        <div className="pt-8 flex justify-end text-xs text-slate-600">
          <div className="w-64 text-center">
            <div className="h-12 border-b border-dashed border-slate-400 mb-1.5" />
            <p className="font-bold text-slate-900 text-sm">Principal Signature & Stamp</p>
            <p className="text-[11px] text-slate-500">Little Scholar School System</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Custom Formatted In-App PDF Modal Viewer */}
      {/* ========================================================================= */}
      <CustomPdfViewerModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        title={`Academic Class Routine & Master Timetable`}
        subtitle={`Schedule Format: ${viewMode === "weekly" ? "Weekly Master Grid" : dailyRoutineType === "friday" ? "Friday Routine" : "Daily Schedule"} • Scope: ${printScope === "all" ? "All Class Sections" : `${selectedClass} (Sec ${selectedSection})`}`}
      >
        <div className="space-y-6 font-bierstadt">
          {(printScope === "all" ? sections : (viewMode === "weekly" && activeWeeklySection ? [activeWeeklySection] : filteredDailySections)).map((sec) => {
            if (viewMode === "weekly") {
              const matrix = sec.weekly_matrix || [];
              return (
                <div key={sec.id} className="border border-slate-300 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                    <div>
                      <h3 className="text-sm font-bold text-blue-950 uppercase">
                        {sec.class_name} - Section {sec.section} (Weekly Master Grid)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Assigned Room: {sec.room} • {sec.isBoardExam ? "Board Exam Candidate Section" : "Regular Academic Curriculum"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        Class Incharge: {sec.first_lecture_teacher}
                      </span>
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                        <th className="py-2 px-3 border border-slate-300 w-24 text-center">Period</th>
                        {DAYS_OF_WEEK.map((d) => (
                          <th key={d} className="py-2 px-3 border border-slate-300 text-center">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {matrix.map((row, rIdx) => {
                        if (row.isBreak) {
                          return (
                            <tr key={rIdx} className="bg-slate-100 text-slate-500 font-medium text-center">
                              <td className="py-1.5 px-3 border border-slate-300 font-bold">{row.period}</td>
                              <td colSpan={DAYS_OF_WEEK.length} className="py-1.5 px-3 border border-slate-300 uppercase text-[11px]">
                                Recess & Refreshment Break ({row.time})
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={rIdx}>
                            <td className="py-2 px-2 border border-slate-300 font-bold text-center bg-slate-50">
                              <div>{row.period}</div>
                              <div className="text-[10px] font-mono text-slate-500">{row.time}</div>
                            </td>
                            {DAYS_OF_WEEK.map((d) => {
                              const slot = row.slots?.[d];
                              return (
                                <td key={d} className="py-2 px-2 border border-slate-300 align-top">
                                  {slot ? (
                                    <div>
                                      <div className="font-bold text-slate-900">{slot.subject}</div>
                                      <div className="text-[11px] text-slate-600">{slot.teacher}</div>
                                      <div className="text-[10px] text-slate-400">{slot.room}</div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            }

            const scheduleList =
              dailyRoutineType === "daily" ? sec.daily_schedule : sec.friday_schedule;

            return (
              <div key={sec.id} className="border border-slate-300 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-sm font-bold text-blue-950 uppercase">
                      {sec.class_name} - Section {sec.section} ({dailyRoutineType === "friday" ? "Friday Routine" : "Daily Routine"})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Room: {sec.room} • Class Incharge: {sec.first_lecture_teacher}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Academic Year 2024-2025
                  </span>
                </div>

                <table className="w-full text-left text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                      <th className="py-2 px-3 border border-slate-300 w-16 text-center">Period</th>
                      <th className="py-2 px-3 border border-slate-300 w-32 font-mono">Timing</th>
                      <th className="py-2 px-3 border border-slate-300">Subject Paper</th>
                      <th className="py-2 px-3 border border-slate-300">Assigned Teacher</th>
                      <th className="py-2 px-3 border border-slate-300">Room</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {scheduleList && scheduleList.map((slot, sIdx) => {
                      if (slot.isBreak) {
                        return (
                          <tr key={sIdx} className="bg-slate-100 text-slate-500 font-medium text-center">
                            <td className="py-1.5 px-3 border border-slate-300">{slot.period}</td>
                            <td className="py-1.5 px-3 border border-slate-300 font-mono text-[11px]">{slot.time}</td>
                            <td colSpan={3} className="py-1.5 px-3 border border-slate-300 uppercase text-[11px]">
                              Recess & Refreshment Break
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={sIdx} className={sIdx % 2 === 1 ? "bg-slate-50/50" : ""}>
                          <td className="py-2 px-3 border border-slate-300 text-center font-bold text-slate-900">
                            {slot.period}
                          </td>
                          <td className="py-2 px-3 border border-slate-300 font-mono text-[11px] text-slate-600 font-medium">
                            {slot.time}
                          </td>
                          <td className="py-2 px-3 border border-slate-300 font-bold text-slate-900">
                            {slot.subject}
                          </td>
                          <td className="py-2 px-3 border border-slate-300 text-slate-700 font-medium">
                            {slot.teacher}
                          </td>
                          <td className="py-2 px-3 border border-slate-300 text-slate-500 font-medium">
                            {slot.room}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </CustomPdfViewerModal>
    </div>
  );
};

export default Timetable;
