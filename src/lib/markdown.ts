// Minimal, dependency-free markdown -> HTML renderer.
// Escapes all HTML first, then applies a safe subset of markdown:
// headings, bold, italic, inline code, links, lists, blockquotes, hr,
// GFM-style tables and paragraphs.

const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  // Inline code
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Links: [label](https://…)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  // Bold: **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic: *text*
  out = out.replace(/(^|[\s(>])\*([^*\n]+)\*(?=[\s).,!?:;<]|$)/g, "$1<em>$2</em>");
  return out;
}

/** Split a table row like "| a | b |" into trimmed cells. */
function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((cell) => cell.trim());
}

/** A divider row like | --- | :---: | ---: | */
function isTableDivider(line: string): boolean {
  if (!line.includes("|") && !/-/.test(line)) return false;
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

type TableAlign = "left" | "center" | "right";

function parseAligns(dividerCells: string[]): TableAlign[] {
  return dividerCells.map((cell) => {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    return "left";
  });
}

function buildTable(headerCells: string[], aligns: TableAlign[], bodyRows: string[][]): string {
  const thAttr = (i: number): string => {
    const align = aligns[i % Math.max(aligns.length, 1)];
    return align && align !== "left" ? ` align="${align}"` : "";
  };
  const head = headerCells
    .map((cell, i) => `<th${thAttr(i)}>${renderInline(cell)}</th>`)
    .join("");
  const body = bodyRows
    .map(
      (row) =>
        `<tr>${row.map((cell, i) => `<td${thAttr(i)}>${renderInline(cell)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function markdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return "";
  // Already HTML (legacy content) — pass through untouched.
  if (HTML_TAG_RE.test(markdown)) return markdown;

  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let quote: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listType) {
      blocks.push(`</${listType}>`);
      listType = null;
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      blocks.push(`<blockquote><p>${renderInline(quote.join(" "))}</p></blockquote>`);
      quote = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    // Heading: # … ######
    const heading = /^(#{1,6})\s+(.+?)\s*#*$/.exec(trimmed);
    if (heading) {
      flushAll();
      const level = Math.min(heading[1].length, 4);
      blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    // Horizontal rule: --- *** ___
    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      flushAll();
      blocks.push("<hr />");
      continue;
    }

    // Blockquote: > text
    const quoted = /^>\s?(.*)$/.exec(trimmed);
    if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1]);
      continue;
    }

    // Unordered list: - / * / +
    const ulItem = /^[-*+]\s+(.+)$/.exec(trimmed);
    if (ulItem && !/^[-*+]\s+$/.test(trimmed)) {
      flushParagraph();
      flushQuote();
      if (listType !== "ul") {
        flushList();
        blocks.push("<ul>");
        listType = "ul";
      }
      blocks.push(`<li>${renderInline(ulItem[1])}</li>`);
      continue;
    }

    // Ordered list: 1. / 1)
    const olItem = /^\d{1,3}[.)]\s+(.+)$/.exec(trimmed);
    if (olItem) {
      flushParagraph();
      flushQuote();
      if (listType !== "ol") {
        flushList();
        blocks.push("<ol>");
        listType = "ol";
      }
      blocks.push(`<li>${renderInline(olItem[1])}</li>`);
      continue;
    }

    // Table: header row + divider row (+ body rows), all containing "|"
    if (trimmed.includes("|")) {
      const tableLines: string[] = [trimmed];
      let j = i + 1;
      while (j < lines.length && lines[j].trim().includes("|")) {
        tableLines.push(lines[j].trim());
        j++;
      }
      if (tableLines.length >= 2 && isTableDivider(tableLines[1])) {
        flushAll();
        const headerCells = splitTableRow(tableLines[0]);
        const dividerCells = splitTableRow(tableLines[1]);
        const aligns = parseAligns(dividerCells);
        const bodyRows = tableLines.slice(2).map(splitTableRow);
        blocks.push(buildTable(headerCells, aligns, bodyRows));
        i = j - 1;
        continue;
      }
    }

    flushList();
    flushQuote();
    paragraph.push(trimmed);
  }

  flushAll();
  return blocks.join("");
}
