import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { GlassButton } from "../components/ui/GlassButton";
import { GlassBadge } from "../components/ui/GlassBadge";

export const PlaceholderModule = ({ title, description }) => {
  return (
    <div className="py-12 px-4 max-w-xl mx-auto text-center">
      <GlassCard className="p-8 sm:p-10 flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-[#e6f4f8] dark:bg-blue-950/60 border border-[#bce3ee] dark:border-blue-800 text-[#086788] dark:text-blue-400 flex items-center justify-center mb-4 shadow-xs">
          <Sparkles className="w-7 h-7 stroke-[2]" />
        </div>

        <GlassBadge variant="teal" size="sm" className="mb-3">
          School Management
        </GlassBadge>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {title || "Module Ready"}
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md leading-relaxed">
          {description ||
            "This module is structured and ready to manage your academic workflows."}
        </p>

        <Link to="/dashboard">
          <GlassButton variant="primary" icon={ArrowLeft}>
            Return to Dashboard
          </GlassButton>
        </Link>
      </GlassCard>
    </div>
  );
};
