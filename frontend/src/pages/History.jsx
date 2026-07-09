import React, { useState, useEffect } from "react";
import axios from "axios";
import { Download, FileText, ChevronDown, ChevronRight, Activity, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { SkeletonRow } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function PredictionRow({ log }) {
  const [expanded, setExpanded] = useState(false);

  // If we have an explanation and want to show a mini chart
  const hasShap = log.explanation && log.explanation.contributions && log.explanation.contributions.length > 0;
  
  return (
    <>
      <tr className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="p-3">
          <button aria-label="Toggle row details" className="text-gray-400 hover:text-white transition-colors">
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        </td>
        <td className="p-3 font-medium text-white">{log.model_name}</td>
        <td className="p-3 text-sm text-gray-300">{log.model_version || "N/A"}</td>
        <td className="p-3 text-sm text-gray-300 truncate max-w-xs">{JSON.stringify(log.input_payload)}</td>
        <td className="p-3 font-medium text-blue-400 truncate max-w-xs">{JSON.stringify(log.output_value)}</td>
        <td className="p-3 text-sm text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="6" className="p-4 bg-white/[0.02] border-b border-white/5">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">Input Details</h4>
                <pre className="bg-black/30 p-3 rounded-lg text-xs text-gray-300 overflow-x-auto">
                  {JSON.stringify(log.input_payload, null, 2)}
                </pre>
                <h4 className="text-sm font-semibold text-gray-300 mb-2 mt-4 uppercase tracking-wider">Output Value</h4>
                <pre className="bg-black/30 p-3 rounded-lg text-xs text-green-400 overflow-x-auto">
                  {JSON.stringify(log.output_value, null, 2)}
                </pre>
              </div>
              
              {hasShap && (
                <div className="flex-1 bg-black/20 rounded-xl p-4 border border-white/5">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">Feature Impact (SHAP)</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={log.explanation.contributions} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="feature" type="category" width={80} tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.05)" }}
                          contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "8px", color: "#F3F4F6" }}
                        />
                        <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                          {log.explanation.contributions.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.contribution >= 0 ? "#10B981" : "#EF4444"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function MessageRow({ log }) {
  const [expanded, setExpanded] = useState(false);
  
  let statusColor = "text-yellow-400 bg-yellow-400/10";
  if (log.status === "sent") statusColor = "text-green-400 bg-green-400/10";
  if (log.status === "failed") statusColor = "text-red-400 bg-red-400/10";
  if (log.status === "simulated") statusColor = "text-blue-400 bg-blue-400/10";

  return (
    <>
      <tr className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="p-3">
          <button aria-label="Toggle row details" className="text-gray-400 hover:text-white transition-colors">
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        </td>
        <td className="p-3 font-medium text-white uppercase">{log.channel}</td>
        <td className="p-3 text-sm text-gray-300">{log.recipient}</td>
        <td className="p-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {log.status}
          </span>
        </td>
        <td className="p-3 text-sm text-gray-300 truncate max-w-xs">{log.message_body}</td>
        <td className="p-3 text-sm text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="6" className="p-4 bg-white/[0.02] border-b border-white/5">
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">Message Body</h4>
                <div className="bg-black/30 p-3 rounded-lg text-sm text-gray-200">
                  {log.message_body}
                </div>
              </div>
              {log.provider_response && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">Provider Response</h4>
                  <pre className="bg-black/30 p-3 rounded-lg text-xs text-gray-300 overflow-x-auto">
                    {JSON.stringify(log.provider_response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function History() {
  const [tab, setTab] = useState("predictions");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  
  // Filters
  const [modelFilter, setModelFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchData();
  }, [tab, page, modelFilter, channelFilter, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === "predictions") {
        const res = await axios.get("/api/history/predictions", {
          params: { page, limit: 15, model_name: modelFilter || undefined }
        });
        setData(res.data.data);
        setTotal(res.data.total);
      } else {
        const res = await axios.get("/api/history/messages", {
          params: { page, limit: 15, channel: channelFilter || undefined, status: statusFilter || undefined }
        });
        setData(res.data.data);
        setTotal(res.data.total);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    const endpoint = tab === "predictions" 
      ? `/api/history/predictions/export${format === "pdf" ? "-pdf" : ""}`
      : `/api/history/messages/export`;
    
    let url = endpoint + "?";
    if (tab === "predictions" && modelFilter) url += `model_name=${modelFilter}&`;
    if (tab === "messages" && channelFilter) url += `channel=${channelFilter}&`;
    if (tab === "messages" && statusFilter) url += `status=${statusFilter}&`;
    
    axios.get(url, {
      responseType: 'blob'
    }).then((response) => {
      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${tab}_export.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }).catch(err => {
      console.error(err);
      toast.error(`Failed to export ${format.toUpperCase()}`);
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            System History
          </h1>
          <p className="text-gray-400 mt-1">Audit logs, predictions, and automated messaging history.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 p-1 rounded-xl backdrop-blur-sm border border-white/10">
          <button
            onClick={() => { setTab("predictions"); setPage(1); }}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              tab === "predictions" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25" : "text-gray-400 hover:text-white"
            }`}
          >
            <Activity size={16} /> Predictions
          </button>
          <button
            onClick={() => { setTab("messages"); setPage(1); }}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              tab === "messages" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25" : "text-gray-400 hover:text-white"
            }`}
          >
            <MessageSquare size={16} /> Messages
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          {tab === "predictions" ? (
            <select
              value={modelFilter}
              onChange={(e) => { setModelFilter(e.target.value); setPage(1); }}
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">All Models</option>
              <option value="salary">Salary Predictor</option>
              <option value="laptop">Laptop Pricing</option>
              <option value="mini_llm">Mini LLM</option>
            </select>
          ) : (
            <>
              <select
                value={channelFilter}
                onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}
                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">All Channels</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="simulated">Simulated</option>
              </select>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-colors border border-white/5"
          >
            <Download size={16} /> CSV
          </button>
          {tab === "predictions" && (
            <button
              onClick={() => handleExport("pdf")}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg text-sm transition-colors border border-indigo-500/30"
            >
              <FileText size={16} /> PDF
            </button>
          )}
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 text-gray-400 text-sm uppercase tracking-wider">
                <th className="p-4 w-10"></th>
                {tab === "predictions" ? (
                  <>
                    <th className="p-4 font-semibold">Model</th>
                    <th className="p-4 font-semibold">Version</th>
                    <th className="p-4 font-semibold">Input</th>
                    <th className="p-4 font-semibold">Output</th>
                    <th className="p-4 font-semibold">Timestamp</th>
                  </>
                ) : (
                  <>
                    <th className="p-4 font-semibold">Channel</th>
                    <th className="p-4 font-semibold">Recipient</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Message</th>
                    <th className="p-4 font-semibold">Timestamp</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan="6" className="p-0">
                      <SkeletonRow cols={6} />
                    </td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8">
                    <EmptyState 
                      icon={tab === "predictions" ? Activity : MessageSquare} 
                      title="No History Found" 
                      message="We couldn't find any records matching your current filters." 
                    />
                  </td>
                </tr>
              ) : (
                data.map((log) => (
                  tab === "predictions" ? <PredictionRow key={log.id} log={log} /> : <MessageRow key={log.id} log={log} />
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="p-4 bg-black/20 border-t border-white/5 flex items-center justify-between text-sm text-gray-400">
            <div>
              Showing <span className="text-white font-medium">{(page - 1) * 15 + 1}</span> to <span className="text-white font-medium">{Math.min(page * 15, total)}</span> of <span className="text-white font-medium">{total}</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button 
                disabled={page * 15 >= total} 
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
