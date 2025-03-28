import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Cog6ToothIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";

const Header: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // Get the current page title
  const getPageTitle = () => {
    const path = location.pathname;

    if (path === "/") return "Welcome";
    if (path === "/chat") return "Chat";
    if (path === "/tools") return "Tools";
    if (path === "/settings") return "Settings";

    return "MCP Client";
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", String(newMode));

    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Set the initial dark mode on component mount
  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          {getPageTitle()}
        </h1>

        <div className="flex items-center space-x-4">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800"
            aria-label={
              darkMode ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {darkMode ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </button>

          {/* Settings button */}
          <a
            href="/settings"
            className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800"
            aria-label="Settings"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </a>

          {/* Auth status indicator */}
          <div className="flex items-center">
            <span
              className={`flex h-3 w-3 mr-2 rounded-full ${
                isAuthenticated ? "bg-green-500" : "bg-red-500"
              }`}
            ></span>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {isAuthenticated ? "Connected" : "Not Connected"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
