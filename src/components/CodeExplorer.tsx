"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Folder,
  FolderOpen,
  Grid3X3,
  List,
  Plus,
  Search,
  Trash2,
  Upload,
  Copy,
  FolderInput,
  StickyNote,
} from "lucide-react";
import { NotesShell } from "@/components/NotesShell";
import { useNotes } from "@/components/UnifiedNotesProvider";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ConfirmModal";
import {
  type Note,
  type CodeFile,
  parseCodeFiles,
  serializeCodeFiles,
  isFolderNote,
  parentIdOf,
  folderTags,
  tagsWithParent,
  uid,
} from "@/lib/crm";
import { codeLangForExt } from "@/components/EditorToolbar";

const IMAGE_VIDEO_EXTS = new Set([
  "jpg","jpeg","png","gif","bmp","svg","webp","ico","tiff","tif",
  "mp4","webm","ogg","mov","avi","mkv","flv","wmv","m4v","3gp",
]);

function isImageOrVideo(name: string): boolean {
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return IMAGE_VIDEO_EXTS.has(ext);
}

function fileExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function formatSize(chars: number): string {
  if (!chars) return "0 B";
  if (chars < 1024) return `${chars} B`;
  if (chars < 1024 * 1024) return `${(chars / 1024).toFixed(1)} KB`;
  return `${(chars / 1024 / 1024).toFixed(1)} MB`;
}

const CODE_EXT_COLORS: Record<string, { bg: string; fg: string }> = {
  php: { bg: "#777BB3", fg: "#fff" }, ts: { bg: "#3178C6", fg: "#fff" },
  tsx: { bg: "#3178C6", fg: "#fff" }, js: { bg: "#F0DB4F", fg: "#323330" },
  jsx: { bg: "#F0DB4F", fg: "#323330" }, py: { bg: "#3776AB", fg: "#fff" },
  html: { bg: "#E34F26", fg: "#fff" }, css: { bg: "#1572B6", fg: "#fff" },
  json: { bg: "#F2C200", fg: "#323330" }, java: { bg: "#E76F00", fg: "#fff" },
  go: { bg: "#00ADD8", fg: "#0b2b30" }, rb: { bg: "#CC342D", fg: "#fff" },
  c: { bg: "#00599C", fg: "#fff" }, cpp: { bg: "#00599C", fg: "#fff" },
  rs: { bg: "#DEA584", fg: "#fff" }, sh: { bg: "#4EAA25", fg: "#fff" },
  sql: { bg: "#E38C00", fg: "#fff" }, xml: { bg: "#8A9B0F", fg: "#fff" },
  md: { bg: "#5B5B5B", fg: "#fff" }, yaml: { bg: "#CB171E", fg: "#fff" },
  yml: { bg: "#CB171E", fg: "#fff" },
};

function extColor(ext: string) {
  return CODE_EXT_COLORS[ext] ?? { bg: "#3C3C3C", fg: "#fff" };
}

export function CodeExplorer() {
  const router = useRouter();
  const { notes, addNote, updateNote, deleteNote } = useNotes();

  // Navigation
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [navHistory, setNavHistory] = useState<(string | null)[]>([null]);
  const [navIndex, setNavIndex] = useState(0);

  // View
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creatingType, setCreatingType] = useState<"file" | "folder">("file");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string; isFolder: boolean } | null>(null);
  const [moveModal, setMoveModal] = useState<{ id: string; name: string; mode: "move" | "copy" } | null>(null);
  const [toast, setToast] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedTimer = useRef<number | null>(null);

  useEffect(() => () => { if (savedTimer.current) window.clearTimeout(savedTimer.current); }, []);

  function announce(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  }

  // --- Navigation ---
  function navigateTo(folderId: string | null) {
    setCurrentFolderId(folderId);
    setSelectedIds(new Set());
    setSearch("");
    setNavHistory((prev) => {
      const trimmed = prev.slice(0, navIndex + 1);
      return [...trimmed, folderId];
    });
    setNavIndex((prev) => prev + 1);
  }

  function goBack() {
    if (navIndex <= 0) return;
    const prev = navHistory[navIndex - 1];
    setNavIndex((i) => i - 1);
    setCurrentFolderId(prev);
    setSelectedIds(new Set());
  }

  function goForward() {
    if (navIndex >= navHistory.length - 1) return;
    const next = navHistory[navIndex + 1];
    setNavIndex((i) => i + 1);
    setCurrentFolderId(next);
    setSelectedIds(new Set());
  }

  function goUp() {
    if (!currentFolderId) return;
    const current = notes.find((n) => n.id === currentFolderId);
    if (!current) return;
    navigateTo(parentIdOf(current));
  }

  // --- Folder path ---
  const folderPath = useMemo(() => {
    const path: { id: string; name: string }[] = [];
    let id = currentFolderId;
    while (id) {
      const f = notes.find((n) => n.id === id);
      if (!f) break;
      path.unshift({ id: f.id, name: f.title || "Untitled" });
      id = parentIdOf(f);
    }
    return path;
  }, [currentFolderId, notes]);

  // --- Items in current folder ---
  const items = useMemo(() => {
    const inFolder = notes.filter((n) => parentIdOf(n) === (currentFolderId ?? null));
    const folders = inFolder.filter(isFolderNote).sort((a, b) => a.title.localeCompare(b.title));
    const files = inFolder.filter((n) => !isFolderNote(n)).sort((a, b) => a.title.localeCompare(b.title));
    return [...folders, ...files];
  }, [notes, currentFolderId]);

  const query = search.trim();
  const filteredItems = useMemo(() => {
    if (query.length < 1) return items;
    const q = query.toLowerCase();
    return items.filter((n) => n.title.toLowerCase().includes(q));
  }, [items, query]);

  const itemCount = filteredItems.length;
  const folderCount = filteredItems.filter(isFolderNote).length;
  const fileCount = itemCount - folderCount;

  // --- Selection ---
  function toggleSelect(id: string, multi: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(multi ? prev : []);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // --- Create ---
  function openNew(type: "file" | "folder") {
    setCreatingType(type);
    setNewName("");
    setNewOpen(true);
  }

  function doCreate() {
    const rawName = newName.trim();
    const name = creatingType === "folder"
      ? (rawName || "New Folder").replace(/\.[^.]+$/, "")
      : (rawName || "untitled");
    const now = new Date().toISOString();
    const id = uid();

    if (creatingType === "folder") {
      addNote({ id, title: name, content: "", kind: "folder", tags: folderTags(currentFolderId), createdAt: now, updatedAt: now });
    } else {
      const ext = fileExt(name);
      const language = codeLangForExt(ext);
      const seed: CodeFile[] = [{ name, language, content: "" }];
      const content = serializeCodeFiles(seed);
      addNote({ id, title: name, content, kind: "code", language, tags: tagsWithParent([], currentFolderId), createdAt: now, updatedAt: now });
    }
    setNewOpen(false);
    announce(creatingType === "folder" ? `Folder "${name}" created` : `File "${name}" created`);
  }

  // --- Upload ---
  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    Array.from(fileList).forEach((file) => {
      if (isImageOrVideo(file.name)) {
        announce(`Cannot upload images/videos: ${file.name}`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const ext = fileExt(file.name);
        const language = codeLangForExt(ext);
        const now = new Date().toISOString();
        const id = uid();
        const seed: CodeFile[] = [{ name: file.name, language, content: text }];
        const content = serializeCodeFiles(seed);
        addNote({ id, title: file.name, content, kind: "code", language, tags: tagsWithParent([], currentFolderId), createdAt: now, updatedAt: now });
        announce(`Uploaded "${file.name}"`);
      };
      reader.readAsText(file);
    });

    e.target.value = "";
  }

  // --- Delete (cascade) ---
  function cascadeDelete(noteId: string) {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;
    if (isFolderNote(target)) {
      notes
        .filter((n) => parentIdOf(n) === noteId)
        .forEach((child) => {
          if (isFolderNote(child)) cascadeDelete(child.id);
          else deleteNote(child.id);
        });
    }
    deleteNote(noteId);
  }

  function handleDeleteSingle(id: string, title: string, isFolder: boolean) {
    if (isFolder) {
      const childCount = notes.filter((n) => parentIdOf(n) === id).length;
      if (childCount === 0) {
        deleteNote(id);
        announce(`"${title}" deleted`);
      } else {
        setConfirmDelete({ id, title, isFolder: true });
      }
    } else {
      deleteNote(id);
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      announce(`"${title}" deleted`);
    }
  }

  function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    selectedIds.forEach((id) => {
      const note = notes.find((n) => n.id === id);
      if (note) cascadeDelete(id);
    });
    setSelectedIds(new Set());
    announce(`${count} item${count > 1 ? "s" : ""} deleted`);
  }

  // --- Move / Copy ---
  function moveNoteTo(noteId: string, dest: string | null) {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    if (isFolderNote(note) && dest) {
      let p: string | null = dest;
      while (p) {
        if (p === noteId) return;
        const f = notes.find((n) => n.id === p);
        p = f ? parentIdOf(f) : null;
      }
    }
    updateNote({ ...note, tags: tagsWithParent(note.tags, dest), updatedAt: new Date().toISOString() });
  }

  function copyNoteTo(noteId: string, dest: string | null) {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    if (isFolderNote(note)) {
      const clone = (srcId: string, parent: string | null) => {
        const src = notes.find((n) => n.id === srcId);
        if (!src) return;
        const newId = uid();
        const isF = isFolderNote(src);
        addNote({
          id: newId, title: src.title, content: src.content,
          kind: isF ? "folder" : "code", language: src.language,
          tags: isF ? folderTags(parent) : tagsWithParent(src.tags, parent),
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
        notes.filter((n) => parentIdOf(n) === srcId).forEach((child) => clone(child.id, newId));
      };
      clone(noteId, dest);
    } else {
      const newId = uid();
      addNote({
        ...note, id: newId,
        title: note.title.replace(/(\.[^.]+)?$/, "-copy$1"),
        tags: tagsWithParent(note.tags, dest),
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    }
  }

  // --- Open file in editor (navigate to /code with editor) ---
  function openFileInEditor(noteId: string) {
    const note = notes.find((n) => n.id === noteId);
    if (!note || isFolderNote(note)) return;
    sessionStorage.setItem("zapnote:open-file", noteId);
    router.push("/app/code/editor");
  }

  // --- Helpers ---
  function fileMeta(note: Note): { label: string; bg: string; fg: string } {
    const files = parseCodeFiles(note.content);
    const name = files?.[0]?.name ?? note.title ?? "";
    const ext = fileExt(name);
    const color = extColor(ext);
    return { label: ext ? `.${ext}` : "FILE", bg: color.bg, fg: color.fg };
  }

  // --- Keyboard shortcuts ---
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && !e.shiftKey) {
        e.preventDefault();
        setSelectedIds(new Set(filteredItems.map((n) => n.id)));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filteredItems]);

  // --- Render ---
  const canGoBack = navIndex > 0;
  const canGoForward = navIndex < navHistory.length - 1;
  const hasSelection = selectedIds.size > 0;

  return (
    <NotesShell bare title="" subtitle="">
      <div className="flex h-full flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 border-b border-(--crm-border) bg-(--crm-surface) px-3 py-2">
          {/* Nav */}
          <button onClick={goBack} disabled={!canGoBack} title="Back (Alt+Left)" className="rounded-md p-1.5 text-(--crm-muted) transition-colors hover:bg-(--crm-hover) hover:text-(--crm-fg) disabled:opacity-30 disabled:hover:bg-transparent"><ArrowLeft size={16} /></button>
          <button onClick={goForward} disabled={!canGoForward} title="Forward (Alt+Right)" className="rounded-md p-1.5 text-(--crm-muted) transition-colors hover:bg-(--crm-hover) hover:text-(--crm-fg) disabled:opacity-30 disabled:hover:bg-transparent"><ArrowRight size={16} /></button>
          <button onClick={goUp} disabled={!currentFolderId} title="Up one folder" className="rounded-md p-1.5 text-(--crm-muted) transition-colors hover:bg-(--crm-hover) hover:text-(--crm-fg) disabled:opacity-30 disabled:hover:bg-transparent"><FolderOpen size={16} /></button>

          <div className="mx-1 h-5 w-px bg-(--crm-border)" />

          {/* Actions */}
          <button onClick={() => openNew("file")} title="New File" className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-(--crm-muted) transition-colors hover:bg-(--crm-hover) hover:text-(--crm-fg)"><Plus size={14} />File</button>
          <button onClick={() => openNew("folder")} title="New Folder" className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-(--crm-muted) transition-colors hover:bg-(--crm-hover) hover:text-(--crm-fg)"><Folder size={14} />Folder</button>
          <button onClick={() => fileInputRef.current?.click()} title="Upload File" className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-(--crm-muted) transition-colors hover:bg-(--crm-hover) hover:text-(--crm-fg)"><Upload size={14} />Upload</button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />

          {hasSelection && (
            <>
              <div className="mx-1 h-5 w-px bg-(--crm-border)" />
              <button onClick={() => { const first = notes.find((n) => selectedIds.has(n.id)); if (first) setMoveModal({ id: first.id, name: first.title || "Untitled", mode: "copy" }); }} title="Copy" className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-(--crm-muted) transition-colors hover:bg-(--crm-hover) hover:text-(--crm-fg)"><Copy size={14} />Copy</button>
              <button onClick={() => { const first = notes.find((n) => selectedIds.has(n.id)); if (first) setMoveModal({ id: first.id, name: first.title || "Untitled", mode: "move" }); }} title="Move" className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-(--crm-muted) transition-colors hover:bg-(--crm-hover) hover:text-(--crm-fg)"><FolderInput size={14} />Move</button>
              <button onClick={handleDeleteSelected} title={`Delete ${selectedIds.size} item(s)`} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 size={14} />Delete</button>
            </>
          )}

          {/* Right side */}
          <div className="ml-auto flex items-center gap-1">
            <div className="relative mr-1">
              <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-(--crm-muted)" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="h-7 w-40 rounded-md border border-(--crm-border-input) bg-(--crm-panel) pl-7 pr-2 text-xs text-(--crm-fg) outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-accent) sm:w-52" />
            </div>
            <button onClick={() => setViewMode("list")} title="List view" className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-(--crm-active) text-white" : "text-(--crm-muted) hover:bg-(--crm-hover) hover:text-(--crm-fg)"}`}><List size={15} /></button>
            <button onClick={() => setViewMode("grid")} title="Grid view" className={`rounded-md p-1.5 transition-colors ${viewMode === "grid" ? "bg-(--crm-active) text-white" : "text-(--crm-muted) hover:bg-(--crm-hover) hover:text-(--crm-fg)"}`}><Grid3X3 size={15} /></button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-0.5 border-b border-(--crm-border-soft) bg-(--crm-surface) px-3 py-1.5 text-xs text-(--crm-muted)">
          <button onClick={() => navigateTo(null)} className={`rounded px-1.5 py-0.5 transition-colors ${currentFolderId === null ? "font-semibold text-(--crm-fg)" : "hover:bg-(--crm-hover) hover:text-(--crm-fg)"}`}>
            📂 Root
          </button>
          {folderPath.map((f) => (
            <span key={f.id} className="flex items-center gap-0.5">
              <ChevronRight size={12} className="text-(--crm-faint)" />
              <button onClick={() => navigateTo(f.id)} className={`rounded px-1.5 py-0.5 transition-colors ${folderPath[folderPath.length - 1]?.id === f.id ? "font-semibold text-(--crm-fg)" : "hover:bg-(--crm-hover) hover:text-(--crm-fg)"}`}>
                {f.name}
              </button>
            </span>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center justify-between bg-(--crm-surface) px-4 py-1.5 text-[0.68rem] text-(--crm-muted)">
          <span>
            {folderCount > 0 && `${folderCount} folder${folderCount > 1 ? "s" : ""}`}
            {folderCount > 0 && fileCount > 0 && " · "}
            {fileCount > 0 && `${fileCount} file${fileCount > 1 ? "s" : ""}`}
            {itemCount === 0 && "This folder is empty"}
          </span>
          {hasSelection && <span className="font-medium text-((--crm-fg)">{selectedIds.size} selected</span>}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-(--crm-bg) p-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-(--crm-soft) text-(--crm-muted)"><StickyNote size={28} /></div>
              <p className="mt-5 text-sm font-semibold text-(--crm-fg)">{query ? "No matches" : "This folder is empty"}</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-(--crm-muted)">{query ? `Nothing matches "${query}"` : "Create a new file or folder, or upload a file."}</p>
              {!query && (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => openNew("file")} className="rounded-lg bg-(--crm-primary) px-3 py-1.5 text-xs font-semibold text-white hover:bg-(--crm-dark)"><Plus size={13} className="mr-1 inline" />New File</button>
                  <button onClick={() => openNew("folder")} className="rounded-lg border border-(--crm-border) bg-(--crm-surface) px-3 py-1.5 text-xs font-semibold text-(--crm-fg) hover:bg-(--crm-soft)"><Folder size={13} className="mr-1 inline" />New Folder</button>
                </div>
              )}
            </div>
          ) : viewMode === "list" ? (
            /* List view */
            <div className="overflow-hidden rounded-xl border border-(--crm-border-soft) bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-(--crm-border-soft) text-[0.68rem] uppercase tracking-wide text-(--crm-muted)">
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Size</th>
                    <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Type</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((note) => {
                    const isFolder = isFolderNote(note);
                    const isSelected = selectedIds.has(note.id);
                    const meta = isFolder ? null : fileMeta(note);
                    const size = isFolder ? "—" : formatSize(parseCodeFiles(note.content)?.[0]?.content?.length ?? note.content?.length ?? 0);
                    return (
                      <tr
                        key={note.id}
                        onClick={(e) => {
                          if (e.detail === 2) {
                            if (isFolder) navigateTo(note.id);
                            else openFileInEditor(note.id);
                          } else {
                            toggleSelect(note.id, e.ctrlKey || e.metaKey);
                          }
                        }}
                        className={`group cursor-pointer border-b border-(--crm-border-soft) last:border-0 transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-(--crm-soft)"}`}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {isFolder ? (
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-600"><Folder size={15} /></span>
                            ) : (
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[0.55rem] font-black" style={{ background: meta!.bg, color: meta!.fg }}>{meta!.label}</span>
                            )}
                            <span className="font-medium text-(--crm-fg)">{note.title || "Untitled"}</span>
                          </div>
                        </td>
                        <td className="hidden px-4 py-2.5 tabular-nums text-(--crm-muted) sm:table-cell">{size}</td>
                        <td className="hidden px-4 py-2.5 sm:table-cell">
                          {isFolder ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.68rem] font-semibold text-amber-600">Folder</span>
                          ) : (
                            <span className="rounded-full bg-(--crm-soft) px-2 py-0.5 text-[0.68rem] font-semibold text-(--crm-secondary)">{meta!.label}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => isFolder ? navigateTo(note.id) : openFileInEditor(note.id)} className="rounded-md px-2 py-1 text-xs font-semibold text-(--crm-brand) hover:bg-(--crm-soft)">Open</button>
                            <button onClick={() => setMoveModal({ id: note.id, name: note.title || "Untitled", mode: "copy" })} className="rounded-md px-2 py-1 text-xs text-(--crm-muted) hover:bg-(--crm-soft) hover:text-(--crm-fg)">Copy</button>
                            <button onClick={() => setMoveModal({ id: note.id, name: note.title || "Untitled", mode: "move" })} className="rounded-md px-2 py-1 text-xs text-(--crm-muted) hover:bg-(--crm-soft) hover:text-(--crm-fg)">Move</button>
                            <button onClick={() => handleDeleteSingle(note.id, note.title || "Untitled", isFolder)} className="rounded-md p-1.5 text-(--crm-muted) hover:bg-red-50 hover:text-red-500" aria-label="Delete"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid view */
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredItems.map((note) => {
                const isFolder = isFolderNote(note);
                const isSelected = selectedIds.has(note.id);
                const meta = isFolder ? null : fileMeta(note);
                return (
                  <div
                    key={note.id}
                    onClick={(e) => {
                      if (e.detail === 2) {
                        if (isFolder) navigateTo(note.id);
                        else openFileInEditor(note.id);
                      } else {
                        toggleSelect(note.id, e.ctrlKey || e.metaKey);
                      }
                    }}
                    className={`group relative flex cursor-pointer flex-col items-center rounded-xl border p-3 text-center transition-all duration-150 ${
                      isSelected
                        ? "border-blue-400 bg-blue-50 shadow-sm"
                        : "border-(--crm-border-soft) bg-white hover:-translate-y-0.5 hover:border-(--crm-border-input) hover:shadow-md"
                    }`}
                  >
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSingle(note.id, note.title || "Untitled", isFolder); }} className="absolute right-1.5 top-1.5 rounded p-1 text-(--crm-muted) opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100" aria-label="Delete"><Trash2 size={12} /></button>
                    {isFolder ? (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 text-amber-500"><Folder size={28} /></div>
                        <p className="mt-2 line-clamp-2 w-full text-[0.8rem] font-medium text-(--crm-fg)">{note.title || "Untitled"}</p>
                        <p className="text-[0.65rem] text-(--crm-muted)">Folder</p>
                      </>
                    ) : (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl text-lg font-black" style={{ background: meta!.bg, color: meta!.fg }}>{meta!.label}</div>
                        <p className="mt-2 line-clamp-2 w-full text-[0.8rem] font-medium text-(--crm-fg)">{note.title || "Untitled"}</p>
                        <p className="text-[0.65rem] text-(--crm-muted)">{(parseCodeFiles(note.content)?.[0]?.language || "code").toUpperCase()}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modals */}
        {confirmDelete && (
          <ConfirmModal
            title={confirmDelete.isFolder ? `Delete folder "${confirmDelete.title}"?` : `Delete "${confirmDelete.title}"?`}
            message={confirmDelete.isFolder ? "All files and subfolders inside will also be deleted. This action cannot be undone." : "This action cannot be undone."}
            onClose={() => setConfirmDelete(null)}
            onConfirm={() => {
              cascadeDelete(confirmDelete.id);
              setSelectedIds((prev) => { const n = new Set(prev); n.delete(confirmDelete.id); return n; });
              announce(`"${confirmDelete.title}" deleted`);
              setConfirmDelete(null);
            }}
          />
        )}

        {newOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setNewOpen(false)}>
            <div className="w-[340px] rounded-xl bg-[#252526] p-4 text-[#cccccc] shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <p className="mb-2 text-sm font-semibold">{creatingType === "folder" ? "New folder" : "New file"}</p>
              <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doCreate(); if (e.key === "Escape") setNewOpen(false); }} placeholder={creatingType === "folder" ? "e.g. src, utils" : "e.g. app.ts, script.py"} className="w-full rounded-md border border-[#007fd4] bg-[#3c3c3c] px-2 py-1.5 text-sm text-white outline-none" />
              {creatingType === "file" && <p className="mt-1.5 text-[0.68rem] text-[#858585]">Language is detected from the extension.</p>}
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setNewOpen(false)} className="rounded-md px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#2a2d2e]">Cancel</button>
                <button onClick={doCreate} className="rounded-md bg-[#007fd4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1c8ad6]">Create</button>
              </div>
            </div>
          </div>
        )}

        {moveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setMoveModal(null)}>
            <div className="w-[340px] rounded-xl bg-[#252526] p-4 text-[#cccccc] shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <p className="mb-3 text-sm font-semibold">{moveModal.mode === "move" ? "Move" : "Copy"} &ldquo;{moveModal.name}&rdquo;</p>
              <p className="mb-2 text-xs text-[#858585]">Choose a destination folder:</p>
              <div className="max-h-[240px] space-y-1 overflow-y-auto">
                <button onClick={() => { if (moveModal.mode === "move") moveNoteTo(moveModal.id, null); else copyNoteTo(moveModal.id, null); setMoveModal(null); announce(moveModal.mode === "move" ? "Moved to root" : "Copied to root"); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-[#2a2d2e]">📂 Root</button>
                {notes.filter((n) => isFolderNote(n) && n.id !== moveModal.id).sort((a, b) => a.title.localeCompare(b.title)).map((folder) => (
                  <button key={folder.id} onClick={() => { if (moveModal.mode === "move") moveNoteTo(moveModal.id, folder.id); else copyNoteTo(moveModal.id, folder.id); setMoveModal(null); announce(moveModal.mode === "move" ? `Moved to ${folder.title}` : `Copied to ${folder.title}`); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-[#2a2d2e]">📁 {folder.title || "Untitled"}</button>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button onClick={() => setMoveModal(null)} className="rounded-md px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#2a2d2e]">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {toast && <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">{toast}</div>}
      </div>
    </NotesShell>
  );
}
