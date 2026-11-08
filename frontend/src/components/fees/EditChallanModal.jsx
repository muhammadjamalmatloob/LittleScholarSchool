import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Percent,
  Receipt,
  AlertCircle,
  CheckCircle,
  Loader2,
  Tag,
  DollarSign,
  User,
  GraduationCap,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { feeApi } from "../../api/fees";
import { useToast } from "../../context/ToastContext";

// Fixed curated standard student fee categories requested by user
const STANDARD_CATEGORIES = [
  { name: "Stationery", defaultAmount: 800 },
  { name: "Uniform", defaultAmount: 1500 },
  { name: "Books", defaultAmount: 2500 },
  { name: "Board Fee", defaultAmount: 3000 },
  { name: "Transport Fee", defaultAmount: 2000 },
  { name: "Late Fine", defaultAmount: 300 },
];

export const EditChallanModal = ({
  isOpen,
  onClose,
  challan = null,
  academicYearId = null,
  onSuccess,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableCharges, setAvailableCharges] = useState([]);
  const [items, setItems] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [chargeNameInput, setChargeNameInput] = useState("");
  const [newChargeAmount, setNewChargeAmount] = useState("");
  const [newChargeRemarks, setNewChargeRemarks] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");

  // Load active fee charges (for matching existing charge IDs and class-specific rates)
  useEffect(() => {
    if (!isOpen) return;

    const loadCharges = async () => {
      try {
        setLoading(true);
        const params = { include_inactive: false };
        if (academicYearId) params.academic_year_id = academicYearId;
        const res = await feeApi.listFeeCharges(params);
        setAvailableCharges(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Failed to load fee charges:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCharges();
  }, [isOpen, academicYearId]);

  // Clean, curated categories with default and configured values
  const categories = useMemo(() => {
    return STANDARD_CATEGORIES.map((cat) => {
      // If configured specifically in fee_charges for this student's class, use that amount
      const matched =
        availableCharges.find(
          (c) =>
            (c.charge_name || "").toLowerCase() === cat.name.toLowerCase() &&
            (!challan?.class_id || c.class_id === challan.class_id)
        ) ||
        availableCharges.find(
          (c) => (c.charge_name || "").toLowerCase() === cat.name.toLowerCase()
        );

      return {
        id: matched ? matched.id : null,
        name: cat.name,
        amount: matched ? Number(matched.amount || cat.defaultAmount) : cat.defaultAmount,
      };
    });
  }, [availableCharges, challan?.class_id]);

  // Initialize line items from challan
  useEffect(() => {
    if (!isOpen || !challan) {
      setItems([]);
      setDueDate("");
      setDiscountPercent("");
      setSelectedCategory("");
      setIsCustomMode(false);
      setChargeNameInput("");
      setNewChargeAmount("");
      setNewChargeRemarks("");
      return;
    }

    const challanItems = challan.items && challan.items.length > 0 ? challan.items : [challan];
    const initialItems = challanItems.map((item) => ({
      fee_id: item.id || null,
      fee_charge_id: item.fee_charge_id || null,
      charge_name: item.charge_name || "Fee Charge",
      amount: Number(item.amount || 0),
      original_amount: Number(item.amount || 0),
      remarks: item.remarks || "",
    }));

    setItems(initialItems);
    setDueDate(challan.due_date || "");
    setDiscountPercent("");
    setSelectedCategory("");
    setIsCustomMode(false);
    setChargeNameInput("");
    setNewChargeAmount("");
    setNewChargeRemarks("");
  }, [isOpen, challan]);

  // Update item amount
  const handleAmountChange = (index, value) => {
    const num = Math.max(0, parseFloat(value) || 0);
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, amount: isNaN(num) ? 0 : num } : item))
    );
  };

  // Update item remarks
  const handleRemarksChange = (index, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, remarks: value } : item))
    );
  };

  // Remove a line item
  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Apply discount percentage on Tuition Fee (or single item)
  const handleApplyDiscount = (pct) => {
    const percent = Math.min(100, Math.max(0, parseFloat(pct) || 0));
    setDiscountPercent(String(percent));

    setItems((prev) =>
      prev.map((item) => {
        const isTuition = (item.charge_name || "").toLowerCase().includes("tuition");
        if (isTuition || prev.length === 1) {
          const discounted = Math.round(item.original_amount * (1 - percent / 100));
          return {
            ...item,
            amount: discounted,
            remarks: percent > 0 ? `${percent}% Approved Concession` : "",
          };
        }
        return item;
      })
    );
  };

  // Handle dropdown category selection
  const handleCategorySelect = (e) => {
    const val = e.target.value;
    if (val === "__custom__") {
      setIsCustomMode(true);
      setSelectedCategory("__custom__");
      setChargeNameInput("");
      setNewChargeAmount("");
      return;
    }

    setSelectedCategory(val);
    if (!val) {
      setChargeNameInput("");
      setNewChargeAmount("");
      return;
    }

    const found = categories.find((c) => c.name === val);
    if (found) {
      setChargeNameInput(found.name);
      setNewChargeAmount(found.amount > 0 ? String(found.amount) : "");
    }
  };

  // Cancel custom mode and return to category dropdown
  const handleCancelCustomMode = () => {
    setIsCustomMode(false);
    setSelectedCategory("");
    setChargeNameInput("");
    setNewChargeAmount("");
  };

  // Add new ad-hoc charge to this challan (selected category or custom typed)
  const handleAddCharge = () => {
    const cleanName = (chargeNameInput || "").trim();
    if (!cleanName) {
      toast.warning("Please select a fee category or type a charge name.");
      return;
    }

    const amt = parseFloat(newChargeAmount);
    if (isNaN(amt) || amt < 0) {
      toast.warning("Please enter a valid amount (e.g. 800).");
      return;
    }

    // Check if an item with the same name already exists in this challan
    const existingIndex = items.findIndex(
      (i) => (i.charge_name || "").toLowerCase() === cleanName.toLowerCase()
    );
    if (existingIndex >= 0) {
      toast.info(`"${cleanName}" is already on this challan. You can adjust its amount directly in the list.`);
      return;
    }

    // Match with existing charge id if one matches student's class or any class
    const matchingCharge =
      availableCharges.find(
        (c) =>
          (c.charge_name || "").toLowerCase() === cleanName.toLowerCase() &&
          (!challan?.class_id || c.class_id === challan.class_id)
      ) ||
      availableCharges.find(
        (c) => (c.charge_name || "").toLowerCase() === cleanName.toLowerCase()
      );

    setItems((prev) => [
      ...prev,
      {
        fee_id: null,
        fee_charge_id: matchingCharge ? matchingCharge.id : null,
        charge_name: cleanName,
        amount: Math.max(0, amt),
        original_amount: amt,
        remarks: newChargeRemarks.trim() || "",
      },
    ]);

    // Reset selection & inputs
    setSelectedCategory("");
    setIsCustomMode(false);
    setChargeNameInput("");
    setNewChargeAmount("");
    setNewChargeRemarks("");
    toast.success(`Added "${cleanName}" (Rs. ${amt.toLocaleString()}) to challan.`);
  };

  // Grand Total calculation
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [items]);

  // Submit changes
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!challan) return;

    if (items.length === 0) {
      toast.error(
        "A fee challan must contain at least one line item. To completely remove the challan, use Delete Challan."
      );
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        student_id: challan.student_id,
        month: Number(challan.month),
        year: Number(challan.year),
        due_date: dueDate || undefined,
        items: items.map((item) => ({
          fee_id: item.fee_id,
          fee_charge_id: item.fee_charge_id || undefined,
          charge_name: item.charge_name,
          amount: Number(item.amount),
          remarks: item.remarks || undefined,
        })),
      };

      const res = await feeApi.updateChalan(payload);
      toast.success(res.message || "Challan updated successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to update challan:", err);
      toast.error(err.response?.data?.detail || "Could not save challan updates.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !challan) return null;

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const displayMonth = challan.month
    ? `${monthNames[challan.month - 1] || challan.month} ${challan.year}`
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 sm:p-7 relative max-h-[90vh] flex flex-col">
        {/* Modal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="min-w-0 pr-8">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                Edit Fee Challan
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                {displayMonth}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {challan.student_name} ({challan.formatted_roll_number || challan.roll_number}) • {challan.class_name} {challan.section ? `• Sec ${challan.section}` : ""}
            </p>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Quick Info & Due Date Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium block text-[11px]">
                Student Identification:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100 mt-0.5 block truncate">
                {challan.student_name}
              </span>
            </div>
            <div>
              <label className="text-slate-500 dark:text-slate-400 font-medium block text-[11px] mb-1">
                Due Date for this Challan:
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Quick Concession / Discount Bar */}
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Quick Concession / Discount on Tuition:</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Auto-calculates reduction
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[0, 10, 15, 20, 25, 30, 50].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleApplyDiscount(pct)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    discountPercent === String(pct)
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {pct === 0 ? "Standard (0%)" : `${pct}% Off`}
                </button>
              ))}

              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Custom %"
                  value={discountPercent}
                  onChange={(e) => handleApplyDiscount(e.target.value)}
                  className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
            </div>
          </div>

          {/* Line Items List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
              <span>Challan Fee Particulars & Line Items</span>
              <span className="text-slate-400 font-normal">Amounts in PKR (Rs.)</span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {items.map((item, idx) => (
                <div
                  key={item.fee_id || `${item.fee_charge_id}-${item.charge_name}-${idx}`}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {item.charge_name}
                      </span>
                      {item.original_amount !== item.amount && (
                        <span className="text-[10px] text-slate-400 line-through">
                          Rs. {Number(item.original_amount).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Remarks (e.g., Sibling discount, Lab waiver)"
                      value={item.remarks}
                      onChange={(e) => handleRemarksChange(idx, e.target.value)}
                      className="mt-1 w-full text-[11px] bg-transparent border-none p-0 text-slate-500 placeholder-slate-400 focus:outline-none focus:text-slate-800 dark:focus:text-slate-200"
                    />
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-center">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={item.amount}
                        onChange={(e) => handleAmountChange(idx, e.target.value)}
                        className="w-28 pl-8 pr-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      title="Remove charge from this challan"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Specific Ad-Hoc Charge (Curated Categories + Editable Amount) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/90 to-blue-50/60 dark:from-blue-950/40 dark:to-slate-800/50 border border-blue-200/80 dark:border-blue-800/60 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Add Specific Charge to this Student:</span>
              </span>
              {isCustomMode && (
                <button
                  type="button"
                  onClick={handleCancelCustomMode}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
                >
                  ← Back to Categories
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs pt-1">
              {/* Category Dropdown OR Custom Charge Input */}
              <div className="sm:col-span-5">
                {!isCustomMode ? (
                  <select
                    value={selectedCategory}
                    onChange={handleCategorySelect}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs cursor-pointer truncate"
                  >
                    <option value="">-- Select Fee Category --</option>
                    {categories.map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name} (Rs. {cat.amount.toLocaleString()})
                      </option>
                    ))}
                    <option value="__custom__">✏️ + Custom / Other...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Charge Name (e.g. Science Board, Badge)"
                    value={chargeNameInput}
                    onChange={(e) => setChargeNameInput(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                  />
                )}
              </div>

              {/* Editable Amount Input */}
              <div className="sm:col-span-3">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    placeholder="Amount"
                    value={newChargeAmount}
                    onChange={(e) => setNewChargeAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCharge();
                      }
                    }}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Note / Remarks & Add Button */}
              <div className="sm:col-span-4 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={newChargeRemarks}
                  onChange={(e) => setNewChargeRemarks(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCharge();
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={handleAddCharge}
                  disabled={!chargeNameInput.trim() || newChargeAmount === ""}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition active:scale-95 cursor-pointer shrink-0 shadow-sm"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Live Grand Total & Save */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">
              Updated Total Payable:
            </span>
            <span className="text-xl font-black text-blue-700 dark:text-blue-400 font-mono">
              Rs. {totalAmount.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 active:scale-[0.98] transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? "Saving Changes..." : "Save & Update Challan"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditChallanModal;
