import { Zap, BrainCircuit, Sliders, Binary, ArrowRight, ShieldCheck, Cpu, Database } from "lucide-react";
import { motion } from "framer-motion";

import CountUp from 'react-countup';
import axios from 'axios';

import LiveUsageStats from "../components/LiveUsageStats";
import AnimatedNumber from "../components/AnimatedNumber";
import DriftDashboard from "../components/DriftDashboard";

export default function Dashboard({ setActivePage }) {
  const cards = [
    {
      id: "automation",
      title: "Automation & Telephony",
      desc: "Dispatch automated WhatsApp notices via Twilio, trigger wa.me browser redirection shortcuts, compose Tweets, or send SMTP TLS emails.",
      icon: Zap,
      color: "from-blue-500 to-indigo-600",
      accent: "text-blue-500 bg-blue-500/10"
    },
    {
      id: "ml",
      title: "Machine Learning Predictors",
      desc: "Train inline salary predictors, parse PDF resumes using FuzzyWuzzy skill mapping, model electricity loads, evaluate laptops, and check sentiments.",
      icon: BrainCircuit,
      color: "from-indigo-500 to-violet-600",
      accent: "text-indigo-500 bg-indigo-500/10"
    },
    {
      id: "studio",
      title: "Data Imputation & Studio",
      desc: "Upload CSV matrices to fill missing rows using row drops, SimpleImputers (mean, median, mode), or KNN regressions. Analyze OHE intercepts.",
      icon: Sliders,
      color: "from-violet-500 to-fuchsia-600",
      accent: "text-violet-500 bg-violet-500/10"
    },
    {
      id: "llm",
      title: "LLM Sequence Simulator",
      desc: "Inject seeds into a PyTorch LSTM sequence estimator, predict outputs token-by-token, and inspect softmax logit charts.",
      icon: Binary,
      color: "from-fuchsia-500 to-pink-600",
      accent: "text-fuchsia-500 bg-fuchsia-500/10"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-10"
    >
      {/* Hero Welcome banner */}
      <motion.div variants={itemVariants} className="tour-dashboard relative rounded-[2rem] overflow-hidden border border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl p-10 flex items-center justify-between shadow-2xl shadow-blue-500/5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10 dark:from-blue-500/5 dark:to-indigo-500/5 pointer-events-none"></div>
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/20 dark:bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 -mb-10 w-48 h-48 bg-indigo-500/20 dark:bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none"></div>

        <div className="space-y-4 max-w-2xl z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-white leading-tight tracking-tight">
            Welcome to <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent drop-shadow-sm inline-block">ML toolbox</span>
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            A secure full-stack dashboard decoupling advanced ML pipelines, PyTorch sequence generators, and programmatic communications from visual presentations.
          </p>
        </div>
      </motion.div>

      {/* Live Usage Stats */}
      <motion.div variants={itemVariants}>
        <LiveUsageStats />
      </motion.div>

      {/* Quick overview metrics - Bento style */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Predictive Models", val: 5, suffix: " Active", icon: Cpu, desc: "Salary, laptop, electricity, sentiment, LLM", accent: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
          { label: "Imputation Methods", val: 5, suffix: " Cleaners", icon: Database, desc: "Mean, median, mode, KNN, row drop", accent: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
          { label: "Core Security", val: 100, suffix: "% HTTPS", icon: ShieldCheck, desc: "Absolute exception catch-blocks", accent: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" }
        ].map((met, idx) => {
          const Icon = met.icon;
          return (
            <motion.div variants={itemVariants} key={idx} className="glass-card p-6 flex flex-col gap-5 hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-2xl ${met.bg} flex items-center justify-center ${met.accent} border border-white/50 dark:border-white/5 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest block mb-1">{met.label}</span>
                <span className="text-2xl font-extrabold text-slate-800 dark:text-white block tracking-tight flex items-center">
                  <AnimatedNumber value={met.val} suffix={met.suffix} />
                </span>
              </div>
              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5">
                <span className="text-[12px] text-slate-500 dark:text-slate-400 block font-medium leading-relaxed">{met.desc}</span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Feature cards Grid */}
      <motion.div variants={containerVariants} className="space-y-6">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-2">Explore Utilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <motion.div 
                variants={itemVariants}
                key={c.id} 
                className="glass-card p-8 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${c.accent} shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 border border-white/20 dark:border-white/5`}>
                      <Icon className="w-7 h-7 drop-shadow-sm" />
                    </div>
                    <span className="text-xs px-3 py-1 font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Active Module</span>
                  </div>
                  <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-3 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{c.title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8 font-medium">{c.desc}</p>
                </div>
                <button
                  onClick={() => setActivePage(c.id)}
                  className="w-full py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-all border border-slate-200/50 dark:border-white/5 group-hover:border-blue-500/30 dark:group-hover:border-blue-400/30 group-hover:shadow-md"
                >
                  Configure Module <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Model Drift Health */}
      <DriftDashboard />
    </motion.div>
  );
}
