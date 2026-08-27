"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Copy,
  Loader2,
  Lock,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { NotesShell } from "@/components/NotesShell";
import { useSettings } from "@/components/SettingsProvider";
import { ConfirmModal } from "@/components/ConfirmModal";
import { formatDate, uid } from "@/lib/crm";

type SwotResult = {
  id: string;
  title: string;
  sourceContent: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  seoScore: number;
  summary: string;
  createdAt: string;
};

const areaCls =
  "w-full rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-focus-border) focus:ring-2 focus:ring-(--crm-focus-ring)";

function snippet(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 160 ? `${flat.slice(0, 160)}…` : flat;
}

export function SwotAnalysis() {
  const { settings } = useSettings();
  const hasApiKey = settings.hasGeminiApiKey ?? false;
  const [analyses, setAnalyses] = useState<SwotResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Slider: null = closed, "new" = form, SwotResult = detail
  const [slider, setSlider] = useState<"new" | SwotResult | null>(null);

  // Form
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Detail actions
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SwotResult | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/ai/swot-analyses")
      .then((r) => r.json())
      .then((d: SwotResult[]) => setAnalyses(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...analyses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const query = search.trim();
  const visible = useMemo(() => {
    if (query.length < 3) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.sourceContent.toLowerCase().includes(q),
    );
  }, [sorted, query]);

  function announce(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  }

  function resetForm() {
    setContent("");
    setTitle("");
    setError("");
  }

  function openNew() {
    resetForm();
    setSlider("new");
  }

  function openDetail(a: SwotResult) {
    setSlider(a);
  }

  // ---- Analyze ----
  async function analyze() {
    setError("");
    if (!content.trim()) { setError("Paste an article to analyze."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/ai/swot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await res.json()) as SwotResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "SWOT analysis failed.");

      const finalTitle = title.trim() || `SWOT ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      const id = uid();
      const now = new Date().toISOString();
      const analysis: SwotResult = {
        id,
        title: finalTitle,
        sourceContent: content,
        strengths: data.strengths || [],
        weaknesses: data.weaknesses || [],
        opportunities: data.opportunities || [],
        threats: data.threats || [],
        seoScore: data.seoScore || 0,
        summary: data.summary || "",
        createdAt: now,
      };

      // Save to DB
      await fetch("/api/ai/swot-analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title: finalTitle,
          sourceContent: content,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          opportunities: analysis.opportunities,
          threats: analysis.threats,
          seoScore: analysis.seoScore,
          summary: analysis.summary,
        }),
      });

      setAnalyses((p) => [analysis, ...p]);
      setSlider(analysis);
      announce("SWOT analysis saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // ---- Delete ----
  async function deleteAnalysis(a: SwotResult) {
    setAnalyses((p) => p.filter((x) => x.id !== a.id));
    await fetch(`/api/ai/swot-analyses/${a.id}`, { method: "DELETE" });
    setConfirmDelete(null);
    setSlider(null);
    announce("Deleted");
  }

  async function copyResult(a: SwotResult) {
    const text = [
      `SWOT ANALYSIS — ${a.title}`,
      "",
      "Strengths:",
      ...a.strengths.map((s) => `  • ${s}`),
      "",
      "Weaknesses:",
      ...a.weaknesses.map((s) => `  • ${s}`),
      "",
      "Opportunities:",
      ...a.opportunities.map((s) => `  • ${s}`),
      "",
      "Threats:",
      ...a.threats.map((s) => `  • ${s}`),
      "",
      `SEO Score: ${a.seoScore}/100`,
      "",
      `Summary: ${a.summary}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    announce("Copied to clipboard");
    window.setTimeout(() => setCopied(false), 2000);
  }

  // =================== GRID VIEW ===================
  return (
    <NotesShell title="SWOT Analysis" subtitle="Content strategy">
      <div className="vn-rise">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-[-.04em] sm:text-[1.625rem]">SWOT Analysis</h2>
            <p className="mt-1 text-sm text-(--crm-secondary)">
              {query.length >= 3
                ? `${visible.length} ${visible.length === 1 ? "match" : "matches"} for "${query}"`
                : `${sorted.length} ${sorted.length === 1 ? "analysis" : "analyses"} saved.`}
            </p>
          </div>
          {hasApiKey ? (
            <button onClick={openNew} className="flex shrink-0 items-center gap-1 rounded-md bg-(--crm-primary) px-2 py-1.5 text-[0.65rem] font-semibold text-white shadow-sm transition-all hover:bg-(--crm-dark) sm:gap-1.5 sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs">
              <Plus size={12} />New Analysis
            </button>
          ) : (
            <a href="/app/settings" className="flex shrink-0 items-center gap-1 rounded-md border border-dashed border-(--crm-border) bg-(--crm-panel) px-2 py-1.5 text-[0.65rem] font-semibold text-(--crm-muted) transition-colors hover:bg-(--crm-hover) sm:gap-2 sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs">
              <Lock size={12} />Add API Key
            </a>
          )}
        </div>
        <div className="relative mt-3">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--crm-muted)" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search analyses…" className="w-full rounded-xl border border-(--crm-border-input) bg-(--crm-panel) py-2.5 pl-9 pr-3 text-sm text-(--crm-fg) outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-accent) sm:max-w-[240px]" />
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
            <Bot size={28} />
          </div>
          <p className="mt-5 text-sm font-semibold text-(--crm-fg)">No analyses yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-(--crm-muted)">
            Click <span className="font-semibold text-(--crm-brand)">New Analysis</span> to paste an article and get a SWOT analysis.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="vn-rise mt-6 rounded-2xl border border-dashed border-(--crm-border) bg-(--crm-panel) px-6 py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-(--crm-soft) text-(--crm-text)">
            <Search size={24} />
          </div>
          <p className="mt-5 text-sm font-semibold text-(--crm-fg)">No analyses found</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-(--crm-muted)">
            Nothing matches <span className="font-semibold text-(--crm-brand)">&ldquo;{query}&rdquo;</span>. Try different keywords.
          </p>
        </div>
      ) : (
        <div className="vn-rise mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((a) => (
            <div
              key={a.id}
              onClick={() => openDetail(a)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(a); }
              }}
              className="group relative flex min-h-[11rem] cursor-pointer flex-col rounded-xl border border-(--crm-border-soft) bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-(--crm-border-input) hover:shadow-[0_8px_24px_rgba(0,0,0,.10)]"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 min-w-0 flex-1 text-[0.9375rem] font-semibold leading-5 text-(--crm-fg)">{a.title}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(a); }}
                  className="shrink-0 rounded p-1 text-(--crm-muted) opacity-0 transition-opacity hover:bg-(--crm-danger-bg) hover:text-(--crm-danger) group-hover:opacity-100"
                  aria-label="Delete analysis"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="my-3 h-px bg-(--crm-border-soft)" />
              <p className="line-clamp-4 flex-1 text-[0.8125rem] leading-5 text-(--crm-secondary)">{snippet(a.summary) || "No summary."}</p>
              <div className="mt-3 flex items-center gap-1.5 border-t border-(--crm-border-soft) pt-2.5">
                <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${a.seoScore >= 70 ? "bg-green-50 text-green-700" : a.seoScore >= 50 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"}`}>
                  SEO {a.seoScore}/100
                </span>
                <span className="ml-auto text-[0.625rem] font-medium uppercase tracking-[.1em] text-(--crm-faint)">{formatDate(a.createdAt)}</span>
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

            {/* ---- NEW ANALYSIS FORM ---- */}
            {slider === "new" && (
              <>
                <div className="flex items-center justify-between border-b border-(--crm-border) px-6 py-4">
                  <h3 className="text-base font-semibold">New SWOT Analysis</h3>
                  <button onClick={() => setSlider(null)} className="rounded-lg p-1 text-(--crm-muted) hover:bg-(--crm-hover)"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  <div>
                    <span className="mb-1.5 block text-[0.69rem] font-semibold uppercase tracking-[.08em] text-(--crm-brand)">Title (optional)</span>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. My Blog Article SWOT"
                      className="h-10 w-full rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3 text-sm outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-focus-border) focus:ring-2 focus:ring-(--crm-focus-ring)"
                    />
                  </div>
                  <div>
                    <span className="mb-1.5 block text-[0.69rem] font-semibold uppercase tracking-[.08em] text-(--crm-brand)">Article Content *</span>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={16}
                      placeholder="Paste your article text here…"
                      className={`${areaCls} font-mono text-sm`}
                    />
                  </div>
                  {error && <p className="rounded-xl bg-(--crm-danger-bg) px-4 py-3 text-xs font-medium text-(--crm-danger)">{error}</p>}
                  <button onClick={() => void analyze()} disabled={busy || !content.trim()} className="flex items-center gap-2 rounded-xl bg-(--crm-primary) px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-(--crm-dark) disabled:cursor-not-allowed disabled:opacity-60">
                    <Sparkles size={16} />{busy ? "Analyzing…" : "Analyze SWOT"}
                  </button>
                  {busy && <div className="flex items-center gap-2 text-xs text-(--crm-muted)"><Loader2 size={14} className="animate-spin" />Running SWOT analysis…</div>}
                </div>
              </>
            )}

            {/* ---- ANALYSIS DETAIL ---- */}
            {slider !== "new" && (
              <>
                <div className="flex items-center justify-between border-b border-(--crm-border) px-6 py-4">
                  <h3 className="truncate text-base font-semibold">{slider.title}</h3>
                  <button onClick={() => setSlider(null)} className="rounded-lg p-1 text-(--crm-muted) hover:bg-(--crm-hover)"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  {/* SEO Score */}
                  <div className="rounded-2xl border border-(--crm-border) bg-(--crm-surface) p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">SEO Score</h4>
                      <span className={`rounded-lg border px-3 py-1 text-sm font-bold ${slider.seoScore >= 70 ? "border-green-600 bg-green-50 text-green-700" : slider.seoScore >= 50 ? "border-yellow-600 bg-yellow-50 text-yellow-700" : "border-red-600 bg-red-50 text-red-700"}`}>
                        {slider.seoScore}/100
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-(--crm-body)">{slider.summary}</p>
                  </div>

                  {/* SWOT Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-green-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-green-700">Strengths</p>
                      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-(--crm-body)">{slider.strengths.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                    </div>
                    <div className="rounded-xl bg-red-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-red-700">Weaknesses</p>
                      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-(--crm-body)">{slider.weaknesses.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Opportunities</p>
                      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-(--crm-body)">{slider.opportunities.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                    </div>
                    <div className="rounded-xl bg-yellow-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-yellow-700">Threats</p>
                      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-(--crm-body)">{slider.threats.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                    </div>
                  </div>

                  {/* Source content */}
                  <div>
                    <p className="mb-2 text-[0.69rem] font-semibold uppercase tracking-[.08em] text-(--crm-brand)">Source Article</p>
                    <pre className="whitespace-pre-wrap rounded-xl border border-(--crm-border) bg-(--crm-surface) p-4 font-mono text-xs leading-5 text-(--crm-body) max-h-[30vh] overflow-y-auto">{slider.sourceContent}</pre>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-(--crm-border) px-6 py-4">
                  <button onClick={() => copyResult(slider)} className="flex items-center gap-1.5 rounded-xl border border-(--crm-border-input) px-4 py-2 text-xs font-semibold text-(--crm-brand) hover:bg-(--crm-hover)"><Copy size={14} />{copied ? "Copied" : "Copy result"}</button>
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
          onConfirm={() => void deleteAnalysis(confirmDelete)}
        />
      )}
      {toast && <div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-(--crm-dark) px-4 py-3 text-xs font-semibold text-white shadow-xl">{toast}</div>}
    </NotesShell>
  );
}
