"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bug,
  ChevronLeft,
  Files,
  FileCode,
  Folder,
  GitBranch,
  Link2,
  Maximize2,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
  Code2,
  Check,
} from "lucide-react";
import type { CodeFile } from "@/lib/crm";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#1e1e1e] text-xs text-[#858585]">
      Loading editor…
    </div>
  ),
});

export type ExplorerItem = { noteId: string; name: string; language: string };
export type OpenTabItem = { noteId: string; name: string; language: string };

type MenuItem = { label?: string; onClick?: () => void; danger?: boolean; separator?: boolean };

const LANGUAGES = [
  "plaintext", "javascript", "typescript", "python", "html", "css", "json", "markdown",
  "java", "c", "cpp", "csharp", "go", "rust", "php", "ruby", "sql", "shell", "yaml", "xml",
];

type CodeWorkspaceProps = {
  files: CodeFile[];
  activeFile: number;
  onChange: (value: string) => void;
  onAddFile: () => void;
  explorerItems: ExplorerItem[];
  openTabs: OpenTabItem[];
  activeNoteId: string | null | undefined;
  onSelectFile: (noteId: string) => void;
  onCloseTab: (noteId: string) => void;
  onRenameNote: (noteId: string, name: string) => void;
  onDuplicateNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onSetLanguage: (language: string) => void;
  onBack?: () => void;
  onFullscreen: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  onSelectFolder?: (folderId: string) => void;
  hasActiveNote?: boolean;
  isGuest?: boolean;
};

// A self-contained VS Code–style editor surface (Monaco is the editor that
// powers VS Code, so we mirror its chrome: title bar, activity bar, explorer,
// tabs, editor area and status bar) on a dark #1e1e1e theme. The explorer lists
// EVERY code file across /code so you can jump between them from one workspace.
export function CodeWorkspace(props: CodeWorkspaceProps) {
  const {
    files,
    activeFile,
    onChange,
    onAddFile,
    explorerItems,
    openTabs,
    activeNoteId,
    onSelectFile,
    onCloseTab,
    onRenameNote,
    onDuplicateNote,
    onDeleteNote,
    onSetLanguage,
    onBack,
    onFullscreen,
    onShare,
    onDelete,
    onSelectFolder,
    hasActiveNote,
    isGuest,
  } = props;

  const [explorerOpen, setExplorerOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [settings, setSettings] = useState({ minimap: true, wordWrap: false });
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const [gearOpen, setGearOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");

  const editorRef = useRef<unknown>(null);
  const monacoRef = useRef<unknown>(null);

  const runFormat = useCallback(() => {
    (editorRef.current as { getAction?: (a: string) => { run?: () => void } } | null)?.getAction?.("editor.action.formatDocument")?.run?.();
  }, []);

  const current = files[activeFile];

  const itemForNote = (noteId: string, name: string): MenuItem[] => [
    { label: "Open", onClick: () => onSelectFile(noteId) },
    { label: "Rename", onClick: () => { setEditingId(noteId); setEditValue(name); } },
    { label: "Duplicate", onClick: () => onDuplicateNote(noteId) },
    { label: "Delete", danger: true, onClick: () => onDeleteNote(noteId) },
    { separator: true },
    { label: "Copy Filename", onClick: () => navigator.clipboard?.writeText(name) },
    { label: "Copy Relative Path", onClick: () => navigator.clipboard?.writeText(name) },
  ];

  const commands = [
    { id: "minimap", title: "View: Toggle Minimap", run: () => setSettings((s) => ({ ...s, minimap: !s.minimap })) },
    { id: "wordwrap", title: "View: Toggle Word Wrap", run: () => setSettings((s) => ({ ...s, wordWrap: !s.wordWrap })) },
    { id: "newfile", title: "File: New File", run: onAddFile },
    ...(activeNoteId
      ? [
          { id: "rename", title: "File: Rename Active", run: () => { const it = explorerItems.find((e) => e.noteId === activeNoteId); setEditingId(activeNoteId); setEditValue(it?.name ?? ""); setGearOpen(false); } },
          { id: "duplicate", title: "File: Duplicate Active", run: () => onDuplicateNote(activeNoteId) },
          { id: "delete", title: "File: Delete Active", run: () => onDeleteNote(activeNoteId) },
        ]
      : []),
    ...LANGUAGES.map((l) => ({ id: "lang-" + l, title: "Language: " + l, run: () => onSetLanguage(l) })),
  ];

  const filteredCommands = commands.filter((c) => c.title.toLowerCase().includes(paletteQuery.toLowerCase()));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        setPaletteQuery("");
      } else if (e.key === "Escape") {
        setPaletteOpen(false);
        setGearOpen(false);
        setCtxMenu(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commitRename = (noteId: string, raw: string) => {
    const name = raw.trim();
    if (name) onRenameNote(noteId, name);
    setEditingId(null);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#1e1e1e] text-[#cccccc]">
      {/* Title bar */}
      <div className="relative flex h-9 shrink-0 items-center justify-between bg-[#3c3c3c] px-2 text-xs text-[#cccccc]">
        <div className="flex min-w-0 items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              title="Back to files"
              className="flex items-center gap-0.5 rounded px-1.5 py-1 text-[#cccccc] hover:bg-[#ffffff1a]"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <Code2 size={14} className="shrink-0 text-[#4ec9b0]" />
          <span className="truncate text-[#cccccc]">Workspace</span>
        </div>
        <div className="flex items-center gap-0.5">
          {!isGuest && hasActiveNote && onShare && (
            <button onClick={onShare} title="Share" className="rounded px-2 py-1 hover:bg-[#ffffff1a]">
              <Link2 size={14} />
            </button>
          )}
          <button onClick={() => setPaletteOpen((o) => !o)} title="Command Palette (Ctrl/Cmd+Shift+P)" className="rounded px-2 py-1 hover:bg-[#ffffff1a]">
            <Search size={14} />
          </button>
          <button onClick={() => setGearOpen((o) => !o)} title="Settings" className="rounded px-2 py-1 hover:bg-[#ffffff1a]">
            <Settings size={14} />
          </button>
          <button onClick={onFullscreen} title="Toggle fullscreen" className="rounded px-2 py-1 hover:bg-[#ffffff1a]">
            <Maximize2 size={14} />
          </button>
          {!isGuest && hasActiveNote && onDelete && (
            <button onClick={onDelete} title="Delete note" className="rounded px-2 py-1 text-[#f48771] hover:bg-[#ffffff1a]">
              <Trash2 size={14} />
            </button>
          )}

          {gearOpen && (
            <>
              <div className="fixed inset-0 z-[110]" onClick={() => setGearOpen(false)} />
              <div className="absolute right-2 top-9 z-[111] min-w-[210px] rounded-md border border-[#454545] bg-[#252526] py-1 text-xs text-[#cccccc] shadow-xl">
                <button onClick={() => { setSettings((s) => ({ ...s, minimap: !s.minimap })); setGearOpen(false); }} className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-[#2a2d2e]">
                  <span>Toggle Minimap</span> {settings.minimap && <Check size={12} />}
                </button>
                <button onClick={() => { setSettings((s) => ({ ...s, wordWrap: !s.wordWrap })); setGearOpen(false); }} className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-[#2a2d2e]">
                  <span>Toggle Word Wrap</span> {settings.wordWrap && <Check size={12} />}
                </button>
                <button onClick={() => { runFormat(); setGearOpen(false); }} className="flex w-full items-center px-3 py-1.5 text-left hover:bg-[#2a2d2e]">
                  Format Document
                </button>
                <div className="my-1 h-px bg-[#333]" />
                <button onClick={() => { setPaletteOpen(true); setPaletteQuery(""); setGearOpen(false); }} className="flex w-full items-center px-3 py-1.5 text-left hover:bg-[#2a2d2e]">
                  Command Palette…
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Activity bar */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-1 bg-[#333333] py-2 text-[#858585]">
          <button
            onClick={() => setExplorerOpen((o) => !o)}
            title="Explorer"
            className="rounded p-2 hover:text-white"
            style={explorerOpen ? { color: "#fff", boxShadow: "inset 2px 0 0 #fff" } : undefined}
          >
            <Files size={20} />
          </button>
          <button className="rounded p-2 hover:text-white" title="Search">
            <Search size={20} />
          </button>
          <button className="rounded p-2 hover:text-white" title="Source Control">
            <GitBranch size={20} />
          </button>
          <button className="rounded p-2 hover:text-white" title="Run and Debug">
            <Bug size={20} />
          </button>
          <button className="mt-auto rounded p-2 hover:text-white" title="Settings">
            <Settings size={20} />
          </button>
        </div>

        {/* Explorer — folder-aware listing */}
        {explorerOpen && (
          <div className="flex w-60 shrink-0 flex-col bg-[#252526] text-[#cccccc]">
            <div className="px-3 pb-1 pt-2 text-[0.7rem] font-semibold uppercase tracking-wide text-[#bbbbbb]">
              Explorer
            </div>
            <div className="px-3 pb-2 text-[0.7rem] uppercase tracking-wide text-[#bbbbbb]">CODE</div>
            <div className="flex-1 overflow-y-auto px-2">
              {explorerItems.length === 0 && (
                <div className="px-2 py-2 text-xs text-[#6c6c6c]">No files yet</div>
              )}
              {explorerItems.map((item) => {
                const isActive = item.noteId === activeNoteId;
                const isEditing = editingId === item.noteId;
                const isFolder = item.language === "folder";
                return (
                  <button
                    key={item.noteId}
                    onClick={() => {
                      if (isEditing) return;
                      if (isFolder && onSelectFolder) onSelectFolder(item.noteId);
                      else onSelectFile(item.noteId);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setCtxMenu({ x: e.clientX, y: e.clientY, items: itemForNote(item.noteId, item.name) });
                    }}
                    onDoubleClick={() => { if (isActive) { setEditingId(item.noteId); setEditValue(item.name); } }}
                    title={isActive ? "Double-click to rename · right-click for menu" : isFolder ? "Open folder" : "Open file · right-click for menu"}
                    className={`flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs ${
                      isActive ? "bg-[#37373d] text-white" : "text-[#cccccc] hover:bg-[#2a2d2e]"
                    }`}
                  >
                    {isFolder ? (
                      <Folder size={14} className="shrink-0 text-[#dcb67a]" />
                    ) : (
                      <FileCode size={14} className="shrink-0 text-[#4ec9b0]" />
                    )}
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editValue}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitRename(item.noteId, editValue)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(item.noteId, editValue);
                          else if (e.key === "Escape") setEditingId(null);
                        }}
                        className="min-w-0 flex-1 rounded-sm border border-[#007fd4] bg-[#3c3c3c] px-1 text-xs text-white outline-none"
                      />
                    ) : (
                      <span className="truncate">{isFolder ? item.name : item.name}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={onAddFile}
              className="m-2 flex items-center justify-center gap-1 rounded-sm border border-[#3c3c3c] py-1.5 text-xs text-[#cccccc] hover:bg-[#2a2d2e]"
            >
              <Plus size={14} /> Add file
            </button>
          </div>
        )}

        {/* Editor column */}
        <div className="flex min-h-0 flex-1 flex-col bg-[#1e1e1e]">
          {/* Tabs — opened files (across notes) */}
          <div className="flex h-9 shrink-0 items-stretch overflow-x-auto bg-[#252526]">
            {openTabs.map((t) => {
              const isActive = t.noteId === activeNoteId;
              return (
                <div
                  key={t.noteId}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setCtxMenu({ x: e.clientX, y: e.clientY, items: itemForNote(t.noteId, t.name) });
                  }}
                  className={`group flex items-center gap-2 border-r border-[#1e1e1e] pl-3 pr-1 text-xs ${
                    isActive ? "bg-[#1e1e1e] text-white" : "bg-[#2d2d2d] text-[#969696] hover:bg-[#252526]"
                  }`}
                >
                  <button onClick={() => onSelectFile(t.noteId)} className="flex items-center gap-2">
                    <FileCode size={14} className="text-[#4ec9b0]" />
                    <span className="max-w-[160px] truncate">{t.name}</span>
                  </button>
                  <button
                    onClick={() => onCloseTab(t.noteId)}
                    className="rounded p-0.5 hover:bg-[#ffffff1a]"
                    aria-label="Close file"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
            <button
              onClick={onAddFile}
              className="flex items-center px-3 text-xs text-[#969696] hover:bg-[#2d2d2d] hover:text-white"
              title="New file"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Monaco */}
          <div className="min-h-0 flex-1">
            {current ? (
              <MonacoEditor
                height="100%"
                theme="vs-dark"
                language={current.language || "plaintext"}
                value={current.content}
                onChange={(v) => onChange(v ?? "")}
                onMount={(ed, monaco) => {
                  editorRef.current = ed;
                  monacoRef.current = monaco;
                }}
                options={{
                  fontSize: 13,
                  minimap: { enabled: settings.minimap },
                  wordWrap: settings.wordWrap ? "on" : "off",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  renderWhitespace: "selection",
                  smoothScrolling: true,
                  fontLigatures: true,
                  cursorBlinking: "smooth",
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#858585]">
                No file open. Select a file from the explorer.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex h-6 shrink-0 items-center gap-4 bg-[#007acc] px-3 text-[0.7rem] text-white">
        <span className="font-semibold">{current ? current.language || "plaintext" : "—"}</span>
        <span>UTF-8</span>
        <span>{current ? current.name : "—"}</span>
        <span
          className="cursor-pointer hover:underline"
          onClick={() => setSettings((s) => ({ ...s, wordWrap: !s.wordWrap }))}
        >
          {settings.wordWrap ? "Word Wrap" : "—"}
        </span>
        <span
          className="cursor-pointer hover:underline"
          onClick={() => setSettings((s) => ({ ...s, minimap: !s.minimap }))}
        >
          {settings.minimap ? "Minimap" : "—"}
        </span>
        <span className="ml-auto opacity-90">ZapNote · Code</span>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <>
          <div
            className="fixed inset-0 z-[120]"
            onClick={() => setCtxMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }}
          />
          <div
            className="fixed z-[121] min-w-[190px] rounded-md border border-[#454545] bg-[#252526] py-1 text-xs text-[#cccccc] shadow-xl"
            style={{ top: ctxMenu.y, left: ctxMenu.x }}
          >
            {ctxMenu.items.map((it, idx) =>
              it.separator ? (
                <div key={idx} className="my-1 h-px bg-[#333]" />
              ) : (
                <button
                  key={idx}
                  onClick={() => { it.onClick?.(); setCtxMenu(null); }}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-[#2a2d2e] ${it.danger ? "text-[#f48771]" : ""}`}
                >
                  {it.label}
                </button>
              )
            )}
          </div>
        </>
      )}

      {/* Command palette */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-start justify-center bg-black/40 pt-[12vh]"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="w-[540px] max-w-[92vw] overflow-hidden rounded-md border border-[#454545] bg-[#252526] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={paletteQuery}
              onChange={(e) => setPaletteQuery(e.target.value)}
              placeholder="Type a command…"
              className="w-full border-b border-[#333] bg-[#3c3c3c] px-3 py-2.5 text-sm text-white outline-none"
            />
            <div className="max-h-72 overflow-y-auto py-1">
              {filteredCommands.length === 0 && (
                <div className="px-3 py-2 text-xs text-[#6c6c6c]">No matching commands</div>
              )}
              {filteredCommands.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { c.run(); setPaletteOpen(false); }}
                  className="flex w-full items-center px-3 py-1.5 text-left text-xs text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white"
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
