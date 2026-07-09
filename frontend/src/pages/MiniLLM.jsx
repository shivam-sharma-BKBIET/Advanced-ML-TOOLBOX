import { useState, useEffect, useCallback } from "react";
import { Binary, Play, Loader2, Sparkles, Thermometer, RefreshCw, BrainCircuit, Database, CheckCircle2, RotateCcw, ShieldCheck, Clock, Zap, AlertTriangle } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";
import confetti from "canvas-confetti";
import { SkeletonRow } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";

// Quick helper: temperature label
function tempLabel(t) {
  if (t <= 0.4) return { text: "Focused", color: "text-blue-500" };
  if (t <= 0.8) return { text: "Balanced", color: "text-emerald-500" };
  if (t <= 1.2) return { text: "Creative", color: "text-amber-500" };
  return { text: "Wild", color: "text-rose-500" };
}

// Example prompts users can click to try
const EXAMPLE_PROMPTS = [
  "the python model is",
  "machine learning can",
  "deep learning uses neural",
  "data science and automation",
  "the lstm network generates",
  "artificial intelligence will",
  "natural language processing",
  "training a neural network",
];

export default function MiniLLM() {
  const [activeTab, setActiveTab]     = useState("simulator");
  const [prompt, setPrompt]           = useState("the python model is");
  const [maxTokens, setMaxTokens]     = useState(14);
  const [temperature, setTemperature] = useState(0.85);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);
  const [selectedStep, setSelectedStep] = useState(0);

  // --- REGISTRY STATE ---
  const [registryVersions, setRegistryVersions] = useState([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  
  const fetchVersions = useCallback(async () => {
    setRegistryLoading(true);
    try {
            const res = await axios.get(`/api/ml/models/mini_llm/versions`);
      setRegistryVersions(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to fetch model versions");
    } finally {
      setRegistryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "versions") fetchVersions();
  }, [activeTab, fetchVersions]);

  const handleSimulate = async (e) => {
    e?.preventDefault();
    if (!prompt.trim()) {
      toast.error("Please enter a prompt seed.");
      return;
    }
    setLoading(true);
    setResult(null);
    setSelectedStep(0);
    try {
      const res = await axios.post("/api/simulator/mini-llm", {
        prompt:         prompt.trim(),
        max_new_tokens: maxTokens,
        temperature:    temperature
      });
      setResult(res.data);
      toast.success("Token generation complete!");
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.6 } });
    } catch (err) {
      const detail = err.response?.data?.detail || "Deep Learning simulation failed.";
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  // Re-run with same prompt but different random seed (temperature sampling is stochastic)
  const handleRerun = () => handleSimulate();

  const step = result?.steps?.[selectedStep];
  const tl   = tempLabel(temperature);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Binary className="w-8 h-8 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Deep Learning Simulator Workspace
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Token-by-token generation via a 2-layer LSTM. Temperature sampling ensures every run is unique.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto mb-6">
        <button
          onClick={() => setActiveTab("simulator")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
            activeTab === "simulator"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Play className="w-4 h-4" />
          LSTM Generator Sandbox
        </button>
        
        <button
          onClick={() => setActiveTab("versions")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
            activeTab === "versions"
              ? "border-violet-500 text-violet-600 dark:text-violet-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Database className="w-4 h-4" />
          Model Versions
        </button>
      </div>

      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* ── LEFT PANEL: Configuration ─────────────────────────────────── */}
        <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit space-y-5">
          <h3 className="font-semibold text-slate-800 dark:text-white">Prompt Configuration</h3>

          <form onSubmit={handleSimulate} className="space-y-5">
            {/* Prompt textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Prompt Seed
              </label>
              <textarea
                placeholder="e.g. the python model is"
                required
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none resize-none font-mono"
              />
            </div>

            {/* Example chips */}
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2 font-semibold uppercase tracking-wide">
                Quick Examples
              </p>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setPrompt(ex)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all ${
                      prompt === ex
                        ? "bg-blue-500 text-white border-blue-500"
                        : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500"
                    }`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Tokens slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Max New Tokens
                </label>
                <span className="text-xs font-mono font-bold text-blue-500">{maxTokens}</span>
              </div>
              <input
                type="range" min="4" max="25" value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                <span>4 (short)</span><span>25 (long)</span>
              </div>
            </div>

            {/* Temperature slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Thermometer className="w-3 h-3" /> Temperature
                </label>
                <span className={`text-xs font-bold font-mono ${tl.color}`}>
                  {temperature.toFixed(2)} — {tl.text}
                </span>
              </div>
              <input
                type="range" min="0.1" max="1.8" step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                <span>0.1 (focused)</span>
                <span>0.8 (balanced)</span>
                <span>1.8 (wild)</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                Higher temperature = more diverse output per run. Same prompt → different result every time.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {loading ? "Generating..." : "Run LSTM Forward Pass"}
            </button>
          </form>
        </div>

        {/* ── RIGHT PANEL: Results ───────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-5">
          {/* Empty state */}
          {!result && !loading && (
            <div className="h-64 glass-card-light dark:glass-card-dark rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3">
              <Binary className="w-12 h-12 text-slate-300 dark:text-slate-700 animate-pulse" />
              <p className="text-xs text-center max-w-xs">
                Configure a prompt seed and click <strong>Run LSTM Forward Pass</strong> to begin.
                Each run with the same prompt produces a <em>different</em> result (temperature sampling).
              </p>
            </div>
          )}

          {result && (
            <>
              {/* Final output banner */}
              <div className="glass-card-light dark:glass-card-dark p-5 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    <Sparkles className="w-4 h-4" />
                    Generated Output
                  </div>
                  <button
                    onClick={handleRerun}
                    disabled={loading}
                    title="Re-run with same prompt for a different result"
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-40"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
                <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-white/40 dark:bg-slate-900/40 font-mono text-sm text-slate-800 dark:text-white leading-relaxed tracking-wide">
                  {/* Highlight: prompt in slate, generated tokens in blue */}
                  <span className="text-slate-500 dark:text-slate-400">{result.prompt} </span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    {result.steps.map((s) => s.predicted_token).join(" ")}
                  </span>
                </div>

                {/* Metadata row */}
                <div className="flex flex-wrap gap-4 text-[10px] font-mono text-slate-400">
                  <span>Tokens generated: <strong className="text-slate-600 dark:text-slate-300">{result.steps.length}</strong></span>
                  <span>Temperature: <strong className="text-slate-600 dark:text-slate-300">{temperature.toFixed(2)}</strong></span>
                  <span>Vocab size: <strong className="text-slate-600 dark:text-slate-300">150+</strong></span>
                  <span>Architecture: <strong className="text-slate-600 dark:text-slate-300">2-layer LSTM</strong></span>
                </div>
              </div>

              {/* Steps + Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Step list */}
                <div className="glass-card-light dark:glass-card-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-3 text-sm">
                    Generation Steps ({result.steps.length})
                  </h3>
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {result.steps.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedStep(idx)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-all ${
                          selectedStep === idx
                            ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold"
                            : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-900/50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-400 w-5 text-right font-mono">{idx + 1}.</span>
                          <span className="truncate w-32 font-mono text-[10px]">
                            {s.input_so_far.split(" ").slice(-3).join(" ")}…
                          </span>
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-bold font-mono text-[10px]">
                          +{s.predicted_token}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logit distribution chart */}
                {step && (
                  <div className="glass-card-light dark:glass-card-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                    <div className="mb-3">
                      <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Softmax Distribution</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Step {selectedStep + 1} — chosen token:{" "}
                        <span className="font-bold text-emerald-500 font-mono">"{step.predicted_token}"</span>
                      </p>
                    </div>
                    <div className="flex-1 min-h-[160px]">
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart
                          layout="vertical"
                          data={step.top_5}
                          margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis type="number" stroke="#888888" fontSize={9} domain={[0, 1]} />
                          <YAxis dataKey="token" type="category" stroke="#888888" fontSize={9} width={52} />
                          <Tooltip
                            formatter={(val) => [`${(val * 100).toFixed(1)}%`, "Probability"]}
                            contentStyle={{ fontSize: 11 }}
                          />
                          <Bar
                            dataKey="probability"
                            fill="#6366f1"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 text-center">
                      Top-5 candidate tokens after temperature {temperature.toFixed(2)} scaling
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {activeTab === "versions" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">MiniLLM Version History</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">LSTM model snapshots · Activate any version as the live inference engine</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={fetchVersions} disabled={registryLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                  {registryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Refresh
                </button>
                
              </div>
            </div>
          </div>

          {/* Version Table */}
          <div className="glass-card-light dark:glass-card-dark rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {registryLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonRow key={i} cols={8} />
                ))}
              </div>
            ) : registryVersions.length === 0 ? (
              <EmptyState 
                icon={Database} 
                title="No Versions Yet" 
                message="Retrain MiniLLM to create the first snapshot." 
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      {["Version", "Trained", "By", "Arch", "Epochs", "Final Loss", "File", "Status"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {registryVersions.map((v) => (
                      <tr key={v.id} className={`transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${v.is_active ? "bg-violet-50/40 dark:bg-violet-900/10" : ""}`}>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-violet-600 dark:text-violet-400">v{v.version_num}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs">{v.timestamp ? new Date(v.timestamp).toLocaleString() : "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{v.user}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-semibold">
                            {v.architecture || "LSTM"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{v.epochs}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {v.final_loss?.toFixed(4)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {v.file_exists ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full font-medium">
                              <Zap className="w-3 h-3" /> Stored
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              Pruned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {v.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30 px-2.5 py-1 rounded-full font-semibold">
                              <ShieldCheck className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="hidden"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
