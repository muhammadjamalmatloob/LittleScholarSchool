import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDashboardMetrics } from "../api/dashboard.api";
import { feeApi } from "../api/fees";
import { studentApi } from "../api/students";
import {
  Users,
  Building2,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Receipt,
  UserPlus,
  Loader2,
  Calendar,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export const Dashboard = () => {
  const { user } = useAuth();

  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalTeachers: 0,
    pendingFees: "Rs. 0",
    collectedFees: "Rs. 0",
  });

  const [recentFees, setRecentFees] = useState([]);
  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [metricsData, feesData, studentsData] = await Promise.all([
          getDashboardMetrics().catch(() => null),
          feeApi.getAll({ limit: 6, sort_by: "date_desc" }).catch(() => null),
          studentApi.getAll({ limit: 6, sort_by: "roll_desc" }).catch(() => null),
        ]);

        if (isMounted) {
          if (metricsData) {
            setMetrics((prev) => ({
              ...prev,
              totalStudents: metricsData.totalStudents ?? prev.totalStudents,
              totalClasses: metricsData.totalClasses ?? prev.totalClasses,
              totalTeachers: metricsData.totalTeachers ?? prev.totalTeachers,
              pendingFees: metricsData.pendingFees ?? prev.pendingFees,
              collectedFees: metricsData.collectedFees ?? prev.collectedFees,
            }));
          }

          // Handle fee transactions list
          const feeList = Array.isArray(feesData)
            ? feesData
            : feesData?.items || [];
          setRecentFees(feeList.slice(0, 6));

          // Handle students list
          const stList = Array.isArray(studentsData)
            ? studentsData
            : studentsData?.items || [];
          setRecentStudents(stList.slice(0, 6));
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const userName = user?.full_name || "Administrator";
  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header Banner */}
      <div className="pb-3 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Operations Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
              Little Scholar School System
            </span>
          </div>
          <p className="text-xs text-blue-900/70 font-medium mt-0.5">
            Welcome back, {userName} • {todayFormatted}
          </p>
        </div>
      </div>

      {/* Top Row: Cohesive Dark Blue KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
        {/* Card 1: Total Enrolled Students */}
        <div className="rounded-2xl p-6 bg-gradient-to-br from-[#0c2340] to-[#1e3a8a] text-white shadow-md shadow-blue-950/20 hover:-translate-y-0.5 transition-all select-none flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-blue-200">Total Enrolled Students</span>
              <p className="text-[38px] leading-tight font-black tracking-tight text-white mt-1.5">
                {metrics.totalStudents}
              </p>
            </div>
            <div className="bg-white/15 p-3 rounded-xl backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <Users className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-5 pt-3.5 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-blue-200">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Active Student Body</span>
            </div>
            <Link
              to="/students"
              className="text-white hover:underline flex items-center gap-1 font-bold"
            >
              <span>View Roster</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Classes & Academic Curriculum */}
        <div className="rounded-2xl p-6 bg-gradient-to-br from-[#0c2340] to-[#1e3a8a] text-white shadow-md shadow-blue-950/20 hover:-translate-y-0.5 transition-all select-none flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-blue-200">Class Levels & Sections</span>
              <p className="text-[38px] leading-tight font-black tracking-tight text-white mt-1.5">
                {metrics.totalClasses} Classes
              </p>
            </div>
            <div className="bg-white/15 p-3 rounded-xl backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <Building2 className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-5 pt-3.5 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-blue-200">
            <span>Playgroup to Matric</span>
            <Link
              to="/classes"
              className="text-white hover:underline flex items-center gap-1 font-bold"
            >
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
                {metrics.pendingFees}
              </p>
            </div>
            <div className="bg-white/15 p-3 rounded-xl backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <CreditCard className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-5 pt-3.5 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-blue-200">
            <span>Collected: {metrics.collectedFees}</span>
            <Link
              to="/fees"
              className="text-white hover:underline flex items-center gap-1 font-bold"
            >
              <span>Fee Portal</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area: 2 Columns (Recent Fee Transactions & Recently Added Students) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Column 1: Recent Fee Transactions */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-blue-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Recent Fee Transactions</h2>
                  <p className="text-xs text-blue-900/60 font-medium">
                    Latest student fee vouchers and receipts
                  </p>
                </div>
              </div>
              <Link
                to="/fees"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-xs font-medium">Loading transactions...</span>
                </div>
              ) : recentFees.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No recent fee transactions recorded.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentFees.map((fee, idx) => {
                    const studentName = fee.student_name || "Student";
                    const rollNo = fee.roll_number || fee.student_id;
                    const amount = fee.amount !== undefined ? `Rs. ${fee.amount.toLocaleString()}` : "Rs. 0";
                    const isPaid = (fee.status || "").toLowerCase() === "paid";

                    return (
                      <div
                        key={fee.id || idx}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-blue-50/30 px-2 rounded-lg transition"
                      >
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {studentName}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            Roll #{rollNo} • {fee.class_name ? `${fee.class_name} (${fee.section || "A"})` : "Class"} • {fee.month || "Current Month"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs sm:text-sm font-black text-blue-950 font-mono">
                            {amount}
                          </p>
                          <span
                            className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPaid
                                ? "bg-blue-50 text-blue-800 border border-blue-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {isPaid ? "Paid" : "Pending"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-blue-100/70 text-right">
            <Link
              to="/fees"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition"
            >
              <span>Manage Fee Accounts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Column 2: Recently Added Students */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-blue-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Recently Added Students</h2>
                  <p className="text-xs text-blue-900/60 font-medium">
                    Latest student admissions and registrations
                  </p>
                </div>
              </div>
              <Link
                to="/students"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-xs font-medium">Loading student admissions...</span>
                </div>
              ) : recentStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No enrolled students found.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentStudents.map((st, idx) => (
                    <div
                      key={st.id || idx}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-blue-50/30 px-2 rounded-lg transition"
                    >
                      <div className="min-w-0">
                        <Link
                          to={`/students/${st.id}`}
                          className="text-xs sm:text-sm font-bold text-slate-900 hover:text-blue-600 transition truncate block"
                        >
                          {st.name}
                        </Link>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          Roll #{st.formatted_roll_number || st.roll_number} • {st.class_name || "Class"} ({st.section || "A"}) • Father: {st.parent_name || st.father_name || "N/A"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Link
                          to={`/students/${st.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
                        >
                          <span>Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-blue-100/70 text-right">
            <Link
              to="/students"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition"
            >
              <span>Enroll New Student</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
