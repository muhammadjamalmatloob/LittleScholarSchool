import React, { createContext, useContext, useState, useEffect } from "react";

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar_open");
    if (saved !== null) return saved === "true";
    return window.innerWidth >= 1024;
  });

  useEffect(() => {
    localStorage.setItem("sidebar_open", isOpen.toString());
  }, [isOpen]);

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    return {
      isOpen: true,
      setIsOpen: () => {},
      toggleSidebar: () => {},
    };
  }
  return context;
};
