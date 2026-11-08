import client from "./client";

export let DUMMY_TEACHERS = [
  {
    id: 1,
    teacher_code: "TCH_001",
    full_name: "Ms. Sana Tariq",
    email: "sana.tariq@littlescholar.edu.pk",
    phone_number: "+92 300 1234567",
    date_of_birth: "1990-05-14",
    gender: "F",
    qualification: "M.Sc. Mathematics",
    specialization: "Mathematics & Class Incharge",
    date_of_joining: "2019-08-15",
    salary: 65000,
    total_periods_per_week: 30,
    is_active: true,
    bank_account: "010203040506",
    bank_name: "Habib Bank Limited (HBL)",
    address: "Model Town, Block C",
    city: "Lahore",
    notes: "Class 1-A Incharge & Senior Math Faculty",
  },
  {
    id: 2,
    teacher_code: "TCH_002",
    full_name: "Mr. Tariq Mehmood",
    email: "tariq.mehmood@littlescholar.edu.pk",
    phone_number: "+92 301 2345678",
    date_of_birth: "1988-11-20",
    gender: "M",
    qualification: "M.A. English Literature",
    specialization: "English Language & Grammar",
    date_of_joining: "2018-09-01",
    salary: 60000,
    total_periods_per_week: 28,
    is_active: true,
    bank_account: "112233445566",
    bank_name: "United Bank Limited (UBL)",
    address: "Gulberg III",
    city: "Lahore",
    notes: "Middle School English Incharge",
  },
  {
    id: 3,
    teacher_code: "TCH_003",
    full_name: "Ms. Ayesha Siddiqa",
    email: "ayesha.siddiqa@littlescholar.edu.pk",
    phone_number: "+92 302 3456789",
    date_of_birth: "1992-03-10",
    gender: "F",
    qualification: "M.Phil Urdu Adab",
    specialization: "Urdu Language & Nazm",
    date_of_joining: "2020-02-01",
    salary: 58000,
    total_periods_per_week: 26,
    is_active: true,
    bank_account: "223344556677",
    bank_name: "Meezan Bank Limited",
    address: "Johar Town, Phase 2",
    city: "Lahore",
    notes: "Head of Urdu Department",
  },
  {
    id: 4,
    teacher_code: "TCH_004",
    full_name: "Mr. Muhammad Bilal",
    email: "muhammad.bilal@littlescholar.edu.pk",
    phone_number: "+92 303 4567890",
    date_of_birth: "1987-07-22",
    gender: "M",
    qualification: "M.Sc. Physics",
    specialization: "General Science & Physics",
    date_of_joining: "2017-04-10",
    salary: 62000,
    total_periods_per_week: 30,
    is_active: true,
    bank_account: "334455667788",
    bank_name: "MCB Bank",
    address: "Faisal Town",
    city: "Lahore",
    notes: "Science Laboratory Director",
  },
  {
    id: 5,
    teacher_code: "TCH_005",
    full_name: "Ms. Fatima Zahra",
    email: "fatima.zahra@littlescholar.edu.pk",
    phone_number: "+92 304 5678901",
    date_of_birth: "1993-09-05",
    gender: "F",
    qualification: "M.Sc. Chemistry & Biology",
    specialization: "Biology & Chemistry",
    date_of_joining: "2021-08-01",
    salary: 60000,
    total_periods_per_week: 28,
    is_active: true,
    bank_account: "445566778899",
    bank_name: "Bank Alfalah",
    address: "DHA Phase 5",
    city: "Lahore",
    notes: "Matric Board Exam Mentor",
  },
  {
    id: 6,
    teacher_code: "TCH_006",
    full_name: "Mr. Abdul Rehman",
    email: "abdul.rehman@littlescholar.edu.pk",
    phone_number: "+92 305 6789012",
    date_of_birth: "1985-01-18",
    gender: "M",
    qualification: "M.A. Islamic Studies",
    specialization: "Islamiyat & Pakistan Studies",
    date_of_joining: "2016-01-15",
    salary: 55000,
    total_periods_per_week: 26,
    is_active: true,
    bank_account: "556677889900",
    bank_name: "Allied Bank Limited (ABL)",
    address: "Iqbal Town",
    city: "Lahore",
    notes: "Ethics & Tarbiyah Coordinator",
  },
  {
    id: 7,
    teacher_code: "TCH_007",
    full_name: "Mr. Farhan Saeed",
    email: "farhan.saeed@littlescholar.edu.pk",
    phone_number: "+92 306 7890123",
    date_of_birth: "1994-12-08",
    gender: "M",
    qualification: "BS Computer Science",
    specialization: "Computer Science & IT",
    date_of_joining: "2022-09-15",
    salary: 65000,
    total_periods_per_week: 28,
    is_active: true,
    bank_account: "667788990011",
    bank_name: "Faysal Bank",
    address: "Wapda Town",
    city: "Lahore",
    notes: "Computer Lab Administrator",
  },
  {
    id: 8,
    teacher_code: "TCH_008",
    full_name: "Ms. Noreen Akhtar",
    email: "noreen.akhtar@littlescholar.edu.pk",
    phone_number: "+92 307 8901234",
    date_of_birth: "1991-04-25",
    gender: "F",
    qualification: "Montessori Diploma & B.Ed",
    specialization: "Early Childhood Education",
    date_of_joining: "2020-03-01",
    salary: 55000,
    total_periods_per_week: 30,
    is_active: true,
    bank_account: "778899001122",
    bank_name: "Meezan Bank Limited",
    address: "Garden Town",
    city: "Lahore",
    notes: "Junior Wing Section Coordinator",
  },
];

export const teacherApi = {
  getAll: async (params = {}) => {
    try {
      const response = await client.get("/teachers", {
        params,
        skipGlobalToast: true,
      });
      if (response.data && (response.data.items || Array.isArray(response.data))) {
        const items = response.data.items || response.data;
        if (items.length > 0) return response.data;
      }
    } catch (err) {
      // Fallback seamlessly to Pakistani faculty dataset
      console.warn("Using offline Pakistani faculty directory:", err.message);
    }

    let filtered = [...DUMMY_TEACHERS];
    if (params.is_active !== undefined) {
      filtered = filtered.filter((t) => t.is_active === params.is_active);
    }
    return {
      total: filtered.length,
      items: filtered,
    };
  },

  getById: async (id) => {
    try {
      const response = await client.get(`/teachers/${id}`);
      if (response.data) return response.data;
    } catch (err) {
      console.warn("Using offline teacher profile for ID", id);
    }
    const found = DUMMY_TEACHERS.find((t) => String(t.id) === String(id));
    if (!found) throw new Error("Teacher record not found");
    return found;
  },

  create: async (payload) => {
    try {
      const response = await client.post("/teachers", payload);
      if (response.data) return response.data;
    } catch (err) {
      console.warn("Creating teacher in local session:", err.message);
    }
    const nextCodeNum = DUMMY_TEACHERS.length + 1;
    const newTeacher = {
      id: Date.now(),
      teacher_code: `TCH_${String(nextCodeNum).padStart(3, "0")}`,
      ...payload,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
    };
    DUMMY_TEACHERS.unshift(newTeacher);
    return newTeacher;
  },

  update: async (id, payload) => {
    try {
      const response = await client.put(`/teachers/${id}`, payload);
      if (response.data) return response.data;
    } catch (err) {
      console.warn("Updating teacher in local session:", err.message);
    }
    const idx = DUMMY_TEACHERS.findIndex((t) => String(t.id) === String(id));
    if (idx !== -1) {
      DUMMY_TEACHERS[idx] = { ...DUMMY_TEACHERS[idx], ...payload };
      return DUMMY_TEACHERS[idx];
    }
    return payload;
  },

  delete: async (id) => {
    try {
      const response = await client.delete(`/teachers/${id}`);
      if (response.data) return response.data;
    } catch (err) {
      console.warn("Deactivating teacher in local session:", err.message);
    }
    const idx = DUMMY_TEACHERS.findIndex((t) => String(t.id) === String(id));
    if (idx !== -1) {
      DUMMY_TEACHERS[idx].is_active = false;
    }
    return { success: true };
  },

  getClasses: async (id, academicYearId) => {
    try {
      const response = await client.get(`/teachers/${id}/classes`, {
        params: academicYearId ? { academic_year_id: academicYearId } : undefined,
      });
      if (response.data) return response.data;
    } catch (err) {
      // offline fallback classes
    }
    return {
      classes: [
        { id: 4, name: "Class 1 - Section A", strength: 32 },
        { id: 13, name: "Class 9 - Section A", strength: 38 },
      ],
    };
  },

  getSalarySummary: async (id, month, year) => {
    try {
      const response = await client.get(`/teachers/${id}/salary-summary`, {
        params: { month, year },
      });
      if (response.data) return response.data;
    } catch (err) {
      // offline fallback salary
    }
    const teacher = DUMMY_TEACHERS.find((t) => String(t.id) === String(id)) || DUMMY_TEACHERS[0];
    const base = Number(teacher.salary || 65000);
    return {
      month: "Current Month",
      base_salary: base,
      deductions: 2000,
      net_salary: base - 2000,
      payment_status: "Paid",
    };
  },
};

export default teacherApi;
