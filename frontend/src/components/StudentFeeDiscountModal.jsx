import React, { useState, useEffect } from "react";
import { X, Percent, Check, AlertCircle, Loader2, Award, ShieldCheck, Tag } from "lucide-react";
import { feeApi } from "../api/fees";
import { useToast } from "../context/ToastContext";

export const StudentFeeDiscountModal = ({
  isOpen,
  onClose,
  student = null,
  academicYearId = null,
  onSuccess,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [charges, setCharges] = useState([]);
  const [planMap, setPlanMap] = useState({}); // { fee_charge_id: { amount, is_enabled } }
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!isOpen || !student) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setFeedback({ type: "", text: "" });

        const ayId = academicYearId || student.academic_year_id;
        const [chargesData, planData] = await Promise.all([
          feeApi.listFeeCharges({ class_id: student.class_id, academic_year_id: ayId }),
          feeApi.getStudentFeePlan(student.id, ayId),
        ]);

        const chargeList = Array.isArray(chargesData) ? chargesData : [];
        setCharges(chargeList);

        // Map existing plan items
        const existingPlans = Array.isArray(planData) ? planData : [];
        const map = {};
        chargeList.forEach((c) => {
          const match = existingPlans.find((p) => p.fee_charge_id === c.id);
          if (match) {
            map[c.id] = {
              amount: match.amount,
              is_enabled: match.is_enabled !== undefined ? match.is_enabled : true,
            };
          } else {
            // Default to standard charge amount
            map[c.id] = {
              amount: c.amount,
              is_enabled: true,
            };
          }
        });
        setPlanMap(map);
      } catch (err) {
        console.error("Error loading student fee plan:", err);
        setFeedback({ type: "error", text: "Failed to load fee charges for student." });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOpen, student, academicYearId]);

  if (!isOpen || !student) return null;

  const handleApplyPreset = (chargeId, percentDiscount) => {
    const charge = charges.find((c) => c.id === chargeId);
    if (!charge) return;

    const baseAmount = Number(charge.amount || 0);
    const discounted = Math.max(0, Math.round(baseAmount * (1 - percentDiscount / 100)));

    setPlanMap((prev) => ({
      ...prev,
      [chargeId]: {
        ...(prev[chargeId] || { is_enabled: true }),
        amount: discounted,
      },
    }));
  };

  const handleAmountChange = (chargeId, value) => {
    const num = Math.max(0, Number(value));
    setPlanMap((prev) => ({
      ...prev,
      [chargeId]: {
        ...(prev[chargeId] || { is_enabled: true }),
        amount: isNaN(num) ? 0 : num,
      },
    }));
  };

  const handleToggleEnabled = (chargeId) => {
    setPlanMap((prev) => {
      const cur = prev[chargeId] || { amount: 0, is_enabled: true };
      return {
        ...prev,
        [chargeId]: {
          ...cur,
          is_enabled: !cur.is_enabled,
        },
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", text: "" });

    try {
      setSubmitting(true);
      const ayId = academicYearId || student.academic_year_id;
      const items = charges.map((c) => {
        const itemPlan = planMap[c.id] || { amount: c.amount, is_enabled: true };
        return {
          fee_charge_id: c.id,
          amount: Number(itemPlan.amount),
          is_enabled: Boolean(itemPlan.is_enabled),
        };
      });

      await feeApi.saveStudentFeePlan(student.id, ayId, items);
      const msg = "Student fee concessions & discount plan saved successfully!";
      setFeedback({ type: "success", text: msg });
      toast.success(msg);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "Failed to update student fee plan.";
      setFeedback({
        type: "error",
        text: errMsg,
      });
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-blue-700 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Percent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Student Fee Concessions & Discounts</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Apply sibling, kinship, merit scholarships or fee waivers for {student.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Identification Bar */}
        <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
              Enrolled Student
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {student.name} ({student.formatted_roll_number || student.roll_number || student.id})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs">
              {student.class_name ? `${student.class_name} - Sec ${student.section || "A"}` : `Class ID ${student.class_id}`}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {feedback.text && (
            <div
              className={`p-3 rounded-xl flex items-center justify-between text-xs font-semibold ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              }`}
            >
              <span>{feedback.text}</span>
              <button onClick={() => setFeedback({ type: "", text: "" })}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Class Fee Heads & Custom Concessions
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ Applies immediately to unpaid challan & future generations
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-xs font-semibold">Loading fee plan...</span>
              </div>
            ) : charges.length === 0 ? (
              <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <p className="text-xs font-semibold">No fee categories configured for this class yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {charges.map((c) => {
                  const itemPlan = planMap[c.id] || { amount: c.amount, is_enabled: true };
                  const standardAmount = Number(c.amount || 0);
                  const isDiscounted = itemPlan.amount < standardAmount;
                  const discountPercent =
                    standardAmount > 0
                      ? Math.round(((standardAmount - itemPlan.amount) / standardAmount) * 100)
                      : 0;

                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        !itemPlan.is_enabled
                          ? "bg-slate-50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 opacity-60"
                          : isDiscounted
                          ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80 shadow-2xs"
                          : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 shadow-2xs"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {c.charge_name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {c.charge_type}
                            </span>
                            {isDiscounted && itemPlan.is_enabled && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                {discountPercent}% Concession
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Standard Class Rate: <span className="font-semibold text-slate-600 dark:text-slate-300">Rs. {standardAmount.toLocaleString()}</span>
                          </p>
                        </div>

                        {/* Enable/Disable Toggle for Optional Items */}
                        <div className="flex items-center gap-2">
                          <label
                            className="text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer flex items-center gap-2"
                            title={
                              itemPlan.is_enabled
                                ? "This fee head is active and included on the student's fee challan"
                                : "Student is exempt / waived from this fee head"
                            }
                          >
                            <input
                              type="checkbox"
                              checked={itemPlan.is_enabled}
                              onChange={() => handleToggleEnabled(c.id)}
                              className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                            />
                            <span className={itemPlan.is_enabled ? "text-emerald-700 dark:text-emerald-400 font-bold" : "text-slate-400 italic"}>
                              {itemPlan.is_enabled ? "Include in Challan" : "Exempt / Waived"}
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Discount Presets and Custom Amount */}
                      {itemPlan.is_enabled && (
                        <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Presets */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-slate-400 font-semibold mr-1">
                              Presets:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleApplyPreset(c.id, 0)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                itemPlan.amount === standardAmount
                                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                                  : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                              }`}
                            >
                              Standard
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyPreset(c.id, 25)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                discountPercent === 25
                                  ? "bg-emerald-600 text-white shadow-2xs"
                                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100"
                              }`}
                            >
                              25% Sibling
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyPreset(c.id, 50)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                discountPercent === 50
                                  ? "bg-emerald-600 text-white shadow-2xs"
                                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100"
                              }`}
                            >
                              50% Kinship
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyPreset(c.id, 100)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                itemPlan.amount === 0
                                  ? "bg-rose-600 text-white shadow-2xs"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100"
                              }`}
                            >
                              100% Free
                            </button>
                          </div>

                          {/* Custom Amount Input */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              Custom Rate:
                            </span>
                            <div className="relative w-28">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                                Rs.
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={itemPlan.amount}
                                onChange={(e) => handleAmountChange(c.id, e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-2.5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 shadow-2xs"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Discounts are tracked in official billing audit logs.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || charges.length === 0}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Concessions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentFeeDiscountModal;
