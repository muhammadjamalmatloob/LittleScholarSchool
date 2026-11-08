import React from "react";

export const GlassBadge = ({
  children,
  variant = "blue",
  size = "md",
  dot = false,
  className = "",
}) => {
  const variantStyles = {
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    teal: "bg-blue-50 text-blue-800 border-blue-200",
    indigo: "bg-blue-50 text-blue-800 border-blue-200",
    mint: "bg-emerald-50 text-emerald-800 border-emerald-200",
    sky: "bg-blue-50 text-blue-800 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    amber: "bg-amber-50 text-amber-900 border-amber-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
    purple: "bg-blue-50 text-blue-800 border-blue-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const dotColors = {
    blue: "bg-blue-600",
    teal: "bg-blue-600",
    indigo: "bg-blue-600",
    mint: "bg-emerald-600",
    sky: "bg-blue-600",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    purple: "bg-blue-500",
    slate: "bg-slate-400",
  };

  const sizeStyles = {
    sm: "px-2.5 py-0.5 text-xs font-bold",
    md: "px-3 py-1 text-xs sm:text-sm font-semibold",
    lg: "px-4 py-1.5 text-sm font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-wide transition-colors ${
        variantStyles[variant] || variantStyles.blue
      } ${sizeStyles[size] || sizeStyles.md} ${className}`}
    >
      {dot && (
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            dotColors[variant] || dotColors.blue
          }`}
        />
      )}
      {children}
    </span>
  );
};
export default GlassBadge;
