import { SCHOOL_LOGO_DATA_URI } from "../assets/schoolLogo";
import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BookOpen,
  Calendar,
  GraduationCap,
  Building2,
  Award,
  TrendingUp,
  Menu,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";
import { useLicense } from "../context/LicenseContext";

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const { isOpen, toggleSidebar } = useSidebar();
  const { schoolName, schoolLogo } = useLicense();

    const navSections = [
    {
      label: "Overview",
      items: [
        {
          name: "Dashboard",
          path: "/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      label: "Academics",
      items: [
        {
          name: "Students",
          path: "/students",
          icon: Users,
        },
        {
          name: "Classes & Sections",
          path: "/classes",
          icon: Building2,
        },
        {
          name: "Courses & Subjects",
          path: "/courses",
          icon: BookOpen,
        },
        {
          name: "Marksheets",
          path: "/marksheet",
          icon: Award,
        },
        
      ],
    },
    {
      label: "Management",
      items: [
        {
          name: "Fee Accounts",
          path: "/fees",
          icon: CreditCard,
        },
        
      ],
    },
  ];

  return (
    <>
      {/* Fixed layout gutter placeholder for desktop flow */}
      <div className="hidden md:block w-[76px] shrink-0 pointer-events-none" aria-hidden="true" />

      {/* Floating backdrop overlay when sidebar is expanded on mobile */}
      <div
        onClick={toggleSidebar}
        className={`fixed inset-0 bg-blue-950/40 z-40 backdrop-blur-[2px] transition-opacity duration-160 ease-out ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Deep Navy Blue Theme Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen z-50 flex flex-col select-none bg-[#0B192C] text-slate-300 border-r border-blue-900/50 font-sans transition-all duration-300 ease-in-out ${
          isOpen
            ? "w-64 shadow-2xl translate-x-0"
            : "-translate-x-full md:translate-x-0 w-[76px] shadow-none"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-blue-900/40 flex items-center px-3.5 transition-all duration-300 overflow-hidden shrink-0">
          <div className="flex items-center min-w-0 flex-1">
            <button
              type="button"
              onClick={toggleSidebar}
              title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
              className="w-12 min-w-[3rem] flex justify-center items-center shrink-0 cursor-pointer"
            >
              <div className="bg-white rounded-full h-11 w-11 flex items-center justify-center p-2 shadow-sm ring-2 ring-blue-500/20 shrink-0 overflow-hidden">
                <img
                  src={SCHOOL_LOGO_DATA_URI}
                  alt={schoolName || "Little Scholar School System"}
                  className="h-full w-full object-contain"
                />
              </div>
            </button>
            <div
              className={`whitespace-nowrap transition-opacity duration-200 min-w-0 pr-2 ${
                isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <h1 className="font-bold text-sm tracking-tight text-white leading-tight truncate">
                {schoolName || "Little Scholar"}
              </h1>
              <p className="text-[11px] text-blue-300 font-medium truncate">
                School System
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            className={`p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-blue-900/50 active:scale-[0.97] transition-all duration-200 cursor-pointer shrink-0 ${
              isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <Menu className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 overflow-x-hidden">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p
                className={`px-3 text-[10px] font-bold uppercase tracking-wider text-blue-300/70 whitespace-nowrap transition-opacity duration-200 mb-1.5 ${
                  isOpen ? "opacity-100" : "opacity-0 select-none pointer-events-none"
                }`}
              >
                {section.label}
              </p>

              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center h-11 rounded-xl text-xs font-medium transition-colors duration-200 active:scale-[0.98] overflow-hidden ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                          : "text-slate-300 hover:text-white hover:bg-blue-900/40"
                      }`
                    }
                    title={!isOpen ? item.name : undefined}
                  >
                    <div className="w-12 min-w-[3rem] flex justify-center items-center shrink-0">
                      <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
                    </div>
                    <span
                      className={`whitespace-nowrap transition-opacity duration-200 pr-3 ${
                        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                      }`}
                    >
                      {item.name}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile Card */}
        <div className="px-3.5 py-3 border-t border-blue-900/40 bg-[#07101e] mt-auto relative">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center min-w-0">
              <div className="w-12 min-w-[3rem] flex justify-center items-center shrink-0 relative group/avatar">
                <button
                  type="button"
                  onClick={logout}
                  title={`Sign out (${user?.full_name || "Admin"})`}
                  aria-label="Sign out"
                  className="relative w-8.5 h-8.5 rounded-full flex items-center justify-center overflow-hidden transition-all duration-200 cursor-pointer shadow-xs active:scale-95 group-hover/avatar:ring-2 group-hover/avatar:ring-rose-500/50"
                >
                  <div className="absolute inset-0 bg-blue-600 text-white font-bold text-xs flex items-center justify-center transition-all duration-200 group-hover/avatar:opacity-0 group-hover/avatar:scale-75">
                    {user?.full_name?.charAt(0) || "A"}
                  </div>

                  <div className="absolute inset-0 bg-rose-600 text-white flex items-center justify-center transition-all duration-200 opacity-0 scale-75 group-hover/avatar:opacity-100 group-hover/avatar:scale-100 shadow-md shadow-rose-600/30">
                    <LogOut className="w-4 h-4" strokeWidth={2} />
                  </div>
                </button>

                {!isOpen && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 border border-blue-900/60 text-rose-300 text-[11px] font-semibold rounded-lg shadow-xl pointer-events-none opacity-0 -translate-x-1 group-hover/avatar:opacity-100 group-hover/avatar:translate-x-0 transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 z-50">
                    <LogOut className="w-3 h-3 text-rose-400" strokeWidth={2} />
                    <span>Log Out</span>
                  </div>
                )}
              </div>

              <div
                className={`whitespace-nowrap transition-opacity duration-200 min-w-0 pr-2 ${
                  isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                <p className="text-xs font-semibold text-white truncate">
                  {user?.full_name || "Administrator"}
                </p>
                <p className="text-[10px] text-blue-300 font-medium truncate">
                  Super Administrator
                </p>
              </div>
            </div>

            {logout && (
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className={`p-1.5 text-blue-300 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200 active:scale-[0.97] cursor-pointer shrink-0 ${
                  isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
