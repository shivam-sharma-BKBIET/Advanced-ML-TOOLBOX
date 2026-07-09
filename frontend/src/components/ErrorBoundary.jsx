import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100 font-sans">
          <div className="absolute inset-0 bg-radial-gradient from-violet-900/20 via-transparent to-transparent pointer-events-none" />
          <div className="relative w-full max-w-md p-8 rounded-2xl border border-rose-500/20 bg-slate-900/60 backdrop-blur-xl shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Something went wrong
            </h1>
            
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              An unexpected application error has occurred. We have logged this error and are looking into it.
            </p>

            {this.state.error && (
              <div className="mb-6 p-4 rounded-lg bg-rose-950/20 border border-rose-500/10 text-left">
                <span className="text-xs font-mono text-rose-300 block overflow-auto max-h-24 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </span>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
