import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { client, extractErrorMessage, getApiBaseUrl } from "../api/client";

export const formatGoogleDriveUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed.includes("drive.google.com")) {
    const match = trimmed.match(/(?:\/file\/d\/|\/d\/|id=)([a-zA-Z0-9_-]{25,})/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  return trimmed;
};

export const resolveSchoolLogoUrl = (url, activatedAt) => {
  if (!url || typeof url !== "string") return "/logo.jpg";
  const formatted = formatGoogleDriveUrl(url);
  if (formatted.startsWith("/api")) {
    const apiBase = getApiBaseUrl();
    const rootUrl = apiBase.replace(/\/api\/?$/, "");
    const ts = activatedAt ? new Date(activatedAt).getTime() : Date.now();
    return `${rootUrl}${formatted}?t=${ts}`;
  }
  return formatted;
};

const LicenseContext = createContext(null);

export const LicenseProvider = ({ children }) => {
  const [license, setLicense] = useState({
    is_activated: true,
    is_expired: false,
    school_name: "Little Scholar School System",
    plan_name: "School Edition",
    modules: {
      students: true,
      classes: true,
      courses: true,
      attendance: true,
      exams: true,
      timetable: true,
      fees: true,
      teachers: true,
      promotion: true,
      reports: true,
    },
  });

  const fetchLicense = useCallback(async () => {
    try {
      const response = await client.get("/system/license");
      if (response.data) {
        setLicense({
          ...response.data,
          is_activated: true,
          is_expired: false,
          school_name: response.data.school_name || "Little Scholar School System",
        });
      }
    } catch {
      // Fail-open gracefully
    }
  }, []);

  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  const hasModule = useCallback(() => true, []);

  const value = {
    license,
    loading: false,
    error: null,
    schoolName: "Little Scholar School System",
    schoolLogo: "/logo.png",
    planName: "School Edition",
    isActivated: true,
    isExpired: false,
    hasModule,
    activateLicense: async () => ({ success: true }),
    deactivateLicense: async () => ({ success: true }),
    syncLicense: async () => ({ success: true }),
    refreshLicense: fetchLicense,
  };

  return (
    <LicenseContext.Provider value={value}>
      {children}
    </LicenseContext.Provider>
  );
};

export const useLicense = () => {
  const context = useContext(LicenseContext);
  if (!context) {
    return {
      license: { is_activated: true },
      loading: false,
      error: null,
      schoolName: "Little Scholar School System",
      schoolLogo: "/logo.png",
      planName: "School Edition",
      isActivated: true,
      isExpired: false,
      hasModule: () => true,
    };
  }
  return context;
};

export default LicenseContext;
