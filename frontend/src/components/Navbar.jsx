import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Calendar, Database, Plus } from "lucide-react";
import { academicYearApi } from "../api/academicYears";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { DatabaseBackupModal } from "./DatabaseBackupModal";
import { AcademicYearForm } from "../pages/AcademicYears/AcademicYearForm";

export const Navbar = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [globalSearch, setGlobalSearch] = useState("");
  const [academicYears, setAcademicYears] = useState([]);
  const [currentYearId, setCurrentYearId] = useState("");
  const [loadingYears, setLoadingYears] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);

  const fetchAcademicYears = () => {
    academicYearApi.getAll()
      .then((data) => {
        const list = data || [];
        setAcademicYears(list);
        const curr = list.find((y) => y.is_current);
        if (curr) {
          setCurrentYearId(curr.id.toString());
        }
      })
      .catch((err) => console.error("Error loading academic years for navbar:", err));
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    navigate(`/students?search=${encodeURIComponent(globalSearch.trim())}`);
  };

  const handleYearChange = async (e) => {
    const val = e.target.value;
    if (val === "__add_new__") {
      setShowAddSessionModal(true);
      return;
    }
    const newId = parseInt(val, 10);
    if (!newId || newId === parseInt(currentYearId, 10)) return;
    setLoadingYears(true);
    try {
      const res = await academicYearApi.setCurrent(newId);
      setCurrentYearId(newId.toString());
      const selectedYear = academicYears.find((y) => y.id === newId);
      const name = selectedYear ? selectedYear.year_name : res.year_name;
      toast.success(`Active Academic Session changed to ${name}. Records updated.`);
      window.dispatchEvent(new CustomEvent("academic-year-changed", { detail: { yearId: newId, yearName: name } }));
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not switch academic session.");
    } finally {
      setLoadingYears(false);
    }
  };

  return (
    <>
      <header
        style={{ transition: "all 300ms cubic-bezier(0.23, 1, 0.32, 1)" }}
        className="sticky top-4 z-10 mx-6 mt-4 mb-4 rounded-2xl bg-white/95 backdrop-blur-md border border-blue-100 shadow-xs px-6 h-14 flex items-center transition-all shrink-0"
      >
        <div className="w-full flex items-center justify-between gap-4">
          {/* Left: Interactive Academic Year Session Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-950 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline text-blue-800 font-medium text-[11px]">Session:</span>
              <select
                value={currentYearId}
                onChange={handleYearChange}
                disabled={loadingYears}
                title="Click to switch active Academic Session"
                className="bg-transparent font-bold text-xs text-blue-900 cursor-pointer focus:outline-none pr-1"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id.toString()} className="text-slate-900 bg-white">
                    {ay.year_name} {ay.is_current ? "★ (Active)" : ""}
                  </option>
                ))}
                {isAdmin && (
                  <option value="__add_new__" className="text-blue-600 font-bold bg-blue-50">
                    + Add New Session...
                  </option>
                )}
              </select>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddSessionModal(true)}
                title="Add New Academic Session"
                className="px-2.5 py-1.5 rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Add Session</span>
              </button>
            )}
          </div>

          {/* Center: Search Bar */}
          <div className="flex justify-center flex-1 max-w-md">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
              <Search
                className="absolute left-3.5 w-4 h-4 text-blue-400 pointer-events-none"
                strokeWidth={1.75}
              />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search students, classes, records..."
                style={{ transition: "all 300ms cubic-bezier(0.23, 1, 0.32, 1)" }}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-blue-50/40 border border-blue-200 rounded-xl placeholder-slate-400 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
              />
            </form>
          </div>

          {/* Right: Database Backup Feature & School Indicator */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBackupModal(true)}
              title="Database Backup and Recovery"
              className="p-2 rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-900 border border-blue-200 active:scale-[0.97] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              aria-label="Database Backup and Recovery"
            >
              <Database className="w-4 h-4 text-blue-600" strokeWidth={1.75} />
              <span className="hidden md:inline">Database</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-blue-800 px-3 py-1.5 rounded-xl bg-blue-50/60 border border-blue-100">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span>Little Scholar</span>
            </div>
          </div>
        </div>
      </header>

      <DatabaseBackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
      />

      {showAddSessionModal && (
        <AcademicYearForm
          isOpen={showAddSessionModal}
          onClose={() => setShowAddSessionModal(false)}
          onSuccess={() => {
            fetchAcademicYears();
            toast.success("New academic session created successfully!");
          }}
        />
      )}
    </>
  );
};

export default Navbar;
