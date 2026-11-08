/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/api";

const AuthContext = createContext(null);

export const DEFAULT_ADMIN_USER = {
  id: 1,
  email: "admin@school.com",
  full_name: "Muhammad Usman",
  role: "admin",
  is_active: true,
  permissions: [
    { resource: "students", action: "create" },
    { resource: "students", action: "read" },
    { resource: "students", action: "update" },
    { resource: "students", action: "delete" },
    { resource: "fees", action: "create" },
    { resource: "fees", action: "read" },
    { resource: "fees", action: "update" },
    { resource: "fees", action: "delete" },
    { resource: "attendance", action: "create" },
    { resource: "attendance", action: "read" },
    { resource: "attendance", action: "update" },
    { resource: "exams", action: "create" },
    { resource: "exams", action: "read" },
    { resource: "users", action: "create" },
    { resource: "users", action: "read" },
  ],
};

export const DEFAULT_TEACHER_USER = {
  id: 2,
  email: "sana.tariq@littlescholar.edu.pk",
  full_name: "Ms. Sana Tariq",
  role: "teacher",
  teacher_id: 1,
  assigned_class: "Class 1",
  assigned_section: "A",
  is_incharge: true, // First period lecture teacher in Class 1-A
  incharge_class_name: "Class 1 - Section A",
  assigned_courses: ["Mathematics", "General Science"],
  is_active: true,
  permissions: [
    { resource: "attendance", action: "create" },
    { resource: "attendance", action: "read" },
    { resource: "attendance", action: "update" },
    { resource: "exams", action: "update" }, // Can assign marks
    { resource: "students", action: "read" },
  ],
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const restoreSession = async () => {
      if (!localStorage.getItem("access_token")) {
        setLoading(false);
        return;
      }

      try {
        const profile = await authService.getCurrentUser();
        setUser(profile);
        localStorage.setItem("current_auth_user", JSON.stringify(profile));
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        localStorage.removeItem("current_auth_user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email, password, rememberMe = false) => {
    setError(null);
    try {
      const data = await authService.login(email, password);
      localStorage.setItem("access_token", data.access_token);
      if (rememberMe) {
        localStorage.setItem("remember_email", email);
      } else {
        localStorage.removeItem("remember_email");
      }

      // Fetch user profile with permissions
      const profile = await authService.getCurrentUser();
      setUser(profile);
      localStorage.setItem("current_auth_user", JSON.stringify(profile));
      localStorage.setItem("user", JSON.stringify(profile));
      return profile;
    } catch (err) {
      let message = "Invalid email or password. Please verify your credentials.";
      if (err.friendlyMessage) {
        message = err.friendlyMessage;
      } else if (err.response?.status === 401) {
        message = "Invalid email or password. Please verify your credentials.";
      } else if (typeof err.response?.data?.detail === "string") {
        message = err.response.data.detail;
      } else if (!err.response) {
        message =
          "Cannot connect to backend server. Please make sure the FastAPI backend is running on http://127.0.0.1:8000";
      } else if (err.message) {
        message = err.message;
      }
      err.friendlyMessage = message;
      setError(message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      localStorage.removeItem("current_auth_user");
      setUser(null);
    }
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return roles.map((r) => r.toLowerCase()).includes(user.role.toLowerCase());
  };

  const hasPermission = (resource, action) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (!user.permissions) return false;
    return user.permissions.some(
      (p) =>
        p.resource.toLowerCase() === resource.toLowerCase() &&
        p.action.toLowerCase() === action.toLowerCase()
    );
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    hasRole,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
