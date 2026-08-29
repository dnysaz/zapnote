"use client";

import { useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  FileDown,
  FileText,
  FileImage,
  FileUp,
  Italic,
  Link2,
  Loader2,
  List,
  ListOrdered,
  Lock,
  Maximize2,
  Plus,
  Printer,
  Redo2,
  Sparkles,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  Undo2,
  Wand2,
  Indent,
  Outdent,
  ArrowLeft,
} from "lucide-react";

export type EditorToolbarProps = {
  title: string;
  html: string;
  hasApiKey: boolean;
  isGuest: boolean;
  hasActiveNote: boolean;
  smartBusy: boolean;
  wordStats: { words: number; chars: number; charsNoSpace: number };
  contentRef: React.RefObject<HTMLDivElement | null>;
  onContentChange: (html: string) => void;
  onUploadHtml: (html: string, title?: string) => void;
  onBack: () => void;
  onNewNote: () => void;
  onShare: () => void;
  onDelete: () => void;
  onFullscreen: () => void;
  onAiOpen: () => void;
  onRunSmart: () => void;
  onDownloadTxt: () => void;
  onDownloadPdf: () => void;
  onDownloadWord: () => void;
  announce: (msg: string) => void;
  isCode?: boolean;
  language?: string;
  onUploadCode?: (raw: string, language: string, title?: string) => void;
};

const FONTS = [
  { label: "DM Sans", value: `"DM Sans", system-ui, sans-serif` },
  { label: "Inter", value: `Inter, system-ui, sans-serif` },
  { label: "Serif", value: `Georgia, serif` },
  { label: "Mono", value: `"Space Mono", monospace` },
  { label: "Arial", value: `Arial, Helvetica, sans-serif` },
];

const SIZES = ["12", "14", "16", "18", "20", "24", "28", "32"];

function exec(ref: React.RefObject<HTMLDivElement | null>, command: string, value?: string) {
  ref.current?.focus();
  try {
    document.execCommand(command, false, value);
  } catch {}
}

export function EditorToolbar(props: EditorToolbarProps) {
  const [fileMenu, setFileMenu] = useState(false);
  const [fontMenu, setFontMenu] = useState(false);
  const [sizeMenu, setSizeMenu] = useState(false);
  const [fileAnchor, setFileAnchor] = useState<DOMRect | null>(null);
  const [fontAnchor, setFontAnchor] = useState<DOMRect | null>(null);
  const [sizeAnchor, setSizeAnchor] = useState<DOMRect | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileBtnRef = useRef<HTMLButtonElement>(null);
  const fontBtnRef = useRef<HTMLButtonElement>(null);
  const sizeBtnRef = useRef<HTMLButtonElement>(null);
  const [fontIdx, setFontIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(2);

  const currentFont = FONTS[fontIdx];
  const currentSize = SIZES[sizeIdx];

  function applyFont(v: string, idx: number) {
    setFontIdx(idx);
    setFontMenu(false);
    exec(props.contentRef, "fontName", v);
    sync();
  }

  function applySize(v: string, idx: number) {
    setSizeIdx(idx);
    setSizeMenu(false);
    exec(props.contentRef, "fontSize", "7");
    const el = props.contentRef.current;
    if (el) {
      const fonts = el.querySelectorAll('font[size="7"]');
      fonts.forEach((f) => {
        const span = document.createElement("span");
        span.style.fontSize = `${v}px`;
        span.innerHTML = f.innerHTML;
        f.replaceWith(span);
      });
    }
    sync();
  }

  function sync() {
    const node = props.contentRef.current;
    if (node) props.onContentChange(node.innerHTML);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    const codeMap: Record<string, string> = {
      html: "html", htm: "html", css: "css", js: "javascript", jsx: "javascript",
      ts: "typescript", tsx: "typescript", py: "python", php: "php", xml: "xml",
      svg: "xml", csv: "plaintext", log: "plaintext", sh: "shell", rb: "ruby",
      go: "go", java: "java", c: "c", cpp: "cpp", h: "c", json: "json",
    };
    try {
      if (ext === "txt" || ext === "md") {
        const text = await file.text();
        const html = text
          .split(/\r?\n/)
          .map((l) => `<div>${l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") || "<br>"}</div>`)
          .join("");
        props.onUploadHtml(html, file.name.replace(/\.[^.]+$/, ""));
        props.announce(`Loaded ${file.name}`);
      } else if (ext === "docx") {
        const buf = await file.arrayBuffer();
        const { default: mammoth } = await import("mammoth");
        const res = await mammoth.convertToHtml({ arrayBuffer: buf });
        const html = res.value || "<div></div>";
        const wrapped = html
          .split(/<\/p>/i)
          .filter(Boolean)
          .map((p) => `<div>${p.replace(/<p[^>]*>/i, "")}</div>`)
          .join("");
        props.onUploadHtml(wrapped || html, file.name.replace(/\.docx$/i, ""));
        props.announce(`Imported ${file.name}`);
      } else if (ext && ext in codeMap) {
        const text = await file.text();
        props.onUploadCode?.(text, codeMap[ext], file.name.replace(/\.[^.]+$/, ""));
        props.announce(`Opened ${file.name}`);
      } else {
        props.announce("Unsupported format — use .txt, .md, .docx, .html, .css, .js, .ts, .py, .php, .xml, .json, …");
      }
    } catch {
      props.announce("Failed to open file");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileMenu(false);
  }

  function handlePrint() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${props.title}</title><style>body{font-family:${currentFont.value};padding:40px;line-height:1.7}h1{font-size:28px}</style></head><body><h1>${props.title}</h1><hr/>${props.html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  const btn = "flex items-center justify-center rounded-md p-1.5 text-(--crm-secondary) transition-colors hover:bg-(--crm-soft) hover:text-(--crm-fg) disabled:opacity-40";
  const sep = "mx-1 h-5 w-px shrink-0 bg-(--crm-border)";

  return (
    <div className="sticky top-0 z-30 w-full shrink-0 border-b border-(--crm-border) bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div className="flex flex-nowrap items-center gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:gap-1 sm:px-3 sm:py-1 sm:overflow-visible">
        <button onClick={props.onBack} className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 font-medium text-(--crm-secondary) hover:bg-(--crm-soft) hover:text-(--crm-fg)">
          <ArrowLeft size={14} /> <span className="hidden sm:inline">Back</span>
        </button>
        <span className={sep} />
        <div className="relative shrink-0">
          <button ref={fileBtnRef} onClick={() => { const open = !fileMenu; setFileMenu(open); setFileAnchor(open ? fileBtnRef.current?.getBoundingClientRect() ?? null : null); }} className="flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold text-(--crm-fg) hover:bg-(--crm-soft)">
            File <ChevronDown size={12} className={fileMenu ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
          {fileMenu && fileAnchor && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFileMenu(false)} />
              <div className="fixed z-50 mt-1 w-56 rounded-xl border border-(--crm-border) bg-white py-1 shadow-xl" style={{ top: fileAnchor.bottom + 4, left: fileAnchor.left }}>
                <button onClick={() => { fileInputRef.current?.click(); setFileMenu(false); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-(--crm-fg) hover:bg-(--crm-soft)"><FileUp size={14} /> Open / Upload…</button>
                <button onClick={() => { setFileMenu(false); props.onNewNote(); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-(--crm-fg) hover:bg-(--crm-soft)"><Plus size={14} /> New note</button>
                <div className="my-1 h-px bg-(--crm-border-soft)" />
                <button onClick={() => { setFileMenu(false); handlePrint(); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-(--crm-fg) hover:bg-(--crm-soft)"><Printer size={14} /> Print</button>
                <div className="my-1 h-px bg-(--crm-border-soft)" />
                <button onClick={() => { setFileMenu(false); props.onDownloadWord(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-(--crm-fg) hover:bg-(--crm-soft)"><FileText size={13} /> Microsoft Word (.docx)</button>
                <button onClick={() => { setFileMenu(false); props.onDownloadPdf(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-(--crm-fg) hover:bg-(--crm-soft)"><FileImage size={13} /> PDF (.pdf)</button>
                <button onClick={() => { setFileMenu(false); props.onDownloadTxt(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-(--crm-fg) hover:bg-(--crm-soft)"><FileDown size={13} /> Plain text (.txt)</button>
                <div className="my-1 h-px bg-(--crm-border-soft)" />
                {props.hasActiveNote ? (
                  <button onClick={() => { setFileMenu(false); props.onDelete(); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"><Trash2 size={14} /> Delete note</button>
                ) : null}
              </div>
            </>
          )}
          <input ref={fileInputRef} type="file" accept=".txt,.md,.html,.htm,.css,.js,.jsx,.ts,.tsx,.py,.php,.xml,.svg,.csv,.log,.json,.docx" className="hidden" onChange={handleFileUpload} />
        </div>
        <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
          <span className="rounded-full bg-(--crm-soft) px-2.5 py-0.5 text-[0.62rem] font-semibold text-(--crm-secondary)">{props.wordStats.words} words · {props.wordStats.charsNoSpace} chars</span>
        </div>
        {/* Desktop-only line break so larger screens keep a two-row layout */}
        <span className="hidden w-px sm:block sm:h-5 sm:w-full" />
        {!props.isCode && (<>
        <div className="flex shrink-0 items-center gap-1">
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec(props.contentRef, "undo"); sync(); }} className={btn} title="Undo (Ctrl+Z)"><Undo2 size={15} /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec(props.contentRef, "redo"); sync(); }} className={btn} title="Redo (Ctrl+Y)"><Redo2 size={15} /></button>
        </div>
        <div className={sep} />
        <div className="relative shrink-0">
          <button ref={fontBtnRef} onClick={() => { const open = !fontMenu; setFontMenu(open); setFontAnchor(open ? fontBtnRef.current?.getBoundingClientRect() ?? null : null); }} className="flex items-center gap-1.5 rounded-md border border-(--crm-border) bg-white px-2.5 py-1 text-xs font-medium text-(--crm-fg) hover:bg-(--crm-soft)">
            <Type size={12} /> <span className="hidden sm:inline">{currentFont.label}</span> <ChevronDown size={12} />
          </button>
          {fontMenu && fontAnchor && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFontMenu(false)} />
              <div className="fixed z-50 mt-1 w-44 rounded-lg border border-(--crm-border) bg-white py-1 shadow-lg" style={{ top: fontAnchor.bottom + 4, left: fontAnchor.left }}>
                {FONTS.map((f, i) => (
                  <button key={f.label} onClick={() => applyFont(f.value, i)} className={`flex w-full px-3 py-1.5 text-xs hover:bg-(--crm-soft) ${i === fontIdx ? "bg-(--crm-soft) font-semibold" : "text-(--crm-fg)"}`} style={{ fontFamily: f.value }}>{f.label}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="relative shrink-0">
          <button ref={sizeBtnRef} onClick={() => { const open = !sizeMenu; setSizeMenu(open); setSizeAnchor(open ? sizeBtnRef.current?.getBoundingClientRect() ?? null : null); }} className="flex items-center gap-1 rounded-md border border-(--crm-border) bg-white px-2 py-1 text-xs font-medium text-(--crm-fg) hover:bg-(--crm-soft)">
            {currentSize}px <ChevronDown size={12} />
          </button>
          {sizeMenu && sizeAnchor && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSizeMenu(false)} />
              <div className="fixed z-50 mt-1 w-24 rounded-lg border border-(--crm-border) bg-white py-1 shadow-lg" style={{ top: sizeAnchor.bottom + 4, left: sizeAnchor.left }}>
                {SIZES.map((s, i) => (
                  <button key={s} onClick={() => applySize(s, i)} className={`flex w-full px-3 py-1.5 text-xs hover:bg-(--crm-soft) ${i === sizeIdx ? "bg-(--crm-soft) font-semibold" : ""}`}>{s}px</button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className={sep} />
        <div className="flex shrink-0 items-center gap-0.5">
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec(props.contentRef, "bold"); sync(); }} className={btn} title="Bold (Ctrl+B)"><Bold size={15} /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec(props.contentRef, "italic"); sync(); }} className={btn} title="Italic (Ctrl+I)"><Italic size={15} /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec(props.contentRef, "underline"); sync(); }} className={btn} title="Underline (Ctrl+U)"><Underline size={15} /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec(props.contentRef, "strikeThrough"); sync(); }} className={btn} title="Strikethrough"><Strikethrough size={15} /></button>
        </div>
        <div className={sep} />
        <div className="flex shrink-0 items-center gap-0.5">
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec(props.contentRef, "justifyLeft"); sync(); }} className={btn} title="Align left"><AlignLeft size={15} /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec(props.contentRef, "justifyCenter"); sync(); }} className={btn} title="Center"><AlignCenter size={15} /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec(props.contentRef, "justifyRight"); sync(); }} className={btn} title="Align right"><AlignRight size={15} /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec(props.contentRef, "justifyFull"); sync(); }} className={btn} title="Justify"><AlignJustify size={15} /></button>
        </div>
        <div className={sep} />
        <div className="flex shrink-0 items-center gap-0.5">
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec(props.contentRef, "insertUnorderedList"); sync(); }} className={btn} title="Bullet list"><List size={15} /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec(props.contentRef, "insertOrderedList"); sync(); }} className={btn} title="Numbered list"><ListOrdered size={15} /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec(props.contentRef, "indent"); sync(); }} className={btn} title="Increase indent (Tab)"><Indent size={15} /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec(props.contentRef, "outdent"); sync(); }} className={btn} title="Decrease indent"><Outdent size={15} /></button>
        </div>
        </>)}
        {props.isCode && (
          <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-1 text-[0.62rem] font-semibold text-violet-700">{props.language ?? "code"}</span>
        )}
        <div className={sep} />
        <div className="flex shrink-0 items-center gap-1">
          {props.hasApiKey ? (
            <>
              <button onClick={props.onAiOpen} className="flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-violet-700">
                <Sparkles size={13} /> <span className="hidden sm:inline">AI Assistant</span>
              </button>
              <button onClick={props.onRunSmart} disabled={props.smartBusy} className="flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-40">
                {props.smartBusy ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} <span className="hidden sm:inline">Smart</span>
              </button>
            </>
          ) : (
            <a href="/app/settings" className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">
              <Lock size={13} /> <span className="hidden sm:inline">Setup AI</span>
            </a>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {!props.isGuest && props.hasActiveNote && (
            <button onClick={props.onShare} className={btn} title="Share"><Link2 size={15} /></button>
          )}
          <button onClick={props.onFullscreen} className={btn} title="Fullscreen"><Maximize2 size={15} /></button>
        </div>
      </div>

      <div className="hidden h-7 items-center justify-center border-t border-(--crm-border-soft) bg-[#f8f9fb] sm:flex">
        <div className="relative flex h-full w-full max-w-[794px] items-end justify-between gap-px overflow-hidden border-x border-white bg-[#f8f9fb] px-6">
          {Array.from({ length: 21 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={i % 5 === 0 ? "h-4 w-px bg-gray-500" : i % 1 === 0 ? "h-2.5 w-px bg-gray-300" : "h-1.5 w-px bg-gray-300"} />
              {i % 5 === 0 && <span className="mt-0.5 text-[0.48rem] font-medium leading-none text-gray-500">{i * 1}</span>}
            </div>
          ))}
          <div className="pointer-events-none absolute inset-x-6 top-[46%] h-px bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export function EditorStatusBar({ stats, draftSaved }: { stats: { words: number; chars: number; charsNoSpace: number }; draftSaved: boolean }) {
  const reading = Math.max(1, Math.ceil(stats.words / 200));
  return (
    <div className="flex items-center gap-3 border-t border-(--crm-border-soft) bg-(--crm-surface) px-3 py-1.5 text-[0.68rem] leading-none text-(--crm-muted) sm:px-5">
      <span className="font-medium text-(--crm-fg)">{stats.words} words</span>
      <span className="h-3 w-px bg-(--crm-border)" />
      <span>{stats.chars} characters</span>
      <span className="hidden sm:inline">({stats.charsNoSpace} without spaces)</span>
      <span className="h-3 w-px bg-(--crm-border) hidden sm:block" />
      <span className="hidden sm:inline">~{reading} min read</span>
      <span className="ml-auto flex items-center gap-1.5">
        {draftSaved ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" /> : <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />}
        {draftSaved ? "Saved" : "All changes saved"}
      </span>
    </div>
  );
}
