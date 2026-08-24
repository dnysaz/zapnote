import { Document, Packer, Paragraph, TextRun } from "docx";

function collectRunsFromHtml(node: ChildNode): { text: string; bold: boolean; italic: boolean; underline: boolean }[] {
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
    for (const r of collectRunsFromHtml(child)) {
      runs.push({ text: r.text, bold: r.bold || isBold, italic: r.italic || isItalic, underline: r.underline || isUnderline });
    }
  }
  return runs;
}

function runsToTextRuns(runs: { text: string; bold: boolean; italic: boolean; underline: boolean }[]): TextRun[] {
  return runs.map((r) =>
    new TextRun({
      text: r.text,
      ...(r.bold ? { bold: true } : {}),
      ...(r.italic ? { italics: true } : {}),
      ...(r.underline ? { underline: {} } : {}),
    }),
  );
}

export async function buildNoteDocxBlob(info: { title: string; content: string }): Promise<Blob> {
  const parsed = new DOMParser().parseFromString(info.content || "<div></div>", "text/html");
  const body = parsed.body;
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: info.title || "Untitled note", bold: true, size: 40, font: "Calibri" })],
      spacing: { after: 200 },
    }),
  );

  for (const child of Array.from(body.childNodes)) {
    if (child.nodeType === 3) {
      const text = (child.textContent || "").trim();
      if (!text) continue;
      children.push(new Paragraph({ children: [new TextRun({ text, size: 22, font: "Calibri" })], spacing: { after: 120 } }));
    } else if (child.nodeType === 1) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === "ul") {
        el.querySelectorAll(":scope > li").forEach((li) => {
          children.push(new Paragraph({ children: runsToTextRuns(collectRunsFromHtml(li)), bullet: { level: 0 }, spacing: { after: 60 } }));
        });
      } else if (tag === "ol") {
        el.querySelectorAll(":scope > li").forEach((li, idx) => {
          children.push(new Paragraph({ children: [new TextRun({ text: `${idx + 1}. `, size: 22, font: "Calibri" }), ...runsToTextRuns(collectRunsFromHtml(li))], spacing: { after: 60 } }));
        });
      } else {
        const runs = collectRunsFromHtml(el);
        if (runs.length) children.push(new Paragraph({ children: runsToTextRuns(runs), spacing: { after: 120 } }));
      }
    }
  }

  const doc = new Document({
    creator: "ViNotes",
    title: info.title,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ children }],
  });
  return Packer.toBlob(doc);
}
