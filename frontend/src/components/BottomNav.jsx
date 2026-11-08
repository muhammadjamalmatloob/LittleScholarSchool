import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, BookOpen, Award, CreditCard, Users } from "lucide-react";

export const BottomNav = () => {
  const navItems = [
    { name: "Home", path: "/dashboard", icon: LayoutDashboard },
    { name: "Students", path: "/students", icon: Users },
    { name: "Courses", path: "/courses", icon: BookOpen },
    { name: "Marksheets", path: "/marksheet", icon: Award },
    { name: "Fees", path: "/fees", icon: CreditCard },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-blue-100 px-2 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg transition-colors"
      aria-label="Mobile Navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `min-w-[56px] min-h-[44px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 active:scale-95 ${
                isActive
                  ? "text-blue-700 font-bold"
                  : "text-slate-500 hover:text-slate-700 font-medium"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive ? "bg-blue-50 text-blue-700" : ""
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.25 : 1.75} />
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">{item.name}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BottomNav;
