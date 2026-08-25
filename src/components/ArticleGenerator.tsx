"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { NotesShell } from "@/components/NotesShell";
import { ConfirmModal } from "@/components/ConfirmModal";
import type { ArticleLength, ArticleStyle } from "@/lib/prompts";
import { formatDate, uid } from "@/lib/crm";

type Article = {
  id: string;
  title: string;
  content: string;
  length: string;
  keyword: string;
  links: string;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
    seoScore: number;
    summary: string;
  } | null;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
};

const LENGTHS: { key: ArticleLength; label: string; hint: string }[] = [
  { key: "short", label: "Short", hint: "300–500 words" },
  { key: "medium", label: "Medium", hint: "800–1200 words" },
  { key: "long", label: "Long", hint: "1800–2500 words" },
];
const STYLES: { key: ArticleStyle; label: string }[] = [
  { key: "casual", label: "Casual" },
  { key: "professional", label: "Professional" },
  { key: "news", label: "News" },
  { key: "humor", label: "Humor" },
  { key: "research", label: "Research" },
];

const inputCls =
  "h-10 w-full rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3 text-sm outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-focus-border) focus:ring-2 focus:ring-(--crm-focus-ring)";
const areaCls =
  "w-full rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-focus-border) focus:ring-2 focus:ring-(--crm-focus-ring)";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.08em] text-(--crm-brand)">
      {children}
    </span>
  );
}

function snippet(article: Article): string {
  const flat = article.content.replace(/[#*_`~\[\]]/g, "").replace(/\s+/g, " ").trim();
  return flat.length > 160 ? `${flat.slice(0, 160)}…` : flat;
}

export function ArticleGenerator() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Slider state: null = closed, "new" = new article form, Article = view/edit article
  const [slider, setSlider] = useState<"new" | Article | null>(null);

  // Form for generating
  const [form, setForm] = useState({
    topic: "",
    description: "",
    length: "medium" as ArticleLength,
    style: "professional" as ArticleStyle,
    keyword: "",
    links: "",
    language: "English",
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Article detail actions
  const [swotBusy, setSwotBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Article | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/ai/articles")
      .then((r) => r.json())
      .then((d: Article[]) => setArticles(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(
    () =>
      [...articles].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [articles],
  );

  const query = search.trim();
  const visibleArticles = useMemo(() => {
    if (query.length < 3) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q),
    );
  }, [sorted, query]);

  function announce(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  }

  function setField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function resetForm() {
    setForm({
      topic: "",
      description: "",
      length: "medium",
      style: "professional",
      keyword: "",
      links: "",
      language: "English",
    });
    setError("");
  }

  function openNew() {
    resetForm();
    setSlider("new");
  }

  function openArticle(article: Article) {
    setSlider(article);
  }

  // ---- Generate ----
  async function generate() {
    setError("");
    if (!form.topic.trim()) { setError("Topic is required."); return; }
    if (!form.description.trim()) { setError("Description is required."); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { markdown?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to generate.");
      // Save automatically
      const now = new Date().toISOString();
      const article: Article = {
        id: uid(),
        title: form.topic.trim(),
        content: data.markdown || "",
        length: form.length,
        keyword: form.keyword,
        links: form.links,
        swot: null,
        verified: false,
        createdAt: now,
        updatedAt: now,
      };
      const saveRes = await fetch("/api/ai/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(article),
      });
      if (saveRes.ok) {
        setArticles((p) => [article, ...p]);
        setSlider(article);
        announce("Article generated & saved");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  // ---- SWOT ----
  async function runSwot(article: Article) {
    setSwotBusy(true);
    try {
      const res = await fetch("/api/ai/swot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: article.content }),
      });
      const data = (await res.json()) as {
        strengths?: string[];
        weaknesses?: string[];
        opportunities?: string[];
        threats?: string[];
        seoScore?: number;
        summary?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "SWOT failed");
      const swot = {
        strengths: data.strengths || [],
        weaknesses: data.weaknesses || [],
        opportunities: data.opportunities || [],
        threats: data.threats || [],
        seoScore: data.seoScore || 0,
        summary: data.summary || "",
      };
      const updated = { ...article, swot };
      setArticles((p) => p.map((a) => (a.id === article.id ? updated : a)));
      setSlider((s) => (s && s !== "new" && s.id === article.id ? updated : s));
      await fetch(`/api/ai/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swot }),
      });
      announce("SWOT generated");
    } catch (e) {
      announce(e instanceof Error ? e.message : "SWOT failed");
    } finally {
      setSwotBusy(false);
    }
  }

  // ---- Delete ----
  async function deleteArticle(a: Article) {
    setArticles((p) => p.filter((x) => x.id !== a.id));
    await fetch(`/api/ai/articles/${a.id}`, { method: "DELETE" });
    setConfirmDelete(null);
    setSlider(null);
    announce("Deleted");
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    announce("Copied!");
    window.setTimeout(() => setCopied(false), 2000);
  }

  function downloadMd(text: string, title: string) {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.slice(0, 50)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    announce("Downloaded");
  }

  // =================== GRID VIEW ===================
  return (
    <NotesShell title="Articles" subtitle="AI content creation">
      <div className="vn-rise flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-[26px] font-semibold tracking-[-.04em]">Articles</h2>
          <p className="mt-1 text-sm text-(--crm-secondary)">
            {query.length >= 3
              ? `${visibleArticles.length} ${visibleArticles.length === 1 ? "match" : "matches"} for "${query}"`
              : `${sorted.length} ${sorted.length === 1 ? "article" : "articles"} generated with AI.`}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--crm-muted)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles…"
              className="w-full max-w-[240px] rounded-xl border border-(--crm-border-input) bg-(--crm-panel) py-2.5 pl-9 pr-3 text-sm text-(--crm-fg) outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-accent)"
            />
          </div>
          <button
            onClick={openNew}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-(--crm-primary) px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-(--crm-dark) hover:shadow-md"
          >
            <Plus size={16} />New Article
          </button>
        </div>
      </div>

      {/* Empty / Grid */}
      {loading ? (
        <div className="mt-10 flex min-h-[120px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--crm-soft) border-t-(--crm-mid)" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="vn-rise mt-6 rounded-2xl border border-dashed border-(--crm-border) bg-(--crm-panel) px-6 py-24 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-(--crm-soft) text-(--crm-text)">
            <PenLine size={28} />
          </div>
          <p className="mt-5 text-sm font-semibold text-(--crm-fg)">No articles yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-(--crm-muted)">
            Click <span className="font-semibold text-(--crm-brand)">New Article</span> to generate your first AI article.
          </p>
        </div>
      ) : visibleArticles.length === 0 ? (
        <div className="vn-rise mt-6 rounded-2xl border border-dashed border-(--crm-border) bg-(--crm-panel) px-6 py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-(--crm-soft) text-(--crm-text)">
            <Search size={24} />
          </div>
          <p className="mt-5 text-sm font-semibold text-(--crm-fg)">No articles found</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-(--crm-muted)">
            Nothing matches <span className="font-semibold text-(--crm-brand)">&ldquo;{query}&rdquo;</span>. Try different keywords.
          </p>
        </div>
      ) : (
        <div className="vn-rise mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {visibleArticles.map((article) => (
            <div
              key={article.id}
              onClick={() => openArticle(article)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openArticle(article); }
              }}
              className="group relative flex cursor-pointer flex-col rounded-md border border-(--crm-border-soft) bg-white p-4 text-left transition-shadow duration-200 hover:shadow-[0_3px_10px_rgba(0,0,0,.10)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--crm-soft) text-(--crm-text)">
                  <FileText size={14} />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(article); }}
                  className="shrink-0 rounded p-0.5 text-(--crm-muted) opacity-0 transition-opacity hover:bg-(--crm-danger-bg) hover:text-(--crm-danger) group-hover:opacity-100"
                  aria-label="Delete article"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="mt-3 line-clamp-2 text-sm font-semibold leading-4 text-(--crm-fg)">{article.title}</p>
              <p className="mt-2 line-clamp-3 flex-1 text-[11px] leading-4 text-(--crm-muted)">{snippet(article) || "No content."}</p>
              <div className="mt-3 flex items-center gap-2 border-t border-(--crm-border-soft) pt-2">
                <span className="rounded bg-(--crm-hover) px-1.5 py-0.5 text-[10px] font-medium capitalize text-(--crm-secondary)">{article.length}</span>
                {article.swot && (
                  <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">SWOT {article.swot.seoScore}/100</span>
                )}
                <span className="ml-auto text-[9px] font-medium uppercase tracking-[.1em] text-(--crm-faint)">{formatDate(article.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =================== RIGHT SLIDER =================== */}
      {slider !== null && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="crm-fade-in absolute inset-0 bg-(--crm-dark)/40 backdrop-blur-[2px]" onClick={() => setSlider(null)} />
          <div className="crm-slide-in relative flex h-full w-full max-w-[680px] flex-col border-l border-(--crm-border) bg-(--crm-panel) shadow-2xl">

            {/* ---- NEW ARTICLE FORM ---- */}
            {slider === "new" && (
              <>
                <div className="flex items-center justify-between border-b border-(--crm-border) px-6 py-4">
                  <h3 className="text-base font-semibold">New Article</h3>
                  <button onClick={() => setSlider(null)} className="rounded-lg p-1 text-(--crm-muted) hover:bg-(--crm-hover)"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  <div><Label>Topic *</Label><input value={form.topic} onChange={(e) => setField("topic", e.target.value)} placeholder="e.g. How to choose web hosting" className={inputCls} /></div>
                  <div><Label>Target keyword</Label><input value={form.keyword} onChange={(e) => setField("keyword", e.target.value)} placeholder="e.g. web hosting tips" className={inputCls} /></div>
                  <div><Label>Description *</Label><textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={5} placeholder="Describe the article, target reader, key points…" className={areaCls} /></div>
                  <div>
                    <Label>Article length</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {LENGTHS.map(({ key, label, hint }) => (
                        <button key={key} type="button" onClick={() => setField("length", key)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${form.length === key ? "bg-(--crm-primary) text-white shadow-sm" : "border border-(--crm-border-input) bg-(--crm-surface) text-(--crm-secondary) hover:bg-(--crm-hover)"}`}>
                          {label} <span className="opacity-70">· {hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Writing style</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {STYLES.map(({ key, label }) => (
                        <button key={key} type="button" onClick={() => setField("style", key)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${form.style === key ? "bg-(--crm-primary) text-white shadow-sm" : "border border-(--crm-border-input) bg-(--crm-surface) text-(--crm-secondary) hover:bg-(--crm-hover)"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div><Label>Links to embed</Label><textarea value={form.links} onChange={(e) => setField("links", e.target.value)} rows={2} placeholder="https://… (one per line)" className={areaCls} /></div>
                  <div><Label>Language</Label><select value={form.language} onChange={(e) => setField("language", e.target.value)} className={inputCls}><option>English</option><option>Indonesian</option><option>Bilingual</option></select></div>

                  {error && <p className="rounded-xl bg-(--crm-danger-bg) px-4 py-3 text-xs font-medium text-(--crm-danger)">{error}</p>}

                  <button onClick={() => void generate()} disabled={generating} className="flex items-center gap-2 rounded-xl bg-(--crm-primary) px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-(--crm-dark) disabled:cursor-not-allowed disabled:opacity-60">
                    <Sparkles size={16} />{generating ? "Writing…" : "Generate article"}
                  </button>
                  {generating && <div className="flex items-center gap-2 text-xs text-(--crm-muted)"><Loader2 size={14} className="animate-spin" />AI is writing your article…</div>}
                </div>
              </>
            )}

            {/* ---- ARTICLE DETAIL ---- */}
            {slider !== "new" && (
              <>
                <div className="flex items-center justify-between border-b border-(--crm-border) px-6 py-4">
                  <h3 className="truncate text-base font-semibold">{slider.title}</h3>
                  <button onClick={() => setSlider(null)} className="rounded-lg p-1 text-(--crm-muted) hover:bg-(--crm-hover)"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {slider.swot && (
                    <div className="mb-6 rounded-2xl border border-(--crm-border) bg-(--crm-surface) p-4">
                      <h4 className="text-sm font-semibold">SWOT Analysis</h4>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-green-50 p-3"><p className="font-semibold text-green-700">Strengths</p><ul className="mt-1 space-y-1">{slider.swot.strengths.map((s, i) => <li key={i}>• {s}</li>)}</ul></div>
                        <div className="rounded-xl bg-red-50 p-3"><p className="font-semibold text-red-700">Weaknesses</p><ul className="mt-1 space-y-1">{slider.swot.weaknesses.map((s, i) => <li key={i}>• {s}</li>)}</ul></div>
                        <div className="rounded-xl bg-blue-50 p-3"><p className="font-semibold text-blue-700">Opportunities</p><ul className="mt-1 space-y-1">{slider.swot.opportunities.map((s, i) => <li key={i}>• {s}</li>)}</ul></div>
                        <div className="rounded-xl bg-yellow-50 p-3"><p className="font-semibold text-yellow-700">Threats</p><ul className="mt-1 space-y-1">{slider.swot.threats.map((s, i) => <li key={i}>• {s}</li>)}</ul></div>
                      </div>
                      <p className="mt-3 text-xs text-(--crm-body)">{slider.swot.summary}</p>
                    </div>
                  )}
                  <pre className="whitespace-pre-wrap font-mono text-[13px] leading-6 text-(--crm-body)">{slider.content}</pre>
                </div>
                <div className="flex gap-2 border-t border-(--crm-border) px-6 py-4">
                  <button onClick={() => copyText(slider.content)} className="flex items-center gap-1.5 rounded-xl border border-(--crm-border-input) px-4 py-2 text-xs font-semibold text-(--crm-brand) hover:bg-(--crm-hover)"><Copy size={14} />{copied ? "Copied" : "Copy"}</button>
                  <button onClick={() => downloadMd(slider.content, slider.title)} className="flex items-center gap-1.5 rounded-xl border border-(--crm-border-input) px-4 py-2 text-xs font-semibold text-(--crm-brand) hover:bg-(--crm-hover)"><Download size={14} />.md</button>
                  <button onClick={() => void runSwot(slider)} disabled={swotBusy} className="flex items-center gap-1.5 rounded-xl border border-(--crm-border-input) px-4 py-2 text-xs font-semibold text-(--crm-brand) hover:bg-(--crm-hover) disabled:opacity-60"><Bot size={14} />{swotBusy ? "Analyzing…" : "Run SWOT"}</button>
                  <div className="flex-1" />
                  <button onClick={() => setSlider(null)} className="rounded-xl border border-(--crm-border) px-4 py-2 text-xs font-semibold text-(--crm-secondary) hover:bg-(--crm-hover)">Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete "${confirmDelete.title}"?`}
          message="This cannot be undone."
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => void deleteArticle(confirmDelete)}
        />
      )}
      {toast && <div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-(--crm-dark) px-4 py-3 text-xs font-semibold text-white shadow-xl">{toast}</div>}
    </NotesShell>
  );
}
