"use client";

import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { buildNotePdf, downloadPdf } from "@/lib/pdf";
import { THEMES, THEME_VAR_KEYS } from "@/lib/settings";
import type { ThemeKey } from "@/lib/settings";

type Article = { id: string; title: string; content: string };

function toHtmlBlocks(html: string): string {
  if (/<\/?[a-z][\s\S]*>/i.test(html)) return html;
  if (!html.trim()) return "";
  return html
    .split(/\r?\n/)
    .map((line) => `<div>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}</div>`)
    .join("");
}

export default function ShareArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Apply theme
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: { theme?: ThemeKey }) => {
        if (data.theme && THEMES[data.theme]) {
          const colors = THEMES[data.theme];
          const root = document.documentElement;
          for (const key of THEME_VAR_KEYS) {
            root.style.setProperty(`--crm-${key}`, colors[key]);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch article
  useEffect(() => {
    (async () => {
      try {
        const { id } = await params;
        const res = await fetch(`/api/shares/${id}`);
        if (!res.ok) { setError("Share link not found or has been revoked."); return; }
        const data = await res.json();
        if (data.docType === "article" && data.doc) setArticle(data.doc);
        else setError("This share link is not for an article.");
      } catch { setError("Failed to load article."); } finally { setLoading(false); }
    })();
  }, [params]);

  async function handleDownloadPdf() {
    if (!article) return;
    setDownloading(true);
    try {
      const doc = await buildNotePdf({ title: article.title, content: article.content });
      downloadPdf(doc, `${article.title.slice(0, 50)}.pdf`);
    } catch { /* ignore */ }
    setDownloading(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="text-center">
          <FileText size={32} className="mx-auto text-gray-300" />
          <h1 className="mt-4 text-lg font-semibold text-gray-800">Article not found</h1>
          <p className="mt-1 text-sm text-gray-500">{error || "This article doesn't exist or has been deleted."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-10 sm:py-14">
        {/* Title */}
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {article.title || "Untitled article"}
        </h1>

        {/* Content */}
        <div
          className="mt-8 text-base leading-8 text-gray-800 [&_div]:mb-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-blue-600 [&_a]:underline [&_strong]:font-semibold [&_em]:italic"
          dangerouslySetInnerHTML={{ __html: toHtmlBlocks(article.content) }}
        />

        {/* Download PDF button */}
        <div className="mt-12 border-t border-gray-200 pt-6">
          <button
            onClick={() => void handleDownloadPdf()}
            disabled={downloading}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-800 disabled:opacity-60"
          >
            <Download size={16} />
            {downloading ? "Generating PDF…" : "Download as PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
