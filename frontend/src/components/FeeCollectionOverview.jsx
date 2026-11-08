import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TrendingUp, CreditCard, ArrowUpRight } from "lucide-react";

const CustomFeeTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 dark:bg-slate-800/95 text-white p-3 rounded-xl shadow-xl border border-slate-700/60 backdrop-blur-md text-xs font-sans space-y-1.5 select-none">
        <div className="flex items-center justify-between gap-3 text-slate-300">
          <span className="font-semibold text-white">{data.month || data.label}</span>
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <ArrowUpRight className="w-3 h-3" />
            {data.recoveryRate || "0.0%"}
          </span>
        </div>
        <div className="pt-1 border-t border-slate-700/60 space-y-1 text-[11px]">
          <div className="flex items-center justify-between gap-4 text-emerald-300">
            <span>Collected:</span>
            <span className="font-semibold font-mono">Rs. {Number(data.collected || 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-rose-300">
            <span>Pending:</span>
            <span className="font-semibold font-mono">Rs. {Number(data.pending || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * FeeCollectionOverview: Financial visualization for Fee-centric tiers
 */
export const FeeCollectionOverview = ({ data = [] }) => {
  const getEmptyTimeline = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        month: months[d.getMonth()],
        year: d.getFullYear(),
        label: `${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
        collected: 0,
        pending: 0,
        total: 0,
        recoveryRate: "0.0%",
      });
    }
    return result;
  };

  const chartData = data && data.length > 0 ? data : getEmptyTimeline();

  const totalCollected = chartData.reduce((acc, curr) => acc + (Number(curr.collected) || 0), 0);
  const totalPending = chartData.reduce((acc, curr) => acc + (Number(curr.pending) || 0), 0);
  const overallBilled = totalCollected + totalPending;
  const overallRate = overallBilled > 0 ? ((totalCollected / overallBilled) * 100).toFixed(1) : "0.0";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between font-sans">
      {/* Header section */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Fee Recovery & Collection
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" strokeWidth={2} />
              {overallRate}% Realized
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Monthly fee realization and outstanding arrears recovery
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200/60 dark:border-slate-700/60">
          <CreditCard className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
          <span>Last 6 Months</span>
        </div>
      </div>

      {/* Chart visualization */}
      <div className="w-full h-64 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="feeCollectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800/60"
            />

            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
              dy={8}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 500 }}
              tickFormatter={(v) => `Rs.${v >= 1000 ? `${v / 1000}k` : v}`}
              width={55}
            />

            <Tooltip content={<CustomFeeTooltip />} />

            <Area
              type="monotone"
              dataKey="collected"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#feeCollectedGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Metrics */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span>Realized Collections</span>
        </span>
        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          Challan Invoicing Cycle
        </span>
      </div>
    </div>
  );
};

