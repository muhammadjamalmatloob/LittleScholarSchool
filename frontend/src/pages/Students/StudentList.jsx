import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { studentApi, getStudents, deleteStudent, restoreStudent, getClassRank } from "../../api/students";
import { getApiBaseUrl } from "../../api/client";
import { classApi, getClasses } from "../../api/classes";
import { academicYearApi } from "../../api/academicYears";
import { useAuth } from "../../context/AuthContext";
import { useLicense } from "../../context/LicenseContext";
import { useToast } from "../../context/ToastContext";
import { StudentForm } from "./StudentForm";
import { StudentImport } from "./StudentImport";
import { PromoteStudentModal } from "./PromoteStudentModal";
import { BulkPromotionModal } from "./BulkPromotionModal";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { CustomPdfViewerModal } from "../../components/ui/CustomPdfViewerModal";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassButton } from "../../components/ui/GlassButton";
import { GlassBadge } from "../../components/ui/GlassBadge";
import {
  Users,
  UserPlus,
  UploadCloud,
  Search,
  Eye,
  Edit,
  Trash2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  GraduationCap,
  Printer,
  ArrowUpDown,
  Filter,
  Download,
  FileSpreadsheet,
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

const formatClassSection = (className, section) => {
  if (!className) return section ? `Section ${section}` : "-";
  // Clean up existing suffixes like "-A" or "-Sec A" to prevent repetition
  const base = className.replace(/[-–]\s*[A-Z]$/i, "").replace(/[-–]\s*Sec\s*[A-Z]$/i, "").trim();
  const sec = section || (className.match(/[-–]\s*([A-Z])$/i) || [])[1];
  return sec ? `${base} - Section ${sec}` : base;
};

export const StudentList = () => {
  const { hasPermission } = useAuth();
  const { hasModule } = useLicense();
  const showAttendance = false;
  const showFees = hasModule ? hasModule("fees") : true;
  const toast = useToast();

  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [searchParams] = useSearchParams();

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      const token = localStorage.getItem("access_token");
      const url = `${getApiBaseUrl()}/students/export/excel`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export student roster.");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `Little_Scholar_Students_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Student directory exported to Excel successfully!");
    } catch (err) {
      toast.error(err.message || "Could not download Excel file.");
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const token = localStorage.getItem("access_token");
      const url = `${getApiBaseUrl()}/students/export/csv`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export student CSV roster.");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `Little_Scholar_Students_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Student directory exported to CSV successfully!");
    } catch (err) {
      toast.error(err.message || "Could not download CSV file.");
    } finally {
      setExportingCsv(false);
    }
  };

  // Filters & Sorting state
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [selectedBaseClass, setSelectedBaseClass] = useState(() => searchParams.get("class") || "all");
  const [selectedSection, setSelectedSection] = useState(() => searchParams.get("section") || "all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  const [sortBy, setSortBy] = useState("class_asc"); // 'class_asc' (PG to 10), 'name_asc', 'name_desc', 'roll_asc', 'roll_desc'
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [studentToPromote, setStudentToPromote] = useState(null);
  const [isBulkPromoteModalOpen, setIsBulkPromoteModalOpen] = useState(false);

  const currentSelectedClassId = useMemo(() => {
    if (selectedBaseClass === "all") return null;
    const match = classes.find((c) => {
      const nameMatch = c.name && c.name.toLowerCase().includes(selectedBaseClass.toLowerCase());
      if (selectedSection !== "all") {
        return nameMatch && (c.section || "").toUpperCase() === selectedSection.toUpperCase();
      }
      return nameMatch;
    });
    return match ? match.id : null;
  }, [classes, selectedBaseClass, selectedSection]);

  const openPromoteStudentModal = (st) => {
    setStudentToPromote(st);
    setIsPromoteModalOpen(true);
  };

  // Load Classes once
  useEffect(() => {
    getClasses()
      .then((data) => setClasses(data || []))
      .catch((err) => console.error("Error loading classes:", err));

    academicYearApi.getAll()
      .then((data) => setAcademicYears(data || []))
      .catch((err) => console.error("Error loading academic years:", err));
  }, []);

  // Sync filters with URL query parameters (e.g. from ClassManager or Navbar search)
  useEffect(() => {
    const urlClass = searchParams.get("class");
    const urlSection = searchParams.get("section");
    const urlSearch = searchParams.get("search");

    if (urlClass) setSelectedBaseClass(urlClass);
    if (urlSection) setSelectedSection(urlSection);
    if (urlSearch !== null && urlSearch !== undefined) setSearch(urlSearch);
  }, [searchParams]);

  // Unique base classes (e.g. Playgroup, Nursery, Prep, Class 1 to 10)
  const baseClassOptions = useMemo(() => {
    const set = new Set();
    classes.forEach((c) => {
      if (c.name) set.add(c.name);
    });
    return Array.from(set).sort((a, b) => getClassRank(a) - getClassRank(b));
  }, [classes]);

  // Unique sections (e.g. A, B, C, D)
  const sectionOptions = useMemo(() => {
    const set = new Set();
    classes.forEach((c) => {
      if (c.section) set.add(c.section.toUpperCase());
    });
    return Array.from(set).sort();
  }, [classes]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        skip: (page - 1) * pageSize,
        limit: 100,
      };
      if (search) params.search = search;
      if (selectedBaseClass !== "all") params.base_class = selectedBaseClass;
      if (selectedSection !== "all") params.section = selectedSection;
      if (selectedStatus !== "all") params.is_active = selectedStatus === "active";
      if (selectedAcademicYear !== "all") params.academic_year_id = parseInt(selectedAcademicYear, 10);
      if (selectedGender !== "all") params.gender = selectedGender;
      params.sort_by = sortBy;

      const res = await getStudents(params);
      let list = res.items || [];

      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter((s) => {
          const name = (s.name || "").toLowerCase();
          const roll = (s.formatted_roll_number || s.roll_number || "").toString().toLowerCase();
          const parent = (s.parent_name || s.father_name || "").toLowerCase();
          return name.includes(q) || roll.includes(q) || parent.includes(q);
        });
      }

      if (selectedBaseClass !== "all") {
        list = list.filter((s) => (s.class_name || "").toLowerCase().includes(selectedBaseClass.toLowerCase()));
      }
      if (selectedSection !== "all") {
        list = list.filter((s) => (s.section || "").toUpperCase() === selectedSection.toUpperCase());
      }
      if (selectedStatus !== "all") {
        list = list.filter((s) => (selectedStatus === "active" ? s.is_active : !s.is_active));
      }
      if (selectedAcademicYear !== "all") {
        list = list.filter((s) => s.academic_year_id === parseInt(selectedAcademicYear, 10));
      }
      if (selectedGender !== "all") {
        list = list.filter((s) => {
          const g = String(s.gender || "").trim().toLowerCase();
          return selectedGender === "male" ? g.startsWith("m") : g.startsWith("f");
        });
      }

      if (sortBy === "class_asc") {
        list.sort((a, b) => {
          const rankA = getClassRank(a.class_name);
          const rankB = getClassRank(b.class_name);
          if (rankA !== rankB) return rankA - rankB;
          const secA = (a.section || "A").toUpperCase();
          const secB = (b.section || "A").toUpperCase();
          if (secA !== secB) return secA.localeCompare(secB);
          return (a.formatted_roll_number || a.roll_number || "").toString().localeCompare((b.formatted_roll_number || b.roll_number || "").toString());
        });
      } else if (sortBy === "name_asc") {
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      } else if (sortBy === "name_desc") {
        list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
      } else if (sortBy === "roll_asc") {
        list.sort((a, b) => (a.formatted_roll_number || a.roll_number || "").toString().localeCompare((b.formatted_roll_number || b.roll_number || "").toString()));
      } else if (sortBy === "roll_desc") {
        list.sort((a, b) => (b.formatted_roll_number || b.roll_number || "").toString().localeCompare((a.formatted_roll_number || a.roll_number || "").toString()));
      }

      setStudents(list);
      setTotal(res.total || list.length);
    } catch (err) {
      setError("Failed to load students. Using cached directory.");
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedBaseClass, selectedSection, selectedStatus, selectedGender, selectedAcademicYear, sortBy]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;

    try {
      await deleteStudent(studentToDelete.id);
      setSuccess(`Student ${studentToDelete.name} moved to inactive students.`);
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to remove student.");
    } finally {
      setDeleteModalOpen(false);
      setStudentToDelete(null);
    }
  };

  const handleRestore = async (st) => {
    try {
      await restoreStudent(st.id);
      toast.success(`${st.name} restored to active students!`);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not restore student.");
    }
  };

  const openCreateModal = () => {
    setEditingStudent(null);
    setIsFormOpen(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  // PDF Export Functionality via in-app PDF Modal Viewer
  const handleExportPDF = () => {
    setPdfModalOpen(true);
  };

  const pdfStats = useMemo(() => {
    const totalCount = students.length;
    const maleCount = students.filter((s) => {
      const g = String(s.gender || "").trim().toLowerCase();
      return g.startsWith("m") || g === "boy";
    }).length;
    const femaleCount = students.filter((s) => {
      const g = String(s.gender || "").trim().toLowerCase();
      return g.startsWith("f") || g === "girl";
    }).length;
    const paidCount = students.filter((s) => s.fee_status === 'paid').length;
    const pendingCount = totalCount - paidCount;
    const withAtt = students.filter((s) => typeof s.attendance_percentage === 'number' && s.attendance_percentage > 0);
    const totalAtt = withAtt.reduce((acc, curr) => acc + curr.attendance_percentage, 0);
    const avgAttendance = withAtt.length > 0 ? (totalAtt / withAtt.length).toFixed(1) : '—';

    const isSpecificClass = selectedBaseClass !== 'all';
    const isSpecificSection = selectedSection !== 'all';
    let title = 'INSTITUTIONAL MASTER STUDENT DIRECTORY';
    let subtitle = 'Comprehensive Enrollment Callset: Playgroup to Class 10';
    if (isSpecificClass && isSpecificSection) {
      title = "CLASS ATTENDANCE & ACADEMIC DIRECTORY";
      subtitle = `${selectedBaseClass} — Section ${selectedSection}`;
    } else if (isSpecificClass) {
      title = "CLASS ACADEMIC DIRECTORY & CALLSET";
      subtitle = `${selectedBaseClass} — All Sections`;
    } else if (isSpecificSection) {
      title = "SECTIONAL STUDENT DIRECTORY";
      subtitle = `All Classes — Section ${selectedSection}`;
    }

    return { totalCount, maleCount, femaleCount, paidCount, pendingCount, avgAttendance, title, subtitle };
  }, [students, selectedBaseClass, selectedSection]);

  const renderFeeBadge = (status) => {
    const s = status?.toLowerCase();
    if (s === "paid") {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
          Paid
        </span>
      );
    }
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Clean Operational Header (No large colored banners) */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Academic Enrollment
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Playgroup to Class 10
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl text-slate-900 dark:text-white font-bold tracking-tight mt-1">
            Student Directory & Roster
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Excel Export Button */}
          <GlassButton
            variant="secondary"
            icon={FileSpreadsheet}
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="px-3.5 py-2 text-xs shadow-2xs"
          >
            {exportingExcel ? "Exporting..." : "Export Excel"}
          </GlassButton>

          {/* CSV Export Button */}
          <GlassButton
            variant="secondary"
            icon={Download}
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="px-3.5 py-2 text-xs shadow-2xs"
          >
            {exportingCsv ? "Exporting..." : "Export CSV"}
          </GlassButton>

          {/* PDF Export Button */}
          <GlassButton
            variant="secondary"
            icon={Printer}
            onClick={handleExportPDF}
            className="px-3.5 py-2 text-xs shadow-2xs"
          >
            Export PDF
          </GlassButton>

          <GlassButton
            variant="white"
            icon={UploadCloud}
            onClick={() => setIsImportOpen(true)}
            className="px-3.5 py-2 text-xs shadow-xs"
          >
            Import CSV
          </GlassButton>

          {/* Promote Students to Next Class */}
          {hasPermission("students", "update") && (
            <button
              type="button"
              onClick={() => setIsBulkPromoteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-[0.97] transition-all duration-300 cursor-pointer"
              title="Promote students to next class (whole school or selected class)"
            >
              <GraduationCap className="w-4 h-4" strokeWidth={2} />
              <span>Promote Students</span>
            </button>
          )}

          {/* Primary App Accent CTA */}
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 active:scale-[0.97] transition-all duration-300 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" strokeWidth={1.75} />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-2xl text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="font-bold text-rose-500 cursor-pointer text-base">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="font-bold text-emerald-500 cursor-pointer text-base">
            ×
          </button>
        </div>
      )}

      {/* 2. Unified Pastel Indigo Control Bar */}
      <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/30 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name or roll number..."
              className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl placeholder-slate-400 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition shadow-2xs"
            />
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={selectedBaseClass}
              onChange={(e) => setSelectedBaseClass(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition font-medium shadow-2xs"
            >
              <option value="all">All Classes (PG to 10)</option>
              {baseClassOptions.map((cName) => (
                <option key={cName} value={cName}>
                  {cName}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition font-medium shadow-2xs"
            >
              <option value="all">All Sections</option>
              {sectionOptions.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Session Filter */}
          <div>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition font-medium shadow-2xs"
            >
              <option value="all">All Sessions</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id.toString()}>
                  Session {ay.year_name} {ay.is_current ? "★" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Gender Filter */}
          <div>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition font-medium shadow-2xs"
            >
              <option value="all">All Genders</option>
              <option value="male">Male (Boys)</option>
              <option value="female">Female (Girls)</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition font-medium shadow-2xs"
            >
              <option value="class_asc">Sort: Class-wise (PG to 10)</option>
              <option value="name_asc">Sort: Name (A to Z)</option>
              <option value="name_desc">Sort: Name (Z to A)</option>
              <option value="roll_asc">Sort: Roll Number (Asc)</option>
              <option value="roll_desc">Sort: Roll Number (Desc)</option>
            </select>
          </div>
        </div>

        {/* Filter Badges Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-blue-200 dark:border-blue-800/50 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-blue-950 dark:text-blue-200 font-semibold">Status:</span>
            <button
              type="button"
              onClick={() => setSelectedStatus("all")}
              className={`px-2.5 py-1 rounded-lg text-xs transition duration-200 cursor-pointer ${
                selectedStatus === "all"
                  ? "bg-blue-600 text-white font-semibold shadow-xs shadow-blue-600/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs"
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("active")}
              className={`px-2.5 py-1 rounded-lg text-xs transition duration-200 cursor-pointer ${
                selectedStatus === "active"
                  ? "bg-blue-600 text-white font-semibold shadow-xs shadow-blue-600/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs"
              }`}
            >
              Active Enrolled
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("inactive")}
              className={`px-2.5 py-1 rounded-lg text-xs transition duration-200 cursor-pointer ${
                selectedStatus === "inactive"
                  ? "bg-blue-600 text-white font-semibold shadow-xs shadow-blue-600/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs"
              }`}
            >
              Inactive
            </button>
          </div>

          <span className="text-blue-950 dark:text-blue-200 font-medium">
            Showing <strong className="text-blue-950 dark:text-white font-bold">{students.length}</strong> matching students
          </span>
        </div>
      </div>

      {/* 3. Student Table Card: Premium Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading student directory...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              No students match the selected criteria
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Try adjusting your class, section, or search filters, or enroll a new student.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/40">
                  <th className="px-5 py-3.5">Roll Number</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Class & Section</th>
                  <th className="px-5 py-3.5 text-center">Gender</th>
                  <th className="px-5 py-3.5">Guardian / Parent</th>
                  {showFees && <th className="px-5 py-3.5 text-center">Fee Status</th>}
                  {showAttendance && <th className="px-5 py-3.5 text-center">Attendance</th>}
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {students.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150"
                  >
                    {/* Roll Number (Session+Class+Section) */}
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-md bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-900/60 inline-block">
                        {s.formatted_roll_number || s.roll_number}
                      </span>
                    </td>

                    {/* Student Name */}
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/students/${s.id}`}
                        className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2.5 transition"
                      >
                        <div
                          className={`w-8 h-8 rounded-full ${getAvatarGradient(
                            s.name,
                            idx
                          )} text-white font-bold text-xs flex items-center justify-center shrink-0 ring-2 ring-white dark:ring-slate-900 shadow-2xs`}
                        >
                          {s.name ? s.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <span className="truncate">{s.name}</span>
                      </Link>
                    </td>

                    {/* Class & Section */}
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 inline-block">
                        {formatClassSection(s.class_name, s.section)}
                      </span>
                    </td>

                    {/* Gender */}
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          String(s.gender || "").toLowerCase().startsWith("f")
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50"
                        }`}
                      >
                        {String(s.gender || "").toLowerCase().startsWith("f") ? "Female" : "Male"}
                      </span>
                    </td>

                    {/* Guardian Name */}
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 text-xs">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{s.parent_name || "-"}</div>
                      {s.contact_number && (
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {s.contact_number}
                        </div>
                      )}
                    </td>

                    {/* Fee Status */}
                    {showFees && (
                      <td className="px-5 py-3.5 text-center">
                        {renderFeeBadge(s.fee_status)}
                      </td>
                    )}

                    {/* Attendance */}
                    {showAttendance && (
                      <td className="px-5 py-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                        {typeof s.attendance_percentage === "number" && s.attendance_percentage > 0 ? (
                          `${s.attendance_percentage}%`
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 font-normal text-xs" title="No attendance recorded yet">
                            —
                          </span>
                        )}
                      </td>
                    )}

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/students/${s.id}`}
                          title="View Profile"
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {hasPermission("students", "update") && !s.is_active && (
                          <button
                            type="button"
                            onClick={() => handleRestore(s)}
                            title="Restore Inactive Student"
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission("students", "update") && s.is_active && (
                          <button
                            type="button"
                            onClick={() => openPromoteStudentModal(s)}
                            title="Promote / Transfer Class"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                          >
                            <GraduationCap className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission("students", "update") && s.is_active && (
                          <button
                            type="button"
                            onClick={() => openEditModal(s)}
                            title="Edit Student"
                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission("students", "delete") && s.is_active && (
                          <button
                            type="button"
                            onClick={() => {
                              setStudentToDelete(s);
                              setDeleteModalOpen(true);
                            }}
                            title="Delete Student"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <StudentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={(student, wasUpdated) => {
          fetchStudents();
          setSuccess(
            wasUpdated
              ? `${student.name} updated successfully.`
              : `${student.name} enrolled successfully.`
          );
        }}
        initialStudent={editingStudent}
      />

      <StudentImport
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={fetchStudents}
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setStudentToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Remove Student"
        message={`Move ${studentToDelete?.name} to inactive students? Their attendance, fees, and enrollment history will be preserved.`}
        confirmText="Move to Inactive"
      />

      {/* Individual Student Promotion Modal */}
      <PromoteStudentModal
        isOpen={isPromoteModalOpen}
        onClose={() => {
          setIsPromoteModalOpen(false);
          setStudentToPromote(null);
        }}
        student={studentToPromote}
        classes={classes}
        academicYears={academicYears}
        onSuccess={() => fetchStudents()}
      />

      {/* Bulk / Class-wide Promotion Modal */}
      <BulkPromotionModal
        isOpen={isBulkPromoteModalOpen}
        onClose={() => setIsBulkPromoteModalOpen(false)}
        classes={classes}
        academicYears={academicYears}
        initialSelectedClassId={currentSelectedClassId}
        onSuccess={() => fetchStudents()}
      />

      {/* ========================================================================= */}
      {/* Custom Formatted In-App PDF Modal Viewer */}
      {/* ========================================================================= */}
      <CustomPdfViewerModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        title={pdfStats.title}
        subtitle={pdfStats.subtitle}
      >
        <div className="space-y-6 font-bierstadt">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center text-xs">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Total Learners</p>
              <p className="text-base font-black text-blue-950 mt-0.5">{pdfStats.totalCount} Students</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Gender Split</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">{pdfStats.maleCount} Boys • {pdfStats.femaleCount} Girls</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Fee Cleared</p>
              <p className="text-base font-bold text-emerald-700 mt-0.5">{pdfStats.paidCount} Paid</p>
            </div>

            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Academic Year</p>
              <p className="text-base font-bold text-slate-700 mt-0.5">
                {academicYears.find((ay) => ay.id.toString() === selectedAcademicYear)?.year_name ||
                  academicYears.find((ay) => ay.is_current)?.year_name ||
                  "2024-2025"}
              </p>
            </div>
          </div>

          {/* Student Records Table */}
          <div className="w-full">
            <table className="w-full text-left text-xs border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                  <th className="py-2 px-2.5 border border-slate-300 w-10 text-center">Sr.</th>
                  <th className="py-2 px-3 border border-slate-300">Roll Number</th>
                  <th className="py-2 px-3 border border-slate-300">Student Name</th>
                  <th className="py-2 px-3 border border-slate-300">Class & Section</th>
                  <th className="py-2 px-2.5 border border-slate-300 text-center">Gender</th>
                  <th className="py-2 px-3 border border-slate-300">Parent / Guardian</th>
                  <th className="py-2 px-3 border border-slate-300 font-mono">Contact</th>
                  <th className="py-2 px-2.5 border border-slate-300 text-center">Fee Status</th>
                                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((st, idx) => (
                  <tr key={st.id || idx} className={idx % 2 === 1 ? "bg-slate-50/50" : ""}>
                    <td className="py-1.5 px-2.5 border border-slate-300 text-center text-slate-500 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-3 border border-slate-300 font-mono font-bold text-blue-900">
                      {st.formatted_roll_number || st.roll_number || `2024-${st.id}`}
                    </td>
                    <td className="py-1.5 px-3 border border-slate-300 font-bold text-slate-900">
                      {st.name}
                    </td>
                    <td className="py-1.5 px-3 border border-slate-300 text-slate-700">
                      {st.class_name || "Unassigned"}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 text-center font-semibold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          String(st.gender || "").toLowerCase().startsWith("f")
                            ? "bg-rose-50 text-rose-800 border border-rose-200"
                            : "bg-blue-50 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {String(st.gender || "").toLowerCase().startsWith("f") ? "Female" : "Male"}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 border border-slate-300 text-slate-600">
                      {st.parent_name || "-"}
                    </td>
                    <td className="py-1.5 px-3 border border-slate-300 font-mono text-[11px] text-slate-600">
                      {st.contact_number || "-"}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          st.fee_status === "paid"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {st.fee_status || "Pending"}
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>


        </div>
      </CustomPdfViewerModal>
    </div>
  );
};
export default StudentList;
