import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Navbar } from "../components/Navbar";
import { BottomNav } from "../components/BottomNav";
import { SidebarProvider } from "../context/SidebarContext";

/**
 * Little Scholar School Layout Shell
 * - Sidebar: Deep Navy Blue (bg-[#0B192C]) with Royal Blue (bg-blue-600) active indicators
 * - Main Canvas: Clean soft blue/slate (bg-[#f8fafc])
 * - Top Navbar: Light glassmorphic bar (bg-white/90 border-blue-100/80 shadow-xs)
 * - Motion: Smooth cubic-bezier transitions
 */
export const AppLayout = ({ children }) => {
  return (
    <SidebarProvider>
      <div
        style={{ transition: "all 300ms cubic-bezier(0.23, 1, 0.32, 1)" }}
        className="flex h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white transition-all relative overflow-hidden"
      >
        {/* Soft SVG Noise Texture Overlay */}
        <div className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.03] mix-blend-overlay bg-noise"></div>

        {/* Ambient Subtle Blue Glow Behind Main Routing Canvas */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-[10%] -left-[5%] w-[40rem] h-[40rem] rounded-full bg-blue-400/10 blur-[130px]"></div>
          <div className="absolute top-[10%] -right-[10%] w-[35rem] h-[35rem] rounded-full bg-blue-300/10 blur-[130px]"></div>
        </div>

        {/* Deep Navy Blue Sidebar */}
        <Sidebar />

        {/* Main Scrolling Viewport with Sticky Navbar */}
        <div
          style={{ transition: "all 300ms cubic-bezier(0.23, 1, 0.32, 1)" }}
          className="flex-1 h-screen overflow-y-auto flex flex-col min-w-0 transition-all relative"
        >
          {/* Top Navbar */}
          <Navbar />

          {/* Main Page Canvas Container */}
          <main className="flex-1 px-6 max-w-7xl w-full mx-auto pb-16">
            {children || <Outlet />}
          </main>
        </div>

        {/* Mobile Navigation fallback */}
        <BottomNav />
      </div>
    </SidebarProvider>
  );
};

export const AppShell = AppLayout;
export default AppLayout;
