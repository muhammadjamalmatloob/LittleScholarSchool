import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export const ThemeToggle = ({ className = "" }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to Light theme" : "Switch to Dark theme"}
      aria-label="Toggle visual theme"
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 cursor-pointer 
        glass-panel-subtle hover:bg-white/80 dark:hover:bg-slate-800/80
        text-slate-600 dark:text-amber-400 
        hover:scale-105 active:scale-95 
        shadow-xs ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-blue-600 transition-transform duration-300 -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
};
