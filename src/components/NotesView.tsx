"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bold,
  ChevronDown,
  FileDown,
  FileText,
  FileImage,
  Italic,
  Link2,
  Loader2,
  List,
  ListOrdered,
  Lock,
  Maximize2,
  Minimize2,
  Plus,
  Redo2,
  Search,
  Sparkles,
  StickyNote,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
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
import type { Note, NoteActionItem } from "@/lib/crm";
import { formatDate, uid } from "@/lib/crm";
import { markdownToHtml } from "@/lib/markdown";

const DRAFT_KEY = "zapnote:draft";
const GUEST_DRAFT_KEY = "zapnote:draft:guest";
const FS_KEY = "zapnote:fullscreen";

type NoteDraft = {
  id: string | null;
  title: string;
  content: string;
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
  const flat = toPlainText(note.content);
  return flat.length > 160 ? `${flat.slice(0, 160)}…` : flat;
}

export function NotesView() {
  const { session } = useAuth();
  const { settings } = useSettings();
  const isGuest = session.status === "anonymous";
  const hasApiKey = settings.hasGeminiApiKey ?? false;
  const { notes, addNote, updateNote, deleteNote } = useNotes();
  const [editor, setEditor] = useState<NoteDraft | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [shareNote, setShareNote] = useState<{ id: string; title: string } | null>(null);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [smartBusy, setSmartBusy] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(FS_KEY) === "1"; } catch { return false; }
  });
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const savedTimer = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const draftKey = isGuest ? GUEST_DRAFT_KEY : DRAFT_KEY;

  // Resume a non-empty draft after refresh / navigation.
  useEffect(() => {
    const draft = readDraft(draftKey);
    if (draft && (draft.title || draft.content)) {
      // One-time sync of persisted draft from localStorage (external system) into React state.
      setEditor(draft);
    }
  }, [draftKey]);

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
    // Intentionally runs only when the edited note or view mode changes, not per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor?.id, fullscreen]);

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
    if (query.length < 3) return sortedNotes.filter(byTag);
    const q = query.toLowerCase();
    return sortedNotes.filter(
      (note) =>
        byTag(note) &&
        (note.title.toLowerCase().includes(q) || toPlainText(note.content).toLowerCase().includes(q)),
    );
  }, [sortedNotes, query, activeTag]);

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

  function updateDraft(patch: Partial<Pick<NoteDraft, "title" | "content">>) {
    setEditor((prev) => (prev ? { ...prev, ...patch } : prev));
    markSaved();
  }

  function openNote(note: Note) {
    setEditor({ id: note.id, title: note.title, content: note.content });
  }

  function openNew() {
    setEditor({ id: null, title: "", content: "" });
  }

  function exec(command: string, value?: string) {
    contentRef.current?.focus();
    try {
      document.execCommand(command, false, value);
    } catch {
      // unsupported command — ignore
    }
    const node = contentRef.current;
    if (node && node.innerHTML !== editor?.content) {
      updateDraft({ content: node.innerHTML });
    }
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
          updateNote({ ...existing, title: finalTitle, content, updatedAt: now });
        }
      } else {
        addNote({ id: uid(), title: finalTitle, content, createdAt: now, updatedAt: now });
      }
      announce("Note saved");
    }
    setEditor({ id: null, title: "", content: "" });
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
    setSaveMenuOpen(false);
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
    setSaveMenuOpen(false);
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
    setSaveMenuOpen(false);
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
          base = { ...existing, title, content: editor.content, updatedAt: now };
          updateNote(base);
        } else {
          base = { id: editor.id, title, content: editor.content, tags: [], actionItems: [], createdAt: now, updatedAt: now };
        }
      } else {
        const newId = uid();
        base = { id: newId, title, content: editor.content, tags: [], actionItems: [], createdAt: now, updatedAt: now };
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
        updateNote({ ...existing, title: finalTitle, content, updatedAt: now });
      }
    } else {
      noteId = uid();
      addNote({ id: noteId, title: finalTitle, content, createdAt: now, updatedAt: now });
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
        updateNote({ ...existing, title: finalTitle, content, updatedAt: now });
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

  // ---------------- Editor (MS Word style paper) ----------------
  if (editor) {
    // ---- Fullscreen mode ----
    if (fullscreen) {
      const fsToolbarBtn = "flex items-center justify-center rounded-lg p-2.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700";
      const fsSep = "my-1 w-6 h-px bg-gray-200";
      const fsToolbarBtnMobile = "flex items-center justify-center rounded-lg p-2 text-gray-400 transition-colors active:bg-gray-100 active:text-gray-700";
      return (
        <div className="fixed inset-0 z-[80] flex flex-col bg-white">
          {/* Desktop: Vertical toolbar — left side */}
          <div className="hidden flex-1 md:flex">
            <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-gray-100 py-4">
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")} className={fsToolbarBtn} title="Bold"><Bold size={17} /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")} className={fsToolbarBtn} title="Italic"><Italic size={17} /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")} className={fsToolbarBtn} title="Underline"><Underline size={17} /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("strikeThrough")} className={fsToolbarBtn} title="Strikethrough"><Strikethrough size={17} /></button>
              <div className={fsSep} />
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")} className={fsToolbarBtn} title="Bullet list"><List size={17} /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")} className={fsToolbarBtn} title="Numbered list"><ListOrdered size={17} /></button>
              <div className={fsSep} />
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("undo")} className={fsToolbarBtn} title="Undo"><Undo2 size={17} /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("redo")} className={fsToolbarBtn} title="Redo"><Redo2 size={17} /></button>
              <div className="flex-1" />
              <div className={fsSep} />
              {hasApiKey ? (
                <button onClick={() => setAiOpen(true)} className={`${fsToolbarBtn} text-violet-500`} title="AI Assistant"><Sparkles size={17} /></button>
              ) : (
                <a href="/app/settings" className={`${fsToolbarBtn} text-violet-300`} title="Add Gemini API key in Settings"><Lock size={17} /></a>
              )}
              <button onClick={handleNewNote} className={fsToolbarBtn} title="New note"><Plus size={17} /></button>
              <button onClick={() => setFullscreen(false)} className={fsToolbarBtn} title="Exit fullscreen (Esc)"><Minimize2 size={17} /></button>
            </div>
            <div className="flex flex-1 items-start justify-center overflow-y-auto px-10 py-10">
              <div className="flex w-full max-w-[780px] flex-col">
                <input
                  value={editor.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                  placeholder="Untitled note"
                  maxLength={160}
                  className="w-full bg-transparent text-5xl font-bold tracking-tight text-gray-900 outline-none placeholder:text-gray-300"
                />
                <div className="my-6 h-px bg-gray-100" />
                <div
                  ref={contentRef}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  data-ph="Start writing…"
                  onInput={(event) => updateDraft({ content: (event.currentTarget as HTMLDivElement).innerHTML })}
                  className="note-editor min-h-[50vh] w-full bg-transparent text-lg leading-9 text-gray-800 outline-none [&_div]:mb-1 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:text-2xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-blue-600 [&_a]:underline"
                />
              </div>
            </div>
          </div>

          {/* Mobile: Full-screen editor with bottom toolbar */}
          <div className="flex flex-1 flex-col md:hidden">
            <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 pt-12 pb-20">
              <div className="flex w-full flex-col">
                <input
                  value={editor.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                  placeholder="Untitled note"
                  maxLength={160}
                  className="w-full bg-transparent text-2xl font-bold tracking-tight text-gray-900 outline-none placeholder:text-gray-300"
                />
                <div className="my-4 h-px bg-gray-100" />
                <div
                  ref={contentRef}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  data-ph="Start writing…"
                  onInput={(event) => updateDraft({ content: (event.currentTarget as HTMLDivElement).innerHTML })}
                  className="note-editor min-h-[60vh] w-full bg-transparent text-sm leading-7 text-gray-800 outline-none sm:text-base [&_div]:mb-1 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-blue-600 [&_a]:underline"
                />
              </div>
            </div>
            {/* Mobile bottom toolbar */}
            <div className="fixed bottom-0 left-0 right-0 z-[85] border-t border-gray-100 bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-2">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-0.5 overflow-x-auto">
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")} className={fsToolbarBtnMobile} title="Bold"><Bold size={16} /></button>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")} className={fsToolbarBtnMobile} title="Italic"><Italic size={16} /></button>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")} className={fsToolbarBtnMobile} title="Underline"><Underline size={16} /></button>
                  <span className="mx-0.5 h-5 w-px bg-gray-200" />
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")} className={fsToolbarBtnMobile} title="Bullet list"><List size={16} /></button>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")} className={fsToolbarBtnMobile} title="Numbered list"><ListOrdered size={16} /></button>
                  <span className="mx-0.5 h-5 w-px bg-gray-200" />
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("undo")} className={fsToolbarBtnMobile} title="Undo"><Undo2 size={16} /></button>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("redo")} className={fsToolbarBtnMobile} title="Redo"><Redo2 size={16} /></button>
                </div>
                <div className="flex items-center gap-0.5">
                  {hasApiKey && <button onClick={() => setAiOpen(true)} className={`${fsToolbarBtnMobile} text-violet-500`} title="AI"><Sparkles size={16} /></button>}
                  <button onClick={handleNewNote} className={fsToolbarBtnMobile} title="New"><Plus size={16} /></button>
                  <button onClick={() => setFullscreen(false)} className={fsToolbarBtnMobile} title="Exit"><Minimize2 size={16} /></button>
                </div>
              </div>
            </div>
          </div>

          {/* Toast */}
          {aiOpen && <NoteAiPanel noteId={editor.id ?? null} noteContent={editor.content} canSync={!isGuest} userName={displayName} onClose={() => setAiOpen(false)} onInsert={handleAiInsert} onSaveAsNote={handleSaveAiToNewNote} />}
          {toast && <div className="fixed bottom-20 left-1/2 z-[90] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-3 text-xs font-semibold text-white shadow-xl md:bottom-5">{toast}</div>}
        </div>
      );
    }

    // ---- Normal editor (MS Word style) ----
    const ribbonBtn = "flex items-center justify-center rounded-md p-1.5 text-(--crm-secondary) transition-colors hover:bg-(--crm-soft) hover:text-(--crm-fg)";
    const ribbonBtnActive = "flex items-center justify-center rounded-md p-1.5 text-(--crm-brand) bg-(--crm-soft)";
    const ribbonSep = "w-px h-5 bg-(--crm-border) mx-0.5 shrink-0";
    const ribbonGroupLabel = "text-[0.55rem] font-medium uppercase tracking-[.08em] text-(--crm-faint) text-center";

    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-(--crm-bg)">
        <style>{`
          .note-editor:empty::before { content: attr(data-ph); color: var(--crm-placeholder); pointer-events: none; }
        `}</style>

        {/* ===== TITLE BAR (Word-style) ===== */}
        <div className="flex shrink-0 items-center gap-2 border-b border-(--crm-border) bg-white px-3 py-2 sm:px-4">
          <button onClick={handleBack} className="flex items-center justify-center rounded-lg p-2 text-(--crm-secondary) transition-colors hover:bg-(--crm-soft) hover:text-(--crm-fg)" title="Save & back"><ArrowLeft size={16} /></button>
          <div className="min-w-0 flex-1">
            <input
              value={editor.title}
              onChange={(event) => updateDraft({ title: event.target.value })}
              placeholder="Untitled note"
              maxLength={160}
              className="w-full bg-transparent text-sm font-semibold text-(--crm-fg) outline-none placeholder:text-(--crm-placeholder) sm:text-base"
            />
          </div>
          <span className={`hidden text-[0.65rem] font-medium text-(--crm-muted) transition-opacity sm:inline ${draftSaved ? "opacity-100" : "opacity-0"}`}>Saved</span>
          {editor.id && !isGuest && (
            <button onClick={handleShare} className="flex items-center gap-1 rounded-md px-2 py-1 text-[0.65rem] font-semibold text-(--crm-secondary) transition-colors hover:bg-(--crm-soft) sm:text-xs" title="Share"><Link2 size={13} /><span className="hidden sm:inline">Share</span></button>
          )}
          <div className="relative">
            <button onClick={() => setSaveMenuOpen(!saveMenuOpen)} className="flex items-center gap-1 rounded-md px-2 py-1 text-[0.65rem] font-semibold text-(--crm-secondary) transition-colors hover:bg-(--crm-soft) sm:text-xs" title="Export"><FileDown size={13} /><span className="hidden sm:inline">Export</span><ChevronDown size={11} /></button>
            {saveMenuOpen && (
              <>
                <div className="fixed inset-0 z-[55]" onClick={() => setSaveMenuOpen(false)} />
                <div className="absolute right-0 top-full z-[56] mt-1 w-44 rounded-xl border border-(--crm-border) bg-white py-1 shadow-xl">
                  <button onClick={downloadWord} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-(--crm-fg) hover:bg-(--crm-soft)"><FileText size={14} />Word (.docx)</button>
                  <button onClick={downloadPdf} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-(--crm-fg) hover:bg-(--crm-soft)"><FileImage size={14} />PDF</button>
                  <button onClick={downloadTxt} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-(--crm-fg) hover:bg-(--crm-soft)"><FileDown size={14} />Plain Text</button>
                </div>
              </>
            )}
          </div>
          {editor.id && (
            <button onClick={() => setConfirmDelete({ id: editor.id!, title: editor.title })} className="flex items-center justify-center rounded-md p-1.5 text-(--crm-muted) transition-colors hover:bg-red-50 hover:text-red-500" title="Delete"><Trash2 size={14} /></button>
          )}
          <button onClick={() => setFullscreen(true)} className="flex items-center justify-center rounded-md p-1.5 text-(--crm-muted) transition-colors hover:bg-(--crm-soft) hover:text-(--crm-fg)" title="Fullscreen"><Maximize2 size={14} /></button>
        </div>

        {/* ===== RIBBON TOOLBAR (Word-style) ===== */}
        <div className="flex shrink-0 flex-wrap items-stretch gap-x-1 gap-y-0 border-b border-(--crm-border) bg-gray-50/80 px-2 py-1 sm:items-center sm:gap-x-1.5 sm:px-3">
          {/* Clipboard group */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-0.5">
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")} className={ribbonBtn} title="Bold (Ctrl+B)"><Bold size={15} /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")} className={ribbonBtn} title="Italic (Ctrl+I)"><Italic size={15} /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")} className={ribbonBtn} title="Underline (Ctrl+U)"><Underline size={15} /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("strikeThrough")} className={ribbonBtn} title="Strikethrough"><Strikethrough size={15} /></button>
            </div>
            <span className={ribbonGroupLabel}>Font</span>
          </div>

          <div className={ribbonSep} />

          {/* Paragraph group */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-0.5">
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")} className={ribbonBtn} title="Bullet list"><List size={15} /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")} className={ribbonBtn} title="Numbered list"><ListOrdered size={15} /></button>
            </div>
            <span className={ribbonGroupLabel}>List</span>
          </div>

          <div className={ribbonSep} />

          {/* History group */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-0.5">
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("undo")} className={ribbonBtn} title="Undo (Ctrl+Z)"><Undo2 size={15} /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("redo")} className={ribbonBtn} title="Redo (Ctrl+Y)"><Redo2 size={15} /></button>
            </div>
            <span className={ribbonGroupLabel}>History</span>
          </div>

          <div className={ribbonSep} />

          {/* AI group */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-0.5">
              {hasApiKey ? (
                <button onClick={() => setAiOpen(true)} className="flex items-center gap-1 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2 py-1.5 text-[0.65rem] font-semibold text-white shadow-sm transition-all hover:from-violet-700 hover:to-fuchsia-700 sm:px-2.5 sm:text-xs" title="AI Assistant"><Sparkles size={13} /><span className="hidden sm:inline">AI</span></button>
              ) : (
                <a href="/app/settings" className="flex items-center gap-1 rounded-md border border-dashed border-violet-300 bg-violet-50 px-2 py-1.5 text-[0.65rem] font-semibold text-violet-400 sm:px-2.5 sm:text-xs"><Lock size={13} />AI</a>
              )}
              {hasApiKey ? (
                <button onClick={() => void runSmart()} disabled={smartBusy} className="flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1.5 text-[0.65rem] font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 sm:px-2.5 sm:text-xs" title="Smart: auto tags & action items">
                  {smartBusy ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                  <span className="hidden sm:inline">Smart</span>
                </button>
              ) : (
                <span className="flex items-center gap-1 rounded-md border border-dashed border-violet-200 bg-violet-50 px-2 py-1.5 text-[0.65rem] font-semibold text-violet-400 sm:px-2.5 sm:text-xs"><Lock size={13} /><span className="hidden sm:inline">Smart</span></span>
              )}
            </div>
            <span className={ribbonGroupLabel}>AI</span>
          </div>

          <div className="flex-1" />

          {/* Quick actions */}
          <div className="flex items-center gap-0.5">
            <button onClick={handleNewNote} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[0.65rem] font-semibold text-(--crm-secondary) transition-colors hover:bg-(--crm-soft) sm:text-xs" title="New note"><Plus size={13} /><span className="hidden sm:inline">New</span></button>
          </div>
        </div>

        {/* ===== PAPER AREA ===== */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[820px] py-4 sm:py-8">
            <div className="mx-2 flex min-h-[60vh] flex-col bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,.08),0_8px_32px_rgba(0,0,0,.12)] sm:mx-auto sm:rounded-sm sm:border sm:border-gray-200 sm:p-10 sm:shadow-[0_2px_8px_rgba(0,0,0,.06),0_24px_56px_rgba(0,0,0,.14)]">
              <input
                value={editor.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
                placeholder="Untitled note"
                maxLength={160}
                className="mb-2 w-full bg-transparent text-2xl font-bold tracking-[-.03em] text-gray-900 outline-none placeholder:text-gray-300 sm:text-3xl"
              />
              <div className="mb-4 h-px bg-gray-100 sm:mb-6" />
              <div
                ref={contentRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                data-ph="Start writing your note here…"
                onInput={(event) => updateDraft({ content: (event.currentTarget as HTMLDivElement).innerHTML })}
                className="note-editor min-h-[50vh] flex-1 bg-transparent text-[0.95rem] leading-7 text-gray-800 outline-none sm:text-base sm:leading-8 [&_div]:mb-1 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-blue-600 [&_a]:underline"
              />
            </div>
          </div>

          {/* Action Items (Smart) */}
          {editingNote && actionItems.length > 0 && (
            <div className="mx-auto max-w-[820px] px-2 pb-8 sm:px-0">
              <div className="rounded-xl border border-(--crm-border) bg-white p-4 shadow-sm">
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
                  <input name="newItem" placeholder="Add task…" className="h-8 flex-1 rounded-lg border border-(--crm-border-input) bg-gray-50 px-3 text-xs outline-none transition-colors placeholder:text-gray-400 focus:border-(--crm-focus-border)" />
                  <button type="submit" className="rounded-lg border border-(--crm-border) bg-gray-50 px-2.5 text-xs font-semibold text-(--crm-secondary) transition-colors hover:bg-(--crm-soft)">Add</button>
                </form>
              </div>
            </div>
          )}
        </div>

        {confirmModal}
        {shareNote && (
          <NoteShareModal
            noteId={shareNote.id}
            onClose={() => setShareNote(null)}
          />
        )}
        {aiOpen && <NoteAiPanel noteId={editor.id ?? null} noteContent={editor.content} canSync={!isGuest} userName={displayName} onClose={() => setAiOpen(false)} onInsert={handleAiInsert} onSaveAsNote={handleSaveAiToNewNote} />}
        {toast && <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-(--crm-dark) px-4 py-3 text-xs font-semibold text-white shadow-xl">{toast}</div>}
      </div>
    );
  }

  // ---------------- Grid view ----------------
  return (
    <NotesShell title="Notes" subtitle="Project notes">
      <div className="crm-rise">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-[-.04em] sm:text-[1.625rem]">Project notes</h2>
            <p className="mt-1 text-sm text-(--crm-secondary)">{query.length >= 3 ? `${visibleNotes.length} ${visibleNotes.length === 1 ? "match" : "matches"} for "${query}"` : `${sortedNotes.length} ${sortedNotes.length === 1 ? "note" : "notes"} to manage your projects.`}</p>
          </div>
          <button onClick={openNew} className="flex shrink-0 items-center gap-1 rounded-md bg-(--crm-primary) px-2 py-1.5 text-[0.65rem] font-semibold text-white shadow-sm transition-all hover:bg-(--crm-dark) sm:gap-1.5 sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs"><Plus size={12} />New Note</button>
        </div>
        <div className="relative mt-3">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--crm-muted)" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes…" className="w-full rounded-xl border border-(--crm-border-input) bg-(--crm-panel) py-2.5 pl-9 pr-3 text-sm text-(--crm-fg) outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-accent) sm:max-w-[240px]" />
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
          <p className="mt-5 text-sm font-semibold text-(--crm-fg)">No notes yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-(--crm-muted)">This page is empty. Click <span className="font-semibold text-(--crm-brand)">New Note</span> in the top right to start writing your first project note.</p>
        </div>
      ) : visibleNotes.length === 0 ? (
        <div className="crm-rise mt-6 rounded-2xl border border-dashed border-(--crm-border) bg-(--crm-panel) px-6 py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-(--crm-soft) text-(--crm-text)"><Search size={24} /></div>
          <p className="mt-5 text-sm font-semibold text-(--crm-fg)">No notes found</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-(--crm-muted)">Nothing matches <span className="font-semibold text-(--crm-brand)">&ldquo;{query}&rdquo;</span>. Try different keywords.</p>
        </div>
      ) : (
        <div className="crm-rise mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-4">
          {visibleNotes.map((note) => (
            <div key={note.id} onClick={() => openNote(note)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openNote(note); } }} className="group relative flex aspect-[3/4] cursor-pointer flex-col overflow-hidden rounded-xl border border-(--crm-border-soft) bg-white p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-(--crm-border-input) hover:shadow-[0_8px_24px_rgba(0,0,0,.10)] sm:aspect-[4/5] sm:p-4">
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
            </div>
          ))}
        </div>
      )}

      {confirmModal}
      {toast && <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-(--crm-dark) px-4 py-3 text-xs font-semibold text-white shadow-xl">{toast}</div>}
    </NotesShell>
  );
}
