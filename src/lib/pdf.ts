import { jsPDF } from "jspdf";

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const c = hex.replace("#", "");
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

function cssVar(name: string, fallback: RGB): RGB {
  if (typeof document === "undefined") return fallback;
  try {
    const probe = document.createElement("div");
    probe.style.color = `var(${name})`;
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    const m = resolved.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  } catch {}
  return fallback;
}

const INK_DEF: RGB = [51, 78, 69];
const BORDER_DEF: RGB = [227, 233, 228];
let INK: RGB = INK_DEF;
let BORDER: RGB = BORDER_DEF;

function refreshTheme() {
  INK = cssVar("--crm-fg", INK_DEF);
  BORDER = cssVar("--crm-border-input", BORDER_DEF);
}

function setFontSafe(doc: jsPDF, family: "DMSans" | "DMSansSemi" | "helvetica", style: "normal" | "bold" = "normal") {
  try { doc.setFont(family, style); } catch { doc.setFont("helvetica", style); }
}

let fontsPromise: Promise<Record<string, string> | null> | null = null;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

async function loadFonts(): Promise<Record<string, string>> {
  const files: Record<string, string> = { dm400: "/fonts/dm-sans-400.ttf", dm600: "/fonts/dm-sans-600.ttf", dm700: "/fonts/dm-sans-700.ttf" };
  const out: Record<string, string> = {};
  await Promise.all(Object.entries(files).map(async ([key, url]) => {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    out[key] = bytesToBase64(new Uint8Array(buf));
  }));
  return out;
}

async function ensureFonts(doc: jsPDF): Promise<void> {
  fontsPromise ??= loadFonts().catch(() => null);
  const f = await fontsPromise;
  if (!f) return;
  try {
    doc.addFileToVFS("dm400.ttf", f.dm400);
    doc.addFont("dm400.ttf", "DMSans", "normal");
    doc.addFileToVFS("dm600.ttf", f.dm600);
    doc.addFont("dm600.ttf", "DMSansSemi", "normal");
    doc.addFileToVFS("dm700.ttf", f.dm700);
    doc.addFont("dm700.ttf", "DMSans", "bold");
  } catch {}
}

function collectRuns(node: ChildNode): { text: string; bold: boolean; italic: boolean; underline: boolean }[] {
  if (node.nodeType === 3) {
    const t = node.textContent || "";
    return t ? [{ text: t, bold: false, italic: false, underline: false }] : [];
  }
  if (node.nodeType !== 1) return [];
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const isBold = tag === "b" || tag === "strong";
  const isItalic = tag === "i" || tag === "em";
  const isUnderline = tag === "u";
  const runs: { text: string; bold: boolean; italic: boolean; underline: boolean }[] = [];
  for (const child of el.childNodes) {
    for (const r of collectRuns(child)) {
      runs.push({ text: r.text, bold: r.bold || isBold, italic: r.italic || isItalic, underline: r.underline || isUnderline });
    }
  }
  return runs;
}

function renderRun(doc: jsPDF, run: { text: string; bold: boolean; italic: boolean; underline: boolean }, x: number, y: number): number {
  setFontSafe(doc, "DMSans", run.bold ? "bold" : "normal");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(run.text, x, y);
  const tw = doc.getTextWidth(run.text);
  if (run.underline) {
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.25);
    doc.line(x, y + 0.6, x + tw, y + 0.6);
  }
  return x + tw;
}

function renderBlock(doc: jsPDF, el: HTMLElement, y: number, w: number, pageBreak: () => number): number {
  const tag = el.tagName.toLowerCase();

  if (tag === "ul" || tag === "ol") {
    const items = el.querySelectorAll(":scope > li");
    let idx = 0;
    items.forEach((li) => {
      idx++;
      if (y + 6 > pageBreak()) { doc.addPage(); y = 22; }
      const bullet = tag === "ol" ? `${idx}. ` : "\u2022  ";
      const runs = collectRuns(li);
      setFontSafe(doc, "DMSans", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.text(bullet, 11, y);
      let x = 11 + doc.getTextWidth(bullet);
      for (const run of runs) {
        const words = run.text.split(/(\s)/);
        for (const word of words) {
          setFontSafe(doc, "DMSans", run.bold ? "bold" : "normal");
          doc.setFontSize(11);
          const ww = doc.getTextWidth(word);
          if (x + ww > 11 + w && word.trim()) { y += 5; if (y > pageBreak()) { doc.addPage(); y = 22; } x = 17; }
          x = renderRun(doc, { text: word, bold: run.bold, italic: run.italic, underline: run.underline }, x, y);
        }
      }
      y += 6;
    });
    return y + 2;
  }

  const runs: { text: string; bold: boolean; italic: boolean; underline: boolean; br?: boolean }[] = [];
  function walkInline(node: ChildNode) {
    if (node.nodeType === 3) {
      const t = node.textContent || "";
      if (t) runs.push({ text: t, bold: false, italic: false, underline: false });
    } else if (node.nodeType === 1) {
      const n = node as HTMLElement;
      const t = n.tagName.toLowerCase();
      if (t === "br") { runs.push({ text: "", bold: false, italic: false, underline: false, br: true }); }
      else {
        const isBold = t === "b" || t === "strong";
        const isItalic = t === "i" || t === "em";
        const isUnderline = t === "u";
        for (const child of n.childNodes) {
          for (const r of collectRuns(child)) {
            runs.push({ text: r.text, bold: r.bold || isBold, italic: r.italic || isItalic, underline: r.underline || isUnderline });
          }
        }
      }
    }
  }
  for (const child of el.childNodes) walkInline(child);

  const hasContent = runs.some((r) => (r.text && r.text.trim()) || r.br);
  if (!hasContent) return y + 8;

  let x = 11;
  for (const run of runs) {
    if (run.br) { y += 5; if (y > pageBreak()) { doc.addPage(); y = 22; } x = 11; continue; }
    const words = run.text.split(/(\s)/);
    for (const word of words) {
      setFontSafe(doc, "DMSans", run.bold ? "bold" : "normal");
      doc.setFontSize(11);
      const ww = doc.getTextWidth(word);
      if (x + ww > 11 + w && word.trim()) { y += 5; if (y > pageBreak()) { doc.addPage(); y = 22; } x = 11; }
      x = renderRun(doc, { text: word, bold: run.bold, italic: run.italic, underline: run.underline }, x, y);
    }
  }
  return y + 5;
}

export async function buildNotePdf(note: { title: string; content: string }): Promise<jsPDF> {
  refreshTheme();
  const doc = new jsPDF();
  await ensureFonts(doc);
  const w = doc.internal.pageSize.getWidth() - 22;
  const pageBreak = () => doc.internal.pageSize.getHeight() - 20;

  let y = 24;
  setFontSafe(doc, "DMSans", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  const titleLines = doc.splitTextToSize(note.title || "Untitled note", w) as string[];
  for (const line of titleLines) { doc.text(line, 11, y); y += 9; }
  y += 4;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(11, y, 11 + w, y);
  y += 8;

  const parsed = new DOMParser().parseFromString(note.content || "<div></div>", "text/html");
  const children = Array.from(parsed.body.childNodes);
  for (const child of children) {
    if (child.nodeType === 3) {
      const text = (child.textContent || "").trim();
      if (!text) continue;
      if (y + 6 > pageBreak()) { doc.addPage(); y = 22; }
      setFontSafe(doc, "DMSans", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(text, w) as string[];
      for (const line of lines) { if (y > pageBreak()) { doc.addPage(); y = 22; } doc.text(line, 11, y); y += 5; }
      y += 3;
    } else if (child.nodeType === 1) {
      if (y + 6 > pageBreak()) { doc.addPage(); y = 22; }
      y = renderBlock(doc, child as HTMLElement, y, w, pageBreak);
    }
  }
  return doc;
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}
