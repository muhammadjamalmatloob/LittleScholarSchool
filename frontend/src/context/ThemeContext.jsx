import React, { createContext, useContext, useEffect } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    // Permanently enforce light blue/white theme
    const root = document.documentElement;
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    localStorage.setItem("app_theme", "light");
  }, []);

  const toggleTheme = () => {
    // Dark theme permanently disabled per user instructions
  };

  return (
    <ThemeContext.Provider value={{ theme: "light", toggleTheme, isDark: false }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "light",
      toggleTheme: () => {},
      isDark: false,
    };
  }
  return context;
};

export default ThemeContext;
