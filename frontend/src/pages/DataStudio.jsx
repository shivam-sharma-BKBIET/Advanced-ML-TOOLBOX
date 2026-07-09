import React, { useState, useEffect } from "react";
import {
  Sliders, Upload, Download, Loader2, Database, Table, Plus, Trash2,
  CheckCircle2, Info, Sparkles, AlertCircle, RefreshCw, Grid, Layers, Zap, ArrowRight, FileText
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

export default function DataStudio() {
  const [activeTab, setActiveTab] = useState("cleaning");

  // Flow State
  const [session, setSession] = useState(null);
  const [analyzeData, setAnalyzeData] = useState(null);
  
  const [uploadLoading, setUploadLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [transformLoading, setTransformLoading] = useState(false);

  // Transform Options
  const [dedupStrategy, setDedupStrategy] = useState("none");
  const [imputeStrategy, setImputeStrategy] = useState("mean");
  
  const [dateCol, setDateCol] = useState("");
  const [ratioNum, setRatioNum] = useState("");
  const [ratioDen, setRatioDen] = useState("");
  const [binCol, setBinCol] = useState("");
  const [binMethod, setBinMethod] = useState("auto");
  const [binCount, setBinCount] = useState(5);
  
  const [targetCol, setTargetCol] = useState("");

  const [samples, setSamples] = useState([]);
  const [samplesLoading, setSamplesLoading] = useState(false);

  useEffect(() => {
    const fetchSamples = async () => {
      setSamplesLoading(true);
      try {
        const res = await axios.get("/api/samples");
        setSamples(res.data);
      } catch(err) {
        console.error("Failed to fetch samples", err);
      } finally {
        setSamplesLoading(false);
      }
    };
    fetchSamples();
  }, []);

  const handleSampleLoad = async (sampleId) => {
    setUploadLoading(true);
    try {
      // 1. Download the sample
      const res = await axios.get(`/api/samples/${sampleId}/download`, { responseType: 'blob' });
      const blob = res.data;
      
      // 2. Wrap in File object
      const file = new File([blob], sampleId, { type: "text/csv" });
      
      // 3. Upload to backend cache
      const formData = new FormData();
      formData.append("file", file);
      
      const uploadRes = await axios.post("/api/studio/upload", formData);
      setSession(uploadRes.data.session_id);
      toast.success("Sample dataset loaded successfully!");
      fetchAnalysis(uploadRes.data.session_id);
    } catch (err) {
      toast.error("Failed to load sample dataset");
      setUploadLoading(false);
    }
  };


  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await axios.post("/api/studio/upload", formData);
      setSession(res.data.session_id);
      toast.success("File uploaded to session cache.");
      fetchAnalysis(res.data.session_id);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
      setUploadLoading(false);
    }
  };

  const fetchAnalysis = async (sid = session, target = targetCol) => {
    if (!sid) return;
    setAnalyzeLoading(true);
    try {
      let url = `/api/studio/${sid}/analyze`;
      if (target) url += `?target_column=${target}`;
      const res = await axios.get(url);
      setAnalyzeData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Analysis failed");
    } finally {
      setAnalyzeLoading(false);
      setUploadLoading(false);
    }
  };

  const handleTransform = async () => {
    if (!session) return;
    setTransformLoading(true);
    
    const payload = {
      dedup_strategy: dedupStrategy !== "none" ? dedupStrategy : null,
      impute_strategy: imputeStrategy,
      date_extract_col: dateCol || null,
      ratio_num_col: ratioNum || null,
      ratio_den_col: ratioDen || null,
      bin_col: binCol || null,
      bin_method: binMethod || null,
      bin_count: binCount
    };
    
    try {
      await axios.post(`/api/studio/${session}/transform`, payload);
      toast.success("Transformations applied successfully!");
      // Reset inputs
      setDedupStrategy("none");
      setDateCol("");
      setRatioNum("");
      setRatioDen("");
      setBinCol("");
      await fetchAnalysis(); // refresh preview and stats
    } catch (err) {
      toast.error(err.response?.data?.detail || "Transformation failed");
    } finally {
      setTransformLoading(false);
    }
  };

  const handleTargetChange = (e) => {
    const val = e.target.value;
    setTargetCol(val);
    if (session) fetchAnalysis(session, val);
  };

  const resetAll = () => {
    setSession(null);
    setAnalyzeData(null);
    setTargetCol("");
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex items-center gap-3">
        <Sliders className="w-8 h-8 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Data Studio Extended</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upload CSV/XLSX/JSON, run deduplication, feature engineering, and view Data Quality Scores.
          </p>
        </div>
      </div>

      {!session ? (
        
        <div className="flex flex-col items-center">
          <div className="glass-card-light dark:glass-card-dark p-12 rounded-2xl border-2 border-dashed border-blue-500/50 flex flex-col items-center justify-center text-center hover:bg-blue-500/5 transition-colors w-full max-w-2xl mx-auto">
            <Upload className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Upload Dataset</h3>
            <p className="text-sm text-slate-500 mb-6">Supported formats: CSV, XLSX, JSON (Max 5MB)</p>
            <label className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-lg shadow-blue-500/20">
              {uploadLoading ? "Loading..." : "Select File"}
              <input type="file" accept=".csv,.xlsx,.json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          
          <div className="mt-8 w-full">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">OR TRY A SAMPLE DATASET</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
            </div>
            
            {samplesLoading ? (
               <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {samples.map(sample => (
                  <div key={sample.id} className="glass-card-light dark:glass-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-colors flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1 truncate">{sample.name}</h4>
                      <p className="text-[10px] text-slate-500 mb-3 line-clamp-2">{sample.description}</p>
                      <div className="flex gap-2 text-[10px] font-mono text-slate-400 mb-4">
                        <span>{sample.row_count} rows</span>
                        <span>&bull;</span>
                        <span>{sample.col_count} cols</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSampleLoad(sample.id)}
                      disabled={uploadLoading}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors"
                    >
                      Load Sample
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between glass-card-light dark:glass-card-dark p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-500" />
              <span className="font-mono text-sm font-bold text-slate-800 dark:text-white">Active Session: {analyzeData?.filename || "Loading..."}</span>
            </div>
            <div className="flex gap-3">
              <a href={`/api/studio/${session}/export-training`} download className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-2">
                <Download className="w-4 h-4" /> Export Cleaned CSV
              </a>
              <button onClick={resetAll} className="px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-bold rounded-lg">
                Close Session
              </button>
            </div>
          </div>
          
          <p className="text-xs text-slate-500 italic">Use this file with the training CLI script to retrain a model — this app does not train models automatically.</p>

          {analyzeLoading || !analyzeData ? (
             <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Quality Score Card */}
              <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border-l-4 border-l-blue-500">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-500"/> Data Quality Score</h3>
                <div className="flex items-end gap-2 mb-4">
                  <span className={`text-5xl font-black ${analyzeData.quality_score.overall_score > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {analyzeData.quality_score.overall_score}
                  </span>
                  <span className="text-slate-500 font-bold mb-1">/ 100</span>
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{analyzeData.quality_score.summary}</p>
                <div className="space-y-2 text-xs font-medium text-slate-500">
                  <div className="flex justify-between"><span>Completeness:</span> <span>{analyzeData.quality_score.completeness}%</span></div>
                  <div className="flex justify-between"><span>Uniqueness:</span> <span>{analyzeData.quality_score.uniqueness}%</span></div>
                  <div className="flex justify-between"><span>Consistency:</span> <span>{analyzeData.quality_score.consistency}%</span></div>
                  <div className="flex justify-between"><span>Outliers (Healthy):</span> <span>{analyzeData.quality_score.outliers}%</span></div>
                </div>
              </div>

              {/* Transformation Config Panel */}
              <div className="lg:col-span-2 glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Zap className="w-4 h-4 text-indigo-500"/> Feature Engineering & Cleaning</h3>
                  <button onClick={handleTransform} disabled={transformLoading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-2">
                    {transformLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Apply Transformations"}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dedup & Impute */}
                  <div className="space-y-4 border-r border-slate-200 dark:border-slate-700 pr-6">
                    <div>
                      <label className="block text-xs font-bold mb-1">Handle Duplicates ({analyzeData.duplicates.exact_duplicates} exact, {analyzeData.duplicates.near_duplicates} near)</label>
                      <select value={dedupStrategy} onChange={e=>setDedupStrategy(e.target.value)} className="w-full text-xs p-2 rounded border bg-slate-50 dark:bg-slate-900">
                        <option value="none">Do Nothing</option>
                        <option value="keep_first">Keep First</option>
                        <option value="keep_last">Keep Last</option>
                        <option value="drop">Drop All</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Missing Value Imputation</label>
                      <select value={imputeStrategy} onChange={e=>setImputeStrategy(e.target.value)} className="w-full text-xs p-2 rounded border bg-slate-50 dark:bg-slate-900">
                        <option value="mean">Mean (Numeric)</option>
                        <option value="median">Median (Numeric)</option>
                        <option value="most_frequent">Most Frequent</option>
                        <option value="knn">KNN</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-purple-500">Target Column (Imbalance Check)</label>
                      <select value={targetCol} onChange={handleTargetChange} className="w-full text-xs p-2 rounded border bg-slate-50 dark:bg-slate-900">
                        <option value="">None</option>
                        {analyzeData.columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {analyzeData.imbalance && (
                        <div className={`mt-2 p-2 rounded text-[10px] font-bold ${analyzeData.imbalance.is_imbalanced ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          {analyzeData.imbalance.message}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Feat Eng */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold mb-1 text-slate-500">Extract Date Features (Yr, Mo, Day)</label>
                      <select value={dateCol} onChange={e=>setDateCol(e.target.value)} className="w-full text-xs p-1.5 rounded border bg-slate-50 dark:bg-slate-900">
                        <option value="">Select Date Column</option>
                        {analyzeData.columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-1 text-slate-500">Create Ratio (Num / Denom)</label>
                      <div className="flex gap-2">
                        <select value={ratioNum} onChange={e=>setRatioNum(e.target.value)} className="w-1/2 text-[10px] p-1.5 rounded border bg-slate-50 dark:bg-slate-900">
                           <option value="">Numerator</option>
                           {analyzeData.columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={ratioDen} onChange={e=>setRatioDen(e.target.value)} className="w-1/2 text-[10px] p-1.5 rounded border bg-slate-50 dark:bg-slate-900">
                           <option value="">Denominator</option>
                           {analyzeData.columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-1 text-slate-500">Binning (Categorize Numeric)</label>
                      <div className="flex gap-2">
                        <select value={binCol} onChange={e=>setBinCol(e.target.value)} className="w-1/3 text-[10px] p-1.5 rounded border bg-slate-50 dark:bg-slate-900">
                           <option value="">Column</option>
                           {analyzeData.columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={binMethod} onChange={e=>setBinMethod(e.target.value)} className="w-1/3 text-[10px] p-1.5 rounded border bg-slate-50 dark:bg-slate-900">
                           <option value="auto">Equal-width</option>
                           <option value="quantile">Quantile</option>
                        </select>
                        <input type="number" min="2" max="20" value={binCount} onChange={e=>setBinCount(Number(e.target.value))} className="w-1/3 text-[10px] p-1.5 rounded border bg-slate-50 dark:bg-slate-900" title="Bin Count" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="lg:col-span-3 glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4">Live Dataset Preview ({analyzeData.row_count} rows, {analyzeData.col_count} columns)</h3>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 z-10 shadow-sm">
                      <tr>
                        {analyzeData.columns.map(c => (
                          <th key={c} className="p-2 font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {c} {c.includes("_per_") || c.includes("_binned") || c.includes("_year") ? "🔧" : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analyzeData.preview.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          {analyzeData.columns.map(col => (
                            <td key={col} className={`p-2 whitespace-nowrap ${row[col] === null ? "text-amber-500 font-bold italic" : ""}`}>
                              {row[col] === null ? "NaN" : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
            </div>
          )}
        </div>
      )}
    </div>
  );
}
