import React from "react";

export const GlassCard = ({
  children,
  className = "",
  hover = false,
  elevated = false,
  glow = "none",
  padding = "p-5",
  onClick,
  ...props
}) => {
  const hoverEffect = hover
    ? "hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-md cursor-pointer"
    : "";

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-all duration-200 ${hoverEffect} ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
export default GlassCard;
