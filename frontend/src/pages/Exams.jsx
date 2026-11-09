import { SCHOOL_LOGO_DATA_URI } from "../assets/schoolLogo";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { examApi } from "../api/exams";
import { classApi } from "../api/classes";
import { CustomPdfViewerModal } from "../components/ui/CustomPdfViewerModal";
import {
  Award,
  Printer,
  Download,
  Save,
  BookOpen,
  User,
  Users,
  Search,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Loader2,
  Trophy,
  Medal,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Plus,
  Trash2,
} from "lucide-react";

export const Exams = () => {
  const { user } = useAuth();
  const toast = useToast();

  // Active Tab: "marksheets" | "subjects" | "merit_list"
  const [activeTab, setActiveTab] = useState("marksheets");

  // Classes & Terms State
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [availableTerms, setAvailableTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [newExamName, setNewExamName] = useState("");

  // Class Results Data (students, subjects, marks dictionary)
  const [resultsData, setResultsData] = useState({
    class_name: "",
    section: "A",
    exam_name: "",
    students: [],
    subjects: [],
    marks: {},
  });
  const [loadingResults, setLoadingResults] = useState(false);

  // Merit List Data
  const [meritData, setMeritData] = useState({
    class_name: "",
    section: "A",
    exam_name: "",
    subjects: [],
    merit_list: [],
  });
  const [loadingMerit, setLoadingMerit] = useState(false);

  // Tab 1 (Marksheets) Filter & Selection
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // Tab 2 (Subjects) Filter & Edit State
  const [selectedSubjectId, setSelectedSubjectId] = useState(""); // "" until first subject loads, "ALL", or subject name
  const [localMarks, setLocalMarks] = useState({});
  const [savingMarks, setSavingMarks] = useState(false);

  // Marksheet PDF Modal State
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfDocumentType, setPdfDocumentType] = useState("marksheet"); // "marksheet" | "subject_ledger" | "merit_list"
  const [selectedMarksheetStudent, setSelectedMarksheetStudent] = useState(null);
  const [studentMarksheetData, setStudentMarksheetData] = useState(null);
  const [loadingMarksheet, setLoadingMarksheet] = useState(false);

  // Load Classes on Initial Mount
  useEffect(() => {
    let isMounted = true;
    setLoadingClasses(true);

    classApi
      .getAll()
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : data?.items || [];
        setClasses(list);
        if (list.length > 0) {
          setSelectedClassId(list[0].id.toString());
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Error loading classes:", err);
        toast.error("Could not load classes list.");
      })
      .finally(() => {
        if (isMounted) setLoadingClasses(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // When class changes, fetch available terms for that class
  useEffect(() => {
    if (!selectedClassId) return;

    examApi
      .getClassExams(selectedClassId)
      .then((terms) => {
        if (Array.isArray(terms) && terms.length > 0) {
          setAvailableTerms(terms);
          setSelectedTerm((prev) => (prev && terms.includes(prev) ? prev : terms[0]));
        } else {
          setAvailableTerms([]);
          setSelectedTerm("");
        }
      })
      .catch((err) => {
        console.error("Error loading terms for class:", err);
      });
  }, [selectedClassId]);

  // Load Class Results & Ledger when class or term changes
  const loadClassResults = () => {
    if (!selectedClassId || !selectedTerm) return;
    setLoadingResults(true);

    examApi
      .getClassResults(selectedClassId, selectedTerm)
      .then((data) => {
        setResultsData(data || { class_name: "", section: "A", students: [], subjects: [], marks: {} });
        setLocalMarks(data?.marks || {});
        const subjectNames = (data?.subjects || []).map((s) => s.name);
        setSelectedSubjectId((prev) => {
          if (prev === "ALL") return "ALL";
          if (subjectNames.includes(prev)) return prev;
          return subjectNames[0] || "";
        });
      })
      .catch((err) => {
        console.error("Error loading class results:", err);
        toast.error("Could not load class marks records.");
      })
      .finally(() => {
        setLoadingResults(false);
      });
  };

  // Load Class Merit List when on Tab 3 or when class/term changes
  const loadClassMeritList = () => {
    if (!selectedClassId || !selectedTerm) return;
    setLoadingMerit(true);

    examApi
      .getClassMeritList(selectedClassId, selectedTerm)
      .then((data) => {
        setMeritData(data || { class_name: "", section: "A", subjects: [], merit_list: [] });
      })
      .catch((err) => {
        console.error("Error loading merit list:", err);
        toast.error("Could not load merit list standings.");
      })
      .finally(() => {
        setLoadingMerit(false);
      });
  };

  useEffect(() => {
    loadClassResults();
    loadClassMeritList();
  }, [selectedClassId, selectedTerm, activeTab]);

  // Current selected class object
  const currentClass = useMemo(() => {
    return classes.find((c) => c.id.toString() === selectedClassId.toString());
  }, [classes, selectedClassId]);

  // Currently selected subject object (for admin-defined max marks)
  const selectedSubject = useMemo(() => {
    return (resultsData.subjects || []).find((s) => s.name === selectedSubjectId) || null;
  }, [resultsData.subjects, selectedSubjectId]);

  // Currently selected student for the "enter all subjects" panel
  const selectedStudent = useMemo(() => {
    return (resultsData.students || []).find((st) => String(st.id) === String(selectedStudentId)) || null;
  }, [resultsData.students, selectedStudentId]);

  // Position lookup (1st / 2nd / 3rd) used on the entry panel and marksheet
  const studentPositionMap = useMemo(() => {
    const map = {};
    (meritData.merit_list || []).forEach((st) => {
      map[String(st.student_id)] = {
        rank: st.rank,
        badge: st.position_badge,
        badgeType: st.badge_type,
      };
    });
    return map;
  }, [meritData.merit_list]);

  // Students list filtered by search query
  const filteredStudents = useMemo(() => {
    const list = resultsData.students || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (st) =>
        st.name?.toLowerCase().includes(q) ||
        String(st.roll_number).includes(q) ||
        st.parent_name?.toLowerCase().includes(q)
    );
  }, [resultsData.students, searchQuery]);

  // Compute summary stats for each student in Tab 1
  const studentsSummaryMap = useMemo(() => {
    const map = {};
    const students = resultsData.students || [];
    const subjects = resultsData.subjects || [];
    const totalMax = subjects.reduce(
      (sum, sub) => sum + Number(sub.max_marks || sub.total_marks || 100),
      0
    );

    students.forEach((st) => {
      let obt = 0;
      let count = 0;
      subjects.forEach((sub) => {
        const val = localMarks[`${st.id}_${sub.name}`];
        if (val !== undefined && val !== null && val !== "") {
          obt += Number(val);
          count++;
        }
      });
      const pct = totalMax > 0 && count > 0 ? ((obt / totalMax) * 100).toFixed(1) : "-";
      let grade = "-";
      if (pct !== "-") {
        const p = parseFloat(pct);
        grade = p >= 80 ? "A" : p >= 60 ? "B" : p >= 40 ? "C" : "F";
      }

      map[st.id] = {
        totalObtained: count > 0 ? obt : "-",
        totalMax: totalMax || 100,
        percentage: pct !== "-" ? `${pct}%` : "-",
        grade,
        hasMarks: count > 0,
        subjectsMarked: count,
        totalSubjects: subjects.length,
      };
    });
    return map;
  }, [resultsData, localMarks]);

  // Open Marksheet Modal for a Student
  const handleViewMarksheet = async (student) => {
    setSelectedMarksheetStudent(student);
    setLoadingMarksheet(true);
    setPdfDocumentType("marksheet");
    setPdfModalOpen(true);

    try {
      const data = await examApi.getSimplifiedMarksheet(student.id, selectedTerm);
      setStudentMarksheetData(data);
    } catch (err) {
      console.error("Error loading simplified marksheet:", err);
      toast.error("Could not load student marksheet.");
      setStudentMarksheetData(null);
    } finally {
      setLoadingMarksheet(false);
    }
  };

  // Delete the currently selected exam term (with its marks/schedules after confirmation)
  const handleDeleteExamTerm = async () => {
    if (!selectedTerm) {
      toast.warning("Select an exam term first.");
      return;
    }
    const confirmed = window.confirm(
      `Delete exam term "${selectedTerm}"?\n\nThis permanently removes all marks records and exam schedules saved under this term. This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await examApi.deleteExamType(selectedTerm, true);
      toast.success(`Exam term "${selectedTerm}" deleted.`, "Term Deleted");
      const remaining = availableTerms.filter((t) => t !== selectedTerm);
      setAvailableTerms(remaining);
      setSelectedTerm(remaining[0] || "");
      setSelectedStudentId("");
      if (selectedClassId) {
        const terms = await examApi.getClassExams(selectedClassId);
        if (Array.isArray(terms) && terms.length > 0) {
          setAvailableTerms(terms);
          setSelectedTerm((prev) => (prev && terms.includes(prev) ? prev : terms[0]));
        } else {
          setAvailableTerms([]);
          setSelectedTerm("");
        }
      }
    } catch (err) {
      console.error("Error deleting exam term:", err);
      toast.error(err.response?.data?.detail || "Could not delete exam term.");
    }
  };

  // Handle Mark Input Change in Tab 2
  const handleMarkChange = (studentId, subjectName, val) => {
    const key = `${studentId}_${subjectName}`;
    // Whole numbers only: strip decimals, minus signs and any non-digit input.
    const cleanVal = val === "" ? "" : String(val).replace(/[^\d]/g, "");
    setLocalMarks((prev) => ({
      ...prev,
      [key]: cleanVal,
    }));
  };

  // Save Subject Marks (or All Marks)
  const handleSaveMarks = async () => {
    setSavingMarks(true);
    try {
      const payload = {
        class_id: parseInt(selectedClassId, 10),
        exam_name: selectedTerm,
        marks: localMarks,
      };
      const res = await examApi.saveClassResults(payload);
      toast.success(`Successfully saved marks records (${res.saved_count || 0} entries)!`);
      loadClassResults();
      if (activeTab === "merit_list") {
        loadClassMeritList();
      }
    } catch (err) {
      console.error("Error saving marks:", err);
      toast.error(err.response?.data?.detail || "Failed to save marks records.");
    } finally {
      setSavingMarks(false);
    }
  };

  // Save only the selected student's marks for every assigned subject
  const handleSaveStudentMarks = async () => {
    if (!selectedStudent) return;
    setSavingMarks(true);
    try {
      const marks = {};
      (resultsData.subjects || []).forEach((sub) => {
        const key = `${selectedStudent.id}_${sub.name}`;
        const val = localMarks[key];
        if (val !== undefined && val !== null && val !== "") {
          marks[key] = val;
        }
      });
      const res = await examApi.saveClassResults({
        class_id: parseInt(selectedClassId, 10),
        exam_name: selectedTerm,
        marks,
      });
      toast.success(
        `Saved ${res.saved_count || 0} subject marks for ${selectedStudent.name}.`
      );
      loadClassResults();
      loadClassMeritList();
    } catch (err) {
      console.error("Error saving student marks:", err);
      toast.error(err.response?.data?.detail || "Failed to save student marks.");
    } finally {
      setSavingMarks(false);
    }
  };

  // Export CSV for current Subject / Class
  const handleExportCSV = () => {
    const students = resultsData.students || [];
    const subjects = resultsData.subjects || [];

    if (selectedSubjectId !== "ALL") {
      // Export single subject
      const headers = ["Roll No", "Student Name", "Father Name", "Subject", "Max Marks", "Marks Obtained", "Percentage", "Grade"];
      const subjectMax = Number(selectedSubject?.max_marks || selectedSubject?.total_marks || 100);
      const rows = students.map((st) => {
        const obt = localMarks[`${st.id}_${selectedSubjectId}`];
        const val = obt !== undefined && obt !== null && obt !== "" ? Number(obt) : "";
        const pctNum = val !== "" && subjectMax > 0 ? (val / subjectMax) * 100 : null;
        const pct = pctNum !== null ? `${pctNum.toFixed(1)}%` : "";
        const grade =
          pctNum === null ? "" : pctNum >= 80 ? "A" : pctNum >= 60 ? "B" : pctNum >= 40 ? "C" : "F";
        return [
          st.formatted_roll_number || st.roll_number,
          `"${st.name}"`,
          `"${st.parent_name || ""}"`,
          `"${selectedSubjectId}"`,
          subjectMax,
          val,
          pct,
          grade,
        ].join(",");
      });
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `${currentClass?.name || "Class"}_${selectedSubjectId}_${selectedTerm}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${selectedSubjectId} marks list as CSV!`);
    } else {
      // Export all subjects matrix
      const headers = ["Roll No", "Student Name", "Father Name", ...subjects.map((s) => s.name), "Total Obtained", "Total Max", "Percentage", "Grade"];
      const rows = students.map((st) => {
        const stats = studentsSummaryMap[st.id] || {};
        const subjectCols = subjects.map((s) => {
          const val = localMarks[`${st.id}_${s.name}`];
          return val !== undefined && val !== null ? val : "";
        });
        return [
          st.formatted_roll_number || st.roll_number,
          `"${st.name}"`,
          `"${st.parent_name || ""}"`,
          ...subjectCols,
          stats.totalObtained !== "-" ? stats.totalObtained : "",
          stats.totalMax || 100,
          stats.percentage !== "-" ? stats.percentage : "",
          stats.grade !== "-" ? stats.grade : "",
        ].join(",");
      });
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `${currentClass?.name || "Class"}_All_Subjects_${selectedTerm}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Exported class marks broadsheet as CSV!");
    }
  };

  // Export Merit List CSV
  const handleExportMeritCSV = () => {
    const list = meritData.merit_list || [];
    const headers = ["Rank", "Position Badge", "Roll No", "Student Name", "Father Name", "Total Max", "Total Obtained", "Percentage", "Grade", "Status"];
    const rows = list.map((st) => [
      st.rank,
      `"${st.position_badge || ""}"`,
      st.formatted_roll_number || st.roll_number,
      `"${st.name || st.student_name}"`,
      `"${st.father_name || ""}"`,
      st.total_max,
      st.total_obtained,
      `"${st.percentage}"`,
      st.grade,
      st.status,
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Merit_List_${meritData.class_name}_${selectedTerm}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported class merit list as CSV!");
  };

  // Top 3 Merit Holders
  const topPositions = useMemo(() => {
    const list = (meritData.merit_list || []).filter((s) => s.has_marks);
    const p1 = list.find((s) => s.rank === 1);
    const p2 = list.find((s) => s.rank === 2);
    const p3 = list.find((s) => s.rank === 3);
    return { p1, p2, p3 };
  }, [meritData.merit_list]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Class/Term Global Selectors */}
      <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-medium text-slate-900 tracking-normal">
                  Marksheets & Examination Portal
                </h1>
                <p className="text-xs sm:text-sm text-blue-900/70 font-medium">
                  Little Scholar School System • Official Grading, Subject Rosters & Class Merit Standings
                </p>
              </div>
            </div>
          </div>

          {/* Global Selectors: Exam first, then Class */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 1. Select Exam Term */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50/70 border border-blue-200">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <label className="text-xs font-semibold text-blue-950 whitespace-nowrap">Select Exam:</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => {
                    setSelectedTerm(e.target.value);
                    setSelectedStudentId("");
                  }}
                  className="bg-transparent font-semibold text-xs sm:text-sm text-blue-900 cursor-pointer focus:outline-none pr-2"
                >
                  {availableTerms.length === 0 ? (
                    <option value="" disabled className="text-slate-500 bg-white">
                      No Exams Found
                    </option>
                  ) : (
                    availableTerms.map((t) => (
                      <option key={t} value={t} className="text-slate-900 bg-white">
                        {t}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setShowAddExamModal(true)}
                title="Add New Examination Name"
                className="px-2.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Exam</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteExamTerm}
                title="Delete selected examination term"
                className="px-2.5 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Term</span>
              </button>
            </div>

            {/* 2. Select Class */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50/70 border border-amber-200">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <label className="text-xs font-semibold text-blue-950 whitespace-nowrap">Select Class:</label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedStudentId("");
                  setSelectedSubjectId("");
                }}
                disabled={loadingClasses}
                className="bg-transparent font-semibold text-xs sm:text-sm text-blue-900 cursor-pointer focus:outline-none pr-2"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id.toString()} className="text-slate-900 bg-white">
                    {c.name} {c.section ? `(${c.section})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (3 Dedicated Views) */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-blue-100/80">
          <button
            type="button"
            onClick={() => setActiveTab("marksheets")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "marksheets"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                : "bg-blue-50/60 text-blue-900 hover:bg-blue-100/70"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Student-wise Marks & Print</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("subjects")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "subjects"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                : "bg-blue-50/60 text-blue-900 hover:bg-blue-100/70"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Subject-wise Class Marks</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("merit_list")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "merit_list"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                : "bg-blue-50/60 text-blue-900 hover:bg-blue-100/70"
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Total Marks & Top 3 Positions</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INDIVIDUAL STUDENT MARKSHEETS LIST */}
      {/* ========================================================================= */}
      {activeTab === "marksheets" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by student name or roll..."
                    className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-blue-50/40 border border-blue-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Total Students: <span className="font-bold text-blue-900">{filteredStudents.length}</span>
                </div>
              </div>

              <div className="text-xs font-medium text-blue-900/70">
                Class Courses: <span className="font-bold text-blue-950">{(resultsData.subjects || []).length} Subjects assigned</span>
              </div>
            </div>
          </div>

          {/* Selected Student: enter every subject mark, then print */}
          {selectedStudent && (
            <div className="bg-white rounded-2xl border border-blue-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 bg-blue-50/70 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-blue-950">
                    {selectedStudent.name} — All Subject Marks
                  </h3>
                  <p className="text-xs text-blue-900/70 mt-0.5">
                    Roll {selectedStudent.formatted_roll_number || selectedStudent.roll_number} •{" "}
                    {resultsData.class_name || currentClass?.name} • {selectedTerm}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {studentPositionMap[String(selectedStudent.id)]?.rank &&
                    studentPositionMap[String(selectedStudent.id)].rank !== "-" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold">
                        <Trophy className="w-3.5 h-3.5 text-amber-600" />
                        {studentPositionMap[String(selectedStudent.id)].badge}
                      </span>
                    )}
                  <button
                    type="button"
                    onClick={handleSaveStudentMarks}
                    disabled={savingMarks}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {savingMarks ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Save All Marks</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewMarksheet(selectedStudent)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Marksheet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId("")}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-blue-900 bg-white border border-blue-200 hover:bg-blue-50 transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {(resultsData.subjects || []).map((sub) => {
                    const key = `${selectedStudent.id}_${sub.name}`;
                    const val = localMarks[key] !== undefined ? localMarks[key] : "";
                    return (
                      <div
                        key={sub.id || sub.name}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-blue-50/40 border border-blue-100"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-blue-950 truncate">{sub.name}</p>
                          <p className="text-[10px] text-blue-900/60">Max {sub.max_marks || sub.total_marks || 100}</p>
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={sub.max_marks || sub.total_marks || 100}
                          step="1"
                          value={val}
                          onChange={(e) => handleMarkChange(selectedStudent.id, sub.name, e.target.value)}
                          placeholder="—"
                          className="w-20 text-center py-1.5 px-2 bg-white border border-blue-200 rounded-lg text-sm font-semibold text-blue-950 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-blue-900">
                    <span className="font-medium">Subjects assigned:</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-semibold">
                      {(resultsData.subjects || []).length}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-blue-900">
                      Total:{" "}
                      <strong className="font-semibold text-blue-950">
                        {studentsSummaryMap[selectedStudent.id]?.totalObtained ?? "-"} /{" "}
                        {studentsSummaryMap[selectedStudent.id]?.totalMax ?? 100}
                      </strong>
                    </span>
                    <span className="text-blue-900">
                      Percentage:{" "}
                      <strong className="font-semibold text-blue-950">
                        {studentsSummaryMap[selectedStudent.id]?.percentage ?? "-"}
                      </strong>
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900">
                      Grade: {studentsSummaryMap[selectedStudent.id]?.grade ?? "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Students Table */}
          <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-hidden">
            {loadingResults ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-xs font-semibold text-slate-600">Loading student records...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm">
                No students enrolled in this class.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-blue-50/80 text-blue-950 font-bold uppercase text-[11px] border-b border-blue-200/80">
                      <th className="py-3 px-4 w-16 text-center">Roll No</th>
                      <th className="py-3 px-4">Student Full Name</th>
                      <th className="py-3 px-4">Father / Guardian</th>
                      <th className="py-3 px-4 text-center">Graded Subjects</th>
                      <th className="py-3 px-4 text-center">Total Marks</th>
                      <th className="py-3 px-4 text-center">Percentage</th>
                      <th className="py-3 px-4 text-center">Grade</th>
                      <th className="py-3 px-4 text-right">Official Marksheet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((st) => {
                      const summary = studentsSummaryMap[st.id] || {};
                      return (
                        <tr key={st.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800 text-center">
                            {st.formatted_roll_number || st.roll_number}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                            {st.name}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-600">
                            {st.parent_name || "N/A"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900">
                              {summary.subjectsMarked || 0} / {summary.totalSubjects || 0}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-900">
                            {summary.totalObtained !== "-" ? `${summary.totalObtained} / ${summary.totalMax}` : "-"}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-blue-950">
                            {summary.percentage}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                summary.grade === "A"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : summary.grade === "B"
                                  ? "bg-blue-100 text-blue-800"
                                  : summary.grade === "C"
                                  ? "bg-amber-100 text-amber-800"
                                  : summary.grade === "F"
                                  ? "bg-rose-100 text-rose-800"
                                  : "text-slate-400"
                              }`}
                            >
                              {summary.grade}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedStudentId(String(st.id))}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition cursor-pointer"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                                <span>Enter All Subjects</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleViewMarksheet(st)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>View Marksheet</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SUBJECT-WISE MARKS ENTRY & LEDGER */}
      {/* ========================================================================= */}
      {activeTab === "subjects" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50/70 border border-blue-200">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <label className="text-xs font-bold text-blue-950">Select Subject:</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="bg-transparent font-bold text-xs sm:text-sm text-blue-900 cursor-pointer focus:outline-none pr-2"
                  >
                    <option value="ALL" className="text-slate-900 bg-white">
                      All Subjects (Broadsheet Ledger)
                    </option>
                    {(resultsData.subjects || []).map((sub) => (
                      <option key={sub.id || sub.name} value={sub.name} className="text-slate-900 bg-white">
                        {sub.name} (Max: {sub.max_marks || sub.total_marks || 100})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  {selectedSubjectId === "ALL"
                    ? `${(resultsData.subjects || []).length} assigned curriculum courses`
                    : `Entering marks for ${selectedSubjectId}`}
                </div>
              </div>

              {/* Action Buttons: Save, CSV, Print */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPdfDocumentType("subject_ledger");
                    setPdfModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
                  title="Print official award list"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>Print Award List</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveMarks}
                  disabled={savingMarks}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 transition cursor-pointer disabled:opacity-50"
                >
                  {savingMarks ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Marks</span>
                </button>
              </div>
            </div>
          </div>

          {/* Subject Entry Table (Single Subject Mode) */}
          {selectedSubjectId !== "ALL" ? (
            <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-950">
                    {selectedSubjectId} — Award List & Student Marks
                  </h3>
                  <p className="text-xs text-blue-900/60 font-medium">
                    {resultsData.class_name || currentClass?.name} • {selectedTerm}
                  </p>
                </div>
                <div className="text-xs font-bold text-blue-900">
                  Max Marks: {selectedSubject?.max_marks || selectedSubject?.total_marks || 100}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-blue-50/80 text-blue-950 font-semibold uppercase text-[11px] border-b border-blue-200">
                      <th className="py-3 px-4 w-16 text-center">Roll No</th>
                      <th className="py-3 px-4">Student Full Name</th>
                      <th className="py-3 px-4">Father / Guardian</th>
                      <th className="py-3 px-4 w-28 text-center">Max Marks</th>
                      <th className="py-3 px-4 w-36 text-center">Marks Obtained (0-100)</th>
                      <th className="py-3 px-4 w-24 text-center">Percentage</th>
                      <th className="py-3 px-4 w-24 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(resultsData.students || []).map((st) => {
                      const key = `${st.id}_${selectedSubjectId}`;
                      const val = localMarks[key] !== undefined ? localMarks[key] : "";
                      const subjectMax = Number(selectedSubject?.max_marks || selectedSubject?.total_marks || 100);
                      const numVal = val !== "" ? Number(val) : null;
                      const pctNum = numVal !== null && subjectMax > 0 ? (numVal / subjectMax) * 100 : null;
                      const pct = pctNum !== null ? `${pctNum.toFixed(1)}%` : "-";
                      const grade =
                        pctNum !== null
                          ? pctNum >= 80
                            ? "A"
                            : pctNum >= 60
                            ? "B"
                            : pctNum >= 40
                            ? "C"
                            : "F"
                          : "-";

                      return (
                        <tr key={st.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800 text-center">
                            {st.formatted_roll_number || st.roll_number}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                            {st.name}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-600">
                            {st.parent_name || "N/A"}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-600">
                            {selectedSubject?.max_marks || selectedSubject?.total_marks || 100}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <input
                              type="number"
                              min={0}
                              max={selectedSubject?.max_marks || selectedSubject?.total_marks || 100}
                              step="1"
                              value={val}
                              onChange={(e) => handleMarkChange(st.id, selectedSubjectId, e.target.value)}
                              placeholder={`0 - ${selectedSubject?.max_marks || selectedSubject?.total_marks || 100}`}
                              className="w-28 text-center py-1.5 px-2 bg-blue-50/40 border border-blue-200 rounded-lg text-sm font-bold text-blue-950 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                            />
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800">
                            {pct}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                grade === "A"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : grade === "B"
                                  ? "bg-blue-100 text-blue-800"
                                  : grade === "C"
                                  ? "bg-amber-100 text-amber-800"
                                  : grade === "F"
                                  ? "bg-rose-100 text-rose-800"
                                  : "text-slate-400"
                              }`}
                            >
                              {grade}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Broadsheet All Subjects Mode */
            <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-950">
                    Comprehensive Class Broadsheet Ledger (All Courses)
                  </h3>
                  <p className="text-xs text-blue-900/60 font-medium">
                    {resultsData.class_name || currentClass?.name} • {selectedTerm}
                  </p>
                </div>
                <div className="text-xs font-bold text-blue-900">
                  Total Courses: {(resultsData.subjects || []).length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-blue-50/80 text-blue-950 font-semibold uppercase text-[10px] border-b border-blue-200">
                      <th className="py-2.5 px-3 w-14 text-center">Roll</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Student Name</th>
                      {(resultsData.subjects || []).map((sub) => (
                        <th key={sub.id || sub.name} className="py-2.5 px-2 text-center min-w-[90px]">
                          {sub.name}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-center min-w-[80px]">Total</th>
                      <th className="py-2.5 px-3 text-center min-w-[70px]">%</th>
                      <th className="py-2.5 px-3 text-center min-w-[60px]">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(resultsData.students || []).map((st) => {
                      const summary = studentsSummaryMap[st.id] || {};
                      return (
                        <tr key={st.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-slate-800 text-center">
                            {st.formatted_roll_number || st.roll_number}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900 truncate">
                            {st.name}
                          </td>
                          {(resultsData.subjects || []).map((sub) => {
                            const key = `${st.id}_${sub.name}`;
                            const val = localMarks[key] !== undefined ? localMarks[key] : "";
                            return (
                              <td key={sub.id || sub.name} className="py-1.5 px-1.5 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={sub.max_marks || sub.total_marks || 100}
                                  step="1"
                                  value={val}
                                  onChange={(e) => handleMarkChange(st.id, sub.name, e.target.value)}
                                  className="w-16 text-center py-1 px-1 text-xs font-bold bg-blue-50/30 border border-slate-200 rounded focus:outline-none focus:border-blue-600 focus:bg-white"
                                />
                              </td>
                            );
                          })}
                          <td className="py-2 px-3 text-center font-semibold text-blue-950">
                            {summary.totalObtained}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-800">
                            {summary.percentage}
                          </td>
                          <td className="py-2 px-3 text-center font-semibold text-slate-900">
                            {summary.grade}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CLASS MERIT & POSITIONS LIST */}
      {/* ========================================================================= */}
      {activeTab === "merit_list" && (
        <div className="space-y-6">
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1st Position */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-2xl border-2 border-amber-300 p-5 shadow-xs relative overflow-hidden">
              <div className="absolute top-2 right-2 text-amber-200/50">
                <Trophy className="w-16 h-16" />
              </div>
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs uppercase tracking-wider mb-2">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span>1st Position (Class Gold)</span>
              </div>
              {topPositions.p1 ? (
                <div>
                  <h3 className="text-lg font-medium text-slate-900">
                    {topPositions.p1.name || topPositions.p1.student_name}
                  </h3>
                  <p className="text-xs text-amber-900/80 font-semibold mt-0.5">
                    Roll #{topPositions.p1.formatted_roll_number || topPositions.p1.roll_number} • {topPositions.p1.percentage}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-amber-200/70 border border-amber-300 rounded-lg text-xs font-semibold text-amber-950">
                    Total: {topPositions.p1.total_obtained} / {topPositions.p1.total_max} (Grade {topPositions.p1.grade})
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-900/60 font-semibold py-4">
                  Marks not recorded yet for 1st rank.
                </div>
              )}
            </div>

            {/* 2nd Position */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/70 rounded-2xl border-2 border-blue-300 p-5 shadow-xs relative overflow-hidden">
              <div className="absolute top-2 right-2 text-blue-200/60">
                <Medal className="w-16 h-16" />
              </div>
              <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs uppercase tracking-wider mb-2">
                <Medal className="w-4 h-4 text-blue-600" />
                <span>2nd Position</span>
              </div>
              {topPositions.p2 ? (
                <div>
                  <h3 className="text-lg font-medium text-blue-950">
                    {topPositions.p2.name || topPositions.p2.student_name}
                  </h3>
                  <p className="text-xs text-blue-800 font-medium mt-0.5">
                    Roll #{topPositions.p2.formatted_roll_number || topPositions.p2.roll_number} • {topPositions.p2.percentage}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-blue-200/70 border border-blue-300 rounded-lg text-xs font-semibold text-blue-950">
                    Total: {topPositions.p2.total_obtained} / {topPositions.p2.total_max} (Grade {topPositions.p2.grade})
                  </div>
                </div>
              ) : (
                <div className="text-xs text-blue-800 font-medium py-4">
                  Marks not recorded yet for 2nd rank.
                </div>
              )}
            </div>

            {/* 3rd Position */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/70 rounded-2xl border-2 border-amber-300 p-5 shadow-xs relative overflow-hidden">
              <div className="absolute top-2 right-2 text-amber-200/60">
                <Medal className="w-16 h-16" />
              </div>
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs uppercase tracking-wider mb-2">
                <Medal className="w-4 h-4 text-amber-600" />
                <span>3rd Position</span>
              </div>
              {topPositions.p3 ? (
                <div>
                  <h3 className="text-lg font-medium text-blue-950">
                    {topPositions.p3.name || topPositions.p3.student_name}
                  </h3>
                  <p className="text-xs text-amber-900/80 font-medium mt-0.5">
                    Roll #{topPositions.p3.formatted_roll_number || topPositions.p3.roll_number} • {topPositions.p3.percentage}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-amber-200/70 border border-amber-300 rounded-lg text-xs font-semibold text-amber-950">
                    Total: {topPositions.p3.total_obtained} / {topPositions.p3.total_max} (Grade {topPositions.p3.grade})
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-900/70 font-medium py-4">
                  Marks not recorded yet for 3rd rank.
                </div>
              )}
            </div>
          </div>

          {/* Merit List Controls & Export */}
          <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-medium text-slate-900">
                  Official Class Standing & Merit Roster
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Students ranked in descending order based on aggregate marks obtained
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportMeritCSV}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Export Merit List CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPdfDocumentType("merit_list");
                    setPdfModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>Print Official Merit List</span>
                </button>
              </div>
            </div>
          </div>

          {/* Full Ranked Table */}
          <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-hidden">
            {loadingMerit ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-xs font-semibold text-slate-600">Calculating class merit standings...</p>
              </div>
            ) : (meritData.merit_list || []).length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm">
                No marks recorded for this examination term yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-blue-50/80 text-blue-950 font-bold uppercase text-[11px] border-b border-blue-200/80">
                      <th className="py-3 px-4 w-32 text-center">Class Standing</th>
                      <th className="py-3 px-4 w-20 text-center">Roll No</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Father / Guardian</th>
                      <th className="py-3 px-4 text-center">Total Marks</th>
                      <th className="py-3 px-4 text-center">Percentage</th>
                      <th className="py-3 px-4 text-center">Grade</th>
                      <th className="py-3 px-4 text-center">Result Status</th>
                      <th className="py-3 px-4 text-right">Marksheet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(meritData.merit_list || []).map((st, idx) => (
                      <tr
                        key={st.student_id || idx}
                        className={`hover:bg-blue-50/30 transition-colors ${
                          st.badge_type === "first"
                            ? "bg-amber-50/40"
                            : st.badge_type === "second"
                            ? "bg-blue-50/60"
                            : st.badge_type === "third"
                            ? "bg-amber-900/5"
                            : ""
                        }`}
                      >
                        {/* Position Badge Column */}
                        <td className="py-3 px-4 text-center">
                          {st.badge_type === "first" ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                              <Trophy className="w-3.5 h-3.5 text-amber-600" />
                              <span>1st Position</span>
                            </span>
                          ) : st.badge_type === "second" ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-950 border border-blue-300 shadow-2xs">
                              <Medal className="w-3.5 h-3.5 text-blue-600" />
                              <span>2nd Position</span>
                            </span>
                          ) : st.badge_type === "third" ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-800/15 text-amber-950 border border-amber-700/30 shadow-2xs">
                              <Medal className="w-3.5 h-3.5 text-amber-700" />
                              <span>3rd Position</span>
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200">
                              {st.position_badge || `Rank #${st.rank}`}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-800 text-center">
                          {st.formatted_roll_number || st.roll_number}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                          {st.name || st.student_name}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600">
                          {st.father_name || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900">
                          {st.total_obtained !== "-" ? `${st.total_obtained} / ${st.total_max}` : "-"}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-blue-950">
                          {st.percentage}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-sm">
                          {st.grade}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {st.status === "PASS" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>PASS</span>
                            </span>
                          ) : st.status === "FAIL" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>FAIL</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleViewMarksheet({ id: st.student_id, name: st.name || st.student_name })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Marksheet</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CLEAN OFFICIAL PRINT / PDF MODAL */}
      {/* ========================================================================= */}
      {/* Add Exam Name Modal */}
      {showAddExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-blue-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <span>Add Examination / Term Name</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddExamModal(false);
                  setNewExamName("");
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Examination / Term Title:
              </label>
              <input
                type="text"
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                placeholder="e.g. Mid Term Exam, 3rd Term Exam, Annual Exam 2025"
                className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 text-slate-900 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
              <p className="text-xs text-slate-500">
                This exam name will be available across Little Scholar School marksheets and merit standings.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowAddExamModal(false);
                  setNewExamName("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-blue-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const trimmed = newExamName.trim();
                  if (!trimmed) {
                    toast.warning("Please enter an exam title.");
                    return;
                  }
                  try {
                    await examApi.createExamType(trimmed);
                  } catch (err) {
                    if (err.response?.status !== 409) {
                      toast.error(err.response?.data?.detail || "Could not save the exam name.");
                      return;
                    }
                  }
                  if (!availableTerms.includes(trimmed)) {
                    setAvailableTerms((prev) => [...prev, trimmed]);
                  }
                  setSelectedTerm(trimmed);
                  setShowAddExamModal(false);
                  setNewExamName("");
                  toast.success(`Added "${trimmed}" to exam selection.`);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                Confirm & Select
              </button>
            </div>
          </div>
        </div>
      )}

      <CustomPdfViewerModal
        isOpen={pdfModalOpen}
        onClose={() => {
          setPdfModalOpen(false);
          setStudentMarksheetData(null);
        }}
        title={
          pdfDocumentType === "marksheet"
            ? `Official Marksheet • ${studentMarksheetData?.student_name || "Student"}`
            : pdfDocumentType === "merit_list"
            ? `Official Merit List • ${meritData.class_name} • Little Scholar School System`
            : `Award List • ${selectedSubjectId} • ${resultsData.class_name}`
        }
        filename={
          pdfDocumentType === "marksheet"
            ? `Marksheet_${studentMarksheetData?.roll_number}_${studentMarksheetData?.student_name}`
            : pdfDocumentType === "merit_list"
            ? `Merit_List_${meritData.class_name}_${selectedTerm}`
            : `Award_List_${selectedSubjectId}_${resultsData.class_name}`
        }
        hideDefaultHeaderFooter
      >
        <div className="w-full text-slate-900 font-sans">
          {/* 1. DOCUMENT TYPE: INDIVIDUAL STUDENT MARKSHEET */}
          {pdfDocumentType === "marksheet" && (
            loadingMarksheet ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-xs font-semibold text-slate-600">Generating clean official marksheet...</p>
              </div>
            ) : studentMarksheetData ? (
              <div className="space-y-5">
                {/* School Header with Transparent Logo */}
                <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: "2px solid #1e3a8a", paddingBottom: "12px", border: "none" }}>
                  <tbody>
                    <tr style={{ border: "none" }}>
                      <td style={{ width: "68px", verticalAlign: "middle", padding: "0 12px 10px 0", border: "none" }}>
                        <img
                          src={SCHOOL_LOGO_DATA_URI}
                          alt="Little Scholar School System"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/logo.png";
                          }}
                          style={{ width: "60px", height: "60px", objectFit: "contain", display: "block" }}
                        />
                      </td>
                      <td style={{ verticalAlign: "middle", padding: "0 0 10px 0", border: "none" }}>
                        <div style={{ fontSize: "20px", fontWeight: "600", color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: "1.2" }}>
                          Little Scholar School System
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: "#334155", marginTop: "3px" }}>
                          {studentMarksheetData.exam_name || selectedTerm} • Academic Session: {studentMarksheetData.academic_session || "2024-2025"}
                        </div>
                      </td>
                      <td style={{ width: "160px", textAlign: "right", verticalAlign: "middle", padding: "0 0 10px 12px", border: "none" }}>
                        <div style={{ display: "inline-block", background: "#eff6ff", color: "#1e3a8a", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "4px 10px", fontSize: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Official Marksheet
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", fontFamily: "monospace" }}>
                          Date: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Student Profile Info Grid */}
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", margin: "14px 0", tableLayout: "fixed" }}>
                  <tbody>
                    <tr style={{ border: "none" }}>
                      <td style={{ width: "25%", padding: "8px 12px", border: "none" }}>
                        <div style={{ color: "#64748b", fontWeight: "600", textTransform: "uppercase", fontSize: "9px" }}>Student Name:</div>
                        <div style={{ color: "#0f172a", fontWeight: "600", fontSize: "13px", marginTop: "2px" }}>{studentMarksheetData.student_name}</div>
                      </td>
                      <td style={{ width: "25%", padding: "8px 12px", border: "none" }}>
                        <div style={{ color: "#64748b", fontWeight: "600", textTransform: "uppercase", fontSize: "9px" }}>Roll Number:</div>
                        <div style={{ color: "#0f172a", fontWeight: "600", fontSize: "13px", marginTop: "2px", fontFamily: "monospace" }}>{studentMarksheetData.roll_number}</div>
                      </td>
                      <td style={{ width: "25%", padding: "8px 12px", border: "none" }}>
                        <div style={{ color: "#64748b", fontWeight: "600", textTransform: "uppercase", fontSize: "9px" }}>Class & Section:</div>
                        <div style={{ color: "#0f172a", fontWeight: "600", fontSize: "13px", marginTop: "2px" }}>{studentMarksheetData.class_name} - Sec {studentMarksheetData.section}</div>
                      </td>
                      <td style={{ width: "25%", padding: "8px 12px", border: "none" }}>
                        <div style={{ color: "#64748b", fontWeight: "600", textTransform: "uppercase", fontSize: "9px" }}>Father / Guardian:</div>
                        <div style={{ color: "#0f172a", fontWeight: "600", fontSize: "13px", marginTop: "2px" }}>{studentMarksheetData.father_name}</div>
                      </td>
                      {(studentMarksheetData.position_badge || (studentMarksheetData.rank && studentMarksheetData.rank <= 3)) && (
                        <td style={{ width: "25%", padding: "8px 12px", border: "none" }}>
                          <div style={{ color: "#b45309", fontWeight: "600", textTransform: "uppercase", fontSize: "9px" }}>Class Position:</div>
                          <div style={{ display: "inline-block", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: "6px", padding: "2px 8px", fontSize: "12px", fontWeight: "600", marginTop: "2px" }}>
                            🏆 {studentMarksheetData.position_badge || (studentMarksheetData.rank === 1 ? "1st Position" : studentMarksheetData.rank === 2 ? "2nd Position" : "3rd Position")}
                          </div>
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>

                {/* Marksheet Subjects Table */}
                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-blue-50/80 text-blue-950 font-bold uppercase text-[11px] border-b border-slate-300">
                      <th className="py-2.5 px-3 border-r border-slate-300 w-12 text-center">Sr.</th>
                      <th className="py-2.5 px-4 border-r border-slate-300">Subject Name</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-center">Max Marks</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-center font-bold">Marks Obtained</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-center">Percentage</th>
                      <th className="py-2.5 px-3 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(studentMarksheetData.subjects || []).map((sub, sIdx) => (
                      <tr key={sIdx} className={sIdx % 2 === 1 ? "bg-blue-50/40" : ""}>
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-bold text-slate-500">
                          {sub.sr || sIdx + 1}
                        </td>
                        <td className="py-2 px-4 border-r border-slate-300 font-bold text-slate-900">
                          {sub.subject}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-semibold text-slate-700">
                          {sub.max_marks}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-semibold text-blue-950 text-sm">
                          {sub.obtained_marks}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-bold text-slate-700">
                          {sub.percentage}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-900">
                          {sub.grade}
                        </td>
                      </tr>
                    ))}

                    {/* Grand Total Row */}
                    <tr className="bg-blue-50/70 text-blue-950 font-semibold text-xs border-t-2 border-blue-900">
                      <td colSpan={2} className="py-2.5 px-4 border-r border-slate-300 text-right uppercase tracking-wider">
                        Grand Total
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-300 text-center font-bold">
                        {studentMarksheetData.total_max}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-300 text-center text-sm font-semibold text-blue-950">
                        {studentMarksheetData.total_obtained}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-300 text-center font-bold">
                        {studentMarksheetData.percentage}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-sm">
                        {studentMarksheetData.grade}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Signatures Only (Class Teacher & Principal) */}
                <div className="grid grid-cols-2 gap-12 pt-8 text-xs text-slate-600">
                  <div className="text-center">
                    <div className="h-10 border-b border-dashed border-slate-400 mb-1.5" />
                    <p className="font-bold text-slate-900 text-sm">Class Teacher Signature</p>
                  </div>
                  <div className="text-center">
                    <div className="h-10 border-b border-dashed border-slate-400 mb-1.5" />
                    <p className="font-bold text-slate-900 text-sm">Principal Signature</p>
                  </div>
                </div>
              </div>
            ) : null
          )}

          {/* 2. DOCUMENT TYPE: MERIT LIST PDF */}
          {pdfDocumentType === "merit_list" && (
            <div className="space-y-5">
              <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: "2px solid #1e3a8a", paddingBottom: "12px", border: "none" }}>
                <tbody>
                  <tr style={{ border: "none" }}>
                    <td style={{ width: "68px", verticalAlign: "middle", padding: "0 12px 10px 0", border: "none" }}>
                      <img
                        src={SCHOOL_LOGO_DATA_URI}
                        alt="Little Scholar School System"
                        style={{ width: "60px", height: "60px", objectFit: "contain", display: "block" }}
                      />
                    </td>
                    <td style={{ verticalAlign: "middle", padding: "0 0 10px 0", border: "none" }}>
                      <div style={{ fontSize: "20px", fontWeight: "600", color: "#1e3a8a", textTransform: "uppercase" }}>
                        Little Scholar School System
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: "600", color: "#334155", marginTop: "3px" }}>
                        Official Class Merit List & Standings • {meritData.class_name} • {selectedTerm}
                      </div>
                    </td>
                    <td style={{ width: "160px", textAlign: "right", verticalAlign: "middle", padding: "0 0 10px 12px", border: "none" }}>
                      <div style={{ display: "inline-block", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: "6px", padding: "4px 10px", fontSize: "10px", fontWeight: "600", textTransform: "uppercase" }}>
                        Merit Document
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", fontFamily: "monospace" }}>
                        Date: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-blue-50 text-blue-950 font-bold uppercase text-[10px] border-b border-slate-300">
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-28">Standing</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-16">Roll</th>
                    <th className="py-2.5 px-4 border-r border-slate-300">Student Name</th>
                    <th className="py-2.5 px-4 border-r border-slate-300">Father Name</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center">Total Marks</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center">%</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center">Grade</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(meritData.merit_list || []).map((st, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? "bg-blue-50/40" : ""}>
                      <td className="py-2 px-3 border-r border-slate-300 text-center font-bold">
                        {st.position_badge || `Rank #${st.rank}`}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-300 text-center font-mono font-bold">
                        {st.formatted_roll_number || st.roll_number}
                      </td>
                      <td className="py-2 px-4 border-r border-slate-300 font-bold text-slate-900">
                        {st.name || st.student_name}
                      </td>
                      <td className="py-2 px-4 border-r border-slate-300 text-slate-700">
                        {st.father_name || "N/A"}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-300 text-center font-bold">
                        {st.total_obtained !== "-" ? `${st.total_obtained} / ${st.total_max}` : "-"}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-300 text-center font-bold">
                        {st.percentage}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-300 text-center font-semibold">
                        {st.grade}
                      </td>
                      <td className="py-2 px-3 text-center font-bold">
                        {st.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-12 pt-8 text-xs text-slate-600">
                <div className="text-center">
                  <div className="h-10 border-b border-dashed border-slate-400 mb-1.5" />
                  <p className="font-bold text-slate-900 text-sm">Class Teacher Signature</p>
                </div>
                <div className="text-center">
                  <div className="h-10 border-b border-dashed border-slate-400 mb-1.5" />
                  <p className="font-bold text-slate-900 text-sm">Principal Signature</p>
                </div>
              </div>
            </div>
          )}

          {/* 3. DOCUMENT TYPE: SUBJECT AWARD LIST PDF */}
          {pdfDocumentType === "subject_ledger" && (
            <div className="space-y-5">
              <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: "2px solid #1e3a8a", paddingBottom: "12px", border: "none" }}>
                <tbody>
                  <tr style={{ border: "none" }}>
                    <td style={{ width: "68px", verticalAlign: "middle", padding: "0 12px 10px 0", border: "none" }}>
                      <img
                        src={SCHOOL_LOGO_DATA_URI}
                        alt="Little Scholar School System"
                        style={{ width: "60px", height: "60px", objectFit: "contain", display: "block" }}
                      />
                    </td>
                    <td style={{ verticalAlign: "middle", padding: "0 0 10px 0", border: "none" }}>
                      <div style={{ fontSize: "20px", fontWeight: "600", color: "#1e3a8a", textTransform: "uppercase" }}>
                        Little Scholar School System
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: "600", color: "#334155", marginTop: "3px" }}>
                        Official Award List • {selectedSubjectId === "ALL" ? "All Subjects" : selectedSubjectId} • {resultsData.class_name} • {selectedTerm}
                      </div>
                    </td>
                    <td style={{ width: "160px", textAlign: "right", verticalAlign: "middle", padding: "0 0 10px 12px", border: "none" }}>
                      <div style={{ display: "inline-block", background: "#eff6ff", color: "#1e3a8a", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "4px 10px", fontSize: "10px", fontWeight: "600", textTransform: "uppercase" }}>
                        Award List
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", fontFamily: "monospace" }}>
                        Date: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-blue-50 text-blue-950 font-bold uppercase text-[10px] border-b border-slate-300">
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-16">Roll</th>
                    <th className="py-2.5 px-4 border-r border-slate-300">Student Name</th>
                    <th className="py-2.5 px-4 border-r border-slate-300">Father Name</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-24">Max Marks</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-28">Marks Obtained</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-20">%</th>
                    <th className="py-2.5 px-3 text-center w-20">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(resultsData.students || []).map((st, idx) => {
                    const key = `${st.id}_${selectedSubjectId}`;
                    const val = localMarks[key] !== undefined && localMarks[key] !== null ? localMarks[key] : "-";
                    const numVal = val !== "-" && val !== "" ? Number(val) : null;
                    const pct = numVal !== null ? `${numVal.toFixed(1)}%` : "-";
                    const grade =
                      numVal !== null
                        ? numVal >= 80
                          ? "A"
                          : numVal >= 60
                          ? "B"
                          : numVal >= 40
                          ? "C"
                          : "F"
                        : "-";

                    return (
                      <tr key={idx} className={idx % 2 === 1 ? "bg-blue-50/40" : ""}>
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-mono font-bold">
                          {st.formatted_roll_number || st.roll_number}
                        </td>
                        <td className="py-2 px-4 border-r border-slate-300 font-bold text-slate-900">
                          {st.name}
                        </td>
                        <td className="py-2 px-4 border-r border-slate-300 text-slate-700">
                          {st.parent_name || "N/A"}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-bold">
                          100
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-semibold text-blue-950">
                          {val}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300 text-center font-bold">
                          {pct}
                        </td>
                        <td className="py-2 px-3 text-center font-semibold">
                          {grade}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-12 pt-8 text-xs text-slate-600">
                <div className="text-center">
                  <div className="h-10 border-b border-dashed border-slate-400 mb-1.5" />
                  <p className="font-bold text-slate-900 text-sm">Subject Teacher Signature</p>
                </div>
                <div className="text-center">
                  <div className="h-10 border-b border-dashed border-slate-400 mb-1.5" />
                  <p className="font-bold text-slate-900 text-sm">Principal Signature</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CustomPdfViewerModal>
    </div>
  );
};

export default Exams;
