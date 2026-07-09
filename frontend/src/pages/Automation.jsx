import { useState } from "react";
import {
  Zap, Send, Phone, MessageSquare, X, Mail, Loader2, CheckCircle2,
  Smartphone, Inbox, Trash2, HelpCircle, ShieldAlert, Sparkles
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";

export default function Automation() {
  // Mode configuration: "sandbox" (free simulation) or "live" (production keys)
  const [mode, setMode] = useState("sandbox"); // default to sandbox (free)

  // Simulation Logs state (stored in local react state for the mock devices)
  const [whatsappLogs, setWhatsappLogs] = useState([
    {
      id: 1,
      recipient: "+14155238886",
      message: "Welcome to the ML Toolbox Sandbox! Dispatched messages will appear here in real-time.",
      timestamp: "10:00 AM",
      status: "delivered"
    }
  ]);
  const [emailLogs, setEmailLogs] = useState([
    {
      id: 1,
      recipient: "user@domain.com",
      subject: "ML Toolbox Activation Confirmation",
      body: "Hello! This is a mock notification confirming your sandbox environment is fully activated and ready.",
      timestamp: "10:05 AM"
    }
  ]);
  const [selectedEmail, setSelectedEmail] = useState(emailLogs[0]);
  const [deviceTab, setDeviceTab] = useState("phone"); // "phone" (whatsapp) or "inbox" (email)

  // 1. Programmatic Twilio WhatsApp State
  const [twilioRecipient, setTwilioRecipient] = useState("");
  const [twilioMessage, setTwilioMessage] = useState("");
  const [twilioLoading, setTwilioLoading] = useState(false);

  // 2. Web-Intent WhatsApp State
  const [webPhone, setWebPhone] = useState("");
  const [webMessage, setWebMessage] = useState("");

  // 3. Twitter Intent State
  const [tweetText, setTweetText] = useState("");

  // 4. SMTP Email State
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Handlers
  const handleTwilioSubmit = async (e) => {
    e.preventDefault();
    if (!twilioRecipient.startsWith("+")) {
      toast.error("Phone number must start with + followed by country code (e.g. +1234567890)");
      return;
    }
    setTwilioLoading(true);
    try {
      const isSandbox = mode === "sandbox";
      const res = await axios.post("/api/automation/whatsapp/twilio", {
        recipient: twilioRecipient,
        message: twilioMessage,
        sandbox: isSandbox
      });

      if (res.data.status === "simulated") {
        toast.success("Sandbox: WhatsApp message queued & logged!");
        // Add to simulated phone logs
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setWhatsappLogs((prev) => [
          ...prev,
          {
            id: Date.now(),
            recipient: twilioRecipient,
            message: twilioMessage,
            timestamp: timeStr,
            status: "delivered"
          }
        ]);
        setDeviceTab("phone");
      } else {
        toast.success(`Message sent live via Twilio! (SID: ${res.data.message_sid.slice(0, 10)}...)`);
      }
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      setTwilioMessage("");
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Failed to dispatch Twilio WhatsApp";
      toast.error(errorMsg);
    } finally {
      setTwilioLoading(false);
    }
  };

  const handleWebWhatsApp = (e) => {
    e.preventDefault();
    const sanitizedPhone = webPhone.replace(/[^\d+]/g, "");
    if (!sanitizedPhone) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    const encodedMsg = encodeURIComponent(webMessage);
    const targetUrl = `https://wa.me/${sanitizedPhone}?text=${encodedMsg}`;
    window.open(targetUrl, "_blank");
    toast.success("Redirected to native WhatsApp portal!");
  };

  const handleTweetIntent = (e) => {
    e.preventDefault();
    if (tweetText.length > 280) {
      toast.error("Tweet exceeds limit of 280 characters.");
      return;
    }
    if (tweetText.trim().length === 0) {
      toast.error("Tweet cannot be empty.");
      return;
    }
    const encodedTweet = encodeURIComponent(tweetText);
    const targetUrl = `https://twitter.com/intent/tweet?text=${encodedTweet}`;
    window.open(targetUrl, "_blank");
    toast.success("Launched X (Twitter) Composer!");
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      const isSandbox = mode === "sandbox";
      const res = await axios.post("/api/automation/email/send", {
        recipient: emailTo,
        subject: emailSubject,
        body: emailBody,
        sandbox: isSandbox
      });

      if (res.data.status === "simulated") {
        toast.success("Sandbox: Simulated email generated & received!");
        // Add to simulated email logs
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newMail = {
          id: Date.now(),
          recipient: emailTo,
          subject: emailSubject,
          body: emailBody,
          timestamp: timeStr
        };
        setEmailLogs((prev) => [newMail, ...prev]);
        setSelectedEmail(newMail);
        setDeviceTab("inbox");
      } else {
        toast.success("Live Email dispatched successfully via SMTP!");
      }
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      setEmailSubject("");
      setEmailBody("");
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Email transmission failed";
      toast.error(errorMsg);
    } finally {
      setEmailLoading(false);
    }
  };

  const clearPhoneLogs = () => {
    setWhatsappLogs([]);
    toast.success("Phone sandbox chat cleared.");
  };

  const clearEmailLogs = () => {
    setEmailLogs([]);
    setSelectedEmail(null);
    toast.success("Email inbox sandbox cleared.");
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Title Block */}
      <div className="flex items-center gap-3">
        <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Automation & Telephony Studio
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Dispatch notification protocols, trigger intent redirects, or verify integration pipelines in real-time.
          </p>
        </div>
      </div>

      {/* Global Mode Switcher */}
      <div className="glass-card-light dark:glass-card-dark p-4 rounded-2xl border border-blue-200 dark:border-blue-900/30 bg-blue-500/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white">Execution Mode</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Choose between free sandbox simulation or live production credentials.
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setMode("sandbox")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              mode === "sandbox"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Simulation Sandbox (Free)
          </button>
          <button
            onClick={() => setMode("live")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              mode === "live"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Live Production API
          </button>
        </div>
      </div>

      {/* 2-Column Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* Left Side: Controllers & Input Forms */}
        <div className="xl:col-span-3 space-y-6">

          {/* Form 1: Programmatic Twilio WhatsApp */}
          <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-4 right-4 flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                mode === "sandbox"
                  ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                  : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
              }`}>
                {mode === "sandbox" ? "Sandbox Mode" : "Live API"}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold text-slate-800 dark:text-white text-xs">
                Programmatic Twilio WhatsApp
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4 max-w-md">
              Send notifications to E.164 phone numbers. Running sandboxed logs messages to the smartphone mockup instantly.
            </p>

            <form onSubmit={handleTwilioSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Recipient (E.164)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +14155238886"
                    required
                    value={twilioRecipient}
                    onChange={(e) => setTwilioRecipient(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Message Body
                  </label>
                  <input
                    type="text"
                    placeholder="Enter notification text..."
                    required
                    value={twilioMessage}
                    onChange={(e) => setTwilioMessage(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {mode === "sandbox" && (
                <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-800 dark:text-blue-300 text-[10px] leading-relaxed">
                  <strong>Offline Simulation:</strong> No real WhatsApp messages will be sent to the recipient's phone. Dispatched messages will immediately populate the <strong>Simulated Chat mockup</strong> on the right side of the screen.
                </div>
              )}

              {mode === "live" && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-slate-700 dark:text-slate-300 space-y-2 text-[10px] leading-relaxed">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[9px] text-amber-600 dark:text-amber-400">
                    <HelpCircle className="w-3.5 h-3.5 animate-pulse" />
                    Free Twilio WhatsApp Sandbox Setup Guide
                  </div>
                  <ul className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                    <li>
                      Open your <strong>Twilio Console</strong> and navigate to <strong>Messaging &gt; Try it out &gt; Send a WhatsApp Message</strong>.
                    </li>
                    <li>
                      Locate your sandbox opt-in keyword (e.g. <code>join sandbox-keyword</code>).
                    </li>
                    <li>
                      From the recipient's phone, send that keyword to the sandbox number: <strong>+1 415 523 8886</strong> via WhatsApp.
                    </li>
                    <li>
                      Ensure your <code>backend/.env</code> has <code>TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886</code> (this has been updated for you).
                    </li>
                    <li>
                      Enter the recipient number with a leading <code>+</code> and country code, then dispatch!
                    </li>
                  </ul>
                </div>
              )}

              <button
                type="submit"
                disabled={twilioLoading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {twilioLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Dispatch Twilio WhatsApp
              </button>
            </form>
          </div>

          {/* Form 2: Asynchronous SMTP Mail Client */}
          <div className="glass-card-light dark:glass-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-4 right-4 flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                mode === "sandbox"
                  ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                  : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
              }`}>
                {mode === "sandbox" ? "Sandbox Mode" : "Live SMTP"}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-rose-500" />
              <h3 className="font-semibold text-slate-800 dark:text-white text-xs">
                Asynchronous SMTP Mail Client
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4 max-w-md">
              Send formal EmailMessage payloads. Sandboxed messages will appear directly inside the mock inbox viewer.
            </p>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    placeholder="user@domain.com"
                    required
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    placeholder="Enter email subject"
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Email Content Body
                </label>
                <textarea
                  placeholder="Type message content here..."
                  required
                  rows={2}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={emailLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {emailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Dispatch SMTP Email
              </button>
            </form>
          </div>

          {/* Form 3: Web Redirects & Intent triggers (100% Free) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* WhatsApp Web Redirect */}
            <div className="glass-card-light dark:glass-card-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  <h4 className="font-semibold text-slate-800 dark:text-white text-xs">WhatsApp Direct URL Redirect</h4>
                </div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mb-4">
                  Creates custom message anchors and opens the official WhatsApp web/app interface. No API keys required.
                </p>
                <form onSubmit={handleWebWhatsApp} className="space-y-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Phone (e.g. 919876543210)"
                      required
                      value={webPhone}
                      onChange={(e) => setWebPhone(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-[11px] focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Pre-filled text message..."
                      required
                      value={webMessage}
                      onChange={(e) => setWebMessage(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-[11px] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> Launch wa.me client
                  </button>
                </form>
              </div>
            </div>

            {/* X Intent Composer */}
            <div className="glass-card-light dark:glass-card-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-sky-500" />
                    <h4 className="font-semibold text-slate-800 dark:text-white text-xs">X Intent Composer</h4>
                  </div>
                  <span className={`text-[9px] font-mono ${tweetText.length > 280 ? "text-rose-500 font-bold" : "text-slate-400"}`}>
                    {tweetText.length}/280
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mb-4">
                  Draft quick status updates matching the 280-char limit. Redirects you directly to the X tweet creator.
                </p>
                <form onSubmit={handleTweetIntent} className="space-y-3">
                  <div>
                    <textarea
                      placeholder="What's happening? (e.g. Building an ML application...)"
                      required
                      rows={2}
                      value={tweetText}
                      onChange={(e) => setTweetText(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-[11px] focus:outline-none resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={tweetText.length > 280 || tweetText.trim().length === 0}
                    className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-[10px] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                  >
                    <X className="w-3.5 h-3.5" /> Launch X Web Intent
                  </button>
                </form>
              </div>
            </div>

          </div>

        </div>

        {/* Right Side: Mock Device Emulators (Free Viewers) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="glass-card-light dark:glass-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[520px]">
            
            {/* Tabs for Devices */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <button
                onClick={() => setDeviceTab("phone")}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  deviceTab === "phone"
                    ? "bg-slate-100 dark:bg-slate-800/80 text-blue-500 border-b-2 border-blue-500"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Simulated Chat (WhatsApp)
              </button>
              <button
                onClick={() => setDeviceTab("inbox")}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  deviceTab === "inbox"
                    ? "bg-slate-100 dark:bg-slate-800/80 text-blue-500 border-b-2 border-blue-500"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
              >
                <Inbox className="w-4 h-4" />
                Simulated Mailbox
              </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-950">
              
              {/* ── DEVICE 1: SMARTPHONE CHAT SCREEN ── */}
              {deviceTab === "phone" && (
                <div className="flex flex-col h-full">
                  {/* Chat header */}
                  <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">ML</div>
                      <div>
                        <p className="font-bold text-white">ML Toolbox Bot</p>
                        <p className="text-[8px] text-emerald-500">online</p>
                      </div>
                    </div>
                    <button
                      onClick={clearPhoneLogs}
                      className="text-slate-500 hover:text-rose-400"
                      title="Clear chat logs"
                      aria-label="Clear chat logs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Chat logs */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col justify-end">
                    {whatsappLogs.length === 0 ? (
                      <div className="my-auto text-center text-slate-600 space-y-1">
                        <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
                        <p className="text-[10px] italic">No active notifications received.</p>
                      </div>
                    ) : (
                      whatsappLogs.map((log) => (
                        <div key={log.id} className="max-w-[85%] self-end bg-teal-800/60 text-slate-100 rounded-2xl rounded-tr-sm p-2.5 text-[11px] shadow-sm relative">
                          <p className="font-semibold text-[8px] text-teal-400 mb-0.5">To: {log.recipient}</p>
                          <p>{log.message}</p>
                          <div className="text-[7px] text-slate-300 text-right mt-1.5 flex items-center justify-end gap-1">
                            {log.timestamp}
                            <span className="text-sky-400">✓✓</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Mock phone bottom bar */}
                  <div className="bg-slate-900/90 p-2 border-t border-slate-800 text-[10px] text-slate-500 text-center">
                    📱 Sandbox Smartphone Simulator
                  </div>
                </div>
              )}

              {/* ── DEVICE 2: EMAIL CLIENT INBOX ── */}
              {deviceTab === "inbox" && (
                <div className="flex h-full text-slate-300">
                  {/* Sidebar (List) */}
                  <div className="w-2/5 border-r border-slate-900 flex flex-col overflow-y-auto bg-slate-900/40">
                    <div className="p-3 border-b border-slate-900 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>Inbox</span>
                      <button onClick={clearEmailLogs} className="text-slate-500 hover:text-rose-400" title="Clear inbox" aria-label="Clear inbox">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {emailLogs.length === 0 ? (
                      <div className="p-4 text-center text-slate-600 text-[10px]">
                        Inbox empty
                      </div>
                    ) : (
                      emailLogs.map((mail) => (
                        <div
                          key={mail.id}
                          onClick={() => setSelectedEmail(mail)}
                          className={`p-2.5 border-b border-slate-900/50 cursor-pointer text-left transition-colors ${
                            selectedEmail?.id === mail.id
                              ? "bg-blue-600/10 border-l-2 border-l-blue-500"
                              : "hover:bg-slate-900/25"
                          }`}
                        >
                          <p className="text-[10px] font-bold text-slate-200 truncate">{mail.recipient}</p>
                          <p className="text-[9px] font-semibold text-slate-400 truncate mt-0.5">{mail.subject}</p>
                          <p className="text-[8px] text-slate-500 truncate mt-0.5">{mail.body}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Mail Reader */}
                  <div className="flex-1 flex flex-col bg-slate-950 p-4 text-xs overflow-y-auto text-left">
                    {selectedEmail ? (
                      <div className="space-y-4">
                        <div className="border-b border-slate-900 pb-3">
                          <h4 className="font-bold text-slate-100 text-sm">{selectedEmail.subject}</h4>
                          <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                            <span>From: <strong>smtp-bot@sandbox.ml</strong></span>
                            <span>{selectedEmail.timestamp}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">To: {selectedEmail.recipient}</p>
                        </div>
                        <div className="text-[11px] leading-relaxed text-slate-300 font-mono whitespace-pre-wrap">
                          {selectedEmail.body}
                        </div>
                      </div>
                    ) : (
                      <div className="my-auto text-center text-slate-600 space-y-2">
                        <Inbox className="w-8 h-8 mx-auto opacity-30" />
                        <p className="text-[10px] italic">Select an email to read it.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
