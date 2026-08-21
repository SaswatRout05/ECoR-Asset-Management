/**
 * AI Assistant — RBAC-Aware Chat Interface connected to FastAPI /api/ai/chat.
 * Displays role-specific context banner (Employee restricted vs Admin global access).
 */
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import {
  Bot,
  Send,
  ChevronRight,
  Sparkles,
  Lightbulb,
  ShieldCheck,
  Lock,
  User,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const ADMIN_SUGGESTIONS = [
  'Generate a full database summary',
  'Calculate the total depreciation report for all departments',
  'List uneconomical assets with high repair ratios',
  'What is the total valuation of assets under repair?',
];

const EMPLOYEE_SUGGESTIONS = [
  'Show all assets currently assigned to me',
  'What is the current book value of my laptop and monitor?',
  'Check warranty and AMC expiry dates for my assets',
  'Which room and desk are my assets allocated to?',
];

export default function AIAssistant() {
  const { token, fullName, role, empId, isAdmin } = useAppStore();
  const isAdministrator = isAdmin() || role === 'auditor';

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: isAdministrator
        ? `👋 **Welcome Administrator (${fullName || 'Admin'})!**\n\nI have initialized your session with **Full Global Database Context**. You can ask for comprehensive cross-department summaries, macro depreciation reports, TCO/MTBF analytics, and auditor compliance overviews.`
        : `👋 **Hello ${fullName || 'Employee'}!**\n\nYour session is operating in **Restricted Employee Context** (Employee ID: \`${empId || 'ECoR-C-1001'}\`). I am authorized to answer questions, calculate straight-line depreciation, and verify warranty status **exclusively for the assets assigned in your custody**.`,
      scope: isAdministrator ? 'Global Admin' : `Employee (${empId})`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextScope, setContextScope] = useState(
    isAdministrator ? 'Global Admin Access' : `Employee Restricted (${empId || 'Current User'})`
  );
  const [scopedCount, setScopedCount] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (textToSend) => {
    const query = textToSend || input.trim();
    if (!query || loading) return;

    // Add user message
    const userMsg = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: query }),
      });

      if (!res.ok) {
        throw new Error(`Server returned error: ${res.status}`);
      }

      const data = await res.json();
      setContextScope(data.context_scope);
      setScopedCount(data.scoped_assets_count);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          scope: data.context_scope,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Connection Error:** Unable to reach AI Assistant backend. Please verify your session token or try again.\n\n*Error: ${err.message}*`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestions = isAdministrator ? ADMIN_SUGGESTIONS : EMPLOYEE_SUGGESTIONS;

  // Simple Markdown Renderer for Tables & Bold
  const renderMessageContent = (content) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          // Detect table separator row
          if (line.startsWith('|') && line.includes('---')) {
            return null;
          }
          // Detect table row
          if (line.startsWith('|') && line.endsWith('|')) {
            const cells = line.split('|').filter((c) => c.trim() !== '');
            const isHeader = idx === 0 || lines[idx - 1]?.includes('---');
            return (
              <div
                key={idx}
                className={`grid grid-cols-${cells.length} gap-2 px-2 py-1 rounded ${
                  isHeader ? 'bg-slate-800/10 font-bold text-slate-900 dark:text-white' : 'hover:bg-slate-500/5'
                }`}
                style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
              >
                {cells.map((cell, cIdx) => (
                  <span key={cIdx} className="text-xs truncate font-mono">
                    {cell.replace(/`/g, '').trim()}
                  </span>
                ))}
              </div>
            );
          }

          // Format bold text
          const formattedLine = line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-200/60 text-xs font-mono">$1</code>');

          return (
            <div
              key={idx}
              dangerouslySetInnerHTML={{ __html: formattedLine }}
              className={line.startsWith('•') || line.startsWith('-') ? 'ml-2' : ''}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto h-[calc(100vh-135px)] flex flex-col space-y-4">
      {/* Breadcrumb & Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-500 mb-1">
            <Link to="/dashboard" className="hover:text-[#1F4E79] transition-colors no-underline text-slate-500">
              Dashboard
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="text-slate-700 font-medium">AI Assistant</span>
          </nav>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>ECoR-AMP AI Assistant</span>
              <Sparkles size={18} className="text-amber-500" />
            </h1>
          </div>
        </div>

        {/* ── RBAC Security Scope Badge ── */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            isAdministrator
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {isAdministrator ? (
            <>
              <ShieldCheck size={14} className="text-purple-600" />
              <span>Context: Global Admin ({role})</span>
            </>
          ) : (
            <>
              <Lock size={14} className="text-amber-600" />
              <span>RBAC Filter: WHERE assigned_to = {empId || 'user'}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Chat Container ── */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="h-1 w-full bg-gradient-to-r from-[#7B1113] via-[#1F4E79] to-[#D4AF37]"></div>

        {/* ── Messages Area ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    msg.isError
                      ? 'bg-red-500 text-white'
                      : 'bg-gradient-to-br from-[#1F4E79] to-[#2E86C1] text-white'
                  }`}
                >
                  {msg.isError ? <AlertCircle size={18} /> : <Bot size={18} />}
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl p-4 shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-[#1F4E79] text-white rounded-br-sm'
                    : msg.isError
                    ? 'bg-red-50 border border-red-200 text-red-800 rounded-bl-sm'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <div className="text-sm">{msg.content}</div>
                ) : (
                  renderMessageContent(msg.content)
                )}

                {msg.scope && msg.role === 'assistant' && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Scope: {msg.scope}</span>
                    <span>ECoR-AMP Engine</span>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-900 font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                  {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-slate-500 text-xs">
              <div className="w-9 h-9 rounded-xl bg-[#1F4E79] text-white flex items-center justify-center shadow-sm">
                <Bot size={18} />
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <Loader2 size={14} className="animate-spin text-[#1F4E79]" />
                <span>
                  {isAdministrator
                    ? 'Querying global asset database & computing cross-department metrics…'
                    : `Filtering database for assigned assets (WHERE assigned_to = ${empId || 'user'})…`}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Prompt Suggestions Chips ── */}
        <div className="px-6 py-2.5 bg-slate-50/70 border-t border-slate-100 flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            <Lightbulb size={12} className="text-amber-500" />
            <span>Suggested:</span>
          </div>
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => sendMessage(s)}
              disabled={loading}
              className="px-3 py-1 bg-white border border-slate-200 hover:border-[#1F4E79]/40 hover:bg-[#1F4E79]/5 rounded-lg text-xs text-slate-600 hover:text-[#1F4E79] transition-all cursor-pointer shadow-2xs truncate max-w-xs"
            >
              {s}
            </button>
          ))}
        </div>

        {/* ── Input Box ── */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder={
                isAdministrator
                  ? 'Ask global queries: "Generate full summary", "Depreciation report for all departments"…'
                  : 'Ask about your assigned assets: "List my laptops", "My depreciation and book value"…'
              }
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79] transition-all disabled:opacity-60"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="px-5 py-2.5 rounded-xl bg-[#1F4E79] text-white hover:bg-[#163B5C] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold text-sm flex items-center gap-1.5 shadow-sm"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
