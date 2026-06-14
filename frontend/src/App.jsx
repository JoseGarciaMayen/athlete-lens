import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from "react-router-dom";
import Upload from "./pages/Upload";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History"

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return [isDark, setIsDark];
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function App() {
  const [isDark, setIsDark] = useDarkMode();

  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
    }`;

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

        <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Athlete Lens</h1>
            <nav className="flex items-center space-x-2">
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/upload" className={navLinkClass}>
                Upload Session
              </NavLink>
              <NavLink to="/history" className={navLinkClass}>
                History
              </NavLink>
              <button
                onClick={() => setIsDark(!isDark)}
                className="ml-2 p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
              </button>
            </nav>
          </div>
        </header>

        <main className="pb-10">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>

      </div>
    </Router>
  );
}

export default App;
