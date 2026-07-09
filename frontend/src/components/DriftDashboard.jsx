import React, { useState, useEffect } from "react";
import axios from "axios";
import { Activity, AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const ModelDriftCard = ({ modelName, friendlyName }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchDrift = async () => {
      try {
                const res = await axios.get(`/api/ml/${modelName}/drift-report`);
        setReport(res.data);
      } catch (err) {
        console.error(`Failed to fetch drift report for ${modelName}`, err);
      } finally {
        setLoading(false);
      }
    };
    fetchDrift();
  }, [modelName]);

  if (loading) {
    return (
      <div className="glass-card p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!report) return null;

  if (report.status === "not_enough_data") {
    return (
      <div className="glass-card p-6 border-l-4 border-slate-400">
        <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2">{friendlyName} Health</h4>
        <div className="flex items-start gap-3 mt-4">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Awaiting Data</span>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{report.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const isStable = report.overall_status === "stable";
  const isModerate = report.overall_status === "moderate drift";
  
  const statusColor = isStable 
    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
    : isModerate 
      ? "border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
      : "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400";

  const StatusIcon = isStable ? CheckCircle2 : AlertTriangle;

  return (
    <div className={`glass-card p-6 border-l-4 ${isStable ? "border-emerald-500" : isModerate ? "border-yellow-500" : "border-rose-500"} transition-all duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-800 dark:text-white">{friendlyName} Health</h4>
        <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${statusColor}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {report.overall_status.toUpperCase()}
        </div>
      </div>
      
      <p className="text-xs text-slate-500 mb-4 font-medium">
        Based on the last {report.prediction_count} live predictions. Max PSI: <span className="font-mono">{report.max_psi}</span>
      </p>

      <button 
        onClick={() => setExpanded(!expanded)} 
        className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
      >
        {expanded ? "Hide Feature Breakdown" : "View Feature Breakdown"}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
          {Object.entries(report.features).map(([feat, data]) => {
            const featStable = data.status === "stable";
            const featMod = data.status === "moderate drift";
            const fColor = featStable ? "bg-emerald-500" : featMod ? "bg-yellow-500" : "bg-rose-500";
            
            return (
              <div key={feat} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{feat.replace("_", " ")}</span>
                  <span className="font-mono text-[10px] text-slate-500">PSI: {data.psi}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full ${fColor} rounded-full transition-all`} style={{ width: `${Math.min(100, Math.max(5, (data.psi / 0.5) * 100))}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function DriftDashboard() {
  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-2">Model Drift Health</h3>
        <div className="group relative cursor-help">
          <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-slate-900/95 text-white text-[11px] p-3 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
            Model Drift (measured via Population Stability Index) tracks how much real-world input data has changed compared to the original training data. Significant drift means the model might be losing accuracy and should be retrained.
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ModelDriftCard modelName="salary" friendlyName="Salary Predictor" />
        <ModelDriftCard modelName="laptop" friendlyName="Laptop Pricing" />
      </div>
    </div>
  );
}
