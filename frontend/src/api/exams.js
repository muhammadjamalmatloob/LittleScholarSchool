import client from "./client";

// Set to false to connect directly to the live backend
export const USE_MOCK = false;

let DUMMY_EXAMS = [
  {
    id: 1,
    name: "1st Term Examination 2024",
    class_id: 1,
    class_name: "Class 1-A",
    exam_date: "2024-10-15",
    total_marks: 100,
    passing_marks: 40,
    students_marked: 4,
    total_students: 5,
  },
  {
    id: 2,
    name: "Final Term Examination 2025",
    class_id: 2,
    class_name: "Class 2-A",
    exam_date: "2025-05-20",
    total_marks: 100,
    passing_marks: 40,
    students_marked: 2,
    total_students: 2,
  },
];

export const TERMS = [
  { id: "1st_term", name: "1st Term Examination", session: "2024-2025", month: "October / November", status: "Active" },
  { id: "final_term", name: "Final Term Examination", session: "2024-2025", month: "May / June", status: "Upcoming" },
];

let DUMMY_DATESHEET = [
  // Class 1
  { id: 1, term_id: "1st_term", class_name: "Class 1", section: "A", subject: "Mathematics", date: "2024-10-21", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 101" },
  { id: 2, term_id: "1st_term", class_name: "Class 1", section: "A", subject: "English Literature", date: "2024-10-23", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 101" },
  { id: 3, term_id: "1st_term", class_name: "Class 1", section: "A", subject: "Urdu Language", date: "2024-10-25", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 101" },
  { id: 4, term_id: "1st_term", class_name: "Class 1", section: "A", subject: "General Science", date: "2024-10-28", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 101" },
  { id: 5, term_id: "1st_term", class_name: "Class 1", section: "A", subject: "Islamiat", date: "2024-10-30", time: "09:00 AM - 11:00 AM", total_marks: 50, room: "Room 101" },
  { id: 6, term_id: "final_term", class_name: "Class 1", section: "A", subject: "Mathematics", date: "2025-05-12", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 101" },
  { id: 7, term_id: "final_term", class_name: "Class 1", section: "A", subject: "English Literature", date: "2025-05-14", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 101" },
  { id: 8, term_id: "final_term", class_name: "Class 1", section: "A", subject: "Urdu Language", date: "2025-05-16", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 101" },

  // Class 2
  { id: 11, term_id: "1st_term", class_name: "Class 2", section: "A", subject: "Mathematics", date: "2024-10-21", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 102" },
  { id: 12, term_id: "1st_term", class_name: "Class 2", section: "A", subject: "English Literature", date: "2024-10-23", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 102" },
  { id: 13, term_id: "1st_term", class_name: "Class 2", section: "A", subject: "General Science", date: "2024-10-25", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 102" },
  { id: 14, term_id: "final_term", class_name: "Class 2", section: "A", subject: "Mathematics", date: "2025-05-12", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 102" },
  { id: 15, term_id: "final_term", class_name: "Class 2", section: "A", subject: "English Literature", date: "2025-05-14", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 102" },

  // Class 3
  { id: 21, term_id: "1st_term", class_name: "Class 3", section: "A", subject: "Mathematics", date: "2024-10-21", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 103" },
  { id: 22, term_id: "1st_term", class_name: "Class 3", section: "A", subject: "English Literature", date: "2024-10-23", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 103" },
  { id: 23, term_id: "1st_term", class_name: "Class 3", section: "A", subject: "General Science", date: "2024-10-25", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 103" },
  { id: 24, term_id: "final_term", class_name: "Class 3", section: "A", subject: "Mathematics", date: "2025-05-12", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 103" },

  // Class 4
  { id: 31, term_id: "1st_term", class_name: "Class 4", section: "A", subject: "Mathematics", date: "2024-10-21", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 104" },
  { id: 32, term_id: "1st_term", class_name: "Class 4", section: "A", subject: "English Literature", date: "2024-10-23", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 104" },
  { id: 33, term_id: "1st_term", class_name: "Class 4", section: "A", subject: "Computer Science", date: "2024-10-25", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 104" },
  { id: 34, term_id: "final_term", class_name: "Class 4", section: "A", subject: "Mathematics", date: "2025-05-12", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 104" },

  // Class 5
  { id: 41, term_id: "1st_term", class_name: "Class 5", section: "A", subject: "Mathematics", date: "2024-10-21", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 105" },
  { id: 42, term_id: "1st_term", class_name: "Class 5", section: "A", subject: "English Literature", date: "2024-10-23", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 105" },
  { id: 43, term_id: "1st_term", class_name: "Class 5", section: "A", subject: "General Science", date: "2024-10-25", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 105" },
  { id: 44, term_id: "final_term", class_name: "Class 5", section: "A", subject: "Mathematics", date: "2025-05-12", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 105" },

  // Class 6
  { id: 51, term_id: "1st_term", class_name: "Class 6", section: "A", subject: "Mathematics", date: "2024-10-21", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 201" },
  { id: 52, term_id: "1st_term", class_name: "Class 6", section: "A", subject: "English Literature", date: "2024-10-23", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 201" },
  { id: 53, term_id: "1st_term", class_name: "Class 6", section: "A", subject: "Computer Science", date: "2024-10-25", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 201" },
  { id: 54, term_id: "final_term", class_name: "Class 6", section: "A", subject: "Mathematics", date: "2025-05-12", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 201" },

  // Class 7
  { id: 61, term_id: "1st_term", class_name: "Class 7", section: "A", subject: "Mathematics", date: "2024-10-21", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 202" },
  { id: 62, term_id: "1st_term", class_name: "Class 7", section: "A", subject: "English Literature", date: "2024-10-23", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 202" },
  { id: 63, term_id: "1st_term", class_name: "Class 7", section: "A", subject: "General Science", date: "2024-10-25", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 202" },
  { id: 64, term_id: "final_term", class_name: "Class 7", section: "A", subject: "Mathematics", date: "2025-05-12", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 202" },

  // Class 8
  { id: 71, term_id: "1st_term", class_name: "Class 8", section: "A", subject: "Mathematics", date: "2024-10-21", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 203" },
  { id: 72, term_id: "1st_term", class_name: "Class 8", section: "A", subject: "English Literature", date: "2024-10-23", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 203" },
  { id: 73, term_id: "1st_term", class_name: "Class 8", section: "A", subject: "General Science", date: "2024-10-25", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 203" },
  { id: 74, term_id: "final_term", class_name: "Class 8", section: "A", subject: "Mathematics", date: "2025-05-12", time: "09:00 AM - 11:30 AM", total_marks: 100, room: "Room 203" },

  // Class 9
  { id: 81, term_id: "1st_term", class_name: "Class 9", section: "A", subject: "Mathematics", date: "2024-10-21", time: "09:00 AM - 12:00 PM", total_marks: 100, room: "Hall B", isBoardCandidate: true },
  { id: 82, term_id: "1st_term", class_name: "Class 9", section: "A", subject: "Physics", date: "2024-10-23", time: "09:00 AM - 12:00 PM", total_marks: 75, room: "Hall B", isBoardCandidate: true },
  { id: 83, term_id: "1st_term", class_name: "Class 9", section: "A", subject: "Chemistry", date: "2024-10-25", time: "09:00 AM - 12:00 PM", total_marks: 75, room: "Hall B", isBoardCandidate: true },
  { id: 84, term_id: "final_term", class_name: "Class 9", section: "A", subject: "Mathematics", date: "2025-05-12", time: "09:00 AM - 12:00 PM", total_marks: 100, room: "Hall B", isBoardCandidate: true },
  { id: 85, term_id: "final_term", class_name: "Class 9", section: "A", subject: "Physics", date: "2025-05-14", time: "09:00 AM - 12:00 PM", total_marks: 75, room: "Hall B", isBoardCandidate: true },
  { id: 86, term_id: "final_term", class_name: "Class 9", section: "A", subject: "Chemistry", date: "2025-05-16", time: "09:00 AM - 12:00 PM", total_marks: 75, room: "Hall B", isBoardCandidate: true },

  // Class 10
  { id: 91, term_id: "1st_term", class_name: "Class 10", section: "A", subject: "Advanced Mathematics", date: "2024-10-21", time: "09:00 AM - 12:00 PM", total_marks: 100, room: "Hall A", isBoardCandidate: true },
  { id: 92, term_id: "1st_term", class_name: "Class 10", section: "A", subject: "Physics", date: "2024-10-23", time: "09:00 AM - 12:00 PM", total_marks: 75, room: "Hall A", isBoardCandidate: true },
  { id: 93, term_id: "1st_term", class_name: "Class 10", section: "A", subject: "Chemistry", date: "2024-10-25", time: "09:00 AM - 12:00 PM", total_marks: 75, room: "Hall A", isBoardCandidate: true },
  { id: 94, term_id: "final_term", class_name: "Class 10", section: "A", subject: "Advanced Mathematics", date: "2025-05-12", time: "09:00 AM - 12:00 PM", total_marks: 100, room: "Hall A", isBoardCandidate: true },
  { id: 95, term_id: "final_term", class_name: "Class 10", section: "A", subject: "Physics", date: "2025-05-14", time: "09:00 AM - 12:00 PM", total_marks: 75, room: "Hall A", isBoardCandidate: true },
  { id: 96, term_id: "final_term", class_name: "Class 10", section: "A", subject: "Chemistry", date: "2025-05-16", time: "09:00 AM - 12:00 PM", total_marks: 75, room: "Hall A", isBoardCandidate: true },
];

let DUMMY_SUBJECT_MARKS = {
  "1_Mathematics": 92,
  "2_Mathematics": 85,
  "3_Mathematics": 74,
  "4_Mathematics": 95,
};

let DUMMY_MARKS = [
  { id: 1, exam_id: 1, student_id: 1, student_name: "Ayaan Ahmed", marks_obtained: 92, grade: "A+", status: "pass" },
  { id: 2, exam_id: 1, student_id: 2, student_name: "Zainab Fatima", marks_obtained: 78, grade: "B", status: "pass" },
  { id: 3, exam_id: 1, student_id: 3, student_name: "Muhammad Bilal", marks_obtained: 38, grade: "F", status: "fail" },
];

const generateMockMarksheet = (studentId, termId = "1st_term") => {
  const seqMatch = String(studentId).match(/(\d+)$/);
  const studentNum = seqMatch ? parseInt(seqMatch[1], 10) : (parseInt(studentId, 10) || 1);
  const subjects = [
    { subject: "Mathematics", max: 100, pass: 33, obtained: Math.min(100, 85 + ((studentNum * 3) % 15)), grade: "A", remarks: "Consistent logical and analytical skill" },
    { subject: "English Literature", max: 100, pass: 33, obtained: Math.min(100, 80 + ((studentNum * 4) % 18)), grade: "A", remarks: "Good grammar, vocabulary & fluency" },
    { subject: "Urdu Language", max: 100, pass: 33, obtained: Math.min(100, 78 + ((studentNum * 5) % 16)), grade: "A", remarks: "Very good reading comprehension" },
    { subject: "General Science", max: 100, pass: 33, obtained: Math.min(100, 82 + ((studentNum * 2) % 17)), grade: "A", remarks: "Active laboratory interest and inquiry" },
    { subject: "Islamiat & Ethics", max: 50, pass: 17, obtained: Math.min(50, 42 + ((studentNum * 2) % 8)), grade: "A+", remarks: "Excellent grasp of core ethical values" },
  ];
  subjects.forEach((s) => {
    const pct = (s.obtained / s.max) * 100;
    s.grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : "F";
  });
  const total_max = subjects.reduce((sum, s) => sum + s.max, 0);
  const total_pass = subjects.reduce((sum, s) => sum + s.pass, 0);
  const total_obtained = subjects.reduce((sum, s) => sum + s.obtained, 0);
  const percentage = parseFloat(((total_obtained / total_max) * 100).toFixed(1));
  const overallGrade = percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B" : percentage >= 60 ? "C" : "F";

  return {
    student_id: studentNum,
    term_id: termId,
    subjects,
    total_max,
    total_pass,
    total_obtained,
    percentage,
    grade: overallGrade,
    class_rank: studentNum === 1 ? "#1st Position" : `#${(studentNum % 10) + 1} Position`,
    attendance: {
      present_days: Math.min(145, 134 + (studentNum % 10)),
      total_days: 145,
      percentage: Math.min(100, Math.round(((134 + (studentNum % 10)) / 145) * 100)),
    },
    teacher_appraisal:
      studentNum === 1
        ? "Outstanding academic performance, highly attentive, and exemplary conduct. Recommended for academic honors."
        : "Disciplined student who demonstrates steady academic engagement across core curriculum subjects.",
  };
};

export const examApi = {
  getTerms: async () => {
    if (USE_MOCK) {
      return [...TERMS];
    }
    try {
      const res = await client.get("/exam-types");
      const filtered = (res.data || []).filter(
        (t) => t.name === "1st Term" || t.name === "Final Term"
      );
      if (filtered.length > 0) {
        return filtered.map((t) => ({
          id: t.name === "1st Term" ? "1st_term" : "final_term",
          name: `${t.name} Examination`,
          session: "2024-2025",
          month: t.name === "1st Term" ? "October / November" : "May / June",
          status: t.name === "1st Term" ? "Active" : "Upcoming",
        }));
      }
      return [...TERMS];
    } catch {
      return [...TERMS];
    }
  },

  getDateSheets: async (params = {}) => {
    if (USE_MOCK) {
      let filtered = [...DUMMY_DATESHEET];
      if (params.term_id) {
        filtered = filtered.filter((d) => d.term_id === params.term_id);
      }
      if (params.class_name) {
        filtered = filtered.filter((d) => d.class_name === params.class_name);
      }
      return filtered;
    }
    try {
      const q = new URLSearchParams(params).toString();
      const res = await client.get(`/exams/datesheets${q ? `?${q}` : ""}`);
      return res.data;
    } catch {
      let filtered = [...DUMMY_DATESHEET];
      if (params.term_id) filtered = filtered.filter((d) => d.term_id === params.term_id);
      if (params.class_name) filtered = filtered.filter((d) => d.class_name === params.class_name);
      return filtered;
    }
  },

  createDateSheet: async (entry) => {
    if (USE_MOCK) {
      const newEntry = {
        id: Date.now(),
        ...entry,
        total_marks: parseInt(entry.total_marks, 10) || 100,
        isBoardCandidate: entry.class_name?.includes("9") || entry.class_name?.includes("10"),
      };
      DUMMY_DATESHEET.push(newEntry);
      return newEntry;
    }
    try {
      const res = await client.post("/exams/datesheets", entry);
      return res.data;
    } catch {
      const newEntry = {
        id: Date.now(),
        ...entry,
        total_marks: parseInt(entry.total_marks, 10) || 100,
        isBoardCandidate: entry.class_name?.includes("9") || entry.class_name?.includes("10"),
      };
      DUMMY_DATESHEET.push(newEntry);
      return newEntry;
    }
  },

  deleteDateSheet: async (id) => {
    if (USE_MOCK) {
      DUMMY_DATESHEET = DUMMY_DATESHEET.filter((d) => d.id !== parseInt(id, 10));
      return { success: true };
    }
    try {
      const res = await client.delete(`/exams/datesheets/${id}`);
      return res.data;
    } catch {
      DUMMY_DATESHEET = DUMMY_DATESHEET.filter((d) => d.id !== parseInt(id, 10));
      return { success: true };
    }
  },

  getSubjectMarks: async (params = {}) => {
    if (USE_MOCK) {
      return { ...DUMMY_SUBJECT_MARKS };
    }
    try {
      const q = typeof params === "string" ? `subject=${params}` : new URLSearchParams(params).toString();
      const res = await client.get(`/exams/marks${q ? `?${q}` : ""}`);
      return res.data;
    } catch {
      return { ...DUMMY_SUBJECT_MARKS };
    }
  },

  saveSubjectMarks: async (payload, maybeTermId, maybeSubject) => {
    let body = {};
    if (payload && typeof payload === "object" && payload.marks !== undefined) {
      body = payload;
    } else {
      body = {
        marks: payload || {},
        term_id: maybeTermId || "1st_term",
        subject: maybeSubject || "",
      };
    }
    if (USE_MOCK) {
      DUMMY_SUBJECT_MARKS = { ...DUMMY_SUBJECT_MARKS, ...(body.marks || {}) };
      return { success: true, count: Object.keys(body.marks || {}).length };
    }
    try {
      const res = await client.post("/exams/marks", body);
      return res.data;
    } catch {
      DUMMY_SUBJECT_MARKS = { ...DUMMY_SUBJECT_MARKS, ...(body.marks || {}) };
      return { success: true, count: Object.keys(body.marks || {}).length };
    }
  },

  getStudentMarksheet: async (studentId, termId = "1st_term") => {
    if (USE_MOCK) {
      return generateMockMarksheet(studentId, termId);
    }
    try {
      const res = await client.get(`/exams/marksheet?student_id=${studentId}&term_id=${termId}`);
      return res.data;
    } catch {
      return generateMockMarksheet(studentId, termId);
    }
  },

  getAll: async (params = {}) => {
    if (USE_MOCK) {
      let filtered = [...DUMMY_EXAMS];
      if (params.class_id) {
        filtered = filtered.filter((e) => e.class_id === parseInt(params.class_id, 10));
      }
      return { items: filtered, total: filtered.length };
    }
    const q = new URLSearchParams(params).toString();
    const res = await client.get(`/exams${q ? `?${q}` : ""}`);
    return res.data;
  },

  getById: async (id) => {
    if (USE_MOCK) {
      const exam = DUMMY_EXAMS.find((e) => e.id === parseInt(id, 10));
      if (!exam) throw new Error("Exam not found");
      return exam;
    }
    const res = await client.get(`/exams/${id}`);
    return res.data;
  },

  create: async (examData) => {
    if (USE_MOCK) {
      const newExam = {
        id: Date.now(),
        ...examData,
        total_marks: parseInt(examData.total_marks, 10) || 100,
        passing_marks: parseInt(examData.passing_marks, 10) || 40,
        students_marked: 0,
        total_students: 25,
      };
      DUMMY_EXAMS.push(newExam);
      return newExam;
    }
    const res = await client.post("/exams", examData);
    return res.data;
  },

  update: async (id, examData) => {
    if (USE_MOCK) {
      const idx = DUMMY_EXAMS.findIndex((e) => e.id === parseInt(id, 10));
      if (idx === -1) throw new Error("Exam not found");
      DUMMY_EXAMS[idx] = { ...DUMMY_EXAMS[idx], ...examData };
      return DUMMY_EXAMS[idx];
    }
    const res = await client.put(`/exams/${id}`, examData);
    return res.data;
  },

  getSchedules: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await client.get(`/exams/schedules${q ? `?${q}` : ""}`);
    return res.data;
  },

  saveSchedule: async (payload) => {
    const res = await client.post("/exams/schedules", payload);
    return res.data;
  },

  deleteSchedule: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await client.delete(`/exams/schedules${q ? `?${q}` : ""}`);
    return res.data;
  },

  getClassExams: async (classId) => {
    const res = await client.get(`/exams/class-exams?class_id=${classId}`);
    return res.data;
  },

  createExamType: async (name, defaultTotalMarks = 100) => {
    const res = await client.post("/exams/exam-types", {
      name,
      default_total_marks: defaultTotalMarks,
    });
    return res.data;
  },

  deleteExamType: async (name, force = false) => {
    const res = await client.delete(
      `/exams/exam-types?name=${encodeURIComponent(name)}&force=${force ? "true" : "false"}`
    );
    return res.data;
  },

  getClassResults: async (classId, examName) => {
    const res = await client.get(`/exams/class-results?class_id=${classId}&exam_name=${encodeURIComponent(examName)}`);
    return res.data;
  },

  saveClassResults: async (payload) => {
    const res = await client.post("/exams/class-results", payload);
    return res.data;
  },

  getClassMeritList: async (classId, examName) => {
    const res = await client.get(`/exams/class-merit-list?class_id=${classId}&exam_name=${encodeURIComponent(examName)}`);
    return res.data;
  },

  getSimplifiedMarksheet: async (studentId, examName) => {
    const res = await client.get(`/exams/simplified-marksheet?student_id=${studentId}&exam_name=${encodeURIComponent(examName)}`);
    return res.data;
  },

  delete: async (id) => {
    if (USE_MOCK) {
      DUMMY_EXAMS = DUMMY_EXAMS.filter((e) => e.id !== parseInt(id, 10));
      return { success: true };
    }
    const res = await client.delete(`/exams/${id}`);
    return res.data;
  },
};

export default examApi;
