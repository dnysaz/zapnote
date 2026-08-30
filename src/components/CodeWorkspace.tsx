"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bug,
  ChevronLeft,
  ChevronRight,
  Files,
  FileCode,
  Folder,
  FolderOpen,
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

type TreeNode = {
  noteId: string;
  name: string;
  language: string;
  isFolder: boolean;
  children: TreeNode[];
};

type MenuItem = { label?: string; onClick?: () => void; danger?: boolean; separator?: boolean };

const LANGUAGES = [
  "plaintext", "javascript", "typescript", "python", "html", "css", "json", "markdown",
  "java", "c", "cpp", "csharp", "go", "rust", "php", "ruby", "sql", "shell", "yaml", "xml",
];

type CodeWorkspaceProps = {
  files: CodeFile[];
  activeFile: number;
  onChange: (value: string) => void;
  onAddFile: (name?: string) => void;
  onAddFileInFolder?: (folderId: string, name?: string) => void;
  onAddFolder?: (name?: string) => void;
  onAddFolderInFolder?: (folderId: string, name?: string) => void;
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
  onNavigateUp?: () => void;
  currentFolderName?: string;
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
    onAddFileInFolder,
    onAddFolder,
    onAddFolderInFolder,
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
    onNavigateUp,
    currentFolderName,
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [creatingItem, setCreatingItem] = useState<{ parentId: string | null; type: "file" | "folder" } | null>(null);
  const [creatingName, setCreatingName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ noteId: string; name: string } | null>(null);

  // Build tree from flat explorer items (indented with spaces from NotesView)
  const tree = useMemo(() => {
    const root: TreeNode[] = [];
    const stack: { node: TreeNode; depth: number }[] = [];

    for (const item of explorerItems) {
      const isFolder = item.language === "folder";
      const indent = item.name.length - item.name.trimStart().length;
      const depth = Math.floor(indent / 2);
      const node: TreeNode = { noteId: item.noteId, name: item.name.trimStart(), language: item.language, isFolder, children: [] };

      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();

      if (stack.length === 0) {
        root.push(node);
      } else {
        stack[stack.length - 1].node.children.push(node);
      }
      stack.push({ node, depth });
    }
    return root;
  }, [explorerItems]);

  // Track known folder IDs to expand new ones automatically
  const knownFoldersRef = useRef(new Set<string>());
  useEffect(() => {
    const currentFolderIds = new Set<string>();
    const walk = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.isFolder) { currentFolderIds.add(n.noteId); walk(n.children); }
      }
    };
    walk(tree);
    const newIds = [...currentFolderIds].filter((id) => !knownFoldersRef.current.has(id));
    if (newIds.length > 0) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        for (const id of newIds) next.add(id);
        return next;
      });
    }
    knownFoldersRef.current = currentFolderIds;
  }, [tree]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const editorRef = useRef<unknown>(null);
  const monacoRef = useRef<unknown>(null);

  const runFormat = useCallback(() => {
    (editorRef.current as { getAction?: (a: string) => { run?: () => void } } | null)?.getAction?.("editor.action.formatDocument")?.run?.();
  }, []);

  const current = files[activeFile];

  const itemForNote = (noteId: string, name: string, isFolder: boolean): MenuItem[] => {
    const items: MenuItem[] = [
      { label: "Open", onClick: () => onSelectFile(noteId) },
      { label: "Rename", onClick: () => { setEditingId(noteId); setEditValue(name); } },
      { label: "Duplicate", onClick: () => onDuplicateNote(noteId) },
      { label: "Delete", danger: true, onClick: () => setDeleteConfirm({ noteId, name }) },
      { separator: true },
      { label: "Copy Filename", onClick: () => navigator.clipboard?.writeText(name) },
      { label: "Copy Relative Path", onClick: () => navigator.clipboard?.writeText(name) },
    ];
    if (isFolder) {
      items.unshift({ separator: true });
      items.unshift({ label: "New Folder", onClick: () => { setCreatingItem({ parentId: noteId, type: "folder" }); setCreatingName(""); } });
      items.unshift({ label: "New File", onClick: () => { setCreatingItem({ parentId: noteId, type: "file" }); setCreatingName(""); } });
    }
    return items;
  };

  const commands = [
    { id: "minimap", title: "View: Toggle Minimap", run: () => setSettings((s) => ({ ...s, minimap: !s.minimap })) },
    { id: "wordwrap", title: "View: Toggle Word Wrap", run: () => setSettings((s) => ({ ...s, wordWrap: !s.wordWrap })) },
    { id: "newfile", title: "File: New File", run: onAddFile },
    ...(onAddFolder ? [{ id: "newfolder", title: "Folder: New Folder", run: onAddFolder }] : []),
    ...(onNavigateUp ? [{ id: "goup", title: "Folder: Go Up", run: onNavigateUp }] : []),
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

  const commitCreate = (raw: string) => {
    if (!creatingItem) return;
    const name = raw.trim();
    if (creatingItem.type === "file") {
      if (creatingItem.parentId) onAddFileInFolder?.(creatingItem.parentId, name);
      else onAddFile(name);
    } else {
      if (creatingItem.parentId) onAddFolderInFolder?.(creatingItem.parentId, name);
      else onAddFolder?.(name);
    }
    setCreatingItem(null);
    setCreatingName("");
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
          {onNavigateUp && (
            <button
              onClick={onNavigateUp}
              title="Go up one folder"
              className="flex items-center gap-0.5 rounded px-1.5 py-1 text-[#cccccc] hover:bg-[#ffffff1a]"
            >
              <FolderOpen size={14} className="text-[#dcb67a]" />
            </button>
          )}
          <Code2 size={14} className="shrink-0 text-[#4ec9b0]" />
          <span className="truncate text-[#cccccc]">{currentFolderName || "Workspace"}</span>
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
            <div
              className="flex-1 overflow-y-auto px-2"
              onContextMenu={(e) => {
                if (e.target === e.currentTarget || (e.target as HTMLElement).closest(".flex-1.overflow-y-auto") === e.currentTarget) {
                  e.preventDefault();
                  setCtxMenu({
                    x: e.clientX,
                    y: e.clientY,
                    items: [
                      { label: "New File", onClick: () => { setCreatingItem({ parentId: null, type: "file" }); setCreatingName(""); } },
                      { label: "New Folder", onClick: () => { setCreatingItem({ parentId: null, type: "folder" }); setCreatingName(""); } },
                    ],
                  });
                }
              }}
            >
              {tree.length === 0 && (
                <div className="px-2 py-2 text-xs text-[#6c6c6c]">No files yet</div>
              )}
              {(() => {
                const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
                  const isActive = node.noteId === activeNoteId;
                  const isEditing = editingId === node.noteId;
                  const paddingLeft = 8 + depth * 16;

                  if (node.isFolder) {
                    const isExpanded = expandedFolders.has(node.noteId);
                    return (
                      <div key={node.noteId}>
                        <button
                          onClick={() => {
                            if (isEditing) return;
                            toggleFolder(node.noteId);
                            if (onSelectFolder) onSelectFolder(node.noteId);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setCtxMenu({ x: e.clientX, y: e.clientY, items: itemForNote(node.noteId, node.name, true) });
                          }}
                          onDoubleClick={() => { if (isActive) { setEditingId(node.noteId); setEditValue(node.name); } }}
                          title={isActive ? "Double-click to rename · right-click for menu" : "Open folder"}
                          className={`flex w-full items-center gap-1 rounded-sm py-1 text-left text-xs ${
                            isActive ? "bg-[#37373d] text-white" : "text-[#cccccc] hover:bg-[#2a2d2e]"
                          }`}
                          style={{ paddingLeft }}
                        >
                          <ChevronRight
                            size={14}
                            className="shrink-0 text-[#858585] transition-transform duration-100"
                            style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                          />
                          {isExpanded ? (
                            <FolderOpen size={14} className="shrink-0 text-[#dcb67a]" />
                          ) : (
                            <Folder size={14} className="shrink-0 text-[#dcb67a]" />
                          )}
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editValue}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitRename(node.noteId, editValue)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename(node.noteId, editValue);
                                else if (e.key === "Escape") setEditingId(null);
                              }}
                              className="min-w-0 flex-1 rounded-sm border border-[#007fd4] bg-[#3c3c3c] px-1 text-xs text-white outline-none"
                            />
                          ) : (
                            <span className="truncate">{node.name}</span>
                          )}
                        </button>
                        {isExpanded && node.children.length > 0 && (
                          <div>
                            {node.children.map((child) => renderNode(child, depth + 1))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // File node
                  return (
                    <button
                      key={node.noteId}
                      onClick={() => {
                        if (isEditing) return;
                        onSelectFile(node.noteId);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setCtxMenu({ x: e.clientX, y: e.clientY, items: itemForNote(node.noteId, node.name, false) });
                      }}
                      onDoubleClick={() => { if (isActive) { setEditingId(node.noteId); setEditValue(node.name); } }}
                      title={isActive ? "Double-click to rename · right-click for menu" : "Open file · right-click for menu"}
                      className={`flex w-full items-center gap-2 rounded-sm py-1 text-left text-xs ${
                        isActive ? "bg-[#37373d] text-white" : "text-[#cccccc] hover:bg-[#2a2d2e]"
                      }`}
                      style={{ paddingLeft }}
                    >
                      <FileCode size={14} className="shrink-0 text-[#4ec9b0]" />
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editValue}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitRename(node.noteId, editValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(node.noteId, editValue);
                            else if (e.key === "Escape") setEditingId(null);
                          }}
                          className="min-w-0 flex-1 rounded-sm border border-[#007fd4] bg-[#3c3c3c] px-1 text-xs text-white outline-none"
                        />
                      ) : (
                        <span className="truncate">{node.name}</span>
                      )}
                    </button>
                  );
                };

                return tree.map((node) => renderNode(node, 0));
              })()}
              {creatingItem && (
                <div className="flex items-center gap-1 py-1" style={{ paddingLeft: 8 }}>
                  {creatingItem.type === "folder" ? (
                    <Folder size={14} className="shrink-0 text-[#dcb67a]" />
                  ) : (
                    <FileCode size={14} className="shrink-0 text-[#4ec9b0]" />
                  )}
                  <input
                    autoFocus
                    value={creatingName}
                    onChange={(e) => setCreatingName(e.target.value)}
                    onBlur={() => commitCreate(creatingName)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitCreate(creatingName);
                      else if (e.key === "Escape") { setCreatingItem(null); setCreatingName(""); }
                    }}
                    placeholder={creatingItem.type === "folder" ? "Folder name" : "File name"}
                    className="min-w-0 flex-1 rounded-sm border border-[#007fd4] bg-[#3c3c3c] px-1 text-xs text-white outline-none"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-1 m-2">
              <button
                onClick={() => { setCreatingItem({ parentId: null, type: "file" }); setCreatingName(""); }}
                className="flex flex-1 items-center justify-center gap-1 rounded-sm border border-[#3c3c3c] py-1.5 text-xs text-[#cccccc] hover:bg-[#2a2d2e]"
              >
                <Plus size={14} /> File
              </button>
              {onAddFolder && (
                <button
                  onClick={() => { setCreatingItem({ parentId: null, type: "folder" }); setCreatingName(""); }}
                  className="flex flex-1 items-center justify-center gap-1 rounded-sm border border-[#3c3c3c] py-1.5 text-xs text-[#cccccc] hover:bg-[#2a2d2e]"
                >
                  <Folder size={14} className="text-[#dcb67a]" /> Folder
                </button>
              )}
            </div>
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
                    setCtxMenu({ x: e.clientX, y: e.clientY, items: itemForNote(t.noteId, t.name, false) });
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
              onClick={() => onAddFile()}
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

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="w-[340px] rounded-lg bg-[#252526] p-4 text-[#cccccc] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold">Delete &ldquo;{deleteConfirm.name}&rdquo;?</p>
            <p className="mt-2 text-xs text-[#858585]">This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="rounded px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#2a2d2e]">Cancel</button>
              <button onClick={() => { onDeleteNote(deleteConfirm.noteId); setDeleteConfirm(null); }} className="rounded bg-[#d32f2f] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#b71c1c]">Delete</button>
            </div>
          </div>
        </div>
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
