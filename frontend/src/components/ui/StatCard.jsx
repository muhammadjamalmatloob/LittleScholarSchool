import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export const StatCard = ({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  trendType = "positive",
  color = "blue",
  onClick,
}) => {
  const colorMap = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
    },
    sky: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
    },
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
    },
    mint: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-800",
    },
    purple: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
    },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div
      onClick={onClick}
      className={`p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs transition duration-150 ease-out flex flex-col justify-between ${
        onClick
          ? "cursor-pointer hover:border-slate-300 hover:shadow-xs active:scale-[0.98]"
          : "hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">
            {title}
          </span>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {value}
          </p>
        </div>

        {Icon && (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${scheme.bg} ${scheme.border} ${scheme.text}`}
          >
            <Icon className="w-5 h-5 stroke-[2]" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
        {sub && (
          <span className="text-xs text-slate-600 font-medium truncate">
            {sub}
          </span>
        )}

        {trend && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              trendType === "positive"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {trendType === "positive" ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{trend}</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
