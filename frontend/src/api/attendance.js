import client from "./client";

// Set to false to connect directly to the live backend
export const USE_MOCK = false;

let DUMMY_ATTENDANCE = [
  { id: 1, student_id: 1, class_id: 1, attendance_date: "2025-01-15", status: "present", remarks: "" },
  { id: 2, student_id: 2, class_id: 1, attendance_date: "2025-01-15", status: "present", remarks: "" },
  { id: 3, student_id: 3, class_id: 1, attendance_date: "2025-01-15", status: "absent", remarks: "Sick leave" },
  { id: 4, student_id: 4, class_id: 1, attendance_date: "2025-01-15", status: "present", remarks: "" },
  { id: 5, student_id: 5, class_id: 1, attendance_date: "2025-01-15", status: "leave", remarks: "Family travel" },
];

export const attendanceApi = {
  mark: async (payload) => {
    if (USE_MOCK) {
      const { class_id, attendance_date, records } = payload;
      DUMMY_ATTENDANCE = DUMMY_ATTENDANCE.filter(
        (a) => !(a.class_id === parseInt(class_id, 10) && a.attendance_date === attendance_date)
      );
      records.forEach((r) => {
        DUMMY_ATTENDANCE.push({
          id: Date.now() + Math.random(),
          student_id: r.student_id,
          class_id: parseInt(class_id, 10),
          attendance_date,
          status: r.status || "present",
          remarks: r.remarks || "",
        });
      });
      return { marked: records.length, success: true };
    }
    const res = await client.post("/attendance/mark", payload);
    return res.data;
  },

  bulkSave: async (payload) => {
    return attendanceApi.mark({
      class_id: payload.class_id,
      attendance_date: payload.date || payload.attendance_date,
      records: payload.records,
    });
  },

  getByClassAndDate: async (classId, date) => {
    if (USE_MOCK) {
      return DUMMY_ATTENDANCE.filter(
        (a) => a.class_id === parseInt(classId, 10) && a.attendance_date === date
      );
    }
    const res = await client.get(`/attendance/class/${classId}/date/${date}`);
    return res.data;
  },

  getStudentSummary: async (studentId, month, year) => {
    if (USE_MOCK) {
      return {
        total_days: 20,
        present: 18,
        absent: 2,
        leave: 0,
        percentage: 90.0,
        status: "good",
      };
    }
    const q = new URLSearchParams({ month, year }).toString();
    const res = await client.get(`/attendance/student/${studentId}/summary?${q}`);
    return res.data;
  },

  getClassSummary: async (classId, month) => {
    if (USE_MOCK) {
      return {
        total_days: 20,
        students: [
          { student_id: 1, name: "Ayaan Ahmed", present: 19, absent: 1, percentage: 95.0 },
          { student_id: 2, name: "Zainab Fatima", present: 18, absent: 2, percentage: 90.0 },
          { student_id: 3, name: "Muhammad Bilal", present: 16, absent: 4, percentage: 80.0 },
        ],
      };
    }
    const q = month ? `?month=${month}` : "";
    const res = await client.get(`/attendance/class/${classId}/summary${q}`);
    return res.data;
  },

  getStudentReport: async (studentId, params = {}) => {
    if (USE_MOCK) {
      return DUMMY_ATTENDANCE.filter((a) => a.student_id === parseInt(studentId, 10));
    }
    const q = new URLSearchParams(params).toString();
    const res = await client.get(`/attendance/student/${studentId}/report${q ? `?${q}` : ""}`);
    return res.data;
  },

  update: async (attendanceId, data) => {
    if (USE_MOCK) {
      const idx = DUMMY_ATTENDANCE.findIndex((a) => a.id === attendanceId);
      if (idx !== -1) {
        DUMMY_ATTENDANCE[idx] = { ...DUMMY_ATTENDANCE[idx], ...data };
      }
      return { success: true };
    }
    const res = await client.put(`/attendance/${attendanceId}`, data);
    return res.data;
  },

  delete: async (attendanceId) => {
    if (USE_MOCK) {
      DUMMY_ATTENDANCE = DUMMY_ATTENDANCE.filter((a) => a.id !== attendanceId);
      return { success: true };
    }
    const res = await client.delete(`/attendance/${attendanceId}`);
    return res.data;
  },

  getWeeklyAttendanceTrend: async () => {
    if (USE_MOCK) {
      return [
        { day: "Mon", date: "Oct 18", attendance: 93.2, present: 399, total: 428 },
        { day: "Tue", date: "Oct 19", attendance: 95.8, present: 410, total: 428 },
        { day: "Wed", date: "Oct 20", attendance: 92.5, present: 396, total: 428 },
        { day: "Thu", date: "Oct 21", attendance: 96.2, present: 412, total: 428 },
        { day: "Fri", date: "Oct 22", attendance: 94.0, present: 402, total: 428 },
        { day: "Sat", date: "Oct 23", attendance: 91.5, present: 392, total: 428 },
        { day: "Today", date: "Oct 24", attendance: 94.6, present: 405, total: 428 },
      ];
    }
    const res = await client.get("/attendance/weekly-trend");
    return res.data;
  },
};

export default attendanceApi;
