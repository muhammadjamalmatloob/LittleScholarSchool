import axios from "axios";

/**
 * Determine API base URL dynamically:
 * 1. Check custom override from localStorage ("school_server_url" or "school_server_ip")
 * 2. Check Vite environment variable (import.meta.env.VITE_API_URL)
 * 3. If running in browser and hostname is not localhost/127.0.0.1 (e.g. mobile browser on LAN at 192.168.x.x:5173),
 *    automatically use that same host with port 8000: http://<hostname>:8000/api
 * 4. Default fallback: http://127.0.0.1:8000/api
 */
export const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    const customConfig =
      localStorage.getItem("school_server_url") ||
      localStorage.getItem("school_server_ip");
    if (customConfig && customConfig.trim()) {
      let trimmed = customConfig.trim();
      if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
        // e.g. "192.168.100.4" or "192.168.100.4:8000"
        if (!trimmed.includes(":")) {
          trimmed = `${trimmed}:8000`;
        }
        trimmed = `http://${trimmed}`;
      }
      trimmed = trimmed.replace(/\/+$/, "");
      return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
    }
  }

  if (import.meta.env.VITE_API_URL) {
    let envUrl = String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, "");
    return envUrl.endsWith("/api") ? envUrl : `${envUrl}/api`;
  }

  if (typeof window !== "undefined" && window.location) {
    const host = window.location.hostname;
    // If opened from a LAN IP (e.g., 192.168.x.x or 10.x.x.x) on mobile browser
    if (host && host !== "localhost" && host !== "127.0.0.1" && host !== "") {
      return `http://${host}:8000/api`;
    }
  }

  return "http://127.0.0.1:8000/api";
};

/**
 * Configure or reset custom server URL in localStorage
 */
export const setSchoolServerUrl = (url) => {
  if (typeof window !== "undefined") {
    if (!url || !url.trim()) {
      localStorage.removeItem("school_server_url");
      localStorage.removeItem("school_server_ip");
    } else {
      localStorage.setItem("school_server_url", url.trim());
    }
    client.defaults.baseURL = getApiBaseUrl();
  }
};

/**
 * Retrieve current configured custom server URL if present
 */
export const getSchoolServerConfig = () => {
  if (typeof window !== "undefined") {
    return (
      localStorage.getItem("school_server_url") ||
      localStorage.getItem("school_server_ip") ||
      ""
    );
  }
  return "";
};

export const client = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper to format backend error responses into friendly text
export const extractErrorMessage = (error) => {
  if (!error) return "An unexpected error occurred.";

  // If already parsed
  if (error.friendlyMessage) return error.friendlyMessage;

  // No response from server (Network Error, CORS, server offline)
  if (!error.response) {
    if (error.code === "ERR_NETWORK" || error.message?.includes("Network Error")) {
      const currentUrl = getApiBaseUrl();
      return `Cannot connect to server at ${currentUrl}. Please verify the backend is running and your device is connected to the same Wi-Fi.`;
    }
    return error.message || "Network error. Please check your connection.";
  }

  const { status, data } = error.response;

  // Unpack FastAPI validation errors (422 Unprocessable Entity)
  if (status === 422 && Array.isArray(data?.detail)) {
    const messages = data.detail.map((err) => {
      const field = err.loc ? err.loc[err.loc.length - 1] : "Field";
      return `${field}: ${err.msg}`;
    });
    return messages.join("; ");
  }

  // String detail from backend
  if (typeof data?.detail === "string" && data.detail.trim().length > 0) {
    return data.detail;
  }

  // Common HTTP status code human translations
  switch (status) {
    case 400:
      return "Invalid request. Please verify the provided details.";
    case 401:
      if (typeof window !== "undefined" && window.location.pathname === "/login") {
        return "Invalid email or password. Please verify your credentials.";
      }
      return "Your session has expired. Please sign in again.";
    case 403:
      return "Access denied: You do not have permission to perform this action.";
    case 404:
      return "The requested record or endpoint was not found.";
    case 409:
      return "Conflict: This record already exists in the system.";
    case 500:
      return "Internal server error. Please try again or contact the administrator.";
    case 502:
    case 503:
    case 504:
      return "Backend service is currently unavailable. Please try again shortly.";
    default:
      return data?.message || `Request failed with error status ${status}.`;
  }
};

// Track recent toasts to deduplicate and prevent toast flood on simultaneous failures
const recentToasts = new Map();

let isWindowUnloading = false;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    isWindowUnloading = true;
  });
  window.addEventListener('unload', () => {
    isWindowUnloading = true;
  });
}

export const setUnloadingState = (val = true) => {
  isWindowUnloading = val;
};

// Dispatch a global toast notification
export const dispatchToast = (type, message, title) => {
  if (typeof window !== "undefined" && window.dispatchEvent) {
    const key = `${type}:${title || ""}:${message}`;
    const now = Date.now();
    const lastDispatched = recentToasts.get(key) || 0;
    // Debounce identical toasts within 2500ms
    if (now - lastDispatched < 2500) {
      return;
    }
    recentToasts.set(key, now);

    // Clean up old entries from map periodically
    if (recentToasts.size > 20) {
      for (const [k, time] of recentToasts.entries()) {
        if (now - time > 5000) recentToasts.delete(k);
      }
    }

    window.dispatchEvent(
      new CustomEvent("app:toast", {
        detail: { type, message, title },
      })
    );
  }
};

// Attach Bearer token from localStorage and ensure dynamic baseURL
client.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Unified Response Interceptor
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      isWindowUnloading ||
      axios.isCancel(error) ||
      error.code === 'ERR_CANCELED' ||
      error.name === 'CanceledError' ||
      error.message === 'canceled'
    ) {
      return Promise.reject(error);
    }
    const friendlyMessage = extractErrorMessage(error);
    error.friendlyMessage = friendlyMessage;

    // Handle 401 Unauthorized for authenticated sessions
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        if (window.location.pathname !== "/login") {
          dispatchToast("warning", "Your session has expired. Please sign in again.", "Session Expired");
          window.location.href = "/login";
          return Promise.reject(error);
        }
      }
    }

    // Auto-dispatch toast for API errors unless explicitly skipped via config
    if (!error.config?.skipGlobalToast) {
      // Don't duplicate toast on login screen since login page handles its own prompt
      if (typeof window !== "undefined" && !(window.location.pathname === "/login" && error.response?.status === 401)) {
        // Do NOT show an intrusive error toast for passive GET requests when an optional module is not in the school plan
        const isModuleForbidden =
          error.response?.status === 403 &&
          (typeof error.response?.data?.detail === "string" &&
            (error.response.data.detail.includes("Feature module") ||
             error.response.data.detail.includes("not included in your school plan")));
        const isGetRequest = (error.config?.method || "get").toLowerCase() === "get";

        if (isModuleForbidden && isGetRequest) {
          // Passive query to a disabled module fails quietly so components can fallback
          return Promise.reject(error);
        }

        dispatchToast("error", friendlyMessage, "Action Failed");
      }
    }

    return Promise.reject(error);
  }
);

export default client;
