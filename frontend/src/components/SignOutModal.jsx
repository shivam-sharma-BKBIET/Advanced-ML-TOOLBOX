import { useEffect } from "react";
import { LogOut, AlertTriangle } from "lucide-react";

export default function SignOutModal({ onConfirm, onCancel }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ESC to cancel
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/50 dark:border-white/10 overflow-hidden">

        {/* Icon Area */}
        <div className="flex flex-col items-center pt-8 pb-5 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-4">
            <LogOut className="w-8 h-8 text-rose-600 dark:text-rose-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Sign Out?</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Are you sure you want to sign out of the ML Toolbox? Your session will be ended.
          </p>

          {/* Warning Note */}
          <div className="mt-4 flex items-start gap-2 text-left px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-500/20 rounded-2xl w-full">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Any unsaved model runs or experiments may be lost.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-2xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-2xl text-sm font-semibold bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md hover:shadow-lg hover:shadow-rose-500/25 hover:-translate-y-0.5 transition-all"
          >
            Yes, Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
