import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from "react-router-dom";
import Upload from "./pages/Upload";
import Dashboard from "./pages/Dashboard";

function App() {
  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
      ? "bg-blue-100 text-blue-700"
      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">

        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">Athlete Lens</h1>
            <nav className="flex space-x-2">
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/upload" className={navLinkClass}>
                Upload Session
              </NavLink>
            </nav>
          </div>
        </header>

        <main className="pb-10">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
          </Routes>
        </main>

      </div>
    </Router>
  );
}

export default App;