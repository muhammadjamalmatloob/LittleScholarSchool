import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { getApiBaseUrl, getSchoolServerConfig, setSchoolServerUrl } from "../api/client";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Wifi,
  X,
  } from "lucide-react";



// Illustrated 2D Vector Pencil Component
const IllustratedPencil = ({
  bodyColor = "#fb7185",
  bandColor = "#38bdf8",
  tipColor = "#e11d48",
  className = "",
  style = {},
}) => (
  <svg
    viewBox="0 0 32 165"
    className={`w-8 h-40 select-none pointer-events-none drop-shadow-md ${className}`}
    style={style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Eraser */}
    <rect x="5" y="4" width="22" height="18" rx="6" fill="#f472b6" stroke="#1e293b" strokeWidth="2.5" />
    {/* Ferrule band */}
    <rect x="5" y="18" width="22" height="12" fill={bandColor} stroke="#1e293b" strokeWidth="2.5" />
    {/* Body facets */}
    <rect x="5" y="30" width="11" height="85" fill={bodyColor} stroke="#1e293b" strokeWidth="2.5" />
    <rect x="16" y="30" width="11" height="85" fill={bodyColor} stroke="#1e293b" strokeWidth="2.5" opacity="0.85" />
    {/* Wood cone */}
    <polygon points="5,115 27,115 16,154" fill="#fed7aa" stroke="#1e293b" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Lead tip */}
    <polygon points="11.5,138 20.5,138 16,154" fill={tipColor} stroke="#1e293b" strokeWidth="2.5" strokeLinejoin="round" />
  </svg>
);

// Illustrated 2D Vector Wooden Ruler
const IllustratedRuler = ({ className = "", style = {} }) => (
  <svg
    viewBox="0 0 54 210"
    className={`w-14 h-56 select-none pointer-events-none drop-shadow-md ${className}`}
    style={style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="3" y="3" width="48" height="204" rx="8" fill="#facc15" stroke="#1e293b" strokeWidth="2.75" />
    {/* Top Hanging Hole */}
    <circle cx="27" cy="24" r="5.5" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
    {/* Measurement ticks */}
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((tick) => (
      <line
        key={tick}
        x1="3"
        y1={42 + tick * 9.5}
        x2={tick % 2 === 0 ? "20" : "11"}
        y2={42 + tick * 9.5}
        stroke="#1e293b"
        strokeWidth="2"
      />
    ))}
  </svg>
);

// Illustrated 2D Vector Paperclip Component
const IllustratedPaperClip = ({ className = "", style = {} }) => (
  <svg
    viewBox="0 0 42 78"
    className={`w-9 h-16 select-none pointer-events-none drop-shadow-sm ${className}`}
    style={style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Outer Loop */}
    <path
      d="M13 25 V59 C13 67 20 73 28 73 C36 73 42 67 42 59 V18 C42 8 34 2 24 2 C14 2 6 9 6 19 V61"
      stroke="#1e293b"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(-3, 0)"
    />
    {/* Inner Loop */}
    <path
      d="M13 25 V55 C13 60 17 64 22 64 C27 64 31 60 31 55 V21 C31 15 27 11 22 11 C17 11 13 15 13 20 V45"
      stroke="#64748b"
      strokeWidth="3.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(-3, 0)"
    />
  </svg>
);

// Illustrated 5-Point Star Badge
const Star5 = ({ className = "", style = {} }) => (
  <svg
    viewBox="0 0 24 24"
    className={`w-6 h-6 select-none pointer-events-none drop-shadow-sm ${className}`}
    style={style}
    fill="#facc15"
    stroke="#1e293b"
    strokeWidth="2"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// Illustrated 4-Point Sparkle
const Sparkle4 = ({ color = "#f97316", className = "", style = {} }) => (
  <svg
    viewBox="0 0 24 24"
    className={`w-5 h-5 select-none pointer-events-none ${className}`}
    style={style}
    fill={color}
    stroke="#1e293b"
    strokeWidth="1.75"
    strokeLinejoin="round"
  >
    <path d="M12 2 Q12 12, 2 12 Q12 12, 12 22 Q12 12, 22 12 Q12 12, 12 2 Z" />
  </svg>
);

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Wi-Fi / backend server configuration modal
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverInput, setServerInput] = useState(getSchoolServerConfig() || "");

  const handleSaveServer = () => {
    setSchoolServerUrl(serverInput);
    setShowServerModal(false);
    toast.success(
      serverInput.trim()
        ? `Server saved. Requests will use ${getApiBaseUrl()}.`
        : "Server reset to automatic detection.",
      "Server Connection"
    );
  };

  const handleResetServer = () => {
    setServerInput("");
    setSchoolServerUrl("");
    toast.success("Server reset to automatic detection.", "Server Connection");
  };
  
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !password) {
      const msg = "Please enter both email and password.";
      setErrorMessage(msg);
      toast.warning(msg, "Missing Information");
      return;
    }

    setLoading(true);
    try {
      await login(email, password, rememberMe);
      toast.success("Signed in successfully! Welcome to the portal.", "Sign In Successful");
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      let friendly = err.friendlyMessage;
      if (!friendly) {
        if (err.response?.status === 401) {
          friendly = "Invalid email or password. Please verify your credentials.";
        } else if (typeof err.response?.data?.detail === "string") {
          friendly = err.response.data.detail;
        } else if (err.code === "ERR_NETWORK" || !err.response) {
          friendly = "Cannot connect to server. Please verify the FastAPI backend is running.";
        } else {
          friendly = "Failed to sign in. Please verify your credentials.";
        }
      }
      setErrorMessage(friendly);
      toast.error(friendly, "Sign In Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-slate-950 overflow-hidden selection:bg-blue-500 selection:text-white">

      {/* Top Floating Controls: Wi-Fi Server Connection & Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowServerModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xs border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition cursor-pointer"
          title="Configure Wi-Fi Server Connection"
        >
          <Wifi className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">Server IP</span>
        </button>
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-full shadow-xs border border-slate-200 dark:border-slate-800 transition-transform hover:scale-105">
          <ThemeToggle />
        </div>
      </div>

      {/* Central Illustrated Stage */}
      <div className="relative w-full max-w-[420px] my-10 flex items-center justify-center">

        {/* ========================================================= */}
        {/* 1. BEHIND-THE-CARD STATIONERY & MAIN RIBBON (z-0)          */}
        {/* ========================================================= */}

        {/* Top-Left Pencils */}
        <div className="absolute -top-16 -left-6 z-0 -rotate-[38deg]">
          <IllustratedPencil
            bodyColor="#fb7185"
            bandColor="#38bdf8"
            tipColor="#e11d48"
          />
        </div>
        <div className="absolute -top-10 -left-16 z-0 -rotate-[58deg]">
          <IllustratedPencil
            bodyColor="#34d399"
            bandColor="#f472b6"
            tipColor="#059669"
          />
        </div>

        {/* Top-Left Star & Sparkle */}
        <div className="absolute -top-6 -left-24 z-0">
          <Star5 />
        </div>
        <div className="absolute top-20 -left-20 z-0">
          <Sparkle4 color="#fb7185" />
        </div>

        {/* Top-Right Yellow Ruler */}
        <div className="absolute -top-14 -right-14 z-0 rotate-[22deg]">
          <IllustratedRuler />
        </div>

        {/* Right Star & Sparkles */}
        <div className="absolute top-36 -right-12 z-0">
          <Star5 />
        </div>
        <div className="absolute top-64 -right-8 z-0">
          <Sparkle4 color="#f97316" />
        </div>

        {/* Bottom-Left Pink Pencil */}
        <div className="absolute -bottom-16 -left-8 z-0 rotate-[-135deg]">
          <IllustratedPencil
            bodyColor="#fb7185"
            bandColor="#38bdf8"
            tipColor="#e11d48"
          />
        </div>

        {/* Bottom-Left Floating Paperclip & Sparkle */}
        <div className="absolute -bottom-24 left-10 z-0 -rotate-[30deg]">
          <IllustratedPaperClip />
        </div>
        <div className="absolute -bottom-6 -left-16 z-0">
          <Sparkle4 color="#f97316" />
        </div>

        {/* Bottom-Right Floating Paperclip & Sparkle */}
        <div className="absolute -bottom-16 -right-6 z-0 rotate-[30deg]">
          <IllustratedPaperClip />
        </div>
        <div className="absolute -bottom-8 right-24 z-0">
          <Sparkle4 color="#fb7185" />
        </div>



        {/* ========================================================= */}
        {/* 2. THE FLOATING FORM CARD (z-10)                          */}
        {/* ========================================================= */}
        <div className="relative z-10 w-full bg-white dark:bg-slate-900 rounded-[28px] p-7 sm:p-9 md:p-10 shadow-[0_20px_45px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_45px_rgba(0,0,0,0.6)] border-2 border-slate-900 dark:border-slate-700 transition-all">

          {/* Paperclip Clipped onto the Top-Right Rim of the Card */}
          <div className="absolute -top-6 right-8 z-30 pointer-events-none rotate-[35deg]">
            <IllustratedPaperClip />
          </div>

          {/* School Crest inside Circular Container */}
          <div className="bg-white rounded-full h-28 w-28 mx-auto flex items-center justify-center p-2 mb-5 shadow-sm border-2 border-slate-900/90 ring-4 ring-slate-100 dark:ring-slate-800">
            <img
              src="/logo.svg"
              alt="Little Scholar School System"
              className="h-full w-full object-contain"
            />
          </div>

          {/* Headings */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Little Scholar School System
            </h1>
            <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 mt-1">
              Sign In to School Portal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
              Enter your credentials to access academic &amp; administration portal
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-tight">{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-600 transition-all bg-white dark:bg-slate-900">
                <div className="w-11 h-12 bg-slate-50 dark:bg-slate-800/60 border-r border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full px-3.5 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm font-medium outline-none bg-transparent"
                />
              </div>
            </div>

            <div>
              <div className="relative flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-600 transition-all bg-white dark:bg-slate-900">
                <div className="w-11 h-12 bg-slate-50 dark:bg-slate-800/60 border-r border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm font-medium outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                />
                <span>Remember me on this browser</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 py-3.5 rounded-xl font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In to School Portal</span>
              )}
            </button>

                      </form>
        </div>



      </div>

      {/* Wi-Fi / Server IP Configuration Modal */}
      {showServerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-blue-200 shadow-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-blue-100 pb-3">
              <div>
                <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-blue-600" />
                  <span>Server Connection</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Set the backend server IP so devices on the same Wi-Fi can sign in.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowServerModal(false)}
                className="text-slate-400 hover:text-blue-600 p-1 rounded-lg transition cursor-pointer"
                aria-label="Close server settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveServer();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-blue-950 mb-1.5">
                  Server IP / URL
                </label>
                <input
                  type="text"
                  value={serverInput}
                  onChange={(e) => setServerInput(e.target.value)}
                  placeholder="e.g. 192.168.1.100:8000"
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-blue-50/40 border border-blue-200 text-slate-900 text-sm font-medium focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Leave blank to detect the server automatically. Currently using:{" "}
                <span className="font-mono font-semibold text-blue-800 break-all">
                  {getApiBaseUrl()}
                </span>
              </p>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetServer}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                >
                  Reset to Auto
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowServerModal(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-blue-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
                  >
                    Save Server
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

          </div>
  );
};

export default Login;
