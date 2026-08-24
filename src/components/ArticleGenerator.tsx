"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Check, Copy, Download, FileText, Loader2, PenLine, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { NotesShell } from "@/components/NotesShell";
import { ConfirmModal } from "@/components/ConfirmModal";
import type { ArticleLength, ArticleStyle } from "@/lib/prompts";
import { formatDate, uid } from "@/lib/crm";

type Article = {
  id: string; title: string; content: string; length: string; keyword: string; links: string;
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[]; seoScore: number; summary: string } | null;
  verified: boolean; createdAt: string; updatedAt: string;
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
const inputCls = "h-10 w-full rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3 text-sm outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-focus-border) focus:ring-2 focus:ring-(--crm-focus-ring)";
const areaCls = "w-full rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-focus-border) focus:ring-2 focus:ring-(--crm-focus-ring)";

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.08em] text-(--crm-brand)">{children}</span>;
}

export function ArticleGenerator() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ topic: "", description: "", length: "medium" as ArticleLength, style: "professional" as ArticleStyle, keyword: "", links: "", language: "English" });
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<{ markdown: string; topic: string } | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Article | null>(null);
  const [detail, setDetail] = useState<Article | null>(null);
  const [swotBusy, setSwotBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/ai/articles").then((r) => r.json()).then((d: Article[]) => setArticles(d)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => [...articles].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [articles]);

  function announce(msg: string) { setToast(msg); window.setTimeout(() => setToast(""), 2600); }
  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { setForm((p) => ({ ...p, [key]: value })); }

  async function generate() {
    setError("");
    if (!form.topic.trim()) { setError("Topic is required."); return; }
    if (!form.description.trim()) { setError("Description is required."); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/article", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json() as { markdown?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to generate.");
      setDraft({ markdown: data.markdown || "", topic: form.topic.trim() });
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); } finally { setGenerating(false); }
  }

  async function saveArticle() {
    if (!draft) return;
    const now = new Date().toISOString();
    const article: Article = { id: uid(), title: draft.topic, content: draft.markdown, length: form.length, keyword: form.keyword, links: form.links, swot: null, verified: false, createdAt: now, updatedAt: now };
    const res = await fetch("/api/ai/articles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(article) });
    if (res.ok) { setArticles((p) => [article, ...p]); setDraft(null); announce("Article saved"); }
    else announce("Failed to save");
  }

  async function runSwot(article: Article) {
    setSwotBusy(true);
    try {
      const res = await fetch("/api/ai/swot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: article.content }) });
      const data = await res.json() as { strengths?: string[]; weaknesses?: string[]; opportunities?: string[]; threats?: string[]; seoScore?: number; summary?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "SWOT failed");
      const swot = { strengths: data.strengths || [], weaknesses: data.weaknesses || [], opportunities: data.opportunities || [], threats: data.threats || [], seoScore: data.seoScore || 0, summary: data.summary || "" };
      const updated = { ...article, swot };
      setArticles((p) => p.map((a) => a.id === article.id ? updated : a));
      setDetail((d) => d?.id === article.id ? updated : d);
      await fetch(`/api/ai/articles/${article.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ swot }) });
      announce("SWOT generated");
    } catch (e) { announce(e instanceof Error ? e.message : "SWOT failed"); } finally { setSwotBusy(false); }
  }

  async function deleteArticle(a: Article) {
    setArticles((p) => p.filter((x) => x.id !== a.id));
    await fetch(`/api/ai/articles/${a.id}`, { method: "DELETE" });
    setConfirmDelete(null); setDetail(null); announce("Deleted");
  }

  async function copyText(text: string) { await navigator.clipboard.writeText(text); setCopied(true); announce("Copied!"); window.setTimeout(() => setCopied(false), 2000); }

  function downloadMd(text: string, title: string) {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${title.slice(0, 50)}.md`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); announce("Downloaded");
  }

  return (
    <NotesShell title="Article Generator" subtitle="AI content creation">
      <div className="vn-rise flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-[26px] font-semibold tracking-[-.04em]">Article Generator</h2>
          <p className="mt-1 text-sm text-(--crm-secondary)">Generate AI articles, save them, and run SWOT analysis.</p>
        </div>
      </div>

      {/* Generator form */}
      <div className="vn-rise mt-6 grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-(--crm-border) bg-(--crm-panel) p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--crm-soft) text-(--crm-text)"><PenLine size={16} /></div>
            <div>
              <h3 className="text-sm font-semibold">Article brief</h3>
              <p className="mt-0.5 text-xs text-(--crm-muted)">Describe the topic — AI writes the article.</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
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
            <button onClick={() => void generate()} disabled={generating} className="flex items-center gap-2 rounded-xl bg-(--crm-primary) px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-(--crm-dark) disabled:cursor-not-allowed disabled:opacity-60">
              <Sparkles size={16} />{generating ? "Writing…" : "Generate article"}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="xl:sticky xl:top-[88px] xl:self-start">
          {draft ? (
            <div className="rounded-2xl border border-(--crm-border) bg-(--crm-panel) p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-semibold">{draft.topic}</span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => copyText(draft.markdown)} className="flex items-center gap-1 rounded-xl border border-(--crm-border-input) px-3 py-1.5 text-xs font-semibold text-(--crm-brand) hover:bg-(--crm-hover)"><Copy size={13} />{copied ? "Copied" : "Copy"}</button>
                  <button onClick={() => downloadMd(draft.markdown, draft.topic)} className="flex items-center gap-1 rounded-xl border border-(--crm-border-input) px-3 py-1.5 text-xs font-semibold text-(--crm-brand) hover:bg-(--crm-hover)"><Download size={13} />.md</button>
                  <button onClick={() => void generate()} disabled={generating} className="flex items-center gap-1 rounded-xl border border-(--crm-border-input) px-3 py-1.5 text-xs font-semibold text-(--crm-brand) hover:bg-(--crm-hover) disabled:opacity-60"><RefreshCw size={13} className={generating ? "animate-spin" : ""} />Regen</button>
                  <button onClick={() => setDraft(null)} className="flex items-center gap-1 rounded-xl border border-(--crm-border-input) px-3 py-1.5 text-xs font-semibold text-(--crm-secondary) hover:bg-(--crm-hover)"><X size={13} />Edit</button>
                </div>
              </div>
              <button onClick={() => void saveArticle()} className="mt-3 flex items-center gap-2 rounded-xl bg-(--crm-primary) px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-(--crm-dark)"><Check size={15} />Save article</button>
              <pre className="mt-4 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl border border-(--crm-border) bg-(--crm-surface) p-4 font-mono text-[13px] leading-6 text-(--crm-body)">{draft.markdown}</pre>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-(--crm-border) bg-(--crm-panel) px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-(--crm-soft) text-(--crm-text)"><PenLine size={26} /></div>
              <p className="mt-5 text-sm font-semibold">{generating ? "Writing your article…" : "Your article will appear here"}</p>
              {generating && <Loader2 size={20} className="mx-auto mt-4 animate-spin text-(--crm-mid)" />}
            </div>
          )}
        </div>
      </div>

      {/* Saved articles */}
      <div className="vn-rise mt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Saved articles</h3>
          <span className="text-xs text-(--crm-muted)">{articles.length} article{articles.length === 1 ? "" : "s"}</span>
        </div>
        {loading ? (
          <div className="mt-4 flex min-h-[80px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-(--crm-soft) border-t-(--crm-mid)" /></div>
        ) : articles.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-(--crm-border) bg-(--crm-panel) px-6 py-10 text-center text-xs text-(--crm-muted)">No articles yet — generate one above.</div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-(--crm-border) bg-(--crm-panel)">
            <table className="w-full text-left">
              <thead><tr className="text-[10px] font-semibold uppercase tracking-[.12em] text-(--crm-label)">
                <th className="px-6 py-4">Title</th><th className="px-4 py-4">Length</th><th className="px-4 py-4">SWOT</th><th className="px-4 py-4">Updated</th><th className="px-4 py-4 text-right">Actions</th>
              </tr></thead>
              <tbody>{sorted.map((a) => (
                <tr key={a.id} className="border-t border-(--crm-border-soft)">
                  <td className="max-w-[260px] px-6 py-3.5"><button onClick={() => setDetail(a)} className="truncate text-sm font-semibold text-(--crm-fg) hover:text-(--crm-brand)">{a.title}</button></td>
                  <td className="px-4 py-3.5 text-xs capitalize text-(--crm-secondary)">{a.length}</td>
                  <td className="px-4 py-3.5 text-xs">{a.swot ? <span className="rounded-lg border border-(--crm-st-done-text) bg-(--crm-st-done-bg) px-2 py-0.5 text-[11px] font-semibold text-(--crm-st-done-text)">{a.swot.seoScore}/100</span> : <span className="text-(--crm-faint)">—</span>}</td>
                  <td className="px-4 py-3.5 text-xs text-(--crm-muted)">{formatDate(a.updatedAt)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => void runSwot(a)} disabled={swotBusy} className="rounded-lg p-2 text-(--crm-muted) hover:bg-(--crm-soft) hover:text-(--crm-text) disabled:opacity-60" title="Run SWOT"><Bot size={14} /></button>
                      <button onClick={() => setConfirmDelete(a)} className="rounded-lg p-2 text-(--crm-muted) hover:bg-(--crm-danger-bg) hover:text-(--crm-danger)" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="crm-fade-in absolute inset-0 bg-(--crm-dark)/40 backdrop-blur-[2px]" onClick={() => setDetail(null)} />
          <div className="crm-slide-in relative flex h-full w-full max-w-[680px] flex-col border-l border-(--crm-border) bg-(--crm-panel) shadow-2xl">
            <div className="flex items-center justify-between border-b border-(--crm-border) px-6 py-4">
              <h3 className="truncate text-base font-semibold">{detail.title}</h3>
              <button onClick={() => setDetail(null)} className="rounded-lg p-1 text-(--crm-muted) hover:bg-(--crm-hover)"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {detail.swot && (
                <div className="mb-6 rounded-2xl border border-(--crm-border) bg-(--crm-surface) p-4">
                  <h4 className="text-sm font-semibold">SWOT Analysis</h4>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-(--crm-st-done-bg) p-3"><p className="font-semibold text-(--crm-st-done-text)">Strengths</p><ul className="mt-1 space-y-1">{detail.swot.strengths.map((s, i) => <li key={i}>• {s}</li>)}</ul></div>
                    <div className="rounded-xl bg-(--crm-st-cancel-bg) p-3"><p className="font-semibold text-(--crm-st-cancel-text)">Weaknesses</p><ul className="mt-1 space-y-1">{detail.swot.weaknesses.map((s, i) => <li key={i}>• {s}</li>)}</ul></div>
                    <div className="rounded-xl bg-(--crm-st-active-bg) p-3"><p className="font-semibold text-(--crm-st-active-text)">Opportunities</p><ul className="mt-1 space-y-1">{detail.swot.opportunities.map((s, i) => <li key={i}>• {s}</li>)}</ul></div>
                    <div className="rounded-xl bg-(--crm-st-process-bg) p-3"><p className="font-semibold text-(--crm-st-process-text)">Threats</p><ul className="mt-1 space-y-1">{detail.swot.threats.map((s, i) => <li key={i}>• {s}</li>)}</ul></div>
                  </div>
                  <p className="mt-3 text-xs text-(--crm-body)">{detail.swot.summary}</p>
                </div>
              )}
              <pre className="whitespace-pre-wrap font-mono text-[13px] leading-6 text-(--crm-body)">{detail.content}</pre>
            </div>
            <div className="flex gap-2 border-t border-(--crm-border) px-6 py-4">
              <button onClick={() => copyText(detail.content)} className="flex items-center gap-1.5 rounded-xl border border-(--crm-border-input) px-4 py-2 text-xs font-semibold text-(--crm-brand) hover:bg-(--crm-hover)"><Copy size={14} />Copy</button>
              <button onClick={() => downloadMd(detail.content, detail.title)} className="flex items-center gap-1.5 rounded-xl border border-(--crm-border-input) px-4 py-2 text-xs font-semibold text-(--crm-brand) hover:bg-(--crm-hover)"><Download size={14} />.md</button>
              <button onClick={() => void runSwot(detail)} disabled={swotBusy} className="flex items-center gap-1.5 rounded-xl border border-(--crm-border-input) px-4 py-2 text-xs font-semibold text-(--crm-brand) hover:bg-(--crm-hover) disabled:opacity-60"><Bot size={14} />{swotBusy ? "Analyzing…" : "Run SWOT"}</button>
              <div className="flex-1" />
              <button onClick={() => setDetail(null)} className="rounded-xl border border-(--crm-border) px-4 py-2 text-xs font-semibold text-(--crm-secondary) hover:bg-(--crm-hover)">Close</button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="vn-rise mt-5 rounded-xl bg-(--crm-danger-bg) px-4 py-3 text-xs font-medium text-(--crm-danger)">{error}</div>}
      {confirmDelete && <ConfirmModal title={`Delete "${confirmDelete.title}"?`} message="This cannot be undone." onClose={() => setConfirmDelete(null)} onConfirm={() => void deleteArticle(confirmDelete)} />}
      {toast && <div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-(--crm-dark) px-4 py-3 text-xs font-semibold text-white shadow-xl">{toast}</div>}
    </NotesShell>
  );
}
