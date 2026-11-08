import client from "./client";

// Set to false to connect directly to the live backend
export const USE_MOCK = false;

export const getClassRank = (className) => {
  if (!className) return 999;
  const lower = className.toLowerCase().trim();
  if (lower.includes("playgroup") || lower.includes("pg")) return 1;
  if (lower.includes("nursery") || lower.includes("nur")) return 2;
  if (lower.includes("prep") || lower.includes("kg") || lower.includes("kindergarten")) return 3;
  const match = lower.match(/\d+/);
  if (match) {
    return 10 + parseInt(match[0], 10);
  }
  return 100;
};

let DUMMY_STUDENTS = [
  {
    id: 1,
    name: "Ayaan Ahmed",
    roll_number: "2024-PG-A-01",
    formatted_roll_number: "2024-PG-A-01",
    class_id: 1,
    class_name: "Playgroup",
    section: "A",
    academic_year: "2024-2025",
    date_of_birth: "2021-05-10",
    gender: "M",
    parent_name: "Zubair Ahmed",
    contact_number: "+92 300 1234567",
    email: "ayaan.ahmed@littlescholar.edu.pk",
    address: "House 12, Street 4, Block B",
    city: "Lahore",
    admission_date: "2024-01-10",
    is_active: true,
    fee_status: "paid",
    attendance_percentage: 96.5,
  },
  {
    id: 2,
    name: "Zainab Fatima",
    roll_number: "2024-NUR-A-01",
    formatted_roll_number: "2024-NUR-A-01",
    class_id: 2,
    class_name: "Nursery",
    section: "A",
    academic_year: "2024-2025",
    date_of_birth: "2020-03-15",
    gender: "F",
    parent_name: "Farhan Ali",
    contact_number: "+92 321 9876543",
    email: "zainab.f@littlescholar.edu.pk",
    address: "Apartment 4B, Gulberg Heights",
    city: "Lahore",
    admission_date: "2024-01-12",
    is_active: true,
    fee_status: "paid",
    attendance_percentage: 94.0,
  },
  {
    id: 3,
    name: "Muhammad Bilal",
    roll_number: "2024-PREP-A-01",
    formatted_roll_number: "2024-PREP-A-01",
    class_id: 3,
    class_name: "Prep",
    section: "A",
    academic_year: "2024-2025",
    date_of_birth: "2019-08-22",
    gender: "M",
    parent_name: "Tariq Mahmood",
    contact_number: "+92 333 4567890",
    email: "bilal.t@littlescholar.edu.pk",
    address: "Sector F-8/2",
    city: "Islamabad",
    admission_date: "2024-01-15",
    is_active: true,
    fee_status: "pending",
    attendance_percentage: 91.5,
  },
  {
    id: 4,
    name: "Muhammad Ali",
    roll_number: "2024-1-A-01",
    formatted_roll_number: "2024-1-A-01",
    class_id: 4,
    class_name: "Class 1",
    section: "A",
    academic_year: "2024-2025",
    date_of_birth: "2018-04-12",
    gender: "M",
    parent_name: "Tariq Mehmood",
    contact_number: "+92 300 2345678",
    email: "ali.tariq@littlescholar.edu.pk",
    address: "House 45, Gulshan Block, Allama Iqbal Town",
    city: "Lahore",
    admission_date: "2024-01-15",
    is_active: true,
    fee_status: "paid",
    attendance_percentage: 97.2,
  },
  {
    id: 5,
    name: "Ayesha Khan",
    roll_number: "2024-1-B-01",
    formatted_roll_number: "2024-1-B-01",
    class_id: 5,
    class_name: "Class 1",
    section: "B",
    academic_year: "2024-2025",
    date_of_birth: "2018-08-23",
    gender: "F",
    parent_name: "Imran Khan",
    contact_number: "+92 321 3456789",
    email: "ayesha.k@littlescholar.edu.pk",
    address: "Street 10, Faisal Town",
    city: "Lahore",
    admission_date: "2024-01-15",
    is_active: true,
    fee_status: "paid",
    attendance_percentage: 95.0,
  },
  {
    id: 6,
    name: "Bilal Ahmed",
    roll_number: "2024-2-A-01",
    formatted_roll_number: "2024-2-A-01",
    class_id: 6,
    class_name: "Class 2",
    section: "A",
    academic_year: "2024-2025",
    date_of_birth: "2017-02-18",
    gender: "M",
    parent_name: "Ahmed Raza",
    contact_number: "+92 333 4567890",
    email: "bilal.raza@littlescholar.edu.pk",
    address: "Sector J, Phase 5, DHA",
    city: "Lahore",
    admission_date: "2024-01-16",
    is_active: true,
    fee_status: "overdue",
    attendance_percentage: 88.0,
  },
  {
    id: 7,
    name: "Zainab Bibi",
    roll_number: "2024-3-A-01",
    formatted_roll_number: "2024-3-A-01",
    class_id: 7,
    class_name: "Class 3",
    section: "A",
    academic_year: "2024-2025",
    date_of_birth: "2016-11-05",
    gender: "F",
    parent_name: "Malik Javed",
    contact_number: "+92 301 5678901",
    email: "zainab.javed@littlescholar.edu.pk",
    address: "Block B, Johar Town",
    city: "Lahore",
    admission_date: "2024-01-18",
    is_active: true,
    fee_status: "paid",
    attendance_percentage: 98.4,
  },
  {
    id: 8,
    name: "Hamza Tariq",
    roll_number: "2024-4-A-01",
    formatted_roll_number: "2024-4-A-01",
    class_id: 8,
    class_name: "Class 4",
    section: "A",
    academic_year: "2024-2025",
    date_of_birth: "2015-06-30",
    gender: "M",
    parent_name: "Tariq Hussain",
    contact_number: "+92 304 6789012",
    email: "hamza.t@littlescholar.edu.pk",
    address: "Canal View Housing Society",
    city: "Lahore",
    admission_date: "2024-01-20",
    is_active: true,
    fee_status: "pending",
    attendance_percentage: 89.2,
  },
  {
    id: 9,
    name: "Sana Javed",
    roll_number: "2024-5-A-01",
    formatted_roll_number: "2024-5-A-01",
    class_id: 9,
    class_name: "Class 5",
    section: "A",
    academic_year: "2024-2025",
    date_of_birth: "2014-09-14",
    gender: "F",
    parent_name: "Javed Iqbal",
    contact_number: "+92 302 7890123",
    email: "sana.javed@littlescholar.edu.pk",
    address: "Main Boulevard, Model Town",
    city: "Lahore",
    admission_date: "2024-01-15",
    is_active: true,
    fee_status: "paid",
    attendance_percentage: 96.0,
  },
  {
    id: 10,
    name: "Usman Malik",
    roll_number: "2024-8-A-01",
    formatted_roll_number: "2024-8-A-01",
    class_id: 12,
    class_name: "Class 8",
    section: "A",
    academic_year: "2024-2025",
    date_of_birth: "2011-07-22",
    gender: "M",
    parent_name: "Malik Arshad",
    contact_number: "+92 305 8901234",
    email: "usman.malik@littlescholar.edu.pk",
    address: "Wapda Town, Block F",
    city: "Lahore",
    admission_date: "2024-01-15",
    is_active: true,
    fee_status: "paid",
    attendance_percentage: 93.5,
  },
  {
    id: 11,
    name: "Hamza Malik",
    roll_number: "2024-10-A-01",
    formatted_roll_number: "2024-10-A-01",
    class_id: 14,
    class_name: "Class 10",
    section: "A",
    academic_year: "2024-2025",
    date_of_birth: "2009-11-12",
    gender: "M",
    parent_name: "Kashif Malik",
    contact_number: "+92 301 5551234",
    email: "hamza.malik@littlescholar.edu.pk",
    address: "DHA Phase 5",
    city: "Lahore",
    admission_date: "2024-01-10",
    is_active: true,
    fee_status: "paid",
    attendance_percentage: 99.0,
  },
  {
    id: 12,
    name: "Sara Khan",
    roll_number: "2024-10-B-01",
    formatted_roll_number: "2024-10-B-01",
    class_id: 15,
    class_name: "Class 10",
    section: "B",
    academic_year: "2024-2025",
    date_of_birth: "2009-04-18",
    gender: "F",
    parent_name: "Imran Khan",
    contact_number: "+92 345 6677889",
    email: "sara.khan@littlescholar.edu.pk",
    address: "Model Town",
    city: "Lahore",
    admission_date: "2024-01-10",
    is_active: true,
    fee_status: "paid",
    attendance_percentage: 96.8,
  },
];

export const studentApi = {
  getAll: async (params = {}) => {
    if (USE_MOCK) {
      let filtered = [...DUMMY_STUDENTS];

      // Search filter
      if (params.search && params.search.trim()) {
        const q = params.search.toLowerCase().trim();
        filtered = filtered.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.roll_number && s.roll_number.toLowerCase().includes(q)) ||
            (s.formatted_roll_number && s.formatted_roll_number.toLowerCase().includes(q)) ||
            (s.parent_name && s.parent_name.toLowerCase().includes(q))
        );
      }

      // Class ID filter
      if (params.class_id && params.class_id !== "all") {
        filtered = filtered.filter((s) => s.class_id === parseInt(params.class_id, 10));
      }

      // Base Class Name filter (e.g. "Playgroup", "Class 10")
      if (params.base_class && params.base_class !== "all") {
        filtered = filtered.filter((s) => (s.class_name || "").toLowerCase() === params.base_class.toLowerCase());
      }

      // Section filter (e.g. "A", "B")
      if (params.section && params.section !== "all") {
        filtered = filtered.filter(
          (s) => (s.section || "").toLowerCase() === params.section.toLowerCase()
        );
      }

      // Active status filter
      if (params.is_active !== undefined && params.is_active !== "") {
        const activeBool = params.is_active === true || params.is_active === "true";
        filtered = filtered.filter((s) => s.is_active === activeBool);
      }

      // Sorting
      const sortBy = params.sort_by || "class_asc";
      if (sortBy === "class_asc") {
        filtered.sort((a, b) => {
          const rankA = getClassRank(a.class_name);
          const rankB = getClassRank(b.class_name);
          if (rankA !== rankB) return rankA - rankB;
          const secA = a.section || "A";
          const secB = b.section || "A";
          if (secA !== secB) return secA.localeCompare(secB);
          return (a.roll_number || "").localeCompare(b.roll_number || "");
        });
      } else if (sortBy === "name_asc") {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortBy === "name_desc") {
        filtered.sort((a, b) => b.name.localeCompare(a.name));
      } else if (sortBy === "roll_asc") {
        filtered.sort((a, b) => (a.roll_number || "").localeCompare(b.roll_number || ""));
      } else if (sortBy === "roll_desc") {
        filtered.sort((a, b) => (b.roll_number || "").localeCompare(a.roll_number || ""));
      }

      const total = filtered.length;
      const skip = params.skip || 0;
      const limit = params.limit || 50;
      const items = filtered.slice(skip, skip + limit);

      return { total, items };
    }

    const query = new URLSearchParams();
    if (params.skip !== undefined) query.append("skip", params.skip);
    if (params.limit !== undefined) query.append("limit", params.limit);
    if (params.search) query.append("search", params.search);
    if (params.class_id && params.class_id !== "all") query.append("class_id", params.class_id);
    if (params.base_class && params.base_class !== "all") query.append("base_class", params.base_class);
    if (params.section && params.section !== "all") query.append("section", params.section);
    if (params.gender && params.gender !== "all") query.append("gender", params.gender);
    if (params.academic_year_id && params.academic_year_id !== "all") query.append("academic_year_id", params.academic_year_id);
    if (params.is_active !== undefined && params.is_active !== "") query.append("is_active", params.is_active);
    if (params.sort_by) query.append("sort_by", params.sort_by);

    const res = await client.get(`/students?${query.toString()}`);
    return res.data;
  },

  getById: async (id) => {
    if (USE_MOCK) {
      const s = DUMMY_STUDENTS.find((st) => st.id === parseInt(id, 10));
      if (!s) throw new Error("Student not found");
      return s;
    }
    const res = await client.get(`/students/${id}`);
    return res.data;
  },

  create: async (studentData) => {
    if (USE_MOCK) {
      // Auto-construct combination roll number: session + class + section + seq
      const session = studentData.academic_year || "2024";
      const sessionPrefix = session.includes("-") ? session.split("-")[0] : session;
      const classCode = (studentData.class_name || "1").replace("Class ", "").replace("Grade ", "").trim();
      const section = (studentData.section || "A").toUpperCase();
      const seq = String(DUMMY_STUDENTS.length + 1).padStart(2, "0");
      const generatedRoll = studentData.roll_number || `${sessionPrefix}-${classCode}-${section}-${seq}`;

      const newStudent = {
        id: Date.now(),
        ...studentData,
        roll_number: generatedRoll,
        formatted_roll_number: generatedRoll,
        is_active: studentData.is_active !== undefined ? studentData.is_active : true,
        fee_status: "paid",
        attendance_percentage: 95.0,
      };
      DUMMY_STUDENTS.unshift(newStudent);
      return newStudent;
    }
    const res = await client.post("/students", studentData);
    return res.data;
  },

  update: async (id, studentData) => {
    if (USE_MOCK) {
      const idx = DUMMY_STUDENTS.findIndex((st) => st.id === parseInt(id, 10));
      if (idx === -1) throw new Error("Student not found");
      DUMMY_STUDENTS[idx] = { ...DUMMY_STUDENTS[idx], ...studentData };
      return DUMMY_STUDENTS[idx];
    }
    const res = await client.put(`/students/${id}`, studentData);
    return res.data;
  },

  delete: async (id) => {
    if (USE_MOCK) {
      DUMMY_STUDENTS = DUMMY_STUDENTS.filter((st) => st.id !== parseInt(id, 10));
      return { success: true, message: "Student deleted" };
    }
    const res = await client.delete(`/students/${id}`);
    return res.data;
  },

  restore: async (id) => {
    if (USE_MOCK) {
      const idx = DUMMY_STUDENTS.findIndex((st) => st.id === parseInt(id, 10));
      if (idx !== -1) DUMMY_STUDENTS[idx].is_active = true;
      return { success: true, message: "Student restored" };
    }
    const res = await client.post(`/students/${id}/restore`);
    return res.data;
  },

  getAttendanceSummary: async (id, month) => {
    if (USE_MOCK) {
      return {
        total_days: 0,
        present: 0,
        absent: 0,
        leave: 0,
        percentage: 0.0,
      };
    }
    try {
      const q = month ? `?month=${month}` : "";
      const res = await client.get(`/students/${id}/attendance-summary${q}`);
      return res.data;
    } catch (err) {
      return {
        total_days: 0,
        present: 0,
        absent: 0,
        leave: 0,
        percentage: 0.0,
      };
    }
  },

  getFeeStatus: async (id) => {
    if (USE_MOCK) {
      return {
        total_due: 0.0,
        pending_months: [],
        last_paid_date: null,
        status: "no_records",
      };
    }
    try {
      const res = await client.get(`/students/${id}/fee-status`);
      return res.data;
    } catch (err) {
      return {
        total_due: 0.0,
        pending_months: [],
        last_paid_date: null,
        status: "no_records",
      };
    }
  },

  downloadTemplate: async ({ classId, section, rollMode }) => {
    if (USE_MOCK) {
      const csvContent =
        "name,roll_number,class_name,section,parent_name,contact_number,email,gender\n" +
        "Ayaan Ahmed,2024-1-A-99,Class 1,A,Zubair Ahmed,+92 300 1234567,ayaan@example.com,M\n";
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "student_template.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    const res = await client.get("/import/students/template", {
      params: { class_id: classId, section, roll_mode: rollMode },
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "student_template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  importCSV: async (file, { classId, section, rollMode }) => {
    if (USE_MOCK) {
      return { imported: 1, failed: 0, errors: [] };
    }
    const formData = new FormData();
    formData.append("file", file);
    const res = await client.post("/import/students", formData, {
      params: { class_id: classId, section, roll_mode: rollMode },
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  promote: async (id, data) => {
    if (USE_MOCK) {
      return { success: true, message: "Student promoted successfully" };
    }
    const res = await client.post(`/students/${id}/promote`, data);
    return res.data;
  },
};

export const getStudents = (params) => studentApi.getAll(params);
export const getStudentById = (id) => studentApi.getById(id);
export const createStudent = (data) => studentApi.create(data);
export const updateStudent = (id, data) => studentApi.update(id, data);
export const promoteStudent = (id, data) => studentApi.promote(id, data);
export const deleteStudent = (id) => studentApi.delete(id);
export const restoreStudent = (id) => studentApi.restore(id);
export const downloadStudentTemplate = (options) => studentApi.downloadTemplate(options);
export const importStudentsCSV = (file, options) => studentApi.importCSV(file, options);

export default studentApi;
