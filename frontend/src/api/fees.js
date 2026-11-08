import client from "./client";

export const USE_MOCK = false;

let DUMMY_FEES = [
  {
    id: 1,
    student_id: 4,
    student_name: "Muhammad Ali",
    roll_number: "2024-1-A-01",
    class_id: 4,
    class_name: "Class 1",
    section: "A",
    amount: 5000,
    tuition_fee: 5000,
    board_registration_fee: 0,
    fee_type: "Tuition",
    month: "January 2025",
    due_date: "2025-01-10",
    status: "paid",
    paid_date: "2025-01-08",
    payment_method: "bank_transfer",
    transaction_id: "TXN-89421",
    remarks: "Received online",
  },
  {
    id: 2,
    student_id: 5,
    student_name: "Ayesha Khan",
    roll_number: "2024-1-B-01",
    class_id: 5,
    class_name: "Class 1",
    section: "B",
    amount: 5000,
    tuition_fee: 5000,
    board_registration_fee: 0,
    fee_type: "Tuition",
    month: "January 2025",
    due_date: "2025-01-10",
    status: "paid",
    paid_date: "2025-01-05",
    payment_method: "cash",
    transaction_id: "CSH-1029",
    remarks: "Paid in administrative office",
  },
  {
    id: 3,
    student_id: 3,
    student_name: "Muhammad Bilal",
    roll_number: "2024-PREP-A-01",
    class_id: 3,
    class_name: "Prep",
    section: "A",
    amount: 5000,
    tuition_fee: 5000,
    board_registration_fee: 0,
    fee_type: "Tuition",
    month: "January 2025",
    due_date: "2025-01-10",
    status: "overdue",
    paid_date: null,
    payment_method: null,
    transaction_id: null,
    remarks: "Reminder notification sent",
  },
  // Class 9 Student with Board Registration Fee (Requirement: 9 & 10 give board exams & board registration fee)
  {
    id: 4,
    student_id: 10,
    student_name: "Zainab Bibi",
    roll_number: "2024-9-A-01",
    class_id: 13,
    class_name: "Class 9",
    section: "A",
    amount: 9500,
    tuition_fee: 6000,
    board_registration_fee: 3500, // BISE Board Registration Fee
    fee_type: "Tuition + Board Exam Fee",
    month: "January 2025",
    due_date: "2025-01-10",
    status: "paid",
    paid_date: "2025-01-07",
    payment_method: "bank_challan",
    transaction_id: "CHL-9042",
    remarks: "Tuition + BISE Board Matric Registration 2025",
  },
  // Class 10 Student with Board Registration Fee
  {
    id: 5,
    student_id: 11,
    student_name: "Hamza Tariq",
    roll_number: "2024-10-A-01",
    class_id: 14,
    class_name: "Class 10",
    section: "A",
    amount: 9500,
    tuition_fee: 6000,
    board_registration_fee: 3500, // BISE Board Registration Fee
    fee_type: "Tuition + Board Exam Fee",
    month: "January 2025",
    due_date: "2025-01-10",
    status: "pending",
    paid_date: null,
    payment_method: null,
    transaction_id: null,
    remarks: "BISE Board Final Term Registration Due",
  },
];

export const feeApi = {
  getAll: async (params = {}) => {
    if (USE_MOCK) {
      let filtered = [...DUMMY_FEES];
      if (params.student_id) filtered = filtered.filter((f) => f.student_id === parseInt(params.student_id, 10));
      if (params.class_id && params.class_id !== "all") {
        filtered = filtered.filter((f) => f.class_id === parseInt(params.class_id, 10));
      }
      if (params.status && params.status !== "all") {
        filtered = filtered.filter((f) => f.status.toLowerCase() === params.status.toLowerCase());
      }
      if (params.month) {
        filtered = filtered.filter((f) => f.month.toLowerCase().includes(params.month.toLowerCase()));
      }

      return { total: filtered.length, items: filtered };
    }
    const q = new URLSearchParams(params).toString();
    const res = await client.get(`/fees${q ? `?${q}` : ""}`);
    return res.data;
  },

  getById: async (id) => {
    if (USE_MOCK) {
      const f = DUMMY_FEES.find((fee) => fee.id === parseInt(id, 10));
      if (!f) throw new Error("Fee record not found");
      return f;
    }
    const res = await client.get(`/fees/${id}`);
    return res.data;
  },

  create: async (feeData) => {
    if (USE_MOCK) {
      const isBoardClass = (feeData.class_name || "").includes("9") || (feeData.class_name || "").includes("10");
      const boardFee = isBoardClass ? 3500 : 0;
      const tuition = parseInt(feeData.amount, 10) || 5000;
      const totalAmount = tuition + boardFee;

      const newFee = {
        id: Date.now(),
        student_id: feeData.student_id || 1,
        student_name: feeData.student_name || "New Student",
        roll_number: feeData.roll_number || "2024-009",
        class_id: feeData.class_id || 1,
        class_name: feeData.class_name || "Class 1",
        section: feeData.section || "A",
        amount: totalAmount,
        tuition_fee: tuition,
        board_registration_fee: boardFee,
        fee_type: isBoardClass ? "Tuition + Board Exam Fee" : "Tuition",
        month: feeData.month || "January 2025",
        due_date: feeData.due_date || "2025-01-10",
        status: "pending",
        paid_date: null,
        payment_method: null,
        transaction_id: null,
        remarks: isBoardClass ? "Includes BISE Board Registration Fee" : "",
      };
      DUMMY_FEES.push(newFee);
      return newFee;
    }
    const res = await client.post("/fees", feeData);
    return res.data;
  },

  recordPayment: async (id, paymentData) => {
    if (USE_MOCK) {
      const idx = DUMMY_FEES.findIndex((f) => f.id === parseInt(id, 10));
      if (idx === -1) throw new Error("Fee record not found");
      DUMMY_FEES[idx] = {
        ...DUMMY_FEES[idx],
        status: "paid",
        paid_date: new Date().toISOString().split("T")[0],
        payment_method: paymentData.payment_method || "cash",
        transaction_id: paymentData.transaction_id || `TXN-${Date.now().toString().slice(-5)}`,
        remarks: paymentData.remarks || DUMMY_FEES[idx].remarks,
      };
      return DUMMY_FEES[idx];
    }
    const res = await client.post(`/fees/${id}/pay`, paymentData);
    return res.data;
  },

  downloadReceipt: async (id) => {
    const res = await client.get(`/fees/${id}/receipt`, { responseType: "blob" });
    const url = window.URL.createObjectURL(res.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fee-receipt-${id}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  },

  getStudentFeePlan: async (studentId, academicYearId) => {
    const res = await client.get(`/students/${studentId}/fee-plan?academic_year_id=${academicYearId}`);
    return res.data;
  },

  saveStudentFeePlan: async (studentId, academicYearId, items) => {
    const res = await client.put(
      `/students/${studentId}/fee-plan?academic_year_id=${academicYearId}`,
      items
    );
    return res.data;
  },

  generateChalans: async (payload) => {
    if (USE_MOCK) {
      return { created: 10, existing: 2, skipped: 0, total_students: 12, total_charges: 1 };
    }
    const res = await client.post("/fee-generation/chalans", payload);
    return res.data;
  },

  listFeeCharges: async (params = {}) => {
    if (USE_MOCK) {
      return [];
    }
    const q = new URLSearchParams(params).toString();
    const res = await client.get(`/fee-charges${q ? `?${q}` : ""}`);
    return res.data;
  },

  updateChalan: async (payload) => {
    const res = await client.put("/fees/chalan", payload);
    return res.data;
  },

  deleteChalan: async (studentId, month, year) => {
    const res = await client.delete(`/fees/chalan?student_id=${studentId}&month=${month}&year=${year}`);
    return res.data;
  },
};
export default feeApi;
