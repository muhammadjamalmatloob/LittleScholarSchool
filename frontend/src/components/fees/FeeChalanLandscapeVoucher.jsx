import React from "react";
import { Scissors } from "lucide-react";

/**
 * 3-Column Landscape Fee Chalan Voucher.
 * Fits perfectly on a single A4 Landscape sheet with:
 * - Bank Copy (Column 1)
 * - School Copy (Column 2)
 * - Student Copy (Column 3)
 * Formatted with Bierstadt typography, official school branding,
 * financial breakdown, and dual authorized verification signatures.
 */
export const FeeChalanLandscapeVoucher = ({ challanFee }) => {
  if (!challanFee) return null;

  const copies = [
    {
      type: "BANK COPY",
      badgeClass: "bg-slate-900 text-white",
      note: "Retained by Bank for account settlement & credit reconciliation.",
    },
    {
      type: "SCHOOL COPY",
      badgeClass: "bg-blue-900 text-white",
      note: "To be submitted to School Accounts Office after bank validation.",
    },
    {
      type: "STUDENT COPY",
      badgeClass: "bg-emerald-900 text-white",
      note: "To be kept securely by student/parent as permanent payment receipt.",
    },
  ];

  const items = challanFee.items && challanFee.items.length > 0 ? challanFee.items : [challanFee];
  const totalBilled = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const totalPaid = items.reduce((sum, i) => sum + Number(i.paid_amount || 0), 0);
  const netDue = Math.max(totalBilled - totalPaid, 0);
  const lateFine = 200;
  const payableAfterDue = netDue > 0 ? netDue + lateFine : 0;

  const issueDate = challanFee.issue_date || new Date().toISOString().split("T")[0];
  const dueDate = challanFee.due_date || "10th of Month";
  const rollNumber = challanFee.formatted_roll_number || challanFee.roll_number || challanFee.student_id;
  const billingMonth = challanFee.monthName
    ? `${challanFee.monthName} ${challanFee.year || ""}`
    : `Month ${challanFee.month || ""} ${challanFee.year || ""}`;

  return (
    <div className="w-full bg-white text-slate-900 font-bierstadt print:p-0">
      {/* 3-Column Landscape Grid */}
      <div className="grid grid-cols-3 gap-0 border border-slate-400">
        {copies.map((copy, idx) => (
          <div
            key={copy.type}
            className={`p-3 sm:p-3.5 flex flex-col justify-between text-[11px] leading-tight relative ${
              idx > 0 ? "border-l border-dashed border-slate-400" : ""
            }`}
          >
            {/* Cut Guide Marker (between columns) */}
            {idx > 0 && (
              <div className="absolute -left-3 top-2 flex flex-col items-center pointer-events-none no-print select-none">
                <Scissors className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                <span className="text-[8px] text-slate-400 uppercase tracking-widest writing-vertical">
                  Cut
                </span>
              </div>
            )}

            {/* Slip Header */}
            <div>
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-300">
                <img
                  src="/logo-transparent.png"
                  alt="School Logo"
                  className="w-8 h-8 object-contain shrink-0"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <div className="min-w-0">
                  <h3 className="text-[11px] font-black text-blue-950 uppercase tracking-tight truncate">
                    Little Scholar School System
                  </h3>
                  <p className="text-[8.5px] text-slate-500 truncate">
                    Main Campus • Tel: 042-35889000
                  </p>
                  <p className="text-[8.5px] font-semibold text-blue-800 truncate">
                    Bank Alfalah / Meezan • A/C: 0145-1002938472
                  </p>
                </div>
              </div>

              {/* Copy Label Strip */}
              <div className="my-1.5 text-center">
                <span
                  className={`inline-block px-3 py-0.5 rounded text-[9px] font-black tracking-widest uppercase ${copy.badgeClass}`}
                >
                  {copy.type}
                </span>
              </div>

              {/* Voucher Meta Matrix */}
              <div className="bg-slate-50 border border-slate-300 rounded p-1.5 space-y-0.5 text-[9.5px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Chalan No:</span>
                  <span className="font-mono font-black text-blue-950">
                    CHL-{String(challanFee.id).padStart(5, "0")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Billing Month:</span>
                  <span className="font-bold text-slate-800">{billingMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Issue Date:</span>
                  <span className="font-medium text-slate-700">{issueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Due Date:</span>
                  <span className="font-bold text-rose-700">{dueDate}</span>
                </div>
              </div>

              {/* Student Particulars */}
              <div className="mt-1.5 border border-slate-300 rounded p-1.5 text-[9.5px] space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Student Name:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[125px]">
                    {challanFee.student_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Roll Number:</span>
                  <span className="font-mono font-bold text-blue-900">{rollNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Class / Sec:</span>
                  <span className="font-semibold text-slate-800">
                    {challanFee.class_name} - Sec {challanFee.section || "A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Guardian:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[125px]">
                    {challanFee.parent_name || challanFee.father_name || "Parent/Guardian"}
                  </span>
                </div>
              </div>

              {/* Fee Breakdown Table */}
              <div className="mt-1.5">
                <table className="w-full text-left text-[9px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                      <th className="py-1 px-1.5 border border-slate-300">Particulars</th>
                      <th className="py-1 px-1.5 border border-slate-300 text-right w-16">
                        Amount (Rs.)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, iIdx) => {
                      const billed = Number(item.amount || 0);
                      const title = item.charge_name || (iIdx === 0 ? "Monthly Tuition Fee" : `Fee Charge #${iIdx + 1}`);
                      return (
                        <tr key={item.id || iIdx} className={iIdx % 2 === 1 ? "bg-slate-50/50" : ""}>
                          <td className="py-0.5 px-1.5 border border-slate-300 font-medium text-slate-800 max-w-[120px]">
                            <div className="truncate">{title}</div>
                            {item.remarks && (
                              <div className="text-[7.5px] text-emerald-700 font-semibold truncate leading-tight">
                                {item.remarks}
                              </div>
                            )}
                          </td>
                          <td className="py-0.5 px-1.5 border border-slate-300 text-right font-mono font-semibold text-slate-900">
                            {billed.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total Row */}
                    <tr className="bg-slate-100 font-bold text-[9.5px]">
                      <td className="py-1 px-1.5 border border-slate-300 text-slate-900 uppercase">
                        Payable by Due Date:
                      </td>
                      <td className="py-1 px-1.5 border border-slate-300 text-right font-mono font-black text-blue-950">
                        Rs. {netDue.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="text-[8.5px] text-slate-600">
                      <td className="py-0.5 px-1.5 border border-slate-300">
                        Late Surcharge (After Due):
                      </td>
                      <td className="py-0.5 px-1.5 border border-slate-300 text-right font-mono font-medium text-rose-600">
                        Rs. {lateFine}
                      </td>
                    </tr>
                    <tr className="bg-rose-50/50 text-[9px] font-bold">
                      <td className="py-0.5 px-1.5 border border-slate-300 text-rose-900 uppercase">
                        Payable After Due Date:
                      </td>
                      <td className="py-0.5 px-1.5 border border-slate-300 text-right font-mono font-black text-rose-800">
                        Rs. {payableAfterDue.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Status Banner */}
              <div className="mt-1 text-center">
                <span
                  className={`inline-block w-full py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider ${
                    challanFee.status === "paid"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : "bg-amber-100 text-amber-900 border border-amber-300"
                  }`}
                >
                  {challanFee.status === "paid" ? "VERIFIED PAID IN FULL" : "PAYABLE AT BANK / CASH DESK"}
                </span>
              </div>
            </div>

            {/* Slip Footer Notes & Signatures */}
            <div className="mt-2 pt-1.5 border-t border-slate-200">
              <p className="text-[7.5px] text-slate-500 leading-tight">
                • {copy.note}
                <br />• Fee once paid is non-refundable. Late fee applies after {dueDate}.
              </p>

              {/* Signatures */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[8px] text-slate-600">
                <div>
                  <div className="h-6 border-b border-dashed border-slate-400 w-full mb-0.5" />
                  <p className="font-bold text-slate-800">Depositor Signature</p>
                </div>
                <div>
                  <div className="h-6 border-b border-dashed border-slate-400 w-full mb-0.5" />
                  <p className="font-bold text-slate-800">Bank / Cashier Stamp</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeeChalanLandscapeVoucher;
