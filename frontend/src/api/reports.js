import client from "./client";

// Set to false to connect directly to the live backend
export const USE_MOCK = false;

export const reportApi = {
  getAttendanceReport: async (params = {}) => {
    if (USE_MOCK) {
      return {
        class_average: 92.4,
        highest_attendance: "Muhammad Ali (98%)",
        lowest_attendance: "Muhammad Bilal (78%)",
        summary: [
          { student_id: 1, name: "Muhammad Ali", roll_number: "2024-1-A-01", class_name: "Class 1-A", present_days: 20, absent_days: 2, percentage: 90.9 },
          { student_id: 2, name: "Ayesha Khan", roll_number: "2024-1-A-02", class_name: "Class 1-A", present_days: 19, absent_days: 3, percentage: 86.4 },
          { student_id: 3, name: "Muhammad Bilal", roll_number: "2024-1-A-03", class_name: "Class 1-A", present_days: 17, absent_days: 5, percentage: 77.3 },
        ],
      };
    }
    const q = new URLSearchParams(params).toString();
    const res = await client.get(`/reports/attendance${q ? `?${q}` : ""}`);
    return res.data;
  },

  getFeeReport: async (params = {}) => {
    if (USE_MOCK) {
      return {
        total_fees: 30000,
        total_collected: 15500,
        pending: 14500,
        overdue: 5000,
        collection_rate: "51.7%",
        students: [],
      };
    }
    const q = new URLSearchParams(params).toString();
    const res = await client.get(`/reports/fees${q ? `?${q}` : ""}`);
    return res.data;
  },

  getExamReport: async (params = {}) => {
    if (USE_MOCK) {
      return {
        average_marks: 74.5,
        pass_percentage: 80.0,
        highest_mark: 92,
        lowest_mark: 38,
        grade_distribution: { "A+": 1, A: 1, B: 1, F: 1 },
      };
    }
    const q = new URLSearchParams(params).toString();
    const res = await client.get(`/reports/exam-performance${q ? `?${q}` : ""}`);
    return res.data;
  },

  getStudentReport: async (studentId) => {
    if (USE_MOCK) {
      return {
        student_id: studentId,
        attendance: { percentage: 91.0, present: 20, total_days: 22 },
        fees: { total_due: 5000, status: "pending" },
        exams: [{ subject: "Mathematics", marks: 92, grade: "A+" }],
      };
    }
    const res = await client.get(`/reports/student-summary/${studentId}`);
    return res.data;
  },

  getDashboardSummary: async () => {
    if (USE_MOCK) {
      return {
        total_students: 428,
        attendance_today: {
          present: 405,
          total: 428,
          percentage: "94.6%",
          fraction: "405 / 428",
        },
        pending_fees: "Rs. 55,000",
        collected_fees: "Rs. 485,000",
        active_classes: 15,
        priority_actions: [
          {
            id: "roll-call-2a",
            type: "attendance",
            title: "Class 2-A Morning Attendance Missing",
            desc: "Class Incharge Ms. Ayesha Siddiqa has not submitted today's roll-call register (25 students).",
            actionText: "Mark Roll Call",
            linkTo: "/attendance",
            severity: "warning",
          },
          {
            id: "roll-call-5a",
            type: "attendance",
            title: "Class 5-A Morning Attendance Missing",
            desc: "Class Incharge Ms. Sana Tariq has not submitted today's roll-call register (30 students).",
            actionText: "Mark Roll Call",
            linkTo: "/attendance",
            severity: "warning",
          },
          {
            id: "fee-overdue-1",
            type: "fee",
            title: "Rs. 5,000 Tuition Voucher Overdue (Prep-A)",
            desc: "Muhammad Bilal (Roll: 2024-PREP-A-01) — January tuition voucher past Jan 10 due date.",
            actionText: "View Voucher",
            linkTo: "/fees",
            severity: "danger",
          },
          {
            id: "fee-overdue-2",
            type: "fee",
            title: "Rs. 9,500 Board Registration & Tuition Overdue (Class 10-A)",
            desc: "Hamza Tariq (Roll: 2024-10-A-01) — includes BISE Matriculation registration fee of Rs. 3,500.",
            actionText: "View Voucher",
            linkTo: "/fees",
            severity: "danger",
          },
        ],
      };
    }
    const res = await client.get("/reports/dashboard/summary");
    return res.data;
  },
};

export default reportApi;
