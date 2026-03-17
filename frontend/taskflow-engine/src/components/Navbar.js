import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout, isAdminOrManager, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { to: "/dashboard", label: "Dashboard", show: true },
    { to: "/tasks", label: "All Tasks", show: true },
    { to: "/create-task", label: "Create Task", show: isAdminOrManager },
    { to: "/admin", label: "Admin", show: isAdmin },
  ];

  const roleBadgeClass = {
    ADMIN: "badge-admin",
    MANAGER: "badge-manager",
    USER: "badge-user",
  };

  return (
    <nav className="glass border-b border-dark-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Nav Links */}
          <div className="flex items-center gap-1">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 mr-8 group"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-glow-purple rounded-lg flex items-center justify-center shadow-lg shadow-accent-500/20 group-hover:shadow-accent-500/40 transition-shadow">
                <span className="text-white font-bold text-sm">TF</span>
              </div>
              <span className="text-white font-bold text-lg hidden sm:block">
                TaskFlow
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks
                .filter((l) => l.show)
                .map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive(link.to)
                        ? "bg-accent-600/20 text-accent-400"
                        : "text-gray-400 hover:text-gray-200 hover:bg-dark-700/50"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-dark-700/50 transition-all duration-200"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-glow-cyan rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user?.username?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-200 leading-tight">
                    {user?.username}
                  </p>
                  <p className="text-xs text-gray-500 leading-tight">
                    {user?.role}
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 glass rounded-xl shadow-xl shadow-black/20 py-2 animate-slide-down">
                  <div className="px-4 py-3 border-b border-dark-700/50">
                    <p className="text-sm font-medium text-white">
                      {user?.username}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {user?.email}
                    </p>
                    <span className={`${roleBadgeClass[user?.role]} mt-2`}>
                      {user?.role}
                    </span>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-700/50 hover:text-white transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"
                      />
                    </svg>
                    Profile
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors w-full text-left"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                      />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>

            <button
              className="md:hidden p-2 rounded-lg hover:bg-dark-700/50 text-gray-400"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                {menuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden py-3 border-t border-dark-700/50 animate-slide-down">
            {navLinks
              .filter((l) => l.show)
              .map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? "bg-accent-600/20 text-accent-400"
                      : "text-gray-400 hover:text-gray-200 hover:bg-dark-700/50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;