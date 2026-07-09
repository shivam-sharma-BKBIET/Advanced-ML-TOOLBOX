import { useState, useEffect } from "react";
import { X, Settings, Sun, Moon, Bell, Clock, Monitor, Save, CheckCircle, RefreshCw } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function PreferencesModal({ darkMode, setDarkMode, onClose }) {
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState({
    theme: darkMode ? "dark" : "light",
    refreshInterval: "15",
    notifications: true,
    compactMode: false,
    sidebarCollapsed: false,
    language: "en",
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    // Fetch user preferences from DB on load
    axios.get("http://localhost:8000/api/auth/me")
      .then(res => {
        if (res.data.preferences) {
          try {
            const backendPrefs = JSON.parse(res.data.preferences);
            setPrefs(p => ({ ...p, ...backendPrefs }));
          } catch(e) {
            console.error("Failed to parse backend preferences", e);
          }
        }
      })
      .catch(err => console.error("Error fetching preferences", err));

    return () => { document.body.style.overflow = ""; };
  }, []);

  // ESC to close
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const toggle = (field) => {
    setPrefs((p) => ({ ...p, [field]: !p[field] }));
    setSaved(false);
  };

  const set = (field, value) => {
    setPrefs((p) => ({ ...p, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      await axios.put("http://localhost:8000/api/auth/preferences", {
        preferences: JSON.stringify(prefs)
      });
      // Apply theme change immediately
      if (prefs.theme === "dark") setDarkMode(true);
      else setDarkMode(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success("Preferences saved successfully!");
    } catch(err) {
      toast.error("Failed to save preferences.");
    }
  };

  const ToggleSwitch = ({ value, onChange, label }) => (
    <button
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
        value ? "bg-violet-600" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
          value ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/50 dark:border-white/10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
              <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">System Preferences</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Customize your experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">

          {/* Appearance Section */}
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Appearance</p>
            <div className="space-y-2">
              {/* Theme Picker */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <Monitor className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Theme</span>
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-200 dark:bg-slate-700 rounded-xl">
                  <button
                    onClick={() => set("theme", "light")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      prefs.theme === "light"
                        ? "bg-white dark:bg-slate-600 text-amber-500 shadow-sm"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" /> Light
                  </button>
                  <button
                    onClick={() => set("theme", "dark")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      prefs.theme === "dark"
                        ? "bg-white dark:bg-slate-600 text-indigo-500 shadow-sm"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" /> Dark
                  </button>
                </div>
              </div>

              {/* Compact Mode */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-white/5">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Compact Mode</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Reduce spacing in UI</p>
                </div>
                <ToggleSwitch value={prefs.compactMode} onChange={() => toggle("compactMode")} label="Toggle Compact Mode" />
              </div>
            </div>
          </div>

          {/* System Section */}
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">System</p>
            <div className="space-y-2">
              {/* Refresh Interval */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">API Refresh Rate</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Health check interval</p>
                  </div>
                </div>
                <select
                  value={prefs.refreshInterval}
                  onChange={(e) => set("refreshInterval", e.target.value)}
                  className="text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 px-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                >
                  <option value="5">5s</option>
                  <option value="10">10s</option>
                  <option value="15">15s</option>
                  <option value="30">30s</option>
                  <option value="60">60s</option>
                </select>
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Notifications</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Toast alerts & warnings</p>
                  </div>
                </div>
                <ToggleSwitch value={prefs.notifications} onChange={() => toggle("notifications")} label="Toggle Notifications" />
              </div>

              {/* Language */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Language</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Display language</p>
                  </div>
                </div>
                <select
                  value={prefs.language}
                  onChange={(e) => set("language", e.target.value)}
                  className="text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 px-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="ur">Urdu</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all"
          >
            {saved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
