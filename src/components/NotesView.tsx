"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  StickyNote,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { NotesShell } from "@/components/NotesShell";
import { useNotes } from "@/components/UnifiedNotesProvider";
import { useAuth } from "@/components/AuthProvider";
import { useSettings } from "@/components/SettingsProvider";
import { ConfirmModal } from "@/components/ConfirmModal";
import { NoteShareModal } from "@/components/NoteShareModal";
import { NoteAiPanel } from "@/components/NoteAiPanel";
import { EditorToolbar, EditorStatusBar, codeLangForExt } from "@/components/EditorToolbar";
import { CodeWorkspace } from "@/components/CodeWorkspace";
import type { Note, NoteActionItem, CodeFile } from "@/lib/crm";
import { formatDate, uid, parseCodeFiles, serializeCodeFiles } from "@/lib/crm";
import { markdownToHtml } from "@/lib/markdown";

const DRAFT_KEY = "zapnote:draft";
const GUEST_DRAFT_KEY = "zapnote:draft:guest";
const CODE_DRAFT_KEY = "zapnote:draft:code";
const GUEST_CODE_DRAFT_KEY = "zapnote:draft:code:guest";
const FS_KEY = "zapnote:fullscreen";

type NoteDraft = {
  id: string | null;
  title: string;
  content: string;
  kind?: "rich" | "code";
  language?: string;
  codeFiles?: CodeFile[];
  activeFile?: number;
};

function readDraft(key: string): NoteDraft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as NoteDraft;
    if (draft && typeof draft.title === "string" && typeof draft.content === "string") return draft;
    return null;
  } catch {
    return null;
  }
}

function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // storage blocked — ignore
  }
}

function toPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

// Convert legacy plain-text content (\n line breaks) into HTML block elements
// so old notes render as separate lines inside the contentEditable editor.
function toHtmlBlocks(html: string): string {
  if (/<\/?[a-z][\s\S]*>/i.test(html)) return html;
  if (!html.trim()) return "";
  return html
    .split(/\r?\n/)
    .map((line) => `<div>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}</div>`)
    .join("");
}

function snippet(note: Note): string {
  if (note.kind === "code") {
    const files = parseCodeFiles(note.content);
    const text = files && files.length ? files[0].content : note.content;
    return text.length > 160 ? `${text.slice(0, 160)}…` : text;
  }
  const text = toPlainText(note.content);
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
}

const CODE_EXT_COLORS: Record<string, { bg: string; fg: string }> = {
  php: { bg: "#777BB3", fg: "#ffffff" },
  ts: { bg: "#3178C6", fg: "#ffffff" },
  tsx: { bg: "#3178C6", fg: "#ffffff" },
  js: { bg: "#F0DB4F", fg: "#323330" },
  jsx: { bg: "#F0DB4F", fg: "#323330" },
  py: { bg: "#3776AB", fg: "#ffffff" },
  html: { bg: "#E34F26", fg: "#ffffff" },
  htm: { bg: "#E34F26", fg: "#ffffff" },
  css: { bg: "#1572B6", fg: "#ffffff" },
  json: { bg: "#F2C200", fg: "#323330" },
  xml: { bg: "#8A9B0F", fg: "#ffffff" },
  java: { bg: "#E76F00", fg: "#ffffff" },
  go: { bg: "#00ADD8", fg: "#0b2b30" },
  rb: { bg: "#CC342D", fg: "#ffffff" },
  c: { bg: "#00599C", fg: "#ffffff" },
  cpp: { bg: "#00599C", fg: "#ffffff" },
  h: { bg: "#00599C", fg: "#ffffff" },
  sh: { bg: "#4EAA25", fg: "#ffffff" },
  md: { bg: "#5B5B5B", fg: "#ffffff" },
};

function codeCardMeta(note: Note): { label: string; bg: string; fg: string; name: string } {
  const files = parseCodeFiles(note.content) ?? [];
  const name = (files[0]?.name || note.title || "").trim();
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  const label = ext ? `.${ext}` : name ? name.toUpperCase() : "FILE";
  const color = CODE_EXT_COLORS[ext] ?? { bg: "#3C3C3C", fg: "#ffffff" };
  return { label, bg: color.bg, fg: color.fg, name: name || "untitled" };
}

export function NotesView({ mode = "notes" }: { mode?: "notes" | "code" }) {
  const { session } = useAuth();
  const { settings } = useSettings();
  const isGuest = session.status === "anonymous";
  const hasApiKey = settings.hasGeminiApiKey ?? false;
  const isCodeMode = mode === "code";
  const { notes, addNote, updateNote, deleteNote } = useNotes();
  const [editor, setEditor] = useState<NoteDraft | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [shareNote, setShareNote] = useState<{ id: string; title: string } | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [smartBusy, setSmartBusy] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(FS_KEY) === "1"; } catch { return false; }
  });
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [newCodeOpen, setNewCodeOpen] = useState(false);
  const [newCodeName, setNewCodeName] = useState("untitled.txt");
  const [newCodeMode, setNewCodeMode] = useState<"note" | "file">("note");
  const savedTimer = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const draftKey = isGuest
    ? (isCodeMode ? GUEST_CODE_DRAFT_KEY : GUEST_DRAFT_KEY)
    : (isCodeMode ? CODE_DRAFT_KEY : DRAFT_KEY);

  // Resume a non-empty draft after refresh / navigation.
  useEffect(() => {
    // Code mode always starts at the file list — never auto-open the editor from a draft.
    if (isCodeMode) return;
    const draft = readDraft(draftKey);
    if (draft && (draft.title || draft.content)) {
      // One-time sync of persisted draft from localStorage (external system) into React state.
      setEditor(draft);
    }
  }, [draftKey, isCodeMode]);

  // Auto-save draft to localStorage on every keystroke.
  useEffect(() => {
    if (!editor) return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(editor));
    } catch {
      // storage full or blocked — ignore
    }
  }, [editor, draftKey]);

  // Sync the contentEditable node with the note being edited (avoids resetting
  // the caret on every keystroke by not binding innerHTML through React).
  // Enter inserts a new block line natively; legacy plain-text content is
  // converted to blocks so its saved \n breaks show up as separate lines.
  useEffect(() => {
    const node = contentRef.current;
    if (!node || !editor) return;
    const display = toHtmlBlocks(editor.content);
    if (node.innerHTML !== display) {
      node.innerHTML = display;
    }
    // Intentionally runs only when the edited note, view mode, or editor kind changes, not per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor?.id, fullscreen, editor?.kind]);

  useEffect(() => () => {
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
  }, []);

  // ESC key exits fullscreen
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && fullscreen) setFullscreen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  // Persist fullscreen state to localStorage
  useEffect(() => {
    try { localStorage.setItem(FS_KEY, fullscreen ? "1" : "0"); } catch {}
  }, [fullscreen]);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [notes],
  );

  // Realtime search: filters only once the query reaches 3 characters.
  const query = search.trim();
  const visibleNotes = useMemo(() => {
    const byTag = (note: Note) => !activeTag || (note.tags ?? []).includes(activeTag);
    const byMode = (note: Note) => (isCodeMode ? note.kind === "code" : note.kind !== "code");
    const base = sortedNotes.filter((n) => byMode(n) && byTag(n));
    if (query.length < 3) return base;
    const q = query.toLowerCase();
    return base.filter((note) => note.title.toLowerCase().includes(q));
  }, [sortedNotes, query, activeTag, isCodeMode]);

  const email = session.status === "authed" ? session.email : "";
  const name = session.status === "authed" && (session as { name?: string }).name ? ((session as { name?: string }).name ?? "") : email;
  const displayName = isGuest ? "" : name.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const editingNote = editor?.id ? notes.find((n) => n.id === editor.id) ?? null : null;
  const actionItems = editingNote?.actionItems ?? [];

  function announce(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function markSaved() {
    setDraftSaved(true);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setDraftSaved(false), 1500);
  }

  function updateDraft(patch: Partial<NoteDraft>) {
    setEditor((prev) => (prev ? { ...prev, ...patch } : prev));
    markSaved();
  }

  const wordStats = useMemo(() => {
    const plain = toPlainText(editor?.content || "");
    const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
    const chars = plain.length;
    const charsNoSpace = plain.replace(/\s/g, "").length;
    return { words, chars, charsNoSpace };
  }, [editor?.content]);


  function handleUploadHtml(html: string, title?: string) {
    const now = new Date().toISOString();
    const newId = uid();
    const finalTitle = title?.trim() || "Untitled note";
    const newNote: Note = { id: newId, title: finalTitle, content: html, createdAt: now, updatedAt: now };
    addNote(newNote);
    clearDraft(draftKey);
    setEditor({ id: newId, title: finalTitle, content: html });
    if (contentRef.current) contentRef.current.innerHTML = html;
    markSaved();
    announce("Opened in new note");
  }

  function closeCodeFile(index: number) {
    setEditor((prev) => {
      if (!prev || !prev.codeFiles) return prev;
      const files = prev.codeFiles.filter((_, i) => i !== index);
      if (files.length === 0) {
        return { ...prev, codeFiles: [], activeFile: 0, content: serializeCodeFiles([]) };
      }
      const active = prev.activeFile && prev.activeFile >= index ? Math.max(0, prev.activeFile - 1) : prev.activeFile ?? 0;
      return { ...prev, codeFiles: files, activeFile: active, content: serializeCodeFiles(files) };
    });
    markSaved();
  }

  function switchCodeFile(index: number) {
    setEditor((prev) => (prev ? { ...prev, activeFile: index } : prev));
    markSaved();
  }

  function renameCodeFile(index: number, name: string) {
    setEditor((prev) => {
      if (!prev || !prev.codeFiles) return prev;
      const ext = name.includes(".") ? name.split(".").pop()! : "";
      const files = prev.codeFiles.map((f, i) => (i === index ? { ...f, name, language: codeLangForExt(ext) } : f));
      return { ...prev, codeFiles: files, content: serializeCodeFiles(files) };
    });
    markSaved();
  }

  function updateActiveCodeContent(value: string) {
    setEditor((prev) => {
      if (!prev || !prev.codeFiles) return prev;
      const i = prev.activeFile ?? 0;
      const files = prev.codeFiles.map((f, idx) => (idx === i ? { ...f, content: value } : f));
      return { ...prev, codeFiles: files, content: serializeCodeFiles(files) };
    });
    markSaved();
  }

  function openNote(note: Note) {
    if (note.kind === "code") {
      const files = parseCodeFiles(note.content) ?? [];
      setEditor({ id: note.id, title: note.title, content: note.content, kind: "code", language: note.language, codeFiles: files, activeFile: 0 });
      return;
    }
    setEditor({ id: note.id, title: note.title, content: note.content });
  }

  function codeFilesForView(): CodeFile[] {
    return (
      editor?.codeFiles ??
      (editor?.kind === "code" && editor.content ? parseCodeFiles(editor.content) ?? [] : [])
    );
  }

  function openNew() {
    if (isCodeMode) {
      setNewCodeName("");
      setNewCodeMode("note");
      setNewCodeOpen(true);
      return;
    }
    setEditor({ id: null, title: "", content: "", kind: "rich" });
  }

  function createCodeFile() {
    const name = newCodeName.trim() || "untitled";
    const ext = name.includes(".") ? name.split(".").pop()! : "";
    const language = codeLangForExt(ext);
    if (newCodeMode === "file") {
      const prev = editor;
      if (prev) {
        const files = prev.codeFiles ?? parseCodeFiles(prev.content) ?? [];
        const next = [...files, { name, language, content: "" }];
        const content = serializeCodeFiles(next);
        setEditor({ ...prev, codeFiles: next, activeFile: next.length - 1, content });
        if (prev.id) {
          const existing = notes.find((n) => n.id === prev.id);
          if (existing) {
            updateNote({ ...existing, title: prev.title, content, kind: "code", language: prev.language, updatedAt: new Date().toISOString() });
          }
        }
      }
    } else {
      const now = new Date().toISOString();
      const id = uid();
      const seed: CodeFile[] = [{ name, language, content: "" }];
      const content = serializeCodeFiles(seed);
      addNote({ id, title: name, content, kind: "code", language, createdAt: now, updatedAt: now });
      setEditor({ id, title: name, content, kind: "code", language, codeFiles: seed, activeFile: 0 });
    }
    setNewCodeOpen(false);
  }

  /** Save the current note (if non-empty) then open a blank note. */
  function handleNewNote() {
    if (!editor) return;
    const title = editor.title.trim();
    const content = editor.content.trim();
    clearDraft(draftKey);
    if (title || toPlainText(content)) {
      const now = new Date().toISOString();
      const finalTitle = title || "Untitled note";
      if (editor.id) {
        const existing = notes.find((n) => n.id === editor.id);
        if (existing) {
          updateNote({ ...existing, title: finalTitle, content, kind: editor.kind, language: editor.language, updatedAt: now });
        }
      } else {
        addNote({ id: uid(), title: finalTitle, content, kind: editor.kind, language: editor.language, createdAt: now, updatedAt: now });
      }
      announce("Note saved");
    }
    openNew();
  }

  function downloadTxt() {
    if (!editor) return;
    const title = editor.title.trim() || "Untitled note";
    const plain = toPlainText(editor.content) || " ";
    const blob = new Blob([plain], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    announce("Saved as .txt");
  }

  async function downloadPdf() {
    if (!editor) return;
    const { buildNotePdf, downloadPdf } = await import("@/lib/pdf");
    const doc = await buildNotePdf({
      title: editor.title || "Untitled note",
      content: editor.content,
    });
    downloadPdf(doc, `${editor.title.trim() || "Untitled note"}.pdf`);
    announce("Saved as PDF");
  }

  async function downloadWord() {
    if (!editor) return;
    const { buildNoteDocxBlob } = await import("@/lib/docx");
    const blob = await buildNoteDocxBlob({
      title: editor.title || "Untitled note",
      content: editor.content,
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${editor.title.trim() || "Untitled note"}.docx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    announce("Saved as Word");
  }

  /** AI Smart Info: auto tags + suggested title + action item extraction. */
  async function runSmart() {
    if (!editor || smartBusy) return;
    if (!editor.title.trim() && !toPlainText(editor.content)) {
      announce("Write something first");
      return;
    }
    setSmartBusy(true);
    try {
      const title = editor.title.trim() || "Untitled note";
      const now = new Date().toISOString();

      // Ensure the note exists so tags & action items can be attached to it.
      let base: Note;
      if (editor.id) {
        const existing = notes.find((n) => n.id === editor.id);
        if (existing) {
          base = { ...existing, title, content: editor.content, kind: editor.kind, language: editor.language, updatedAt: now };
          updateNote(base);
        } else {
          base = { id: editor.id, title, content: editor.content, kind: editor.kind, language: editor.language, tags: [], actionItems: [], createdAt: now, updatedAt: now };
        }
      } else {
        const newId = uid();
        base = { id: newId, title, content: editor.content, kind: editor.kind, language: editor.language, tags: [], actionItems: [], createdAt: now, updatedAt: now };
        addNote(base);
        clearDraft(draftKey);
        setEditor((prev) => (prev ? { ...prev, id: newId } : prev));
      }

      const res = await fetch("/api/ai/note-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editor.content, title }),
      });
      const data = (await res.json()) as {
        tags?: string[];
        suggestedTitle?: string;
        actionItems?: { text: string; priority?: string }[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Smart analysis failed." );

      // Merge results with what the note already has.
      const mergedTags = Array.from(new Set([...(base.tags ?? []), ...(data.tags ?? [])]));
      const mergedItems: NoteActionItem[] = [
        ...(base.actionItems ?? []),
        ...(data.actionItems ?? []).map((it) => ({ text: it.text, done: false })),
      ];
      const finalTitle = !title.trim() || title === "Untitled note" ? data.suggestedTitle || title : title;
      updateNote({ ...base, title: finalTitle, tags: mergedTags, actionItems: mergedItems });
      if ((title === "Untitled note" || !title.trim()) && data.suggestedTitle) {
        setEditor((prev) => (prev ? { ...prev, title: data.suggestedTitle! } : prev));
      }
      announce(`✨ ${mergedTags.length} tags · ${mergedItems.length} action items`);
    } catch (e) {
      announce(e instanceof Error ? e.message : "Smart analysis failed");
    } finally {
      setSmartBusy(false);
    }
  }

  function toggleActionItem(index: number) {
    if (!editingNote) return;
    updateNote({
      ...editingNote,
      actionItems: actionItems.map((item, i) => (i === index ? { ...item, done: !item.done } : item)),
    });
  }

  function removeActionItem(index: number) {
    if (!editingNote) return;
    updateNote({ ...editingNote, actionItems: actionItems.filter((_, i) => i !== index) });
  }

  function addActionItem(text: string) {
    if (!editingNote || !text.trim()) return;
    updateNote({ ...editingNote, actionItems: [...actionItems, { text: text.trim(), done: false }] });
  }

  /** Save an AI response as a NEW note, open it, and share the chat history with it. */
  function handleSaveAiToNewNote(markdown: string, chatMessages: { role: string; text: string }[]) {
    // Derive a title from the response's first heading / line.
    const mdLines = markdown.split("\n").map((l) => l.trim());
    const h1 = mdLines.find((l) => /^#\s+/.test(l));
    const derived = (h1 ? h1.replace(/^#+\s*/, "") : mdLines.find((l) => l && !l.startsWith("#")) || "")
      .replace(/[*_`>#\[\]]/g, "")
      .trim()
      .slice(0, 80);
    const fallbackTitle = editingNote?.title ? `${editingNote.title} — AI` : "AI Note";
    const finalTitle = derived || fallbackTitle;

    const now = new Date().toISOString();
    const newId = uid();
    const sourceMarkdown = derived ? markdown : `# ${finalTitle}\n\n${markdown}`;
    const newNote: Note = {
      id: newId,
      title: finalTitle,
      content: markdownToHtml(sourceMarkdown),
      tags: Array.from(new Set([...(editingNote?.tags ?? []), "ai"])),
      actionItems: [],
      createdAt: now,
      updatedAt: now,
    };
    addNote(newNote);

    // Share the chat history with the new note (localStorage + DB).
    if (chatMessages.length > 0) {
      try {
        localStorage.setItem(`zapnote:aichat:${newId}`, JSON.stringify(chatMessages));
      } catch {}
      if (!isGuest) {
        void fetch(`/api/notes/${newId}/chat`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatMessages }),
        }).catch(() => {});
      }
    }

    clearDraft(draftKey);
    setEditor({ id: newId, title: finalTitle, content: newNote.content });
    setAiOpen(false);
    announce("Saved to new note — chat history shared");
  }

  /** Append AI result (markdown) to the end of the note as rendered HTML. */
  function handleAiInsert(markdown: string) {
    if (!editor) return;
    const html = markdownToHtml(markdown);
    const separator = editor.content.trim() ? "<div><br></div>" : "";
    const newContent = `${editor.content}${separator}${html}`;
    setEditor({ ...editor, content: newContent });
    if (contentRef.current) contentRef.current.innerHTML = newContent;
    markSaved();
    announce("AI result inserted");
  }

  function handleShare() {
    if (!editor) return;
    // Save the note first so it exists in the DB before sharing
    const title = editor.title.trim();
    const content = editor.content.trim();
    if (!title && !toPlainText(content)) {
      announce("Write something before sharing");
      return;
    }
    const now = new Date().toISOString();
    const finalTitle = title || "Untitled note";
    let noteId = editor.id;
      if (editor.id) {
        const existing = notes.find((n) => n.id === editor.id);
        if (existing) {
          updateNote({ ...existing, title: finalTitle, content, kind: editor.kind, language: editor.language, updatedAt: now });
        }
      } else {
        noteId = uid();
        addNote({ id: noteId, title: finalTitle, content, kind: editor.kind, language: editor.language, createdAt: now, updatedAt: now });
      }
    clearDraft(draftKey);
    setEditor({ id: noteId, title: finalTitle, content });
    setShareNote({ id: noteId!, title: finalTitle });
  }

  // Save to the database, then go back to the grid.
  function handleBack() {
    if (!editor) return;
    const title = editor.title.trim();
    const content = editor.content.trim();
    clearDraft(draftKey);
    if (!title && !toPlainText(content)) {
      setEditor(null);
      return;
    }
    const now = new Date().toISOString();
    const finalTitle = title || "Untitled note";
    if (editor.id) {
      const existing = notes.find((n) => n.id === editor.id);
      if (existing) {
        updateNote({ ...existing, title: finalTitle, content, kind: editor.kind, language: editor.language, updatedAt: now });
        announce("Note saved");
      }
    } else {
      addNote({ id: uid(), title: finalTitle, content, createdAt: now, updatedAt: now });
      announce("Note saved");
    }
    setEditor(null);
  }

  const confirmModal = confirmDelete && (
    <ConfirmModal
      title={`Delete "${confirmDelete.title || "Untitled note"}"?`}
      message="This action cannot be undone."
      onClose={() => setConfirmDelete(null)}
      onConfirm={() => {
        deleteNote(confirmDelete.id);
        if (editor?.id === confirmDelete.id) {
          clearDraft(draftKey);
          setEditor(null);
        }
        announce("Note deleted");
        setConfirmDelete(null);
      }}
    />
  );

  const newCodeModal = newCodeOpen ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={() => setNewCodeOpen(false)}
    >
      <div
        className="w-[320px] rounded-xl bg-[#252526] p-4 text-[#cccccc] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-2 text-sm font-semibold">New code file</p>
        <input
          autoFocus
          value={newCodeName}
          onChange={(e) => setNewCodeName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") createCodeFile();
            if (e.key === "Escape") setNewCodeOpen(false);
          }}
          placeholder="e.g. app.ts, script.py"
          className="w-full rounded-md border border-[#007fd4] bg-[#3c3c3c] px-2 py-1.5 text-sm text-white outline-none"
        />
        <p className="mt-1.5 text-[0.68rem] text-[#858585]">Language is detected automatically from the extension.</p>
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => setNewCodeOpen(false)}
            className="rounded-md px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#2a2d2e]"
          >
            Cancel
          </button>
          <button
            onClick={createCodeFile}
            className="rounded-md bg-[#007fd4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1c8ad6]"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ---------------- Editor (MS Word style paper) ----------------
  if (editor) {
    // ---- Fullscreen mode ----
    if (fullscreen) {
      return (
        <div className="fixed inset-0 z-[80] flex flex-col bg-[#1e1e1e]">
          {isCodeMode ? (
            <CodeWorkspace
              files={codeFilesForView()}
              activeFile={editor.activeFile ?? 0}
              onChange={updateActiveCodeContent}
              onSwitchFile={switchCodeFile}
              onCloseFile={closeCodeFile}
              onRenameFile={renameCodeFile}
              onAddFile={() => { setNewCodeName(""); setNewCodeMode("file"); setNewCodeOpen(true); }}
              onBack={() => { setEditor(null); clearDraft(draftKey); }}
              onFullscreen={() => setFullscreen(false)}
              onShare={handleShare}
              onDelete={() => editor.id && setConfirmDelete({ id: editor.id, title: editor.title })}
              hasActiveNote={!!editor.id}
              isGuest={isGuest}
            />
          ) : (
            <>
              <EditorToolbar
                title={editor.title}
                html={editor.content}
                hasApiKey={hasApiKey}
                isGuest={isGuest}
                hasActiveNote={!!editor.id}
                smartBusy={smartBusy}
                wordStats={wordStats}
                contentRef={contentRef}
                onContentChange={(html) => updateDraft({ content: html })}
                onUploadHtml={handleUploadHtml}
                isCode={false}
                language={editor.language}
                onBack={() => setFullscreen(false)}
                onNewNote={handleNewNote}
                onShare={handleShare}
                onDelete={() => editor.id && setConfirmDelete({ id: editor.id, title: editor.title })}
                onFullscreen={() => setFullscreen(false)}
                onAiOpen={() => setAiOpen(true)}
                onRunSmart={() => void runSmart()}
                onDownloadTxt={downloadTxt}
                onDownloadPdf={() => void downloadPdf()}
                onDownloadWord={() => void downloadWord()}
                announce={announce}
              />
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#e9eaed]">
                <div className="flex-1 overflow-y-auto p-0 sm:p-6">
                  <div ref={paperRef} className="relative mx-auto w-full max-w-[794px] bg-white border border-gray-300 shadow-[0_2px_10px_rgba(0,0,0,.08)]" style={{ minHeight: "1123px" }}>
                    <div className="pointer-events-none absolute inset-0 max-sm:m-3 sm:m-[72px_64px]" style={{ border: '1px dashed rgba(0,0,0,0.08)' }} />
                    <div className="relative px-3 py-3 sm:px-[64px] sm:py-[72px]">
                      <input value={editor.title} onChange={(e) => updateDraft({ title: (e.target as HTMLInputElement).value })} placeholder="Untitled document" maxLength={80} className="mb-3 w-full border-0 border-b border-gray-300 bg-transparent px-1 py-2 text-base font-semibold text-gray-800 placeholder:text-gray-400 outline-none focus:border-violet-500 focus:ring-0 rounded-none sm:text-xl" />
                      <div ref={contentRef} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-ph="Start writing…" onInput={(e) => updateDraft({ content: (e.target as HTMLDivElement).innerHTML })} className="note-editor min-h-[40vh] w-full bg-transparent text-sm leading-7 text-gray-800 outline-none sm:text-lg sm:leading-9 [&_div]:mb-1 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-blue-600 [&_a]:underline" />
                    </div>
                  </div>
                </div>
              </div>
              <EditorStatusBar stats={wordStats} draftSaved={draftSaved} />
            </>
          )}

          {/* Toast */}
          {aiOpen && <NoteAiPanel noteId={editor.id ?? null} noteContent={editor.content} canSync={!isGuest} userName={displayName} onClose={() => setAiOpen(false)} onInsert={handleAiInsert} onSaveAsNote={handleSaveAiToNewNote} />}
          {toast && <div className="fixed bottom-20 left-1/2 z-[90] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-3 text-xs font-semibold text-white shadow-xl md:bottom-5">{toast}</div>}
          {newCodeModal}
        </div>
      );
    }

    // ---- Normal editor (inside NotesShell) ----
    return (
      <NotesShell
        bare={isCodeMode}
        title={isCodeMode ? "" : "Notes"}
        subtitle={isCodeMode ? "" : "Project notes"}
        headerExtra={
          isCodeMode ? undefined : (
            <input
              value={editor.title}
              onChange={(e) => updateDraft({ title: e.target.value })}
              placeholder="Untitled document"
              maxLength={80}
              className="w-full max-w-[280px] border-0 border-b border-gray-300 bg-transparent px-1 py-1.5 text-sm font-medium text-gray-800 placeholder:text-gray-400 outline-none focus:border-violet-500 focus:ring-0 rounded-none"
            />
          )
        }
      >
        {isCodeMode ? (
          <CodeWorkspace
              files={codeFilesForView()}
              activeFile={editor.activeFile ?? 0}
              onChange={updateActiveCodeContent}
              onSwitchFile={switchCodeFile}
              onCloseFile={closeCodeFile}
              onRenameFile={renameCodeFile}
              onAddFile={() => { setNewCodeName(""); setNewCodeMode("file"); setNewCodeOpen(true); }}
              onBack={() => { setEditor(null); clearDraft(draftKey); }}
              onFullscreen={() => setFullscreen(true)}
              onShare={handleShare}
              onDelete={() => editor.id && setConfirmDelete({ id: editor.id, title: editor.title })}
              hasActiveNote={!!editor.id}
              isGuest={isGuest}
            />
          ) : (
            <>
              <style>{`.note-editor:empty::before { content: attr(data-ph); color: var(--crm-placeholder); pointer-events: none; }`}</style>
              <EditorToolbar
                title={editor.title}
                html={editor.content}
                hasApiKey={hasApiKey}
                isGuest={isGuest}
                hasActiveNote={!!editor.id}
                smartBusy={smartBusy}
                wordStats={wordStats}
                contentRef={contentRef}
                onContentChange={(html) => updateDraft({ content: html })}
                onUploadHtml={handleUploadHtml}
                isCode={false}
                language={editor.language}
                onBack={handleBack}
                onNewNote={handleNewNote}
                onShare={handleShare}
                onDelete={() => editor.id && setConfirmDelete({ id: editor.id, title: editor.title })}
                onFullscreen={() => setFullscreen(true)}
                onAiOpen={() => setAiOpen(true)}
                onRunSmart={() => void runSmart()}
                onDownloadTxt={downloadTxt}
                onDownloadPdf={() => void downloadPdf()}
                onDownloadWord={() => void downloadWord()}
                announce={announce}
              />
              <div className="flex-1 overflow-y-auto p-0 sm:p-6 bg-[#e9eaed]">
                <div className="relative mx-auto w-full max-w-[794px] bg-white border border-gray-300 shadow-[0_2px_10px_rgba(0,0,0,.08)]" style={{ minHeight: "1123px" }}>
                  <div className="pointer-events-none absolute inset-0 max-sm:m-3 sm:m-[72px_64px]" style={{ border: '1px dashed rgba(0,0,0,0.08)' }} />
                  <div ref={paperRef} className="relative px-3 py-3 sm:px-[64px] sm:py-[72px]">
                    <div
                      ref={contentRef}
                      contentEditable
                      suppressContentEditableWarning
                      role="textbox"
                      aria-multiline="true"
                      data-ph="Start writing…"
                      onInput={(event) => updateDraft({ content: (event.currentTarget as HTMLDivElement).innerHTML })}
                      className="note-editor min-h-[40vh] flex-1 bg-transparent text-[0.9375rem] leading-7 text-(--crm-fg) outline-none sm:text-base sm:leading-8 [&_div]:mb-1 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-blue-600 [&_a]:underline"
                    />
                  </div>

                  {/* Action Items */}
                  {editingNote && actionItems.length > 0 && (
                    <div className="mt-4 rounded-xl border border-(--crm-border) bg-white p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-(--crm-fg)"><Wand2 size={14} className="text-violet-500" />Action Items</h4>
                        <span className="text-[0.69rem] font-medium text-(--crm-muted)">{actionItems.filter((item) => item.done).length}/{actionItems.length} done</span>
                      </div>
                      <ul className="mt-3 space-y-1">
                        {actionItems.map((item, index) => (
                          <li key={`${item.text}-${index}`} className="group/item flex items-center gap-2.5 rounded-lg px-1 py-1 transition-colors hover:bg-(--crm-soft)">
                            <input type="checkbox" checked={item.done} onChange={() => toggleActionItem(index)} className="h-3.5 w-3.5 shrink-0 accent-violet-600" aria-label={item.text} />
                            <span className={`min-w-0 flex-1 truncate text-xs ${item.done ? "text-(--crm-faint) line-through" : "text-(--crm-fg)"}`}>{item.text}</span>
                            <button onClick={() => removeActionItem(index)} className="shrink-0 rounded p-0.5 text-(--crm-muted) opacity-0 transition-opacity hover:text-red-500 group-hover/item:opacity-100" aria-label="Remove"><X size={12} /></button>
                          </li>
                        ))}
                      </ul>
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          const input = event.currentTarget.elements.namedItem("newItem") as HTMLInputElement;
                          addActionItem(input.value);
                          input.value = "";
                        }}
                        className="mt-2.5 flex gap-2"
                      >
                        <input name="newItem" placeholder="Add task…" className="h-8 flex-1 rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3 text-xs outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-focus-border)" />
                        <button type="submit" className="rounded-lg border border-(--crm-border) bg-(--crm-surface) px-2.5 text-xs font-semibold text-(--crm-secondary) transition-colors hover:bg-(--crm-soft)">Add</button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
              <EditorStatusBar stats={wordStats} draftSaved={draftSaved} />
            </>
          )}

        {confirmModal}
        {shareNote && (
          <NoteShareModal
            noteId={shareNote.id}
            onClose={() => setShareNote(null)}
          />
        )}
        {aiOpen && <NoteAiPanel noteId={editor.id ?? null} noteContent={editor.content} canSync={!isGuest} userName={displayName} onClose={() => setAiOpen(false)} onInsert={handleAiInsert} onSaveAsNote={handleSaveAiToNewNote} />}
        {toast && <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-(--crm-dark) px-4 py-3 text-xs font-semibold text-white shadow-xl">{toast}</div>}
      {newCodeModal}
      </NotesShell>
    );
  }

  // ---------------- Grid view ----------------
  return (
    <NotesShell title={isCodeMode ? "Code" : "Notes"} subtitle={isCodeMode ? "Code editor" : "Project notes"}>
      <div className="crm-rise">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-[-.04em] sm:text-[1.625rem]">{isCodeMode ? "Code editor" : "Project notes"}</h2>
            <p className="mt-1 text-sm text-(--crm-secondary)">{query.length >= 3 ? `${visibleNotes.length} ${visibleNotes.length === 1 ? "match" : "matches"} for "${query}"` : `${visibleNotes.length} ${visibleNotes.length === 1 ? (isCodeMode ? "file" : "note") : (isCodeMode ? "files" : "notes")} ${isCodeMode ? "in your workspace." : "to manage your projects."}`}</p>
          </div>
          <button onClick={openNew} className="flex shrink-0 items-center gap-1 rounded-md bg-(--crm-primary) px-2 py-1.5 text-[0.65rem] font-semibold text-white shadow-sm transition-all hover:bg-(--crm-dark) sm:gap-1.5 sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs"><Plus size={12} />{isCodeMode ? "New File" : "New Note"}</button>
        </div>
        <div className="relative mt-3">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--crm-muted)" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isCodeMode ? "Search code…" : "Search notes…"} className="w-full rounded-xl border border-(--crm-border-input) bg-(--crm-panel) py-2.5 pl-9 pr-3 text-sm text-(--crm-fg) outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-accent) sm:max-w-[240px]" />
        </div>
      </div>

      {/* Active tag filter */}
      {activeTag && (
        <div className="crm-rise mt-4 flex items-center gap-2 text-xs text-(--crm-secondary)">
          Filtered by tag
          <span className="rounded-full bg-violet-600 px-2.5 py-0.5 font-semibold text-white">#{activeTag}</span>
          <button onClick={() => setActiveTag(null)} className="font-semibold underline underline-offset-2 hover:text-(--crm-fg)">Clear filter</button>
        </div>
      )}

      {sortedNotes.length === 0 ? (
        <div className="crm-rise mt-6 rounded-2xl border border-dashed border-(--crm-border) bg-(--crm-panel) px-6 py-24 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-(--crm-soft) text-(--crm-text)"><StickyNote size={28} /></div>
          <p className="mt-5 text-sm font-semibold text-(--crm-fg)">{isCodeMode ? "No code files yet" : "No notes yet"}</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-(--crm-muted)">{isCodeMode ? "This page is empty. Click New File in the top right to create your first code file." : "This page is empty. Click New Note in the top right to start writing your first project note."}</p>
        </div>
      ) : visibleNotes.length === 0 ? (
        <div className="crm-rise mt-6 rounded-2xl border border-dashed border-(--crm-border) bg-(--crm-panel) px-6 py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-(--crm-soft) text-(--crm-text)"><Search size={24} /></div>
          <p className="mt-5 text-sm font-semibold text-(--crm-fg)">{isCodeMode ? "No code files found" : "No notes found"}</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-(--crm-muted)">Nothing matches <span className="font-semibold text-(--crm-brand)">&ldquo;{query}&rdquo;</span>. Try different keywords.</p>
        </div>
      ) : (
        <div className="crm-rise mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-4">
            {visibleNotes.map((note) => {
              const meta = isCodeMode ? codeCardMeta(note) : null;
              return (
              <div key={note.id} onClick={() => openNote(note)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openNote(note); } }} className="group relative flex aspect-[3/4] cursor-pointer flex-col overflow-hidden rounded-xl border border-(--crm-border-soft) bg-white p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-(--crm-border-input) hover:shadow-[0_8px_24px_rgba(0,0,0,.10)] sm:aspect-[4/5] sm:p-4">
                {meta ? (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 min-w-0 flex-1 text-[0.8rem] font-semibold leading-5 text-(--crm-fg)">{note.title || "untitled"}</p>
                      <button onClick={(event) => { event.stopPropagation(); setConfirmDelete({ id: note.id, title: note.title }); }} className="shrink-0 rounded p-1 text-(--crm-muted) opacity-0 transition-opacity hover:bg-(--crm-danger-bg) hover:text-(--crm-danger) group-hover:opacity-100" aria-label="Delete file"><Trash2 size={14} /></button>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl text-xl font-black" style={{ background: meta.bg, color: meta.fg }}>{meta.label}</div>
                    </div>
                    <p className="border-t border-(--crm-border-soft) pt-2.5 text-[0.7rem] font-medium text-(--crm-muted)">{(parseCodeFiles(note.content)?.[0]?.language || "code").toUpperCase()}</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 min-w-0 flex-1 text-[0.9375rem] font-semibold leading-5 text-(--crm-fg)">{note.title || "Untitled note"}</p>
                      <button onClick={(event) => { event.stopPropagation(); setConfirmDelete({ id: note.id, title: note.title }); }} className="shrink-0 rounded p-1 text-(--crm-muted) opacity-0 transition-opacity hover:bg-(--crm-danger-bg) hover:text-(--crm-danger) group-hover:opacity-100" aria-label="Delete note"><Trash2 size={14} /></button>
                    </div>
                    <div className="my-3 h-px bg-(--crm-border-soft)" />
                    {(note.tags?.length ?? 0) > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {note.tags!.slice(0, 3).map((tag) => (
                          <button
                            key={tag}
                            onClick={(event) => { event.stopPropagation(); setActiveTag(activeTag === tag ? null : tag); }}
                            className={`rounded-full px-2 py-0.5 text-[0.625rem] font-semibold transition-colors ${activeTag === tag ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-700 hover:bg-violet-100"}`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="line-clamp-4 flex-1 text-[0.8125rem] leading-5 text-(--crm-secondary)">{snippet(note) || "No content yet."}</p>
                    <p className="mt-3 border-t border-(--crm-border-soft) pt-2.5 text-[0.625rem] font-medium uppercase tracking-[.1em] text-(--crm-faint)">Updated {formatDate(note.updatedAt)}</p>
                  </>
                )}
              </div>
              );
            })}
        </div>
      )}

       {confirmModal}
       {toast && <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-(--crm-dark) px-4 py-3 text-xs font-semibold text-white shadow-xl">{toast}</div>}
    {newCodeModal}
    </NotesShell>
  );
}