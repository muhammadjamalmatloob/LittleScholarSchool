import React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const ActionCard = ({
  title,
  subtitle,
  icon: Icon,
  to,
  onClick,
  badgeText,
  color = "mint", // "mint", "sky", "coral", "purple", "amber", "teal", "blue"
  highlighted = false,
  className = "",
}) => {
  const colorStyles = {
    mint: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
    },
    sky: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
    },
    coral: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
    },
    purple: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-200",
    },
    teal: {
      bg: "bg-blue-50",
      text: "text-blue-800",
      border: "border-blue-200",
    },
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-900",
      border: "border-blue-300",
    },
  };

  const scheme = colorStyles[color] || colorStyles.sky;

  const content = (
    <div
      className={`group relative flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white border transition-all duration-200 select-none ${
        highlighted
          ? "border-blue-600 shadow-md ring-2 ring-blue-500/20"
          : "border-slate-200 hover:border-blue-500/40 shadow-xs hover:shadow-md"
      } ${className}`}
    >
      {/* Left section: Squircle Icon + Title */}
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${scheme.bg} ${scheme.text} ${scheme.border} transition-transform group-hover:scale-105`}
        >
          {Icon && <Icon className="w-6 h-6 stroke-[2]" />}
        </div>

        <div className="truncate">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight truncate group-hover:text-blue-600 transition-colors">
              {title}
            </h3>
            {badgeText && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                {badgeText}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 truncate mt-0.5 font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right section: Deep Navy rounded circle arrow button */}
      <div className="w-9 h-9 rounded-full bg-blue-900 text-white flex items-center justify-center shrink-0 ml-3 transition-all duration-200 group-hover:bg-blue-600 group-hover:translate-x-0.5 shadow-xs">
        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block no-underline">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="w-full text-left cursor-pointer">
      {content}
    </button>
  );
};
export default ActionCard;
