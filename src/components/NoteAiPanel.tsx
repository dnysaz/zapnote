"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, CornerDownLeft, FilePlus2, Loader2, Lock, Sparkles, X } from "lucide-react";
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
      <div className="crm-fade-in absolute inset-0 bg-(--crm-dark)/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="crm-slide-in relative flex h-full w-full max-w-[480px] flex-col border-l border-(--crm-border) bg-(--crm-panel) shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--crm-border) px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--crm-primary) text-white shadow-sm">
              <Sparkles size={15} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-(--crm-fg)">AI Assistant</h3>
              <p className="text-[0.69rem] text-(--crm-muted)">Interactive chat about this note</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); setError(""); }}
                className="mr-1 rounded-lg px-2 py-1 text-[0.69rem] font-semibold text-(--crm-muted) transition-colors hover:bg-(--crm-hover) hover:text-(--crm-fg)"
                title="Clear conversation"
              >
                Clear
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-1 text-(--crm-muted) hover:bg-(--crm-hover)" aria-label="Close AI panel"><X size={16} /></button>
          </div>
        </div>

        {/* Conversation */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {/* AI always greets first */}
          <div className="flex justify-start">
            <div className="w-full max-w-[95%] rounded-2xl rounded-bl-sm border border-(--crm-border) bg-(--crm-surface) px-3.5 py-3 shadow-sm">
              <MarkdownView
                content={buildGreeting(userName ?? "", noteContent)}
                className="text-sm [&_p]:my-1.5 [&_ul]:my-2 [&_li]:my-0.5"
              />
            </div>
          </div>

          {messages.map((msg, index) =>
            msg.role === "user" ? (
              <div key={index} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-(--crm-primary) px-3.5 py-2 text-xs leading-5 text-white shadow-sm">{msg.text}</div>
              </div>
            ) : (
              <div key={index} className="flex justify-start">
                <div className="w-full max-w-[95%] overflow-x-auto rounded-2xl rounded-bl-sm border border-(--crm-border) bg-(--crm-surface) px-3.5 py-3">
                  <MarkdownView content={msg.text} className="text-sm [&_table]:text-xs [&_table]:my-2 [&_p]:my-1.5" />
                  <div className="mt-2 flex gap-1.5 border-t border-(--crm-border-soft) pt-2">
                    <button onClick={() => void copyResult(msg.text, index)} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.63rem] font-semibold text-(--crm-secondary) hover:bg-(--crm-hover)">
                      <Copy size={11} />{copiedIdx === index ? "Copied" : "Copy"}
                    </button>
                    <button onClick={() => onInsert(msg.text)} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.63rem] font-semibold text-(--crm-brand) hover:bg-(--crm-hover)">
                      <CornerDownLeft size={11} />Insert to note
                    </button>
                    {onSaveAsNote && (
                      <button onClick={() => onSaveAsNote(msg.text, messages)} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.63rem] font-semibold text-(--crm-brand) hover:bg-(--crm-hover)">
                        <FilePlus2 size={11} />New note
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ),
          )}

          {error && (
            <p className="rounded-xl bg-(--crm-danger-bg) px-4 py-3 text-xs font-medium text-(--crm-danger)">{error}</p>
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-(--crm-border) bg-(--crm-surface) px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--crm-mid)" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-(--crm-border) px-5 py-4">
          {!hasApiKey ? (
            <a href="/app/settings" className="flex items-center gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50 px-4 py-3 text-xs font-semibold text-violet-500 transition-colors hover:bg-violet-100">
              <Lock size={14} />
              Add your Gemini API key in Settings to use AI features.
            </a>
          ) : (
            <>
              {messages.length === 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => void send(p.command)}
                      disabled={loading}
                      className="rounded-full border border-(--crm-border-input) bg-(--crm-surface) px-3 py-1.5 text-xs font-semibold text-(--crm-secondary) transition-colors hover:bg-(--crm-hover) disabled:opacity-60"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative">
                <textarea
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(command);
                    }
                  }}
                  rows={2}
                  placeholder="Ask anything about this note… (Enter to send, Shift+Enter for new line)"
                  className="w-full resize-none rounded-xl border border-(--crm-border-input) bg-(--crm-surface) px-3 py-2 pr-11 text-sm leading-6 text-(--crm-fg) outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-focus-border) focus:ring-2 focus:ring-(--crm-focus-ring)"
                />
                <button
                  onClick={() => void send(command)}
                  disabled={!command.trim() || loading}
                  className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-(--crm-primary) text-white shadow-sm transition-all hover:bg-(--crm-dark) disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send message"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <CornerDownLeft size={13} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
