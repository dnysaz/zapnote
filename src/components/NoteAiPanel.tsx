"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, CornerDownLeft, FilePlus2, Loader2, Lock, Sparkles, User, Wand2, X } from "lucide-react";
import { MarkdownView } from "@/components/MarkdownView";
import { useSettings } from "@/components/SettingsProvider";

const PRESETS: { label: string; command: string }[] = [
  {
    label: "Count numbers",
    command: "Total all the structured numbers in this note. Show the breakdown per item in a table and the final sum.",
  },
  {
    label: "Expand into mini article",
    command: "Expand the points and ideas in this note into a complete, well-structured mini article.",
  },
  {
    label: "Summarize & conclude",
    command: "Summarize the content of this note and give a clear conclusion.",
  },
];

type ChatMessage = { role: "user" | "ai"; text: string };

const DB_DEBOUNCE_MS = 1200;
const MAX_STORED = 200;

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Local, zero-cost greeting with suggestions based on quick note heuristics. */
function buildGreeting(userName: string, noteContent: string): string {
  const plain = stripHtml(noteContent);
  const namePart = userName ? `Hello **${userName}**!` : "Hello!";
  const lines = plain.split("\n").filter(Boolean);
  const hasNumbers = /\d[\d.,]*/.test(plain);
  const hasListPoints = lines.length >= 3 || /(^|\n)\s*[-*•]/.test(noteContent);
  const isLong = plain.length > 600;

  const ideas: string[] = [];
  if (hasNumbers) ideas.push("**count all the structured numbers** in this note");
  if (hasListPoints) ideas.push("**expand the points** into a mini article or research concept");
  if (isLong) ideas.push("**summarize the content** and give a conclusion");
  if (!hasNumbers && !hasListPoints && !isLong) ideas.push("**analyze the content** of this note in more depth");

  return [
    `${namePart} 👋 What would you like to discuss about this note? I'm here to help.`,
    "",
    "For example, I can:",
    ...ideas.map((idea) => `- ${idea}`),
    "",
    "Or just ask anything in the box below.",
  ].join("\n");
}

function sanitize(raw: unknown): ChatMessage[] {
  return Array.isArray(raw)
    ? (raw as { role?: unknown; text?: unknown }[])
        .filter((m) => m && typeof m.text === "string" && (m.text as string).trim() && (m.role === "user" || m.role === "ai"))
        .slice(-MAX_STORED)
        .map((m) => ({ role: m.role === "ai" ? "ai" : "user", text: String(m.text) }))
    : [];
}

function loadLocalChat(key: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return sanitize(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function NoteAiPanel({
  noteId,
  noteContent,
  canSync,
  userName,
  onClose,
  onInsert,
  onSaveAsNote,
}: {
  noteId: string | null;
  noteContent: string;
  canSync: boolean;
  userName?: string;
  onClose: () => void;
  onInsert: (markdown: string) => void;
  onSaveAsNote?: (markdown: string, messages: ChatMessage[]) => void;
}) {
  const [command, setCommand] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dbTimer = useRef<number | null>(null);

  // Per-note storage key. Unsaved notes share a "draft" key until they get an id.
  const storageKey = noteId ? `zapnote:aichat:${noteId}` : "zapnote:aichat:draft";

  // Load history: localStorage instantly, then DB if it has more.
  useEffect(() => {
    let cancelled = false;
    const local = loadLocalChat(storageKey);
    // One-time sync of persisted chat from localStorage into React state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(local);
    setError("");
    if (noteId && canSync) {
      fetch(`/api/notes/${noteId}/chat`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { messages?: unknown } | null) => {
          if (cancelled || !data) return;
          const remote = sanitize(data.messages);
          setMessages((prev) => (prev.length >= remote.length ? prev : remote));
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [storageKey, noteId, canSync]);

  // Persist: localStorage on every change, DB debounced ("pelan-pelan").
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch {
      // storage full or blocked — ignore
    }
    if (!noteId || !canSync) return;
    if (dbTimer.current) window.clearTimeout(dbTimer.current);
    const snapshot = messages;
    dbTimer.current = window.setTimeout(() => {
      void fetch(`/api/notes/${noteId}/chat`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: snapshot }),
      }).catch(() => {});
    }, DB_DEBOUNCE_MS);
    return () => {
      if (dbTimer.current) window.clearTimeout(dbTimer.current);
    };
  }, [messages, storageKey, noteId, canSync]);

  const { settings } = useSettings();
  const hasApiKey = settings.hasGeminiApiKey ?? false;

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Keep the latest message in view
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(instruction: string) {
    if (!instruction.trim() || loading) return;
    setLoading(true);
    setError("");
    setMessages((prev) => [...prev, { role: "user", text: instruction.trim() }]);
    setCommand("");
    try {
      const res = await fetch("/api/ai/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteContent,
          instruction,
          history: messages.map((m) => ({ role: m.role === "ai" ? "model" : "user", text: m.text })),
        }),
      });
      const data = (await res.json()) as { markdown?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "AI request failed.");
      setMessages((prev) => [...prev, { role: "ai", text: data.markdown || "" }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult(text: string, index: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(index);
    window.setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-[75] flex justify-end">
      <div className="absolute inset-0 bg-gray-900/25 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[440px] flex-col overflow-hidden rounded-l-[20px] border-l border-white/20 bg-white shadow-[-12px_0_40px_rgba(0,0,0,.12)]">
        <div className="flex items-center justify-between bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
              <Sparkles size={16} />
            </span>
            <div>
              <h3 className="text-[0.95rem] font-bold tracking-tight text-gray-900">AI Assistant</h3>
              <p className="text-[0.68rem] font-medium text-gray-400">Interactive chat about this note</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={() => { setMessages([]); setError(""); }} className="rounded-full px-3 py-1 text-xs font-semibold text-gray-400 hover:bg-gray-100 hover:text-gray-600">Clear</button>
            )}
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close AI panel"><X size={14} /></button>
          </div>
        </div>
        <div className="h-px bg-gray-100" />

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-[#fafafb] px-4 py-5 sm:px-5">
          <div className="flex gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm"><Wand2 size={12} /></span>
            <div className="flex-1 rounded-[18px] rounded-tl-[6px] border border-gray-100 bg-white px-4 py-3 shadow-[0_1px_6px_rgba(0,0,0,.06)]">
              <MarkdownView content={buildGreeting(userName ?? "", noteContent)} className="text-[0.84rem] leading-6 text-gray-700 [&_p]:my-1.5 [&_ul]:my-2 [&_li]:my-1 [&_li]:flex [&_li]:gap-1.5 [&_strong]:text-gray-900" />
            </div>
          </div>

          {messages.map((msg, index) =>
            msg.role === "user" ? (
              <div key={index} className="flex justify-end gap-2">
                <div className="max-w-[78%] rounded-[18px] rounded-br-[6px] bg-gradient-to-br from-violet-600 to-indigo-600 px-4 py-2.5 text-[0.84rem] leading-6 text-white shadow-md">{msg.text}</div>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white"><User size={12} /></span>
              </div>
            ) : (
              <div key={index} className="flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-violet-600 shadow-sm ring-1 ring-gray-100"><Sparkles size={12} /></span>
                <div className="flex-1 overflow-hidden rounded-[18px] rounded-tl-[6px] border border-gray-100 bg-white px-4 py-3 shadow-[0_1px_6px_rgba(0,0,0,.06)]">
                  <MarkdownView content={msg.text} className="text-[0.84rem] leading-6 text-gray-700 [&_table]:text-xs [&_table]:my-2 [&_p]:my-1.5 [&_strong]:text-gray-900" />
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-50 pt-3">
                    <button onClick={() => void copyResult(msg.text, index)} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                      <Copy size={11} />{copiedIdx === index ? "Copied ✓" : "Copy"}
                    </button>
                    <button onClick={() => onInsert(msg.text)} className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-black">
                      <CornerDownLeft size={11} />Insert
                    </button>
                    {onSaveAsNote && (
                      <button onClick={() => onSaveAsNote(msg.text, messages)} className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100">
                        <FilePlus2 size={11} />New note
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ),
          )}

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-medium text-red-600 ring-1 ring-red-100">{error}</p>}

          {loading && (
            <div className="flex gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-violet-600 shadow-sm ring-1 ring-gray-100"><Sparkles size={12} /></span>
              <div className="flex items-center gap-1.5 rounded-[18px] rounded-tl-[6px] border border-gray-100 bg-white px-5 py-4 shadow-sm">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-white px-4 py-4 sm:px-5">
          {!hasApiKey ? (
            <a href="/app/settings" className="flex items-center gap-2 rounded-2xl border border-dashed border-violet-200 bg-violet-50/70 px-4 py-3 text-xs font-semibold text-violet-600 hover:bg-violet-50">
              <Lock size={14} />Add your Gemini API key in Settings to use AI
            </a>
          ) : (
            <>
              {messages.length === 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button key={p.label} type="button" onClick={() => void send(p.command)} disabled={loading} className="rounded-full bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-black disabled:opacity-50">
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative rounded-[16px] border border-gray-200 bg-gray-50 p-2 shadow-inner focus-within:border-violet-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-100 transition-all">
                <textarea value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(command); } }} rows={2} placeholder="Ask anything about this note…" className="w-full resize-none bg-transparent px-2 py-1 pr-10 text-sm leading-6 text-gray-800 outline-none placeholder:text-gray-400" />
                <button onClick={() => void send(command)} disabled={!command.trim() || loading} className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white shadow-md hover:bg-violet-700 disabled:opacity-40" aria-label="Send">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <CornerDownLeft size={14} />}
                </button>
              </div>
              <p className="mt-2 text-center text-[0.62rem] font-medium text-gray-400">Enter to send · Shift+Enter new line</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
