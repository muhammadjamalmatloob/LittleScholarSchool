import React from "react";

export const PillTabs = ({ tabs, activeTab, onChange, className = "" }) => {
  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer select-none ${
              isActive
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-blue-900 hover:bg-white"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
export default PillTabs;
