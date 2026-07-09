import { useState, useEffect, useCallback } from "react";
import { 
  Bot,
  BrainCircuit, 
  DollarSign, 
  FileText, 
  Lightbulb, 
  Laptop, 
  Smile, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Upload, 
  Loader2,
  RefreshCw,
  Sparkles,
  Database,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Clock,
  Target,
  UserCheck,
  Zap,
  AlertTriangle,
  Info
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  LineChart, 
  Line, 
  Legend,
  Cell
} from "recharts";
import confetti from "canvas-confetti";

const friendlyNames = {
  experience: "Experience (Yrs)",
  education: "Education Level",
  skill_score: "Skill Score",
  company_size: "Company Size",
  ram: "RAM (GB)",
  storage: "Storage (GB)",
  weight: "Weight (kg)",
  screen_size: "Screen Size (in)",
  processor_speed: "CPU Speed (GHz)"
};

export default function MachineLearning() {
  const [activeTab, setActiveTab] = useState("salary");

  // --- REGISTRY STATE ---
  const [registryModel, setRegistryModel] = useState("salary");
  const [registryVersions, setRegistryVersions] = useState([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  
  const fetchVersions = useCallback(async (modelName) => {
    setRegistryLoading(true);
    try {
            const res = await axios.get(`/api/ml/models/${modelName}/versions`);
      setRegistryVersions(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to fetch model versions");
    } finally {
      setRegistryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "registry") fetchVersions(registryModel);
  }, [activeTab, registryModel, fetchVersions]);

  
  // --- 1. SALARY STATE ---
  const [salaryForm, setSalaryForm] = useState({ experience: 2, education: "Bachelors", skill_score: 70, company_size: "Medium" });
  const [salaryList, setSalaryList] = useState([]);
  const [salaryPredictions, setSalaryPredictions] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryExplanation, setSalaryExplanation] = useState(null);
  const [salaryShapLoading, setSalaryShapLoading] = useState(false);

  const addSalaryCandidate = () => {
    setSalaryList([...salaryList, { ...salaryForm, id: Date.now() }]);
    toast.success("Candidate added to batch list.");
  };

  const removeSalaryCandidate = (id) => {
    setSalaryList(salaryList.filter(c => c.id !== id));
  };

  const predictSalaries = async () => {
    if (salaryList.length === 0) {
      toast.error("Please add at least one candidate first.");
      return;
    }
    setSalaryLoading(true);
    setSalaryExplanation(null);
    setSalaryShapLoading(true);
    try {
      const payload = salaryList.map(({ experience, education, skill_score, company_size }) => ({
        experience: parseInt(experience),
        education,
        skill_score: parseInt(skill_score),
        company_size
      }));
      // Step 1: Immediate fast prediction without SHAP
      const res = await axios.post("/api/ml/predict-salary", { payload, include_explanation: false });
      const preds = res.data.predictions;
      
      const updatedList = salaryList.map((cand, idx) => ({
        ...cand,
        predicted: preds[idx]
      }));
      setSalaryPredictions(updatedList);
      toast.success("Batch salary predictions complete!");
      confetti({ particleCount: 50 });
      setSalaryLoading(false);

      // Step 2: Background SHAP evaluation for the first candidate
      try {
        const shapRes = await axios.post("/api/ml/predict-salary", { payload, include_explanation: true });
        if (shapRes.data.explanation) {
          setSalaryExplanation(shapRes.data.explanation);
        }
      } catch (errShap) {
        console.error("Salary SHAP background compute failed:", errShap);
      } finally {
        setSalaryShapLoading(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Salary prediction failed");
      setSalaryLoading(false);
      setSalaryShapLoading(false);
    }
  };

  // --- 2. RESUME STATE ---
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setResumeFile(file);
    setResumeLoading(true);
    setResumeData(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("/api/ml/analyze-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResumeData(res.data);
      toast.success("Resume parsed successfully!");
      confetti({ particleCount: 60 });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Resume parsing failed");
    } finally {
      setResumeLoading(false);
    }
  };

  // --- 3. ELECTRICITY STATE ---
  const [electForm, setElectForm] = useState({ date: "", usage_kwh: "", cost: "" });
  const [electHistory, setElectHistory] = useState([
    { date: "2026-06-01", usage_kwh: 120, cost: 24.5 },
    { date: "2026-06-02", usage_kwh: 135, cost: 27.2 },
    { date: "2026-06-03", usage_kwh: 115, cost: 23.0 },
    { date: "2026-06-04", usage_kwh: 140, cost: 29.8 },
    { date: "2026-06-05", usage_kwh: 130, cost: 26.0 },
  ]);
  const [electForecast, setElectForecast] = useState([]);
  const [electLoading, setElectLoading] = useState(false);

  const addElectReading = (e) => {
    e.preventDefault();
    if (!electForm.date || !electForm.usage_kwh || !electForm.cost) {
      toast.error("Please fill in all reading fields.");
      return;
    }
    const newReading = {
      date: electForm.date,
      usage_kwh: parseFloat(electForm.usage_kwh),
      cost: parseFloat(electForm.cost)
    };
    setElectHistory([...electHistory, newReading].sort((a, b) => a.date.localeCompare(b.date)));
    setElectForm({ date: "", usage_kwh: "", cost: "" });
    toast.success("Electricity reading added.");
  };

  const deleteElectReading = (idx) => {
    setElectHistory(electHistory.filter((_, i) => i !== idx));
  };

  const getElectricityForecast = async () => {
    if (electHistory.length < 5) {
      toast.error("At least 5 historical readings are required to train the forecaster.");
      return;
    }
    setElectLoading(true);
    try {
      const res = await axios.post("/api/ml/forecast-electricity", { history: electHistory });
      setElectForecast(res.data.forecast);
      toast.success("30-Day forecast generated successfully!");
      confetti({ particleCount: 50 });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Forecasting failed");
    } finally {
      setElectLoading(false);
    }
  };

  // --- 4. LAPTOP STATE ---
  const [laptopSpecs, setLaptopSpecs] = useState({ ram: 16, storage: 512, weight: 1.8, screen_size: 15.6, processor_speed: 3.2 });
  const [laptopPrice, setLaptopPrice] = useState(null);
  const [laptopLoading, setLaptopLoading] = useState(false);
  const [laptopExplanation, setLaptopExplanation] = useState(null);
  const [laptopShapLoading, setLaptopShapLoading] = useState(false);

  const handleLaptopPredict = async (e) => {
    e.preventDefault();
    setLaptopLoading(true);
    setLaptopPrice(null);
    setLaptopExplanation(null);
    setLaptopShapLoading(true);
    try {
      // Step 1: Immediate fast prediction without SHAP
      const res = await axios.post("/api/ml/predict-laptop", { ...laptopSpecs, include_explanation: false });
      setLaptopPrice(res.data.predicted_price);
      toast.success("Laptop evaluation complete.");
      confetti({ particleCount: 30 });
      setLaptopLoading(false);

      // Step 2: Background SHAP evaluation
      try {
        const shapRes = await axios.post("/api/ml/predict-laptop", { ...laptopSpecs, include_explanation: true });
        if (shapRes.data.explanation) {
          setLaptopExplanation(shapRes.data.explanation);
        }
      } catch (errShap) {
        console.error("Laptop SHAP background compute failed:", errShap);
      } finally {
        setLaptopShapLoading(false);
      }
    } catch (err) {
      toast.error("Price estimation failed");
      setLaptopLoading(false);
      setLaptopShapLoading(false);
    }
  };

  // --- 5. SENTIMENT STATE ---
  const [sentimentText, setSentimentText] = useState("");
  const [sentimentResult, setSentimentResult] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);

  const handleSentimentCheck = async (e) => {
    e.preventDefault();
    if (!sentimentText.trim()) return;
    setSentimentLoading(true);
    try {
      const res = await axios.post("/api/ml/analyze-sentiment", { text: sentimentText });
      setSentimentResult(res.data);
      toast.success("Text sentiment analyzed.");
    } catch (err) {
      toast.error("Sentiment analysis failed");
    } finally {
      setSentimentLoading(false);
    }
  };


  // --- BATCH PREDICT STATE ---
  const [batchFile, setBatchFile] = useState(null);
  const [batchModel, setBatchModel] = useState("salary");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchJobId, setBatchJobId] = useState(null);
  const [batchStatus, setBatchStatus] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  
  const handleBatchUpload = (e) => {
    const file = e.target.files[0];
    if (file) setBatchFile(file);
  };

  const runBatchPrediction = async () => {
    if (!batchFile) return toast.error("Please select a CSV file first");
    setBatchLoading(true);
    setBatchResults(null);
    setBatchStatus("Uploading and validating...");
    
    const formData = new FormData();
    formData.append("file", batchFile);
    
    try {
            const res = await axios.post(`/api/ml/${batchModel}/predict-batch`, formData, {
        headers: { 
          "Content-Type": "multipart/form-data" 
        }
      });
      
      const data = res.data;
      if (data.status === "completed") {
        setBatchStatus("completed");
        setBatchResults(data);
        toast.success("Batch prediction completed successfully!");
      } else if (data.status === "processing") {
        setBatchJobId(data.job_id);
        setBatchStatus("processing");
        toast.success("Large batch queued for background processing");
        pollBatchStatus(data.job_id);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Batch prediction failed");
      setBatchStatus("failed");
    } finally {
      setBatchLoading(false);
    }
  };

  const pollBatchStatus = async (jobId) => {
        let polling = true;
    while (polling) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await axios.get(`/api/ml/batch-jobs/${jobId}`);
        setBatchStatus(res.data.status);
        if (res.data.status === "completed") {
          polling = false;
          toast.success("Background batch job completed!");
          // Fetch results? Actually just show a link to export.
          setBatchResults({ job_id: jobId, status: "completed", row_count: res.data.row_count });
        } else if (res.data.status === "failed") {
          polling = false;
          toast.error("Background batch job failed: " + res.data.error_detail);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const downloadBatchResults = () => {
        const id = batchResults?.job_id || batchJobId;
    if (!id) return;
    window.location.href = `/api/ml/batch-jobs/${id}/export`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title */}
      <div className="flex items-center gap-3">
        <BrainCircuit className="w-8 h-8 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Machine Learning Predictors
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Execute batch regressions, file analysis, time-series projections, and NLP classifiers.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
        {[
          { id: "salary", label: "Salary Regressor", icon: DollarSign },
          { id: "resume", label: "AI Resume Parser", icon: FileText },
          { id: "electricity", label: "Electricity Tracker", icon: Lightbulb },
          { id: "laptop", label: "Laptop Pricing", icon: Laptop },
          { id: "sentiment", label: "Sentiment Analyzer", icon: Smile },
          { id: "batch", label: "Batch Predict", icon: Upload },
                    { id: "registry", label: "Model Registry", icon: Database },
        ].map(tab => {
          const Icon = tab.icon;
        
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${tab.id === 'batch' ? 'tour-batch ' : ''}${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENTS */}
      <div className="pt-2">
        
        {/* --- BATCH PREDICT TAB --- */}
        {activeTab === "batch" && (
          <div className="space-y-6">
            <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Run Batch Prediction</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Upload a CSV file to process multiple predictions at once using vectorized processing.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Target Model</label>
                  <select 
                    value={batchModel} 
                    onChange={(e) => setBatchModel(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-4"
                  >
                    <option value="salary">Salary Regressor (experience, education, skill_score, company_size)</option>
                    <option value="laptop">Laptop Pricing (ram, storage, weight, screen_size, processor_speed)</option>
                  </select>

                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Upload CSV</label>
                  <input type="file" accept=".csv" onChange={handleBatchUpload} className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400 mb-6" />
                  
                  <button onClick={runBatchPrediction} disabled={batchLoading || !batchFile} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                    {batchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Run Batch Prediction
                  </button>
                </div>

                <div>
                  {batchStatus && (
                    <div className={`p-4 rounded-xl border ${batchStatus === "completed" ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900" : batchStatus === "failed" ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900" : "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-900"}`}>
                      <h3 className="font-semibold text-sm mb-1">Job Status: {batchStatus.toUpperCase()}</h3>
                      {batchStatus === "processing" && <p className="text-xs flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Background task is processing the large batch...</p>}
                      {batchStatus === "completed" && (
                        <div className="mt-4">
                          <button onClick={downloadBatchResults} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all">
                            <FileText className="w-3 h-3" /> Download Results CSV
                          </button>
                          {batchResults?.predictions && (
                            <p className="text-xs mt-3 text-emerald-600 dark:text-emerald-400">Processed {batchResults.predictions.length} rows successfully. Expand SHAP explanations dynamically below.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {batchResults?.predictions && (
               <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto max-h-96 overflow-y-auto">
                 <h3 className="font-semibold text-sm mb-4">Sample Results Preview (Top Rows)</h3>
                 <table className="w-full text-xs text-left">
                   <thead>
                     <tr className="border-b border-slate-200 dark:border-slate-800">
                       <th className="py-2 px-2">Row #</th>
                       <th className="py-2 px-2">Prediction</th>
                       <th className="py-2 px-2">SHAP Computed</th>
                     </tr>
                   </thead>
                   <tbody>
                     {batchResults.predictions.slice(0, 50).map((row, idx) => (
                       <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/50">
                         <td className="py-2 px-2">{idx + 1}</td>
                         <td className="py-2 px-2 font-mono font-bold text-blue-600 dark:text-blue-400">{row.prediction.toFixed(2)}</td>
                         <td className="py-2 px-2">{row.explanation ? <span className="text-emerald-500 font-semibold">Yes</span> : <span className="text-slate-400">No</span>}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            )}
          </div>
        )}

        {/* --- 1. SALARY TAB --- */}
        {activeTab === "salary" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Input Form */}
            <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Add Candidate</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Years of Experience ({salaryForm.experience} yrs)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={salaryForm.experience}
                    onChange={(e) => setSalaryForm({ ...salaryForm, experience: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Education Level
                  </label>
                  <select
                    value={salaryForm.education}
                    onChange={(e) => setSalaryForm({ ...salaryForm, education: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-sm"
                  >
                    <option value="Bachelors">Bachelors</option>
                    <option value="Masters">Masters</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Skill Score ({salaryForm.skill_score} / 100)
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={salaryForm.skill_score}
                    onChange={(e) => setSalaryForm({ ...salaryForm, skill_score: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Company Size
                  </label>
                  <select
                    value={salaryForm.company_size}
                    onChange={(e) => setSalaryForm({ ...salaryForm, company_size: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-sm"
                  >
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                  </select>
                </div>
                <button
                  onClick={addSalaryCandidate}
                  className="w-full py-2.5 rounded-xl border border-dashed border-blue-500 text-blue-500 hover:bg-blue-500/10 text-sm font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Candidate
                </button>
              </div>
            </div>

            {/* Candidate List & Predict */}
            <div className="xl:col-span-2 space-y-6">
              <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-800 dark:text-white">Batch Candidate Pipeline</h3>
                  {salaryList.length > 0 && (
                    <button
                      onClick={predictSalaries}
                      disabled={salaryLoading}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      {salaryLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                      Predict Salaries ({salaryList.length})
                    </button>
                  )}
                </div>

                {salaryList.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                    No candidates in the list. Add some using the sidebar form.
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                          <th className="pb-2">Exp (Yrs)</th>
                          <th className="pb-2">Education</th>
                          <th className="pb-2">Skill Rating</th>
                          <th className="pb-2">Company Size</th>
                          <th className="pb-2">Predicted Salary</th>
                          <th className="pb-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(salaryPredictions.length > 0 ? salaryPredictions : salaryList).map((cand, idx) => (
                          <tr key={cand.id} className="border-b border-slate-100 dark:border-slate-900/50 text-slate-700 dark:text-slate-300">
                            <td className="py-2.5 font-mono">{cand.experience}</td>
                            <td className="py-2.5">{cand.education}</td>
                            <td className="py-2.5 font-mono">{cand.skill_score}%</td>
                            <td className="py-2.5">{cand.company_size}</td>
                            <td className="py-2.5 font-semibold text-emerald-500">
                              {cand.predicted ? `₹${cand.predicted.toLocaleString(undefined, {maximumFractionDigits:0})}` : "—"}
                            </td>
                            <td className="py-2.5 text-right">
                              <button onClick={() => removeSalaryCandidate(cand.id)} className="text-rose-500 hover:text-rose-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Bar Chart Visualization */}
              {salaryPredictions.length > 0 && (
                <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-64">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Predicted Salary Distribution comparison</h4>
                  <div className="w-full h-full pb-4">
                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart data={salaryPredictions.map((c, i) => ({ name: `Cand ${i+1}`, Salary: Math.round(c.predicted) }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="name" stroke="#888888" fontSize={10} />
                        <YAxis stroke="#888888" fontSize={10} />
                        <Tooltip />
                        <Bar dataKey="Salary" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* SHAP explanation */}
              {(salaryShapLoading || salaryExplanation) && (
                <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-white">
                        Why this prediction: Feature Impact Breakdown (Candidate 1)
                      </h4>
                      <div className="group relative cursor-help">
                        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 animate-pulse" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-slate-900/95 text-white text-[11px] p-3 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 leading-relaxed border border-slate-700">
                          SHAP values explain the difference between the model's baseline average prediction (the base value) and the final prediction. Green bars show features that increased the prediction, while red bars show features that decreased it. Longer bars = bigger impact.
                        </div>
                      </div>
                    </div>
                    {salaryExplanation && (
                      <span className="text-[10px] font-mono text-slate-400">
                        Base Value: ₹{Math.round(salaryExplanation.base_value).toLocaleString()}
                      </span>
                    )}

                      <button 
                        onClick={() => window.dispatchEvent(new CustomEvent("open-ai-chat-with-context", { detail: { text: "Can you explain this salary prediction result in plain language?", context: salaryExplanation } }))}
                        className="ml-auto text-xs px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Bot className="w-3.5 h-3.5" /> Explain this in plain language
                      </button>

                  </div>

                  {salaryShapLoading ? (
                    <div className="animate-pulse space-y-4 py-4">
                      <div className="h-3 bg-slate-200 dark:bg-slate-755 rounded w-1/4"></div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-4">
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded col-span-1"></div>
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded col-span-3"></div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded col-span-1"></div>
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded col-span-3"></div>
                        </div>
                      </div>
                    </div>
                  ) : salaryExplanation?.error ? (
                    <p className="text-xs text-rose-500 font-mono py-2">{salaryExplanation.error}</p>
                  ) : (
                    <div className="w-full h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={salaryExplanation.contributions.map(c => ({
                            name: friendlyNames[c.feature] || c.feature,
                            val: c.contribution
                          }))}
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis type="number" stroke="#888888" fontSize={9} />
                          <YAxis dataKey="name" type="category" stroke="#888888" fontSize={9} width={100} />
                          <Tooltip formatter={(value) => [`₹${Math.round(value).toLocaleString()}`, "Contribution"]} />
                          <Bar dataKey="val">
                            {salaryExplanation.contributions.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.contribution >= 0 ? "#10b981" : "#ef4444"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- 2. RESUME TAB --- */}
        {activeTab === "resume" && (
          <div className="space-y-6">
            <div className="glass-card-light dark:glass-card-dark p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto text-blue-500">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-white">Upload Resume PDF</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Detects 80+ skills via exact keyword matching. Extracts experience, education & seniority level automatically.
                  </p>
                </div>
                <div className="pt-2">
                  <label className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors">
                    {resumeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {resumeLoading ? "Analyzing..." : "Choose PDF File"}
                    <input type="file" accept=".pdf" onChange={handleResumeUpload} className="hidden" />
                  </label>
                </div>
                {resumeFile && (
                  <p className="text-[11px] text-slate-500 font-mono">
                    Selected: {resumeFile.name} ({(resumeFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>

            {/* Results */}
            {resumeData && (
              <div className="space-y-6">

                {/* ── AI Summary Bar ── */}
                <div className="glass-card-light dark:glass-card-dark p-5 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-500/5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-4">
                    <BrainCircuit className="w-4 h-4" /> AI Resume Summary — {resumeData.filename}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      { label: "Skills Found",   value: resumeData.matched_skills.length,                                                   color: "text-emerald-500" },
                      { label: "Skill Coverage", value: `${resumeData.skill_coverage ?? 0}%`,                                              color: "text-blue-500" },
                      { label: "Experience",     value: resumeData.experience_years > 0 ? `${resumeData.experience_years} yr` : "N/A",    color: "text-amber-500" },
                      { label: "Education",      value: resumeData.education ?? "N/A",                                                     color: "text-purple-500" },
                      { label: "Level",          value: resumeData.level ?? "Unknown",                                                     color: "text-rose-500" },
                      { label: "Word Count",     value: (resumeData.word_count ?? resumeData.text_length).toLocaleString(),                color: "text-slate-500" },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center">
                        <div className={`text-lg font-extrabold font-mono ${stat.color}`}>{stat.value}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* WordCloud */}
                  <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white mb-2">Resume Keyword Cloud</h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                        Visual frequency map of keywords extracted from your actual resume content.
                      </p>
                      {resumeData.wordcloud_base64 ? (
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center p-2">
                          <img
                            src={`data:image/png;base64,${resumeData.wordcloud_base64}`}
                            alt="Resume WordCloud"
                            className="w-full h-auto max-h-56 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-44 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center text-xs text-slate-400">
                          Wordcloud not available
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <span>File: {resumeData.filename}</span>
                      <span>{resumeData.text_length} chars</span>
                    </div>
                  </div>

                  {/* Skill Matrix */}
                  <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                    {/* Matched Skills */}
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white mb-2">
                        Detected Skills <span className="text-emerald-500">({resumeData.matched_skills.length})</span>
                      </h3>
                      {resumeData.matched_skills.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          No skills found. Ensure your PDF has selectable text (not a scanned image). Try copy-pasting text from the PDF to verify.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
                          {resumeData.matched_skills.map((s, i) => (
                            <span
                              key={i}
                              title={`Mentioned ${s.mentions ?? 1}x in resume — confidence ${s.score}%`}
                              className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-900/50 cursor-default"
                            >
                              {s.skill}
                              <span className="ml-1 opacity-55 font-mono text-[10px]">×{s.mentions ?? 1}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Skill Gaps */}
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white mb-1">
                        Skill Gaps <span className="text-rose-400">({resumeData.missing_skills.length})</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-3">
                        Skills not found in your resume. Add relevant ones to strengthen your profile.
                      </p>
                      <div className="max-h-40 overflow-y-auto pr-1 space-y-1.5">
                        {resumeData.missing_skills.slice(0, 15).map((s, i) => (
                          <div key={i} className="flex items-center gap-3 text-xs">
                            <span className="w-28 text-slate-600 dark:text-slate-400 font-medium truncate">{s.skill}</span>
                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-400/50 rounded-full" style={{ width: "100%" }} />
                            </div>
                            <span className="text-[9px] text-rose-400 font-mono">Not Found</span>
                          </div>
                        ))}
                        {resumeData.missing_skills.length > 15 && (
                          <p className="text-[10px] text-slate-400 text-center pt-1">
                            +{resumeData.missing_skills.length - 15} more gaps not shown
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 3. AI Smart Insights (Gemini) ── */}
                {resumeData.is_ai_powered && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Recommended Jobs */}
                    <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/40 shadow-sm bg-indigo-50/30 dark:bg-indigo-900/10">
                      <h3 className="font-semibold text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4" /> Recommended Roles
                      </h3>
                      <ul className="space-y-2">
                        {(resumeData.recommended_jobs || []).map((job, idx) => (
                          <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                            <span className="text-indigo-500 mt-1">•</span>
                            {job}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Skills to Learn */}
                    <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-amber-200 dark:border-amber-900/40 shadow-sm bg-amber-50/30 dark:bg-amber-900/10">
                      <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4" /> Skills to Learn
                      </h3>
                      <ul className="space-y-2">
                        {(resumeData.skills_to_learn || []).map((skill, idx) => (
                          <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                            <span className="text-amber-500 mt-1">•</span>
                            {skill}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* AI Feedback */}
                    <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm bg-emerald-50/30 dark:bg-emerald-900/10 md:col-span-3">
                      <h3 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                        <UserCheck className="w-4 h-4" /> Recruiter Feedback
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {resumeData.ai_feedback}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- 3. ELECTRICITY TAB --- */}
        {activeTab === "electricity" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Input logs form */}
            <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Add Log Reading</h3>
              <form onSubmit={addElectReading} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Reading Date
                  </label>
                  <input
                    type="date"
                    required
                    value={electForm.date}
                    onChange={(e) => setElectForm({ ...electForm, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Usage (kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 120.5"
                    required
                    value={electForm.usage_kwh}
                    onChange={(e) => setElectForm({ ...electForm, usage_kwh: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Log Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 24.50"
                    required
                    value={electForm.cost}
                    onChange={(e) => setElectForm({ ...electForm, cost: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1 hover:opacity-95 transition-opacity"
                >
                  <Plus className="w-4 h-4" /> Add Record
                </button>
              </form>
            </div>

            {/* List & Plotting area */}
            <div className="xl:col-span-2 space-y-6">
              <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-800 dark:text-white">Historical logs ({electHistory.length})</h3>
                  {electHistory.length >= 5 && (
                    <button
                      onClick={getElectricityForecast}
                      disabled={electLoading}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {electLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      Generate 30-Day Forecast
                    </button>
                  )}
                </div>

                {electHistory.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                    No readings added.
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                          <th className="pb-2">Date</th>
                          <th className="pb-2">Usage (kWh)</th>
                          <th className="pb-2">Cost (₹)</th>
                          <th className="pb-2 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {electHistory.map((reading, idx) => (
                          <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/50 text-slate-700 dark:text-slate-300">
                            <td className="py-2.5 font-mono">{reading.date}</td>
                            <td className="py-2.5 font-mono">{reading.usage_kwh} kWh</td>
                            <td className="py-2.5 font-semibold text-slate-800 dark:text-white">₹{reading.cost.toFixed(2)}</td>
                            <td className="py-2.5 text-right">
                              <button onClick={() => deleteElectReading(idx)} className="text-rose-500 hover:text-rose-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Cost Forecast visualization panel */}
              {electForecast.length > 0 && (
                <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-72">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                    30-Day Electricity Projections: Usage & Cost Load Map
                  </h4>
                  <div className="w-full h-full pb-8">
                    <ResponsiveContainer width="100%" height="90%">
                      <LineChart
                        data={[
                          ...electHistory.map(h => ({ date: h.date, HistoricalCost: h.cost, ForecastedCost: null })),
                          ...electForecast.map(f => ({ date: f.date, HistoricalCost: null, ForecastedCost: f.predicted_cost }))
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="date" stroke="#888888" fontSize={9} />
                        <YAxis stroke="#888888" fontSize={9} />
                        <Tooltip />
                        <Legend verticalAlign="top" height={24} iconSize={10} fontSize={10} />
                        <Line type="monotone" dataKey="HistoricalCost" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Historical Cost (₹)" />
                        <Line type="monotone" dataKey="ForecastedCost" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Forecasted Cost (₹)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- 4. LAPTOP TAB --- */}
        {activeTab === "laptop" && (
          <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Input Specs */}
            <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Laptop hardware Specs</h3>
              <form onSubmit={handleLaptopPredict} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    System RAM (GB)
                  </label>
                  <select
                    value={laptopSpecs.ram}
                    onChange={(e) => setLaptopSpecs({ ...laptopSpecs, ram: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-sm"
                  >
                    {[4, 8, 12, 16, 24, 32, 64, 128].map(r => (
                      <option key={r} value={r}>{r} GB</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Storage Capacity (GB)
                  </label>
                  <select
                    value={laptopSpecs.storage}
                    onChange={(e) => setLaptopSpecs({ ...laptopSpecs, storage: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-sm"
                  >
                    {[128, 256, 512, 1024, 2048, 4096].map(s => (
                      <option key={s} value={s}>{s >= 1024 ? `${s/1024} TB` : `${s} GB`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Processor Clock (GHz)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    required
                    value={laptopSpecs.processor_speed}
                    onChange={(e) => setLaptopSpecs({ ...laptopSpecs, processor_speed: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Chassis Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="5.0"
                    required
                    value={laptopSpecs.weight}
                    onChange={(e) => setLaptopSpecs({ ...laptopSpecs, weight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Display Diagonal (Inches)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="10.0"
                    max="20.0"
                    required
                    value={laptopSpecs.screen_size}
                    onChange={(e) => setLaptopSpecs({ ...laptopSpecs, screen_size: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={laptopLoading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1 hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  {laptopLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Laptop className="w-4 h-4" />}
                  Evaluate System Value
                </button>
              </form>
            </div>

            {/* Price Outputs Column */}
            <div className="space-y-6">
              <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center text-center">
                <h3 className="text-slate-400 dark:text-slate-500 text-sm font-medium">Estimated Pricing Output</h3>
                {laptopPrice !== null ? (
                  <div className="mt-4 space-y-2">
                    <div className="text-4xl font-extrabold text-emerald-500 font-mono">
                      ₹{laptopPrice.toFixed(2)}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      RandomForestRegressor model output derived from synthetic dataset baseline weights.
                    </p>
                  </div>
                ) : (
                  <div className="text-slate-400 dark:text-slate-600 text-xs mt-4">
                    Input system hardware details and click evaluate to isolate predicted valuations.
                  </div>
                )}
              </div>

              {/* SHAP explanation */}
              {(laptopShapLoading || laptopExplanation) && (
                <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-white">
                        Why this prediction: Feature Impact Breakdown
                      </h4>
                      <div className="group relative cursor-help">
                        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 animate-pulse" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-slate-900/95 text-white text-[11px] p-3 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 leading-relaxed border border-slate-700">
                          SHAP values explain the difference between the model's baseline average prediction (the base value) and the final prediction. Green bars show features that increased the prediction, while red bars show features that decreased it. Longer bars = bigger impact.
                        </div>
                      </div>
                    </div>
                    {laptopExplanation && (
                      <span className="text-[10px] font-mono text-slate-400">
                        Base Value: ₹{Math.round(laptopExplanation.base_value).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {laptopShapLoading ? (
                    <div className="animate-pulse space-y-4 py-4">
                      <div className="h-3 bg-slate-200 dark:bg-slate-755 rounded w-1/4"></div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-4">
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded col-span-1"></div>
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded col-span-3"></div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded col-span-1"></div>
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded col-span-3"></div>
                        </div>
                      </div>
                    </div>
                  ) : laptopExplanation?.error ? (
                    <p className="text-xs text-rose-500 font-mono py-2">{laptopExplanation.error}</p>
                  ) : (
                    <div className="w-full h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={laptopExplanation.contributions.map(c => ({
                            name: friendlyNames[c.feature] || c.feature,
                            val: c.contribution
                          }))}
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis type="number" stroke="#888888" fontSize={9} />
                          <YAxis dataKey="name" type="category" stroke="#888888" fontSize={9} width={100} />
                          <Tooltip formatter={(value) => [`₹${Math.round(value).toLocaleString()}`, "Contribution"]} />
                          <Bar dataKey="val">
                            {laptopExplanation.contributions.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.contribution >= 0 ? "#10b981" : "#ef4444"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- 5. SENTIMENT TAB --- */}
        {activeTab === "sentiment" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-2">NLP Text Sentiment analyzer</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                Calculates textual polarity scores and subjectivity indicators dynamically using TextBlob models.
              </p>
              <form onSubmit={handleSentimentCheck} className="space-y-4">
                <textarea
                  placeholder="Enter custom sentence or content to evaluate..."
                  required
                  rows={4}
                  value={sentimentText}
                  onChange={(e) => setSentimentText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
                <button
                  type="submit"
                  disabled={sentimentLoading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1 hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  {sentimentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smile className="w-4 h-4" />}
                  Analyze Sentiment
                </button>
              </form>
            </div>

            {/* Results Panel */}
            {sentimentResult && (
              <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-slate-800 dark:text-white">Analysis details</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    sentimentResult.sentiment_label.includes("Highly Positive")
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50"
                      : sentimentResult.sentiment_label.includes("Positive")
                      ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200 dark:border-green-900/50"
                      : sentimentResult.sentiment_label.includes("Neutral")
                      ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      : sentimentResult.sentiment_label.includes("Highly Negative")
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50"
                  }`}>
                    {sentimentResult.sentiment_label}
                  </span>
                </div>

                {/* Score bars */}
                <div className="space-y-4">
                  {/* Polarity Slider scale */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500">Polarity Score (Negative to Positive)</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{sentimentResult.polarity}</span>
                    </div>
                    <div className="relative h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      {/* Midline anchor */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 dark:bg-slate-700 z-10"></div>
                      {/* Colored metric segment */}
                      <div 
                        className={`absolute h-full ${sentimentResult.polarity >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                        style={{
                          left: sentimentResult.polarity >= 0 ? "50%" : `${50 + sentimentResult.polarity * 50}%`,
                          width: `${Math.abs(sentimentResult.polarity) * 50}%`
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>-1.0 (Negative)</span>
                      <span>0.0 (Neutral)</span>
                      <span>1.0 (Positive)</span>
                    </div>
                  </div>

                  {/* Subjectivity */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Subjectivity Score (Objective vs Subjective)</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{sentimentResult.subjectivity}</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${sentimentResult.subjectivity * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>0.0 (Objective Facts)</span>
                      <span>1.0 (Personal Opinion)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- 7. MODEL REGISTRY TAB --- */}
        {activeTab === "registry" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Model Version Registry</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Immutable versioned snapshots · Activate or roll back safely</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={registryModel}
                    onChange={(e) => { setRegistryModel(e.target.value); setRegistryVersions([]); }}
                    className="px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-sm"
                  >
                    <option value="salary">Salary Regressor</option>
                    <option value="laptop">Laptop Pricing</option>
                    <option value="mini_llm">MiniLLM LSTM</option>
                  </select>
                  <button onClick={() => fetchVersions(registryModel)} disabled={registryLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                    {registryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Refresh
                  </button>
                  
                </div>
              </div>
            </div>

            {/* Version Table */}
            <div className="glass-card-light dark:glass-card-dark rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              {registryLoading ? (
                <div className="flex items-center justify-center py-20 gap-3">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  <span className="text-slate-500 dark:text-slate-400 text-sm">Loading versions...</span>
                </div>
              ) : registryVersions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <Database className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No versions found. Train a model first.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        {["Version", "Trained", "By", "Epochs", "Final Loss", "Score", "Metric", "File", "Status"].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {registryVersions.map((v) => (
                        <tr key={v.id} className={`transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${v.is_active ? "bg-emerald-50/40 dark:bg-emerald-900/10" : ""}`}>
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">v{v.version_num}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span className="text-xs">{v.timestamp ? new Date(v.timestamp).toLocaleString() : "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{v.user}</td>
                          <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{v.epochs}</td>
                          <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{v.final_loss?.toFixed(4)}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {v.final_score?.toFixed(4)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[120px] truncate">{v.metric_name}</td>
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
                              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full font-semibold">
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

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Database, color: "indigo", title: "Immutable Snapshots", desc: "Every training run creates a versioned file. Old versions are never overwritten." },
                { icon: ShieldCheck, color: "emerald", title: "Safe Activation", desc: "Swap the active model atomically. The in-memory registry and DB flag update together." },
                { icon: RotateCcw, color: "amber", title: "One-Click Rollback", desc: "Instantly revert to the previous version if a new model degrades performance." },
              ].map(({ icon: Icon, color, title, desc }) => (
                <div key={title} className={`glass-card-light dark:glass-card-dark p-5 rounded-2xl border border-${color}-200/50 dark:border-${color}-800/30 shadow-sm`}>
                  <div className={`w-9 h-9 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
                  </div>
                  <h4 className="font-semibold text-slate-800 dark:text-white text-sm mb-1">{title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
