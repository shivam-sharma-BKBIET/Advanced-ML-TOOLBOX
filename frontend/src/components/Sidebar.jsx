import { 
  Zap, 
  BrainCircuit, 
  Sliders, 
  Binary, 
  Home,
  MonitorPlay,
  Clock
} from "lucide-react";

export default function Sidebar({ activePage, setActivePage, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "automation", label: "Automation", icon: Zap },
    { id: "ml", label: "Machine Learning", icon: BrainCircuit },
    { id: "studio", label: "Data Studio", icon: Sliders },
    { id: "llm", label: "LLM Simulator", icon: Binary },
    { id: "history", label: "History Logs", icon: Clock }
  ];

  return (
    <aside className={`w-64 fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 border-r border-slate-200/50 dark:border-white/[0.03] bg-white/95 md:bg-white/40 dark:bg-[#0B0F19]/95 md:dark:bg-[#0B0F19]/40 backdrop-blur-xl ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
          <MonitorPlay className="w-5 h-5" />
        </div>
        <span className="font-bold tracking-tight text-xl bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
          ML toolbox
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
              <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 animate-fadeIn delay-${(idx+1)*100} ${item.id === "ml" ? "tour-predict" : ""} ${item.id === "studio" ? "tour-data-studio" : ""} ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`} />
                {isActive && (
                  <div className="absolute -inset-1 rounded-full bg-blue-500/20 dark:bg-blue-400/20 blur-sm animate-pulse-slow"></div>
                )}
              </div>
              {item.label}
              
              {/* Active Indicator Line */}
              {isActive && (
                <div className="absolute left-0 w-1 h-8 bg-blue-600 dark:bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / System Status Summary */}
      <div className="p-6">
        <div className="glass-card rounded-2xl p-4 border border-slate-200/50 dark:border-white/5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            Client Core Active
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono opacity-80">
            v1.0.0 (Production)
          </div>
        </div>
      </div>
    </aside>
  );
}
