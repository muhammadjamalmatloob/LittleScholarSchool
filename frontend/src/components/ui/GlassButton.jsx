import React from "react";

export const GlassButton = ({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  className = "",
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

  const sizeStyles = {
    xs: "px-3 py-1.5 text-xs gap-1.5",
    sm: "px-4 py-2 text-xs sm:text-sm gap-2",
    md: "px-5 py-2.5 text-sm gap-2.5",
    lg: "px-6 py-3 text-base gap-3",
  };

  const variantStyles = {
    primary:
      "bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-[0_4px_16px_rgba(37,99,235,0.25)] border border-blue-600 font-semibold",
    white:
      "bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 font-bold shadow-xs",
    amber:
      "bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold shadow-xs border border-amber-300",
    "golden-orange":
      "bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold shadow-xs border border-amber-300",
    secondary:
      "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs font-semibold",
    dark:
      "bg-blue-950 hover:bg-blue-900 text-white shadow-sm font-semibold border border-blue-900",
    navy:
      "bg-blue-900 hover:bg-blue-800 text-white shadow-sm font-semibold border border-blue-800",
    emerald:
      "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold",
    amber:
      "bg-amber-400 hover:bg-amber-500 text-blue-950 font-bold shadow-xs border border-amber-300",
    danger:
      "bg-rose-600 hover:bg-rose-500 text-white shadow-sm border border-rose-400 font-semibold",
    ghost:
      "text-slate-600 hover:bg-slate-100 border border-transparent font-medium",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${sizeStyles[size]} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        Icon && <Icon className="w-4 h-4 shrink-0" />
      )}
      <span>{children}</span>
    </button>
  );
};
export default GlassButton;
