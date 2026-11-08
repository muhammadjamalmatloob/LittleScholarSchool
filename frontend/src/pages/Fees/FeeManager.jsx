import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { validateAmount } from "../../utils/validation";
import { feeApi } from "../../api/fees";
import { classApi } from "../../api/classes";
import { academicYearApi } from "../../api/academicYears";
import { GlassButton } from "../../components/ui/GlassButton";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { FeeCategoriesModal } from "../../components/FeeCategoriesModal";
import { StudentFeeDiscountModal } from "../../components/StudentFeeDiscountModal";
import { CustomPdfViewerModal } from "../../components/ui/CustomPdfViewerModal";
import { FeeChalanLandscapeVoucher } from "../../components/fees/FeeChalanLandscapeVoucher";
import { EditChallanModal } from "../../components/fees/EditChallanModal";
import {
  CreditCard,
  Wallet,
  Receipt,
  Search,
  CheckCircle,
  AlertCircle,
  Printer,
  X,
  Loader2,
  Award,
  ShieldAlert,
  ArrowRight,
  Plus,
  Tag,
  Percent,
  Edit2,
  Trash2,
} from "lucide-react";

// Dynamic Tailwind gradient palettes for student avatars
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

export const FeeManager = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const isTeacher = user?.role === "teacher";

  const [fees, setFees] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [search, setSearch] = useState("");

  // Payment Modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [paymentData, setPaymentData] = useState({
    paid_amount: "",
    payment_method: "cash",
    transaction_id: "",
    remarks: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  // Challan generation modal state
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [generateData, setGenerateData] = useState({
    class_id: "all",
    academic_year_id: "",
    month: String(new Date().getMonth() + 1),
    year: new Date().getFullYear(),
    due_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-10`,
  });
  const [generating, setGenerating] = useState(false);

  // Challan print voucher modal state
  const [challanFee, setChallanFee] = useState(null);

  // Fee Categories and Discount modals state
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [selectedStudentForDiscount, setSelectedStudentForDiscount] = useState(null);

  const openDiscountModal = (feeItem) => {
    setSelectedStudentForDiscount({
      id: feeItem.student_id,
      name: feeItem.student_name,
      roll_number: feeItem.formatted_roll_number || feeItem.roll_number,
      class_id: feeItem.class_id,
      class_name: feeItem.class_name,
      section: feeItem.section,
      academic_year_id:
        generateData.academic_year_id ||
        (academicYears.find((y) => y.is_current)?.id || academicYears[0]?.id),
    });
    setDiscountModalOpen(true);
  };

  // Edit & Delete Challan states
  const [editChallanModalOpen, setEditChallanModalOpen] = useState(false);
  const [challanToEdit, setChallanToEdit] = useState(null);
  const [deleteChallanModalOpen, setDeleteChallanModalOpen] = useState(false);
  const [challanToDelete, setChallanToDelete] = useState(null);
  const [deletingChallan, setDeletingChallan] = useState(false);

  const handleDeleteChallan = async () => {
    if (!challanToDelete) return;
    try {
      setDeletingChallan(true);
      const res = await feeApi.deleteChalan(challanToDelete.student_id, challanToDelete.month, challanToDelete.year);
      toast.success(res.message || "Fee challan deleted successfully!");
      setDeleteChallanModalOpen(false);
      setChallanToDelete(null);
      loadFees(true);
    } catch (err) {
      console.error("Failed to delete challan:", err);
      toast.error(err.response?.data?.detail || "Could not delete fee challan.");
    } finally {
      setDeletingChallan(false);
    }
  };

  const monthsList = [
    ["", "All Months"],
    ["1", "January"],
    ["2", "February"],
    ["3", "March"],
    ["4", "April"],
    ["5", "May"],
    ["6", "June"],
    ["7", "July"],
    ["8", "August"],
    ["9", "September"],
    ["10", "October"],
    ["11", "November"],
    ["12", "December"],
  ];

  // Load Classes and Academic Years
  useEffect(() => {
    classApi
      .getAll()
      .then((data) => setClasses(data))
      .catch((err) => console.error(err));

    academicYearApi
      .getAll()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAcademicYears(list);
        const current = list.find((y) => y.is_current);
        if (current) {
          setGenerateData((prev) => ({ ...prev, academic_year_id: current.id }));
        } else if (list.length > 0) {
          setGenerateData((prev) => ({ ...prev, academic_year_id: list[0].id }));
        }
      })
      .catch((err) => console.error("Error loading academic years:", err));
  }, []);

  // Load Fees
  const loadFees = useCallback(async (silent = false) => {
    if (isTeacher) return;
    if (!silent) setLoading(true);
    try {
      const params = {};
      if (selectedClassId !== "all") params.class_id = selectedClassId;
      if (selectedMonth) params.month = selectedMonth;
      if (selectedStatus !== "all") params.status = selectedStatus;

      const res = await feeApi.getAll(params);
      setFees(res.items || res || []);
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", text: "Failed to load fee ledger records." });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedClassId, selectedMonth, selectedStatus, isTeacher]);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  // Open Payment modal
  const openPaymentModal = (feeItem) => {
    setSelectedFee(feeItem);
    setPaymentData({
      paid_amount: Math.max(feeItem.balance ?? ((feeItem.amount || 0) - (feeItem.paid_amount || 0)), 0).toString(),
      payment_method: "cash",
      transaction_id: `CSH-${Math.floor(1000 + Math.random() * 9000)}`,
      remarks: "Received at campus desk",
    });
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedFee) return;

    const maxDue = Math.max(selectedFee.balance ?? ((selectedFee.amount || 0) - (selectedFee.paid_amount || 0)), 0);
    const amountVal = validateAmount(paymentData.paid_amount, "Payment Amount", 1, maxDue > 0 ? maxDue : 10000000);
    if (!amountVal.valid) {
      setFeedback({ type: "error", text: amountVal.error });
      toast.warning(amountVal.error);
      return;
    }

    setSubmitting(true);
    try {
      let remainingPayment = Number(paymentData.paid_amount);
      for (const fee of selectedFee.items || [selectedFee]) {
        if (remainingPayment <= 0) break;
        const feeBalance = Math.max((fee.amount || 0) - (fee.paid_amount || 0), 0);
        const payment = Math.min(remainingPayment, feeBalance);
        if (payment > 0) {
          await feeApi.recordPayment(fee.id, {
            ...paymentData,
            paid_amount: payment,
          });
          remainingPayment -= payment;
        }
      }
      const successMsg = `Payment of Rs. ${parseInt(paymentData.paid_amount, 10).toLocaleString()} successfully recorded for ${selectedFee.student_name}!`;
      setFeedback({
        type: "success",
        text: successMsg,
      });
      toast.success(successMsg);
      setPaymentModalOpen(false);
      loadFees(true);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "Failed to record payment transaction.";
      setFeedback({
        type: "error",
        text: errMsg,
      });
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateChalans = async (e) => {
    e.preventDefault();
    if (!generateData.academic_year_id) {
      setFeedback({ type: "error", text: "Please select an active academic year." });
      return;
    }

    setGenerating(true);
    try {
      const targetClasses =
        generateData.class_id === "all"
          ? classes
          : classes.filter((c) => String(c.id) === String(generateData.class_id));

      if (targetClasses.length === 0) {
        setFeedback({ type: "error", text: "No classes found to generate chalans for." });
        setGenerating(false);
        return;
      }

      let totalCreated = 0;
      let totalExisting = 0;
      let totalSkipped = 0;

      for (const cls of targetClasses) {
        const res = await feeApi.generateChalans({
          class_id: cls.id,
          academic_year_id: Number(generateData.academic_year_id),
          month: Number(generateData.month),
          year: Number(generateData.year),
          due_date: generateData.due_date || undefined,
        });
        totalCreated += res.created || 0;
        totalExisting += res.existing || 0;
        totalSkipped += res.skipped || 0;
      }

      setFeedback({
        type: "success",
        text: `Monthly chalan generation complete! ${totalCreated} created, ${totalExisting} already existing${
          totalSkipped > 0 ? `, ${totalSkipped} skipped` : ""
        }.`,
      });
      setGenerateModalOpen(false);
      loadFees();
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        text: err.response?.data?.detail || "Failed to generate monthly fee chalans.",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Open Challan in custom PDF viewer
  const openChallanPrint = (feeItem) => {
    const studentFees = fees.filter(
      (fee) =>
        fee.student_id === feeItem.student_id &&
        fee.month === feeItem.month &&
        fee.year === feeItem.year
    );
    const challanItems = studentFees.length > 0 ? studentFees : [feeItem];
    const totalAmount = challanItems.reduce((total, fee) => total + (fee.amount || 0), 0);
    const monthName =
      monthsList.find(([value]) => value === String(feeItem.month))?.[1] || feeItem.month;
    const academicYear = feeItem.year ? `${Number(feeItem.year) - 1} - ${feeItem.year}` : "2024 - 2025";
    setChallanFee({
      ...feeItem,
      items: challanItems,
      totalAmount,
      monthName,
      academicYear,
    });
  };

  const downloadReceipt = async (feeItem) => {
    try {
      await feeApi.downloadReceipt(feeItem.id);
    } catch (err) {
      setFeedback({
        type: "error",
        text: err.response?.data?.detail || "Failed to download receipt.",
      });
    }
  };

  // KPI calculations
  const stats = useMemo(() => {
    const totalBilled = fees.reduce((sum, f) => sum + (f.amount || 0), 0);
    const totalCollected = fees.reduce((sum, f) => sum + (f.paid_amount || 0), 0);
    const totalPending = fees.reduce(
      (sum, f) => sum + (f.balance ?? Math.max((f.amount || 0) - (f.paid_amount || 0), 0)),
      0
    );
    const recoveryRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;
    const boardStudentsCount = fees.filter((f) => (f.board_registration_fee || 0) > 0).length;

    return { totalBilled, totalCollected, totalPending, recoveryRate, boardStudentsCount };
  }, [fees]);

  // Filter by search
  const filteredFees = useMemo(() => {
    return fees.filter((f) => {
      const q = search.toLowerCase();
      const matchName = (f.student_name || "").toLowerCase().includes(q);
      const matchRoll = String(f.roll_number || "").toLowerCase().includes(q);
      const matchTxn = String(f.transaction_id || "").toLowerCase().includes(q);
      return matchName || matchRoll || matchTxn;
    });
  }, [fees, search]);

  const groupedFees = useMemo(() => {
    const groups = new Map();
    filteredFees.forEach((fee) => {
      const key = `${fee.student_id}-${fee.month ?? ""}-${fee.year ?? ""}`;
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(fee);
        existing.amount += fee.amount || 0;
        existing.paid_amount += fee.paid_amount || 0;
        existing.balance += fee.balance ?? Math.max((fee.amount || 0) - (fee.paid_amount || 0), 0);
      } else {
        groups.set(key, {
          ...fee,
          items: [fee],
          amount: fee.amount || 0,
          paid_amount: fee.paid_amount || 0,
          balance: fee.balance ?? Math.max((fee.amount || 0) - (fee.paid_amount || 0), 0),
        });
      }
    });
    return Array.from(groups.values()).map((group) => ({
      ...group,
      status: group.balance <= 0 ? "paid" : group.paid_amount > 0 ? "partial" : "pending",
    }));
  }, [filteredFees]);

  // =========================================================================
  // TEACHER ACCESS RESTRICTION VIEW
  // Requirement: "Teachers will not be able to view fees"
  // =========================================================================
  if (isTeacher) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 mt-2">
          You are currently signed in as a <span className="font-bold text-blue-900">Teacher ({user?.full_name || "Ms. Sana Tariq"})</span>. Fee management, financial invoices, and fee collection registers are reserved exclusively for Administrators and Accounts staff.
        </p>
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-3">
          <GlassButton
            variant="primary"
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 shadow-xs flex items-center gap-2"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </GlassButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Page Header Container */}
      <div className="print:hidden bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/40 dark:to-blue-900/40 border border-blue-100 dark:border-blue-800/50 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-slate-800/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50 flex items-center justify-center shadow-xs shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Fee Management & Accounts
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-300 mt-0.5">
              Track student billing, record invoice payments, and monitor fee recovery
            </p>
          </div>
        </div>

        {["admin", "accountant"].includes(user?.role) && (
          <div className="flex flex-wrap items-center gap-2.5">
            <GlassButton
              variant="secondary"
              onClick={() => setCategoriesModalOpen(true)}
              className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-sm px-4 py-2.5 shadow-2xs active:scale-[0.98] transition flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Manage Fee Categories</span>
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={() => setGenerateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 shadow-sm shadow-blue-600/20 active:scale-[0.98] transition flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Monthly Challans</span>
            </GlassButton>
          </div>
        )}
      </div>

      {/* Feedback Toast */}
      {feedback.text && (
        <div
          className={`print:hidden p-4 rounded-xl flex items-center justify-between text-base font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: "", text: "" })}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Financial Metric Cards */}
      <div className="print:hidden grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Billed: bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/85">
              Total Billed ({selectedMonth})
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-xs">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
            Rs. {stats.totalBilled.toLocaleString()}
          </p>
          <p className="text-xs text-white/80 mt-1">Across all registered students</p>
        </div>

        {/* Total Recovered: bg-gradient-to-br from-emerald-400 to-blue-500 text-white shadow-lg shadow-blue-500/30 */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 text-white shadow-lg shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/85">
              Total Recovered
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-xs">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
            Rs. {stats.totalCollected.toLocaleString()}
          </p>
          <p className="text-xs text-white/90 font-semibold mt-1">
            {stats.recoveryRate}% Recovery ratio
          </p>
        </div>

        {/* Pending Balance: bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-lg shadow-rose-500/30 */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-lg shadow-rose-500/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/85">
              Pending Balance
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-xs">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
            Rs. {stats.totalPending.toLocaleString()}
          </p>
          <p className="text-xs text-white/80 mt-1">Unpaid student vouchers</p>
        </div>

        {/* Board Candidates: bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-lg shadow-blue-500/30 */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-lg shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/85">
              Board Candidates (9 & 10)
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-xs">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
            {stats.boardStudentsCount} Students
          </p>
          <p className="text-xs text-white/90 font-semibold mt-1">
            Includes Board Registration Fee
          </p>
        </div>
      </div>

      {/* Established Soft Indigo Search and Filter Bar */}
      <div className="print:hidden bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/30 rounded-2xl p-3 sm:p-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or transaction..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-950 dark:text-blue-200 shrink-0">Class:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id || c.name} value={c.id || c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-950 dark:text-blue-200 shrink-0">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition"
              >
                {monthsList.map(([value, label]) => (
                  <option key={value || "all"} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-950 dark:text-blue-200 shrink-0">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-base font-medium text-slate-500">Loading fee records...</p>
        </div>
      ) : groupedFees.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No Invoices Found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            No fee vouchers match your active search or filter selection.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-200 text-xs uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4 w-12 text-center">Sr.</th>
                  <th className="py-3 px-4">Student Roll No.</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Class & Sec</th>
                  <th className="py-3 px-4 text-right">Fee Categories</th>
                  <th className="py-3 px-4 text-right">Total Fee (Rs.)</th>
                  <th className="py-3 px-4 text-right">Pending (Rs.)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {groupedFees.map((f, idx) => {
                  return (
                    <tr key={f.id} className="hover:bg-blue-50/20 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-center font-medium text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {f.formatted_roll_number || f.roll_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full ${getAvatarGradient(
                              f.student_name,
                              idx
                            )} text-white font-bold text-xs flex items-center justify-center shrink-0 ring-2 ring-white dark:ring-slate-900 shadow-2xs`}
                          >
                            {f.student_name ? f.student_name.charAt(0).toUpperCase() : "S"}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {f.student_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium text-xs">
                        {f.class_name} - Sec {f.section || "A"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          {f.items.map((item) => (
                            <span key={item.id} className="text-xs text-slate-600 dark:text-slate-300">
                              {item.charge_name}: Rs. {(item.amount || 0).toLocaleString()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-slate-100">
                        {f.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-rose-700 dark:text-rose-300">
                        {f.balance.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            f.status === "paid"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : f.status === "pending"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-rose-100 text-rose-900 border border-rose-300"
                          }`}
                        >
                          {f.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {["admin", "accountant"].includes(user?.role) && (f.paid_amount || 0) === 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setChallanToEdit(f);
                                setEditChallanModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                              title="Edit Challan (Adjust amounts, add books/stationary, custom concession)"
                            >
                              <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </button>
                          )}
                          {["admin", "accountant"].includes(user?.role) && (f.paid_amount || 0) === 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setChallanToDelete(f);
                                setDeleteChallanModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                              title="Delete / Void this unpaid Challan"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </button>
                          )}
                          {["admin", "accountant"].includes(user?.role) && (
                            <button
                              type="button"
                              onClick={() => openDiscountModal(f)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                              title="Configure Permanent Student Concession"
                            >
                              <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </button>
                          )}
                          {["admin", "accountant"].includes(user?.role) && f.status !== "paid" && (
                            <button
                              type="button"
                              onClick={() => openPaymentModal(f)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 active:scale-[0.98] transition cursor-pointer"
                            >
                              Collect
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openChallanPrint(f)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                            title="Print 3-Copy Bank Challan"
                          >
                            <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </button>
                          {f.status === "paid" && (
                            <button
                              onClick={() => downloadReceipt(f)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200"
                              title="Download payment receipt"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 relative">
            <button
              onClick={() => setPaymentModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1">Record Fee Collection</h3>
            <p className="text-xs text-slate-500 mb-4">
              Student: {selectedFee.student_name} ({selectedFee.roll_number}) • {selectedFee.class_name}
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Amount to Collect (Rs.)
                </label>
                <input
                  type="number"
                  value={paymentData.paid_amount}
                  onChange={(e) => setPaymentData({ ...paymentData, paid_amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-base font-bold focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="cash">Cash at Accounts Desk</option>
                  <option value="check">Cheque</option>
                  <option value="bank_transfer">Bank Transfer (HBL / MCB / Allied)</option>
                  <option value="online">Online Transfer (Raast / IBFT)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Receipt / Transaction Ref
                </label>
                <input
                  type="text"
                  value={paymentData.transaction_id}
                  onChange={(e) => setPaymentData({ ...paymentData, transaction_id: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2 shadow-sm shadow-blue-600/20 active:scale-[0.98] transition cursor-pointer"
                >
                  Confirm Payment
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Monthly Challans Modal */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 relative text-slate-900 dark:text-slate-100">
            <button
              onClick={() => setGenerateModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Generate Monthly Fee Chalans
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bulk invoice generation for enrolled students based on class fee charges
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateChalans} className="space-y-4 mt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Target Class
                  </label>
                  <select
                    value={generateData.class_id}
                    onChange={(e) => setGenerateData({ ...generateData, class_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="all">All Classes & Sections</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `- Sec ${c.section}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Academic Year
                  </label>
                  <select
                    value={generateData.academic_year_id}
                    onChange={(e) =>
                      setGenerateData({ ...generateData, academic_year_id: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.year_name} {ay.is_current ? "(Current Session)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Billing Month
                  </label>
                  <select
                    value={generateData.month}
                    onChange={(e) => setGenerateData({ ...generateData, month: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {monthsList
                      .filter(([val]) => val !== "")
                      .map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Billing Year
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2035"
                    value={generateData.year}
                    onChange={(e) => setGenerateData({ ...generateData, year: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={generateData.due_date}
                  onChange={(e) => setGenerateData({ ...generateData, due_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                <p>
                  <strong>Note:</strong> Existing chalans for students who already have invoices generated for this month will be preserved without double-billing.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={() => setGenerateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  disabled={generating}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2 shadow-sm shadow-blue-600/20 active:scale-[0.98] transition cursor-pointer flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Generate Chalans</span>
                  )}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3-Column Landscape Fee Chalan Custom PDF Viewer */}
      <CustomPdfViewerModal
        isOpen={Boolean(challanFee)}
        onClose={() => setChallanFee(null)}
        title={challanFee ? `Fee Chalan Voucher — ${challanFee.student_name}` : "Fee Chalan Voucher"}
        subtitle={
          challanFee
            ? `Chalan #CHL-${challanFee.id} • ${challanFee.class_name} • Month: ${monthsList.find(([val]) => val === String(challanFee.month))?.[1] || challanFee.month} ${challanFee.year || ""}`
            : ""
        }
        orientation="landscape"
        hideDefaultHeaderFooter={true}
      >
        {challanFee && <FeeChalanLandscapeVoucher challanFee={challanFee} />}
      </CustomPdfViewerModal>

      {/* Fee Categories Modal */}
      <FeeCategoriesModal
        isOpen={categoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
        classes={classes}
        academicYears={academicYears}
        onChanged={loadFees}
      />

      {/* Student Fee Discount / Concession Modal */}
      <StudentFeeDiscountModal
        isOpen={discountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
        student={selectedStudentForDiscount}
        academicYearId={
          generateData.academic_year_id ||
          (academicYears.find((y) => y.is_current)?.id || academicYears[0]?.id)
        }
        onSuccess={() => loadFees(true)}
      />

      {/* Edit Challan Modal (Adjust line items, books, stationary, discounts) */}
      <EditChallanModal
        isOpen={editChallanModalOpen}
        onClose={() => {
          setEditChallanModalOpen(false);
          setChallanToEdit(null);
        }}
        challan={challanToEdit}
        academicYearId={
          generateData.academic_year_id ||
          (academicYears.find((y) => y.is_current)?.id || academicYears[0]?.id)
        }
        onSuccess={() => loadFees(true)}
      />

      {/* Delete Challan Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteChallanModalOpen}
        onClose={() => {
          setDeleteChallanModalOpen(false);
          setChallanToDelete(null);
        }}
        onConfirm={handleDeleteChallan}
        title="Delete Fee Challan"
        message={
          challanToDelete
            ? `Are you sure you want to delete and void the ${
                monthsList.find(([val]) => val === String(challanToDelete.month))?.[1] || challanToDelete.month
              } ${challanToDelete.year || ""} fee challan for ${challanToDelete.student_name} (${
                challanToDelete.formatted_roll_number || challanToDelete.roll_number
              })? Total unpaid balance: Rs. ${(challanToDelete.amount || 0).toLocaleString()}.`
            : "Are you sure you want to delete this fee challan?"
        }
        confirmText="Delete Challan"
        confirmVariant="danger"
        loading={deletingChallan}
      />
    </div>
  );
};
export default FeeManager;
