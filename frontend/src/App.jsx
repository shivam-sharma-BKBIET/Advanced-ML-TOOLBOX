import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import Automation from "./pages/Automation";
import MachineLearning from "./pages/MachineLearning";
import DataStudio from "./pages/DataStudio";
import MiniLLM from "./pages/MiniLLM";
import History from "./pages/History";
import toast, { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import ChatWidget from "./components/ChatWidget";
import OnboardingTour from './components/OnboardingTour';

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour) {
      setTimeout(() => setRunTour(true), 1000);
    }
  }, []);

  // Sync tailwind class list with darkMode state
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  }, [darkMode]);

  // Page Routing logic matrix
  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard setActivePage={setActivePage} />;
      case "automation":
        return <Automation />;
      case "ml":
        return <MachineLearning />;
      case "studio":
        return <DataStudio />;
      case "llm":
        return <MiniLLM />;
      case "history":
        return <History />;
      default:
        return <Dashboard setActivePage={setActivePage} />;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 text-slate-900 dark:text-slate-100 ${darkMode ? 'bg-mesh-dark' : 'bg-mesh-light'}`}>
      {/* Toast Notification Provider */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: darkMode ? "#1e293b" : "#ffffff",
            color: darkMode ? "#f8fafc" : "#0f172a",
            border: darkMode ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)",
            fontSize: "13px",
            borderRadius: "12px"
          }
        }} 
      />

      <>
          {/* Shared Fixed Sidebar Navigation */}
          <Sidebar 
            activePage={activePage} 
            setActivePage={(page) => {
              setActivePage(page);
              setIsMobileMenuOpen(false); // Close mobile menu on navigate
            }} 
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />

          {/* Main Page Layout Wrapper */}
          <div className="md:pl-64 flex flex-col min-h-screen transition-all duration-300">
            {/* Shared Top Navigation Header */}
            <Header 
              darkMode={darkMode} 
              setDarkMode={setDarkMode} 
              
              
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              setRunTour={setRunTour}
            />

            {/* Dynamic Inner Page Content view */}
            <main className="flex-1 mt-16 p-4 md:p-8 max-w-7xl w-full mx-auto overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePage}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="w-full h-full"
                >
                  {renderPage()}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
          
          {/* Mobile Overlay */}
          {isMobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
          
          <OnboardingTour run={runTour} setRun={setRunTour} />
          <ChatWidget />
        </>
    </div>
  );
}
