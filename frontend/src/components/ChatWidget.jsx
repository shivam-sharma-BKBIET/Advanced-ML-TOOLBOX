import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2, Minimize2, Maximize2 } from "lucide-react";
import axios from "axios";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, role: "assistant", content: "Hi! I'm your AI Assistant (Gemini Flash). How can I help you with the ML Toolbox today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Listen for context injections from other components
  useEffect(() => {
    const handleContextInjection = (e) => {
      const { text, context } = e.detail;
      setIsOpen(true);
      sendMessage(text, context);
    };

    window.addEventListener("open-ai-chat-with-context", handleContextInjection);
    return () => window.removeEventListener("open-ai-chat-with-context", handleContextInjection);
  }, []);

  const sendMessage = async (messageText, context = null) => {
    if (!messageText.trim()) return;

    const newMsg = { id: Date.now(), role: "user", content: messageText };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setIsLoading(true);

    try {
            const payload = { message: messageText };
      if (context) payload.context = context;

      const res = await axios.post("/api/assistant/chat", payload);

      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "assistant", content: res.data.response, isError: !res.data.is_success }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "assistant", content: "Sorry, I couldn't connect to the server right now.", isError: true }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="tour-assistant fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform z-50 animate-bounce"
        title="Chat with AI Assistant"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${isExpanded ? "w-[450px] h-[600px]" : "w-[350px] h-[500px]"}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">AI Assistant</span>
            <span className="text-[10px] text-blue-100">Powered by Gemini (Free Tier)</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300" : "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"}`}>
              {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[75%] px-4 py-2.5 text-sm rounded-2xl whitespace-pre-wrap ${m.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : m.isError ? "bg-red-50 text-red-600 dark:bg-red-900/20 rounded-tl-sm border border-red-100 dark:border-red-900/50" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-sm border border-slate-200 dark:border-slate-700 shadow-sm"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-700 shadow-sm flex gap-1">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Info */}
      <div className="bg-slate-100 dark:bg-slate-950 px-3 py-1.5 border-t border-slate-200 dark:border-slate-800 text-center">
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          Usage is rate-limited to keep the assistant free.
        </span>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your data..."
            className="w-full pl-4 pr-12 py-3 bg-slate-100 dark:bg-slate-800 text-sm rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
