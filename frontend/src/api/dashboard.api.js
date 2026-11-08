import client from "./client";

// Set to false to connect directly to the live FastAPI backend
export const USE_MOCK = false;

/**
 * Fetch top row KPI summary metrics
 */
export const getDashboardMetrics = async () => {
  if (USE_MOCK) {
    return {
      totalStudents: 428,
      attendancePercentage: "94.6%",
      attendanceFraction: "405 / 428",
      pendingFees: "Rs. 55,000",
      collectedFees: "Rs. 485,000",
    };
  }
  const res = await client.get("/reports/dashboard/summary");
  const data = res.data;
  return {
    totalStudents: data.total_students ?? 0,
    totalClasses: data.total_classes ?? 0,
    totalTeachers: data.total_teachers ?? 0,
    attendancePercentage: data.attendance_today?.percentage !== undefined
      ? `${data.attendance_today.percentage}%`
      : "0%",
    attendanceFraction: `${data.attendance_today?.present || 0} / ${data.total_students || 0}`,
    pendingFees: data.pending_fees !== undefined && data.pending_fees !== null
      ? `Rs. ${Number(data.pending_fees).toLocaleString()}`
      : "Rs. 0",
    collectedFees: data.collected_fees !== undefined && data.collected_fees !== null
      ? `Rs. ${Number(data.collected_fees).toLocaleString()}`
      : "Rs. 0",
  };
};

/**
 * Fetch 6-month fee recovery & collections trend
 */
export const getFeeCollectionTrend = async () => {
  if (USE_MOCK) {
    return [
      { month: "May", collected: 380000, pending: 45000, recoveryRate: "89.4%" },
      { month: "Jun", collected: 420000, pending: 35000, recoveryRate: "92.3%" },
      { month: "Jul", collected: 410000, pending: 40000, recoveryRate: "91.1%" },
      { month: "Aug", collected: 460000, pending: 30000, recoveryRate: "93.8%" },
      { month: "Sep", collected: 475000, pending: 28000, recoveryRate: "94.4%" },
      { month: "Oct", collected: 485000, pending: 55000, recoveryRate: "89.8%" },
    ];
  }
  const res = await client.get("/reports/dashboard/fee-trend", { skipGlobalToast: true });
  return res.data || [];
};

/**
 * Fetch 7-day attendance trend data for the area chart
 */
export const getAttendanceTrend = async () => {
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
};

/**
 * Fetch actionable items requiring immediate administrative follow-up
 */
export const getPriorityActions = async () => {
  if (USE_MOCK) {
    return [
      {
        id: "roll-call-2a",
        type: "attendance",
        title: "Class 2-A morning attendance missing",
        desc: "Class Incharge Ms. Ayesha Siddiqa has not submitted today's roll-call register (25 students).",
        actionText: "Mark Roll Call",
        linkTo: "/attendance",
        severity: "warning",
      },
      {
        id: "roll-call-5a",
        type: "attendance",
        title: "Class 5-A morning attendance missing",
        desc: "Class Incharge Ms. Sana Tariq has not submitted today's roll-call register (30 students).",
        actionText: "Mark Roll Call",
        linkTo: "/attendance",
        severity: "warning",
      },
      {
        id: "fee-overdue-1",
        type: "fee",
        title: "Rs. 5,000 tuition voucher overdue (Prep-A)",
        desc: "Muhammad Bilal (Roll: 2024-PREP-A-01) — January tuition voucher past Jan 10 due date.",
        actionText: "View Voucher",
        linkTo: "/fees",
        severity: "danger",
      },
      {
        id: "fee-overdue-2",
        type: "fee",
        title: "Rs. 9,500 board registration & tuition overdue (Class 10-A)",
        desc: "Hamza Tariq (Roll: 2024-10-A-01) — includes BISE Matriculation registration fee of Rs. 3,500.",
        actionText: "View Voucher",
        linkTo: "/fees",
        severity: "danger",
      },
    ];
  }
  const res = await client.get("/reports/dashboard/priority-actions");
  return res.data;
};

export default {
  USE_MOCK,
  getDashboardMetrics,
  getAttendanceTrend,
  getFeeCollectionTrend,
  getPriorityActions,
};
