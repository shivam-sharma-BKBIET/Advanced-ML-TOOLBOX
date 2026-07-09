import { useState, useEffect, useRef } from "react";
import { Sun, Moon, WifiOff, RefreshCw, User, Settings, LogOut, ChevronDown, Shield, Menu, HelpCircle } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import ProfileModal from "./ProfileModal";
import PreferencesModal from "./PreferencesModal";
import SignOutModal from "./SignOutModal";

export default function Header({ darkMode, setDarkMode, isMobileMenuOpen, setIsMobileMenuOpen, setRunTour }) {
  const [serverStatus, setServerStatus] = useState("checking");
  const [latency, setLatency] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Modal visibility states
  const [showProfile, setShowProfile] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);

  const dropdownRef = useRef(null);

  // Load profile from localStorage for display in header
  const [profile, setProfile] = useState(() => {
    const stored = localStorage.getItem("ml_profile");
    return stored
      ? JSON.parse(stored)
      : { name: "Admin User", email: "admin@mltoolbox.local", role: "Superadmin", initials: "AU" };
  });

  // Set default guest profile
  const displayName = "Guest User";
  const displayInitials = "GU";
  const displayEmail = "guest@mltoolbox.local";

  // Re-sync profile from localStorage when modal closes
  const handleProfileClose = () => {
    setShowProfile(false);
    const stored = localStorage.getItem("ml_profile");
    if (stored) setProfile(JSON.parse(stored));
  };

  const checkHealth = async () => {
    const start = performance.now();
    try {
      const res = await axios.get("/api/health");
      if (res.data && res.data.status === "healthy") {
        setServerStatus("online");
        setLatency(Math.round(performance.now() - start));
      } else {
        setServerStatus("error");
      }
    } catch {
      setServerStatus("offline");
      setLatency(null);
    }
  };

  // Poll health every 15s
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setIsDropdownOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  const close = () => setIsDropdownOpen(false);

  const handleSignOutConfirm = () => {
    setShowSignOut(false);
    // Clear session data
    localStorage.removeItem("ml_session");
    toast.success("Signed out successfully. See you soon!", { icon: "👋" });
    // In a real app we might redirect or reload here
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <>
      <header className="h-20 fixed top-0 right-0 left-0 md:left-64 z-30 flex items-center justify-between px-4 md:px-8 border-b border-slate-200/50 dark:border-white/[0.03] bg-white/40 dark:bg-[#0B0F19]/40 backdrop-blur-xl transition-all duration-300">

        {/* Left: Title + Status Badge */}
        <div className="flex items-center gap-3 md:gap-5">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <h2 className="hidden sm:block text-base font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            System Management Panel
          </h2>
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-white/5 shadow-sm">
            {serverStatus === "online" ? (
              <>
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </div>
                <span className="text-slate-500 dark:text-slate-400">API Status:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold tracking-wide">Online</span>
                {latency && (
                  <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] ml-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                    {latency}ms
                  </span>
                )}
              </>
            ) : serverStatus === "checking" ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                <span className="text-slate-500">Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
                <span className="text-rose-600 dark:text-rose-400 font-semibold">Offline</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={checkHealth}
            aria-label="Refresh Backend Status"
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:shadow-sm transition-all"
            title="Refresh Backend Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {/* Take Tour Button */}
          <button 
            onClick={() => setRunTour(true)} 
            className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <HelpCircle className="w-4 h-4" /> Take Tour
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle Theme"
            className="p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            title="Toggle Theme"
          >
            {darkMode
              ? <Sun className="w-4 h-4 text-amber-400 drop-shadow-md" />
              : <Moon className="w-4 h-4 text-indigo-600 drop-shadow-md" />}
          </button>

          {/* User Profile Dropdown */}
          <div ref={dropdownRef} className="relative border-l border-slate-200/50 dark:border-slate-800/50 pl-3 ml-1">
            {/* Trigger Button */}
            <button
              id="admin-user-btn"
              aria-label="User menu"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-3 hover:bg-white/60 dark:hover:bg-slate-900/60 p-1.5 pr-3 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200/50 dark:hover:border-white/5 hover:shadow-sm"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center font-bold text-sm text-white shadow-md shadow-fuchsia-500/20">
                {displayInitials}
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-none">{displayName}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{profile.role}</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown Panel */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl py-2 z-50 shadow-2xl border border-slate-200/50 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl">

                {/* Profile Info */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/50 dark:border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {displayInitials}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-none truncate">{displayName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{displayEmail}</p>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-2 space-y-0.5">
                  <button
                    id="profile-settings-btn"
                    onClick={() => { close(); setShowProfile(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300 transition-colors text-left group"
                  >
                    <User className="w-4 h-4 text-slate-400 group-hover:text-violet-500 transition-colors" />
                    Profile Settings
                  </button>
                  <button
                    id="system-preferences-btn"
                    onClick={() => { close(); setShowPreferences(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors text-left group"
                  >
                    <Settings className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    System Preferences
                  </button>
                </div>

                <div className="border-t border-slate-200/50 dark:border-white/5 mx-2" />

                <div className="p-2">
                  <button
                    id="sign-out-btn"
                    onClick={() => { close(); setShowSignOut(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-left group"
                  >
                    <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modals — rendered outside the header so they are not clipped */}
      {showProfile && (
        <ProfileModal onClose={handleProfileClose} />
      )}
      {showPreferences && (
        <PreferencesModal
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onClose={() => setShowPreferences(false)}
        />
      )}
      {showSignOut && (
        <SignOutModal
          onConfirm={handleSignOutConfirm}
          onCancel={() => setShowSignOut(false)}
        />
      )}
    </>
  );
}
