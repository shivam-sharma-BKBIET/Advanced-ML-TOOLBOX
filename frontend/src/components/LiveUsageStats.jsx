import { useState, useEffect } from "react";
import axios from "axios";
import { Activity, Database, MessageSquare, Zap, Cpu } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";

export default function LiveUsageStats() {
  const [stats, setStats] = useState({
    total_predictions: 0,
    total_batches: 0,
    total_messages: 0,
    total_assistant: 0,
    total_datasets_processed: 0
  });
  
  const fetchStats = async () => {
    try {
      const res = await axios.get("/api/analytics/global-stats");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch global stats:", err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const statItems = [
    { label: "Total Predictions", value: stats.total_predictions, icon: Cpu, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Batch Jobs", value: stats.total_batches, icon: Database, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Automation Msgs", value: stats.total_messages, icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "AI Chats", value: stats.total_assistant, icon: MessageSquare, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Datasets Cleaned", value: stats.total_datasets_processed, icon: Activity, color: "text-violet-500", bg: "bg-violet-500/10" }
  ];

  return (
    <div className="glass-card p-6 border border-slate-200/50 dark:border-white/5 shadow-sm rounded-2xl w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
          Global Usage Stats
        </h3>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          Live Data
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{item.label}</p>
              <p className="text-xl font-extrabold text-slate-800 dark:text-white leading-tight">
                <AnimatedNumber value={item.value} />
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
