"use client";

import { useState } from "react";
import { Bot, Copy, Loader2, Sparkles, Trash2 } from "lucide-react";
import { NotesShell } from "@/components/NotesShell";

type SwotResult = {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  seoScore: number;
  summary: string;
};

const areaCls = "w-full rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-focus-border) focus:ring-2 focus:ring-(--crm-focus-ring)";

export function SwotAnalysis() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<SwotResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  function announce(msg: string) { setToast(msg); window.setTimeout(() => setToast(""), 2600); }

  async function analyze() {
    setError("");
    if (!content.trim()) { setError("Paste an article to analyze."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/ai/swot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const data = await res.json() as SwotResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "SWOT analysis failed.");
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); }
  }

  function clear() { setContent(""); setResult(null); setError(""); }

  async function copyResult() {
    if (!result) return;
    const text = [
      "SWOT ANALYSIS", "",
      "Strengths:", ...result.strengths.map((s) => `  • ${s}`),
      "", "Weaknesses:", ...result.weaknesses.map((s) => `  • ${s}`),
      "", "Opportunities:", ...result.opportunities.map((s) => `  • ${s}`),
      "", "Threats:", ...result.threats.map((s) => `  • ${s}`),
      "", `SEO Score: ${result.seoScore}/100`,
      "", `Summary: ${result.summary}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    announce("Copied to clipboard");
  }

  return (
    <NotesShell title="SWOT Analysis" subtitle="Content strategy">
      <div className="vn-rise">
        <h2 className="text-[26px] font-semibold tracking-[-.04em]">SWOT Analysis</h2>
        <p className="mt-1 text-sm text-(--crm-secondary)">Paste any article text and get an instant SWOT analysis with SEO scoring.</p>
      </div>

      <div className="vn-rise mt-6 grid gap-5 xl:grid-cols-2">
        {/* Input */}
        <div className="rounded-2xl border border-(--crm-border) bg-(--crm-panel) p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--crm-soft) text-(--crm-text)"><Bot size={16} /></div>
            <div>
              <h3 className="text-sm font-semibold">Paste article</h3>
              <p className="mt-0.5 text-xs text-(--crm-muted)">Paste the full article text below and click Analyze.</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              placeholder="Paste your article text here…"
              className={`${areaCls} font-mono text-[13px]`}
            />
            <div className="flex gap-2">
              <button onClick={() => void analyze()} disabled={busy || !content.trim()} className="flex items-center gap-2 rounded-xl bg-(--crm-primary) px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-(--crm-dark) disabled:cursor-not-allowed disabled:opacity-60">
                <Sparkles size={16} />{busy ? "Analyzing…" : "Analyze SWOT"}
              </button>
              <button onClick={clear} className="flex items-center gap-1.5 rounded-xl border border-(--crm-border-input) px-3 py-2.5 text-xs font-semibold text-(--crm-secondary) hover:bg-(--crm-hover)">
                <Trash2 size={14} />Clear
              </button>
            </div>
          </div>
        </div>

        {/* Result */}
        <div>
          {busy ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-(--crm-border) bg-(--crm-panel) py-20 text-sm font-medium text-(--crm-secondary)">
              <Loader2 size={20} className="animate-spin text-(--crm-mid)" />Running SWOT analysis…
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Score */}
              <div className="rounded-2xl border border-(--crm-border) bg-(--crm-panel) p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">SEO Score</h3>
                  <span className={`rounded-lg border px-3 py-1 text-sm font-bold ${result.seoScore >= 70 ? "border-(--crm-st-done-text) bg-(--crm-st-done-bg) text-(--crm-st-done-text)" : result.seoScore >= 50 ? "border-(--crm-st-process-text) bg-(--crm-st-process-bg) text-(--crm-st-process-text)" : "border-(--crm-danger) bg-(--crm-danger-bg) text-(--crm-danger)"}`}>
                    {result.seoScore}/100
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-(--crm-body)">{result.summary}</p>
                <button onClick={() => void copyResult()} className="mt-3 flex items-center gap-1.5 rounded-lg border border-(--crm-border-input) px-3 py-1.5 text-xs font-semibold text-(--crm-brand) hover:bg-(--crm-hover)"><Copy size={13} />Copy result</button>
              </div>

              {/* SWOT Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-(--crm-border) bg-(--crm-st-done-bg) p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-(--crm-st-done-text)">Strengths</p>
                  <ul className="mt-2 space-y-1.5 text-xs leading-5 text-(--crm-body)">{result.strengths.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                </div>
                <div className="rounded-2xl border border-(--crm-border) bg-(--crm-st-cancel-bg) p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-(--crm-st-cancel-text)">Weaknesses</p>
                  <ul className="mt-2 space-y-1.5 text-xs leading-5 text-(--crm-body)">{result.weaknesses.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                </div>
                <div className="rounded-2xl border border-(--crm-border) bg-(--crm-st-active-bg) p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-(--crm-st-active-text)">Opportunities</p>
                  <ul className="mt-2 space-y-1.5 text-xs leading-5 text-(--crm-body)">{result.opportunities.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                </div>
                <div className="rounded-2xl border border-(--crm-border) bg-(--crm-st-process-bg) p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-(--crm-st-process-text)">Threats</p>
                  <ul className="mt-2 space-y-1.5 text-xs leading-5 text-(--crm-body)">{result.threats.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-(--crm-border) bg-(--crm-panel) px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-(--crm-soft) text-(--crm-text)"><Bot size={26} /></div>
              <p className="mt-5 text-sm font-semibold">SWOT result will appear here</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-(--crm-muted)">Paste article text on the left and click Analyze SWOT.</p>
            </div>
          )}
        </div>
      </div>

      {error && <div className="vn-rise mt-5 rounded-xl bg-(--crm-danger-bg) px-4 py-3 text-xs font-medium text-(--crm-danger)">{error}</div>}
      {toast && <div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-(--crm-dark) px-4 py-3 text-xs font-semibold text-white shadow-xl">{toast}</div>}
    </NotesShell>
  );
}
