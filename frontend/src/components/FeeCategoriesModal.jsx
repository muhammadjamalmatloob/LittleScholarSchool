import React, { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash2, Tag, Check, Loader2 } from "lucide-react";
import { feeApi } from "../api/fees";
import client from "../api/client";

export const FeeCategoriesModal = ({
  isOpen,
  onClose,
  classes = [],
  academicYears = [],
  onChanged,
}) => {
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  // New category form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCharge, setNewCharge] = useState({
    charge_name: "",
    amount: "",
    charge_type: "monthly",
    applicable_from_month: "",
    is_mandatory: true,
  });
  const [targetScope, setTargetScope] = useState("specific"); // "specific" | "all" | "selected"
  const [targetClassId, setTargetClassId] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (classes.length > 0 && !targetClassId) {
        setTargetClassId(String(classes[0].id));
      }
      if (academicYears.length > 0 && !selectedAcademicYearId) {
        const cur = academicYears.find((y) => y.is_current) || academicYears[0];
        setSelectedAcademicYearId(String(cur.id));
      }
    }
  }, [isOpen, classes, academicYears, targetClassId, selectedAcademicYearId]);

  useEffect(() => {
    if (!isOpen || !selectedAcademicYearId) return;

    const fetchCharges = async () => {
      try {
        setLoading(true);
        setFeedback({ type: "", text: "" });
        const data = await feeApi.listFeeCharges({
          academic_year_id: selectedAcademicYearId,
          include_inactive: false,
        });
        setCharges(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading fee charges:", err);
        setFeedback({ type: "error", text: "Failed to load fee categories." });
      } finally {
        setLoading(false);
      }
    };
    fetchCharges();
  }, [isOpen, selectedAcademicYearId]);

  // Group charges by name, amount & cycle so categories display cleanly with assigned classes
  const groupedCharges = useMemo(() => {
    const groups = {};
    charges.forEach((c) => {
      const key = `${c.charge_name}__${c.amount}__${c.charge_type}__${c.is_mandatory}`;
      if (!groups[key]) {
        groups[key] = {
          ids: [c.id],
          charge_name: c.charge_name,
          amount: c.amount,
          charge_type: c.charge_type,
          applicable_from_month: c.applicable_from_month,
          is_mandatory: c.is_mandatory,
          class_ids: [c.class_id],
        };
      } else {
        groups[key].ids.push(c.id);
        groups[key].class_ids.push(c.class_id);
      }
    });
    return Object.values(groups);
  }, [charges]);

  if (!isOpen) return null;

  const handleCreateCharge = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", text: "" });

    if (!newCharge.charge_name.trim()) {
      setFeedback({ type: "error", text: "Please provide a valid fee category name." });
      return;
    }
    const amountVal = parseFloat(newCharge.amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setFeedback({ type: "error", text: "Amount must be greater than zero." });
      return;
    }

    try {
      setSubmitting(true);
      let targetClassIds = [];
      if (targetScope === "all") {
        targetClassIds = classes.map((c) => c.id);
      } else if (targetScope === "selected") {
        if (!selectedClassIds || selectedClassIds.length === 0) {
          setFeedback({ type: "error", text: "Please select at least one class from the list." });
          setSubmitting(false);
          return;
        }
        targetClassIds = selectedClassIds;
      } else {
        const cId = Number(targetClassId || (classes[0] ? classes[0].id : 0));
        if (!cId) {
          setFeedback({ type: "error", text: "Please select a target class." });
          setSubmitting(false);
          return;
        }
        targetClassIds = [cId];
      }

      for (const cId of targetClassIds) {
        const payload = {
          class_id: cId,
          academic_year_id: Number(selectedAcademicYearId),
          charge_name: newCharge.charge_name.trim(),
          amount: amountVal,
          charge_type: newCharge.charge_type,
          applicable_from_month:
            newCharge.applicable_from_month ? Number(newCharge.applicable_from_month) : null,
          is_mandatory: newCharge.is_mandatory,
        };
        await client.post("/fee-charges", payload);
      }

      const successMsg =
        targetScope === "all"
          ? `Category "${newCharge.charge_name}" added to all ${classes.length} classes!`
          : targetScope === "selected"
          ? `Category "${newCharge.charge_name}" added to ${targetClassIds.length} selected classes!`
          : `Category "${newCharge.charge_name}" added successfully!`;

      setFeedback({
        type: "success",
        text: successMsg,
      });
      setShowAddForm(false);
      setNewCharge({
        charge_name: "",
        amount: "",
        charge_type: "monthly",
        applicable_from_month: "",
        is_mandatory: true,
      });
      setTargetScope("specific");

      // Reload list
      const updated = await feeApi.listFeeCharges({
        academic_year_id: selectedAcademicYearId,
        include_inactive: false,
      });
      setCharges(Array.isArray(updated) ? updated : []);
      if (onChanged) onChanged();
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        text: err.response?.data?.detail || "Failed to create fee category.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGroup = async (group) => {
    try {
      await Promise.all(group.ids.map((id) => client.delete(`/fee-charges/${id}`)));
      setCharges((prev) => prev.filter((c) => !group.ids.includes(c.id)));
      setFeedback({ type: "success", text: `Fee category "${group.charge_name}" removed.` });
      if (onChanged) onChanged();
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", text: "Failed to delete fee category." });
    }
  };

  const renderAssignedClasses = (group) => {
    if (classes.length > 0 && group.class_ids.length >= classes.length) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          All Classes ({classes.length})
        </span>
      );
    }
    const classNames = group.class_ids
      .map((cId) => {
        const cls = classes.find((c) => c.id === cId);
        return cls ? `${cls.name}${cls.section ? ` (${cls.section})` : ""}` : `Class ${cId}`;
      })
      .slice(0, 3);

    const hasMore = group.class_ids.length > 3;

    return (
      <div className="flex flex-wrap items-center gap-1">
        {classNames.map((name, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          >
            {name}
          </span>
        ))}
        {hasMore && (
          <span className="text-[10px] font-semibold text-slate-400">
            +{group.class_ids.length - 3} more
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Manage Fee Categories & Charges</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Configure Tuition, Stationery, Lab, and optional fee heads per class
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

        {/* Academic Session Bar (Single clean selector) */}
        <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Academic Session:
            </label>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.year_name} {y.is_current ? "★ (Current Session)" : ""}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Fee categories apply to classes configured below
          </span>
        </div>

        {/* Body / Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
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

          {/* Action Row */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Categories ({groupedCharges.length})
            </h3>
            {!showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            )}
          </div>

          {/* Add Category Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateCharge}
              className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/60 rounded-2xl p-4 space-y-4 animate-fadeIn"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  New Fee Head Definition
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCharge.charge_name}
                    onChange={(e) => setNewCharge({ ...newCharge, charge_name: e.target.value })}
                    placeholder="e.g. Monthly Tuition Fee, Transport Fee"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Standard Amount (PKR)
                  </label>
                  <input
                    type="number"
                    value={newCharge.amount}
                    onChange={(e) => setNewCharge({ ...newCharge, amount: e.target.value })}
                    placeholder="e.g. 3500"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Frequency / Cycle
                  </label>
                  <select
                    value={newCharge.charge_type}
                    onChange={(e) => setNewCharge({ ...newCharge, charge_type: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly (Annual)</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="one-time">One-Time (Admission)</option>
                  </select>
                </div>

                {newCharge.charge_type === "yearly" && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Billing Month (1-12)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={newCharge.applicable_from_month}
                      onChange={(e) => setNewCharge({ ...newCharge, applicable_from_month: e.target.value })}
                      placeholder="e.g. 4 for April"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="isMandatory"
                    checked={newCharge.is_mandatory}
                    onChange={(e) => setNewCharge({ ...newCharge, is_mandatory: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="isMandatory" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Mandatory Fee
                  </label>
                </div>
              </div>

              {/* Target Class Scope Section (Combo Box & Multi-Select) */}
              <div className="pt-3 border-t border-blue-100 dark:border-blue-800/60 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Assign Category To (Class Scope)
                    </label>
                    <select
                      value={targetScope}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTargetScope(val);
                        if (val === "selected" && selectedClassIds.length === 0) {
                          setSelectedClassIds(classes.map((c) => c.id));
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
                    >
                      <option value="specific">Specific Class Only</option>
                      <option value="all">All Classes in Session ({classes.length} Classes)</option>
                      <option value="selected">Custom Selected Classes (Multiple)</option>
                    </select>
                  </div>

                  {targetScope === "specific" && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Select Target Class
                      </label>
                      <select
                        value={targetClassId}
                        onChange={(e) => setTargetClassId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
                      >
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} - Section {c.section || "A"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {targetScope === "all" && (
                    <div className="flex items-end">
                      <div className="w-full flex items-center gap-2 px-3 py-2 bg-blue-100/70 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold text-blue-900 dark:text-blue-200">
                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Applying school-wide to all {classes.length} classes</span>
                      </div>
                    </div>
                  )}
                </div>

                {targetScope === "selected" && (
                  <div className="bg-white/90 dark:bg-slate-900/70 border border-blue-200 dark:border-blue-800/80 rounded-xl p-3 space-y-2 mt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-950 dark:text-blue-200">
                        Select Target Classes ({selectedClassIds.length} of {classes.length} selected):
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedClassIds(classes.map((c) => c.id))}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedClassIds([])}
                          className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-lg">
                      {classes.map((c) => {
                        const isChecked = selectedClassIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition ${
                              isChecked
                                ? "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/70 dark:border-blue-700 dark:text-blue-200 font-semibold"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedClassIds((prev) => [...prev, c.id]);
                                } else {
                                  setSelectedClassIds((prev) => prev.filter((id) => id !== c.id));
                                }
                              }}
                              className="w-3.5 h-3.5 text-blue-600 rounded"
                            />
                            <span className="truncate">{c.name} {c.section ? `(${c.section})` : ""}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          )}

          {/* Charges List Table */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Loading fee categories...</span>
            </div>
          ) : groupedCharges.length === 0 ? (
            <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <p className="text-xs font-semibold">No fee categories configured for this session yet.</p>
              <p className="text-[11px] text-slate-400 mt-1">Click &quot;Add Category&quot; above to define Tuition, Lab, or other fees.</p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Fee Category</th>
                    <th className="py-3 px-4">Cycle</th>
                    <th className="py-3 px-4 text-right">Standard Amount</th>
                    <th className="py-3 px-4">Assigned Classes</th>
                    <th className="py-3 px-4 text-center">Type</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {groupedCharges.map((group, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {group.charge_name}
                      </td>
                      <td className="py-3.5 px-4 capitalize font-medium text-slate-600 dark:text-slate-300">
                        {group.charge_type} {group.applicable_from_month ? `(Month ${group.applicable_from_month})` : ""}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                        Rs. {Number(group.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderAssignedClasses(group)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            group.is_mandatory
                              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          }`}
                        >
                          {group.is_mandatory ? "Mandatory" : "Optional"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(group)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                          title="Remove this fee category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeeCategoriesModal;
