import React from "react";
import { Users, Building2, CreditCard, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Cohesive Blue / White Dashboard Metrics
 */
export const DashboardMetrics = ({
  totalStudents = 0,
  pendingFees = "Rs. 0",
  collectedFees = "Rs. 0",
  totalClasses = 0,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
      {/* Card 1: Total Enrolled Students */}
      <div className="rounded-2xl p-6 bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-700/20 hover:-translate-y-0.5 transition-all select-none flex flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-blue-100">Total Enrolled Students</span>
            <p className="text-[38px] leading-tight font-black tracking-tight text-white mt-1.5">
              {totalStudents}
            </p>
          </div>
          <div className="bg-white/15 p-3 rounded-xl backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
            <Users className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
        </div>
        <div className="mt-5 pt-3.5 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-blue-100">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active Student Body</span>
          </div>
          <Link to="/students" className="text-white hover:underline flex items-center gap-1 font-bold">
            <span>View Roster</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Card 2: Classes & Academic Curriculum */}
      <div className="rounded-2xl p-6 bg-gradient-to-br from-blue-700 to-blue-900 text-white shadow-md shadow-blue-900/20 hover:-translate-y-0.5 transition-all select-none flex flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-blue-100">Class Levels & Sections</span>
            <p className="text-[38px] leading-tight font-black tracking-tight text-white mt-1.5">
              {totalClasses} Classes
            </p>
          </div>
          <div className="bg-white/15 p-3 rounded-xl backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
            <Building2 className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
        </div>
        <div className="mt-5 pt-3.5 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-blue-100">
          <span>Curriculum Active</span>
          <Link to="/classes" className="text-white hover:underline flex items-center gap-1 font-bold">
            <span>Manage Classes</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Card 3: Fee Accounts & Dues */}
      <div className="rounded-2xl p-6 bg-gradient-to-br from-[#0c2340] to-[#1e3a8a] text-white shadow-md shadow-blue-950/20 hover:-translate-y-0.5 transition-all select-none flex flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-blue-200">Pending Receivables</span>
            <p className="text-[36px] leading-tight font-black tracking-tight text-white mt-1.5">
              {pendingFees}
            </p>
          </div>
          <div className="bg-white/15 p-3 rounded-xl backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
            <CreditCard className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
        </div>
        <div className="mt-5 pt-3.5 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-blue-200">
          <span>Collected: {collectedFees}</span>
          <Link to="/fees" className="text-white hover:underline flex items-center gap-1 font-bold">
            <span>Fee Portal</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardMetrics;
