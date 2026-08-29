"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Bug,
  Files,
  FileCode,
  GitBranch,
  Link2,
  Maximize2,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
  Code2,
  FileText,
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

type CodeWorkspaceProps = {
  files: CodeFile[];
  activeFile: number;
  onChange: (value: string) => void;
  onSwitchFile: (index: number) => void;
  onCloseFile: (index: number) => void;
  onAddFile: () => void;
  onSwitchToNote: () => void;
  onFullscreen: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  hasActiveNote?: boolean;
  isGuest?: boolean;
};

// A self-contained VS Code–style editor surface (Monaco is the editor that
// powers VS Code, so we mirror its chrome: title bar, activity bar, explorer,
// tabs, editor area and status bar) on a dark #1e1e1e theme.
export function CodeWorkspace(props: CodeWorkspaceProps) {
  const {
    files,
    activeFile,
    onChange,
    onSwitchFile,
    onCloseFile,
    onAddFile,
    onSwitchToNote,
    onFullscreen,
    onShare,
    onDelete,
    hasActiveNote,
    isGuest,
  } = props;

  const [explorerOpen, setExplorerOpen] = useState(true);
  const current = files[activeFile];

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#1e1e1e] text-[#cccccc]">
      {/* Title bar */}
      <div className="flex h-9 shrink-0 items-center justify-between bg-[#3c3c3c] px-2 text-xs text-[#cccccc]">
        <div className="flex min-w-0 items-center gap-2">
          <Code2 size={14} className="shrink-0 text-[#4ec9b0]" />
          <span className="select-none font-semibold tracking-wide text-[#cccccc]">ZapNote</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onSwitchToNote}
            title="Switch to note editor"
            className="flex items-center gap-1 rounded px-2 py-1 text-[#cccccc] hover:bg-[#ffffff1a]"
          >
            <FileText size={14} />
          </button>
          {!isGuest && hasActiveNote && onShare && (
            <button onClick={onShare} title="Share" className="rounded px-2 py-1 hover:bg-[#ffffff1a]">
              <Link2 size={14} />
            </button>
          )}
          <button onClick={onFullscreen} title="Toggle fullscreen" className="rounded px-2 py-1 hover:bg-[#ffffff1a]">
            <Maximize2 size={14} />
          </button>
          {!isGuest && hasActiveNote && onDelete && (
            <button onClick={onDelete} title="Delete note" className="rounded px-2 py-1 text-[#f48771] hover:bg-[#ffffff1a]">
              <Trash2 size={14} />
            </button>
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

        {/* Explorer */}
        {explorerOpen && (
          <div className="flex w-60 shrink-0 flex-col bg-[#252526] text-[#cccccc]">
            <div className="px-3 pb-1 pt-2 text-[0.7rem] font-semibold uppercase tracking-wide text-[#bbbbbb]">
              Explorer
            </div>
            <div className="px-3 pb-2 text-[0.7rem] uppercase tracking-wide text-[#bbbbbb]">
              Notes
            </div>
            <div className="flex-1 overflow-y-auto px-2">
              {files.map((f, i) => (
                <button
                  key={i}
                  onClick={() => onSwitchFile(i)}
                  className={`flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs ${
                    i === activeFile ? "bg-[#37373d] text-white" : "text-[#cccccc] hover:bg-[#2a2d2e]"
                  }`}
                >
                  <FileCode size={14} className="shrink-0 text-[#4ec9b0]" />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
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
          {/* Tabs */}
          <div className="flex h-9 shrink-0 items-stretch overflow-x-auto bg-[#252526]">
            {files.map((f, i) => (
              <div
                key={i}
                className={`group flex items-center gap-2 border-r border-[#1e1e1e] pl-3 pr-1 text-xs ${
                  i === activeFile ? "bg-[#1e1e1e] text-white" : "bg-[#2d2d2d] text-[#969696] hover:bg-[#252526]"
                }`}
              >
                <button onClick={() => onSwitchFile(i)} className="flex items-center gap-2">
                  <FileCode size={14} className="text-[#4ec9b0]" />
                  <span className="max-w-[160px] truncate">{f.name}</span>
                </button>
                {files.length > 1 && (
                  <button
                    onClick={() => onCloseFile(i)}
                    className="rounded p-0.5 hover:bg-[#ffffff1a]"
                    aria-label="Close file"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
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
                options={{
                  fontSize: 13,
                  minimap: { enabled: true },
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
                No files. Click + to open a code file.
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
        <span className="ml-auto opacity-90">ZapNote · Code</span>
      </div>
    </div>
  );
}
