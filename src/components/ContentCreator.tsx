"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { toJpeg } from "html-to-image";
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Camera,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Download,
  Gift,
  Heart,
  Images,
  Lightbulb,
  Lock,
  Loader2,
  Maximize2,
  MessageCircle,
  Plus,
  Rocket,
  Save,
  Search,
  Shield,
  Sparkles,
  X,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { NotesShell } from "@/components/NotesShell";
import { useSettings } from "@/components/SettingsProvider";
import { ConfirmModal } from "@/components/ConfirmModal";
import { formatDate, type Carousel } from "@/lib/crm";
import {
  CARD_H,
  CARD_W,
  CAROUSEL_FONTS,
  CAROUSEL_PALETTES,
  CAROUSEL_THEMES,
  getFont,
  getPalette,
  getTheme,
  type CarouselCardData,
  type CardTone,
  type CarouselThemeContext,
} from "@/lib/carousel";

// ---------- Icon registry (must match ALLOWED_ICONS in the API route) ----------
const ICONS: Record<string, LucideIcon> = {
  Sparkles, Lightbulb, Target, TrendingUp, Rocket, CheckCircle, AlertTriangle,
  Heart, Star, Zap, Brain, Users, MessageCircle, BookOpen, Search, Clock,
  Shield, Gift, Camera, Coffee,
};
const ICON_NAMES = Object.keys(ICONS);

type Card = { icon: string; title: string; body: string[] };

const PREVIEW_CARD: CarouselCardData = {
  icon: "Lightbulb",
  title: "Card title here",
  body: ["One short point", "Two short points"],
};

/** Resolve a theme by id (falls back to first). */
export function CarouselCard({
  card,
  index,
  total,
  brandName,
  paletteId,
  templateId,
  tone,
  fontId,
}: {
  card: Card;
  index: number;
  total: number;
  brandName: string;
  paletteId: string;
  templateId: string;
  tone: CardTone;
  fontId: string;
}) {
  const theme = getTheme(templateId);
  const palette = getPalette(paletteId);
  const font = getFont(fontId);
  const Icon = ICONS[card.icon] ?? Sparkles;
  const ctx: CarouselThemeContext = { card, index, total, brandName, palette, tone, font, Icon };
  return theme.render(ctx);
}

export function ContentCreator() {
  const { settings } = useSettings();
  const hasApiKey = settings.hasGeminiApiKey ?? false;
  const [form, setForm] = useState({ topic: "", description: "", language: "Indonesian", cardCount: 4 });
  const [cardCountInput, setCardCountInput] = useState("4");
  const [cards, setCards] = useState<Card[] | null>(null);
  const [paletteId, setPaletteId] = useState("sage");
  const [templateId, setTemplateId] = useState("theme1");
  const [fontId, setFontId] = useState("inter");
  const [cardTone, setCardTone] = useState<CardTone>("dark");
  const [brandName, setBrandName] = useState(settings.siteName || "ZapNote!");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [exportingZip, setExportingZip] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewScale, setPreviewScale] = useState(0.5);
  const touchStartX = useRef<number | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ----- Saved carousels (list view) -----
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [listLoading, setListLoading] = useState(true);
  // null = list view, "new" = fresh editor, otherwise the saved carousel id
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/carousels")
      .then((r) => r.json())
      .then((data: Carousel[]) => setCarousels(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, []);

  // Fit the 1080x1350 card into the viewport for fullscreen preview.
  useEffect(() => {
    if (!previewOpen) return;
    function computeScale() {
      const s = Math.min((window.innerHeight * 0.88) / CARD_H, (window.innerWidth * 0.92) / CARD_W, 1);
      setPreviewScale(Math.max(s, 0.15));
    }
    computeScale();
    window.addEventListener("resize", computeScale);
    return () => window.removeEventListener("resize", computeScale);
  }, [previewOpen]);

  // Keyboard navigation in preview.
  useEffect(() => {
    if (!previewOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewOpen(false);
      if (e.key === "ArrowRight") setPreviewIndex((i) => Math.min(i + 1, (cards?.length ?? 1) - 1));
      if (e.key === "ArrowLeft") setPreviewIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen, cards]);

  const palette = useMemo(() => getPalette(paletteId), [paletteId]);
  const template = useMemo(() => getTheme(templateId), [templateId]);

  function announce(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  }

  function updateCard(index: number, patch: Partial<Card>) {
    setCards((prev) => prev ? prev.map((c, i) => (i === index ? { ...c, ...patch } : c)) : prev);
  }

  // ----- View transitions -----
  function openNew() {
    setForm({ topic: "", description: "", language: "Indonesian", cardCount: 4 });
    setCardCountInput("4");
    setCards(null);
    setError("");
    setEditing("new");
  }

  function openSaved(c: Carousel) {
    const count = Math.min(Math.max(c.cards.length, 2), 10);
    setForm({ topic: "", description: "", language: "Indonesian", cardCount: count });
    setCardCountInput(String(count));
    setCards(c.cards.map((card) => ({ icon: card.icon, title: card.title, body: card.body })));
    setPaletteId(CAROUSEL_PALETTES.some((p) => p.id === c.palette) ? c.palette : "sage");
    setTemplateId(CAROUSEL_THEMES.some((t) => t.id === c.template) ? c.template : "theme1");
    setFontId(CAROUSEL_FONTS.some((f) => f.id === c.fontId) ? c.fontId ?? "inter" : "inter");
    setCardTone(c.tone);
    setError("");
    setEditing(c.id);
  }

  function backToList() {
    setEditing(null);
    setCards(null);
  }

  async function persistCarousel(cardsToSave: Card[] = cards ?? []): Promise<boolean> {
    if (!cardsToSave || cardsToSave.length === 0) return false;
    const title = form.topic.trim() || `Carousel (${cardsToSave.length} cards)`;
    const body = { title, cards: cardsToSave, palette: paletteId, template: templateId, tone: cardTone, fontId, brandName };
    try {
      let ok = false;
      if (editing && editing !== "new") {
        const res = await fetch(`/api/carousels/${editing}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        ok = res.ok;
      } else {
        const res = await fetch("/api/carousels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        ok = res.ok;
      }
      if (!ok) return false;
      const res = await fetch("/api/carousels");
      const list = (await res.json()) as Carousel[];
      setCarousels(Array.isArray(list) ? list : []);
      return true;
    } catch {
      return false;
    }
  }

  async function saveCarousel() {
    setSaving(true);
    const ok = await persistCarousel();
    setSaving(false);
    if (ok) {
      announce("Carousel saved");
      backToList();
    } else {
      announce("Save failed");
    }
  }

  async function deleteCarousel(id: string) {
    try {
      await fetch(`/api/carousels/${id}`, { method: "DELETE" });
      setCarousels((prev) => prev.filter((c) => c.id !== id));
      announce("Carousel deleted");
    } catch {
      announce("Delete failed");
    } finally {
      setConfirmDelete(null);
    }
  }

  async function generate() {
    if (!form.topic.trim()) { setError("Topic is required."); return; }
    const count = Math.min(Math.max(Math.round(Number(cardCountInput) || 4), 2), 10);
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/ai/carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, cardCount: count }),
      });
      const data = (await res.json()) as { cards?: Card[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to generate.");
      if (!data.cards?.length) throw new Error("No cards returned.");
      // New carousels are saved automatically so the result shows up on the main page.
      // Pass the cards explicitly — state updates are async and would be stale here.
      if (editing === "new") {
        const ok = await persistCarousel(data.cards);
        if (ok) {
          announce("Carousel generated & saved");
          backToList();
        } else {
          announce("Generated, but save failed");
        }
      } else {
        setCards(data.cards);
        announce("Carousel generated");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  function downloadDataUrl(dataUrl: string, filename: string) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /** Export every card and bundle them into a single ZIP of JPEGs. */
  async function exportAllAsZip() {
    if (!cards || exportingZip) return;
    setExportingZip(true);
    try {
      const zip = new JSZip();
      const folderBase = brandName.toLowerCase().replace(/\s+/g, "-") || "carousel";
      for (let i = 0; i < cards.length; i++) {
        const node = cardRefs.current[i];
        if (!node) throw new Error("Card not ready");
        const dataUrl = await toJpeg(node, { quality: 0.95, width: CARD_W, height: CARD_H });
        zip.file(`${folderBase}-card-${i + 1}.jpg`, dataUrl.split(",")[1] ?? "", { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      downloadDataUrl(url, `${folderBase}-carousel.zip`);
      URL.revokeObjectURL(url);
      announce(`${cards.length} cards exported as ZIP`);
    } catch {
      announce("Export ZIP failed");
    } finally {
      setExportingZip(false);
    }
  }

  // =================== LIST VIEW (always visible; editor overlays on top) ===================
  return (
    <NotesShell title="Content Creator" subtitle="Instagram carousel maker">
      <div className="vn-rise">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-[-.04em] sm:text-[1.625rem]">Content Creator</h2>
            <p className="mt-1 text-sm text-(--crm-secondary)">
              {carousels.length > 0
                ? `${carousels.length} ${carousels.length === 1 ? "carousel" : "carousels"} — AI-built hooks, points & takeaways, ready to export as JPEG.`
                : "AI builds Instagram carousels (hook → points → conclusion), ready to export as JPEG."}
            </p>
          </div>
          {hasApiKey ? (
            <button onClick={openNew} className="flex shrink-0 items-center gap-1 rounded-md bg-(--crm-primary) px-2 py-1.5 text-[0.65rem] font-semibold text-white shadow-sm transition-all hover:bg-(--crm-dark) sm:gap-1.5 sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs">
              <Plus size={12} />New Carousel
            </button>
          ) : (
            <a href="/app/settings" className="flex shrink-0 items-center gap-1 rounded-md border border-dashed border-(--crm-border) bg-(--crm-panel) px-2 py-1.5 text-[0.65rem] font-semibold text-(--crm-muted) transition-colors hover:bg-(--crm-hover) sm:gap-2 sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs">
              <Lock size={12} />Add API Key
            </a>
          )}
        </div>
      </div>

        {listLoading ? (
          <div className="vn-rise mt-6 flex items-center justify-center rounded-2xl border border-dashed border-(--crm-border) bg-(--crm-panel) px-6 py-20">
            <Loader2 size={22} className="animate-spin text-(--crm-muted)" />
          </div>
        ) : carousels.length === 0 ? (
          <div className="vn-rise mt-6 rounded-2xl border border-dashed border-(--crm-border) bg-(--crm-panel) px-6 py-24 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-(--crm-soft) text-(--crm-text)"><Images size={28} /></div>
            <p className="mt-5 text-sm font-semibold text-(--crm-fg)">No carousel yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-(--crm-muted)">
              Click <span className="font-semibold text-(--crm-brand)">New Carousel</span> to start. Enter a topic, pick a template and colors, then generate — the number of cards is adjustable from 2 to 10.
            </p>
          </div>
        ) : (
          <div className="vn-rise mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {carousels.map((c) => {
              const pal = getPalette(c.palette);
              const tpl = getTheme(c.template);
              const first = c.cards[0];
              return (
                <div key={c.id} onClick={() => openSaved(c)} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSaved(c); } }}
                  className="group relative flex min-h-[12rem] cursor-pointer flex-col overflow-hidden rounded-xl border border-(--crm-border-soft) bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-(--crm-border-input) hover:shadow-[0_8px_24px_rgba(0,0,0,.10)]"
                >
                  <div className="relative h-32 shrink-0" style={{ background: c.tone === "light" ? pal.lightBg : pal.darkBg }}>
                    {first && (
                      <div style={{ transform: "scale(0.09)", transformOrigin: "top left" }}>
                        <CarouselCard card={first} index={0} total={c.cards.length} brandName={brandName || "Brand"} paletteId={c.palette} templateId={c.template} tone={c.tone} fontId={c.fontId ?? "inter"} />
                      </div>
                    )}
                    <div className="absolute bottom-1.5 right-1.5 rounded-md bg-black/45 px-2 py-0.5 text-[0.625rem] font-semibold text-white">
                      {c.cards.length} cards
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col p-4">
                    <p className="line-clamp-2 text-[0.9375rem] font-semibold leading-5 text-(--crm-fg)">{c.title || "Untitled carousel"}</p>
                    <p className="mt-1 text-[0.6875rem] font-medium text-(--crm-muted)">{tpl.label} · {pal.label}</p>
                    <p className="mt-auto pt-2 text-[0.625rem] font-medium uppercase tracking-[.1em] text-(--crm-faint)">Updated {formatDate(c.updatedAt)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(c.id); }}
                    className="absolute right-1.5 top-1.5 z-10 rounded p-1 text-white/70 opacity-0 transition-opacity hover:bg-black/30 hover:text-white group-hover:opacity-100"
                    aria-label="Delete carousel"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {confirmDelete && (
          <ConfirmModal
            title="Delete this carousel?"
            message="This action cannot be undone."
            onClose={() => setConfirmDelete(null)}
            onConfirm={() => void deleteCarousel(confirmDelete)}
          />
        )}
        {toast && <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-(--crm-dark) px-4 py-3 text-xs font-semibold text-white shadow-xl">{toast}</div>}

        {/* =================== RIGHT SLIDER (editor overlay) =================== */}
        {editing !== null && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="crm-fade-in absolute inset-0 bg-(--crm-dark)/40 backdrop-blur-[2px]" onClick={backToList} />
          <div className="crm-slide-in relative flex h-full w-full max-w-[860px] flex-col border-l border-(--crm-border) bg-(--crm-panel) shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-(--crm-border) px-6 py-4">
              <h3 className="text-base font-semibold">{editing === "new" ? "New Carousel" : "Edit Carousel"}</h3>
              <button onClick={backToList} className="rounded-lg p-1 text-(--crm-muted) hover:bg-(--crm-hover)"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {editing === "new" ? (
                /* ============ CREATE MODE: form generate ============ */
                <>
                  <p className="mb-5 text-xs text-(--crm-secondary)">Enter a topic, choose a style, then generate. Results are saved to the main page automatically.</p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
                    {/* Fields */}
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-(--crm-secondary)">Topic *</label>
                        <input value={form.topic} onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))} placeholder="e.g. 5 common mistakes when building an emergency fund" className="h-10 w-full rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3.5 text-sm outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-accent)" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-(--crm-secondary)">Description / brief (optional)</label>
                        <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={5} placeholder="Target audience, key points to highlight, tone of voice…" className="w-full resize-none rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3.5 py-2.5 text-sm leading-6 outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-accent)" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-(--crm-secondary)">Number of cards</label>
                          <input
                            type="number"
                            min={2}
                            max={10}
                            value={cardCountInput}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw !== "" && !/^\d+$/.test(raw)) return;
                              if (raw !== "" && Number(raw) > 10) return;
                              setCardCountInput(raw);
                            }}
                            onBlur={() => {
                              const n = Math.min(Math.max(Math.round(Number(cardCountInput) || 4), 2), 10);
                              setCardCountInput(String(n));
                              setForm((p) => ({ ...p, cardCount: n }));
                            }}
                            className="h-10 w-full rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3.5 text-sm outline-none transition-colors focus:border-(--crm-accent)"
                          />
                          <p className="mt-1 text-[11px] text-(--crm-muted)">2–10 cards</p>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-(--crm-secondary)">Language</label>
                          <select value={form.language} onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))} className="h-10 w-full rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3 text-sm outline-none transition-colors focus:border-(--crm-accent)">
                            <option>Indonesian</option><option>English</option><option>Bilingual</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-(--crm-secondary)">Brand name</label>
                        <input value={brandName} onChange={(e) => setBrandName(e.target.value)} maxLength={24} className="h-10 w-full rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3.5 text-sm outline-none transition-colors focus:border-(--crm-accent)" />
                      </div>
                    </div>

                    {/* Live preview */}
                    <div className="min-w-0">
                      <label className="mb-2 block text-xs font-semibold text-(--crm-secondary)">Preview</label>
                      <div className="relative overflow-hidden rounded-lg border border-(--crm-border-soft) shadow-md" style={{ height: 260 }}>
                        <div style={{ transform: "scale(0.19)", transformOrigin: "top left" }}>
                          <CarouselCard card={PREVIEW_CARD} index={0} total={4} brandName={brandName || "Brand"} paletteId={paletteId} templateId={templateId} tone={cardTone} fontId={fontId} />
                        </div>
                      </div>
                      <p className="mt-1.5 text-[10px] text-(--crm-muted)">{template.label} · {palette.label} · {cardTone === "dark" ? "gelap" : "terang"}</p>
                    </div>
                  </div>

                  {/* Theme */}
                  <div className="mt-5 rounded-2xl border border-(--crm-border) bg-(--crm-surface) p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-xs font-semibold text-(--crm-secondary)">Theme</label>
                      <button
                        type="button"
                        onClick={() => setCardTone((t) => (t === "light" ? "dark" : "light"))}
                        className={`flex items-center gap-1.5 rounded-lg border border-(--crm-border-input) px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${cardTone === "dark" ? "bg-(--crm-dark) text-white" : "bg-(--crm-soft) text-(--crm-text)"}`}
                        title="Toggle light / dark variant"
                      >
                        {cardTone === "dark" ? "Dark" : "Light"}
                      </button>
                    </div>

                    {/* Template */}
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[.06em] text-(--crm-secondary)">Template card</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {CAROUSEL_THEMES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => { setTemplateId(t.id); setCardTone(t.tone); setFontId(t.fontId); }}
                          className={`flex items-center gap-2.5 rounded-xl border-2 p-2.5 text-left transition-all ${templateId === t.id ? "border-(--crm-accent) bg-(--crm-soft)" : "border-(--crm-border-soft) bg-(--crm-panel) hover:border-(--crm-border-input) hover:bg-(--crm-hover)"}`}
                        >
                          <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md shadow-sm" style={{ background: t.tone === "light" ? palette.lightBg : palette.darkBg }}>
                            <div style={{ transform: "scale(0.036)", transformOrigin: "top left" }}>
                              <CarouselCard card={PREVIEW_CARD} index={0} total={4} brandName={brandName || "Brand"} paletteId={paletteId} templateId={t.id} tone={t.tone} fontId={t.fontId} />
                            </div>
                          </div>
                          <span className="min-w-0 text-xs font-semibold text-(--crm-fg)">{t.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Palette */}
                    <div className="mt-4">
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[.06em] text-(--crm-secondary)">Color palette</label>
                      <div className="flex flex-wrap gap-2">
                        {CAROUSEL_PALETTES.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPaletteId(p.id)}
                            title={p.label}
                            className={`flex items-center gap-1.5 rounded-lg border-2 px-2 py-1.5 transition-all ${paletteId === p.id ? "border-(--crm-accent) bg-(--crm-soft)" : "border-(--crm-border-soft) bg-(--crm-panel) hover:border-(--crm-border-input)"}`}
                          >
                            <span className="flex h-5 w-8 items-center justify-center rounded border border-black/5" style={{ background: p.lightBg }}>
                              <span className="h-3 w-3 rounded-full border border-white/30" style={{ background: p.darkBg }} />
                            </span>
                            <span className={`text-[10px] font-semibold ${paletteId === p.id ? "text-(--crm-fg)" : "text-(--crm-faint)"}`}>{p.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font */}
                    <div className="mt-4">
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[.06em] text-(--crm-secondary)">Font style</label>
                      <div className="flex flex-wrap gap-2">
                        {CAROUSEL_FONTS.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setFontId(f.id)}
                            className={`rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all ${fontId === f.id ? "border-(--crm-accent) bg-(--crm-soft) text-(--crm-fg)" : "border-(--crm-border-soft) bg-(--crm-panel) text-(--crm-muted) hover:border-(--crm-border-input)"}`}
                            style={{ fontFamily: f.stack }}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => void generate()}
                      disabled={generating}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-(--crm-primary) px-4 text-xs font-semibold text-white shadow-sm transition-all hover:bg-(--crm-dark) disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      {generating ? "Creating…" : "Generate with AI"}
                    </button>
                  </div>
                  {error && <p className="mt-3 rounded-xl bg-(--crm-danger-bg) px-4 py-3 text-xs font-medium text-(--crm-danger)">{error}</p>}
                </>
              ) : (
                /* ============ EDIT MODE: stacked manual editor ============ */
                <>
              {/* Header actions */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-(--crm-secondary)">Edit the words on each card, then save.</p>
                {cards && cards.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setPreviewIndex(0); setPreviewOpen(true); }} className="flex items-center gap-1.5 rounded-xl border border-(--crm-border-input) px-3 py-2 text-xs font-semibold text-(--crm-brand) transition-colors hover:bg-(--crm-hover)">
                      <Maximize2 size={14} />Preview
                    </button>
                    <button onClick={() => void exportAllAsZip()} disabled={exportingZip} className="flex items-center gap-1.5 rounded-xl border border-(--crm-border-input) px-3 py-2 text-xs font-semibold text-(--crm-secondary) transition-colors hover:bg-(--crm-hover) disabled:opacity-60">
                      {exportingZip ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      {exportingZip ? "Zipping…" : "Download ZIP"}
                    </button>
                    <button onClick={() => void saveCarousel()} disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-(--crm-primary) px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-(--crm-dark) disabled:opacity-60">
                      <Save size={14} />{saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                )}
              </div>

              {/* Stacked card editor — one card per row */}
              {cards && cards.length > 0 && (
                <div className="space-y-5">
                  {cards.map((card, index) => (
                    <div key={index} className="rounded-2xl border border-(--crm-border) bg-(--crm-surface) p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-(--crm-fg)">Card {index + 1}</h4>
                        <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-(--crm-muted)">
                          {index === 0 ? "Hook" : index === cards.length - 1 ? "Conclusion" : "Point"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-4 sm:flex-row">
                        {/* Preview (kiri) */}
                        <div className="mx-auto h-[280px] w-[224px] shrink-0 overflow-hidden rounded-lg border border-(--crm-border-soft) bg-white shadow-sm" style={{ height: 280, width: 224 }}>
                          <div style={{ transform: "scale(0.207)", transformOrigin: "top left" }}>
                            <div ref={(el) => { cardRefs.current[index] = el; }}>
                              <CarouselCard card={card} index={index} total={cards.length} brandName={brandName || "Brand"} paletteId={paletteId} templateId={templateId} tone={cardTone} fontId={fontId} />
                            </div>
                          </div>
                        </div>

                        {/* Fields (kanan) */}
                        <div className="min-w-0 flex-1 space-y-3">
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-(--crm-secondary)">Title</label>
                            <input value={card.title} onChange={(e) => updateCard(index, { title: e.target.value })} maxLength={120} className="h-10 w-full rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3 text-sm outline-none transition-colors focus:border-(--crm-accent)" />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-(--crm-secondary)">Body (one line = one point)</label>
                            <textarea value={card.body.join("\n")} onChange={(e) => updateCard(index, { body: e.target.value.split("\n").filter((l) => l.trim() !== "") })} rows={4} className="w-full resize-none rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3 py-2 text-sm leading-6 outline-none transition-colors focus:border-(--crm-accent)" />
                          </div>
                          <div className="flex items-end gap-3">
                            <div className="flex-1">
                              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-(--crm-secondary)">Icon</label>
                              <select value={card.icon} onChange={(e) => updateCard(index, { icon: e.target.value })} className="h-10 w-full rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3 text-sm outline-none transition-colors focus:border-(--crm-accent)">
                                {ICON_NAMES.map((name) => <option key={name}>{name}</option>)}
                              </select>
                            </div>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-(--crm-border-soft) bg-white">
                              {(() => { const Ic = ICONS[card.icon] ?? Sparkles; return <Ic size={18} color="#7c3aed" />; })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Theme — at the very bottom */}
              {cards && cards.length > 0 && (
                <div className="mt-5 rounded-2xl border border-(--crm-border) bg-(--crm-surface) p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-(--crm-soft) text-[0.65rem] font-bold text-(--crm-brand)">T</span>
                      <h4 className="text-sm font-semibold text-(--crm-fg)">Theme</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCardTone((t) => (t === "light" ? "dark" : "light"))}
                      className={`flex items-center gap-1.5 rounded-lg border border-(--crm-border-input) px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${cardTone === "dark" ? "bg-(--crm-dark) text-white" : "bg-(--crm-soft) text-(--crm-text)"}`}
                      title="Toggle light / dark variant"
                    >
                      {cardTone === "dark" ? "Dark" : "Light"}
                    </button>
                  </div>

                  {/* Brand name */}
                  <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-semibold text-(--crm-secondary)">Brand name (on cards)</label>
                    <input value={brandName} onChange={(e) => setBrandName(e.target.value)} maxLength={24} className="h-10 w-full rounded-lg border border-(--crm-border-input) bg-(--crm-surface) px-3.5 text-sm outline-none transition-colors focus:border-(--crm-accent)" />
                  </div>

                  {/* Template */}
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[.06em] text-(--crm-secondary)">Template card</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {CAROUSEL_THEMES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => { setTemplateId(t.id); setCardTone(t.tone); setFontId(t.fontId); }}
                          className={`flex items-center gap-2.5 rounded-xl border-2 p-2.5 text-left transition-all ${templateId === t.id ? "border-(--crm-accent) bg-(--crm-soft)" : "border-(--crm-border-soft) bg-(--crm-panel) hover:border-(--crm-border-input) hover:bg-(--crm-hover)"}`}
                        >
                          <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md shadow-sm" style={{ background: t.tone === "light" ? palette.lightBg : palette.darkBg }}>
                            <div style={{ transform: "scale(0.036)", transformOrigin: "top left" }}>
                              <CarouselCard card={PREVIEW_CARD} index={0} total={4} brandName={brandName || "Brand"} paletteId={paletteId} templateId={t.id} tone={t.tone} fontId={t.fontId} />
                            </div>
                          </div>
                          <span className="min-w-0 text-xs font-semibold text-(--crm-fg)">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Palette */}
                  <div className="mt-4">
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[.06em] text-(--crm-secondary)">Color palette</label>
                    <div className="flex flex-wrap gap-2">
                      {CAROUSEL_PALETTES.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPaletteId(p.id)}
                          title={p.label}
                          className={`flex items-center gap-1.5 rounded-lg border-2 px-2 py-1.5 transition-all ${paletteId === p.id ? "border-(--crm-accent) bg-(--crm-soft)" : "border-(--crm-border-soft) bg-(--crm-panel) hover:border-(--crm-border-input)"}`}
                        >
                          <span className="flex h-5 w-8 items-center justify-center rounded border border-black/5" style={{ background: p.lightBg }}>
                            <span className="h-3 w-3 rounded-full border border-white/30" style={{ background: p.darkBg }} />
                          </span>
                          <span className={`text-[10px] font-semibold ${paletteId === p.id ? "text-(--crm-fg)" : "text-(--crm-faint)"}`}>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font */}
                  <div className="mt-4">
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[.06em] text-(--crm-secondary)">Font style</label>
                    <div className="flex flex-wrap gap-2">
                      {CAROUSEL_FONTS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFontId(f.id)}
                          className={`rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all ${fontId === f.id ? "border-(--crm-accent) bg-(--crm-soft) text-(--crm-fg)" : "border-(--crm-border-soft) bg-(--crm-panel) text-(--crm-muted) hover:border-(--crm-border-input)"}`}
                          style={{ fontFamily: f.stack }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen IG-style preview */}
      {previewOpen && cards && (
        <div className="fixed inset-0 z-[85] flex flex-col items-center justify-center bg-black/95">
          {/* Close */}
          <button onClick={() => setPreviewOpen(false)} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20" aria-label="Close preview">
            <X size={22} />
          </button>

          {/* Story-style progress bars */}
          <div className="mb-4 flex w-full gap-1.5 px-6" style={{ maxWidth: CARD_W * previewScale }}>
            {cards.map((_, i) => (
              <button key={i} onClick={() => setPreviewIndex(i)} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25" aria-label={`Go to card ${i + 1}`}>
                <div className={`h-full ${i <= previewIndex ? "w-full" : "w-0"} bg-white transition-all duration-300`} />
              </button>
            ))}
          </div>

          {/* Slide track */}
          <div
            className="relative overflow-hidden rounded-xl shadow-2xl"
            style={{ width: CARD_W * previewScale, height: CARD_H * previewScale }}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const delta = e.changedTouches[0].clientX - touchStartX.current;
              if (delta < -40) setPreviewIndex((i) => Math.min(i + 1, cards.length - 1));
              else if (delta > 40) setPreviewIndex((i) => Math.max(i - 1, 0));
              touchStartX.current = null;
            }}
          >
            <div
              className="flex h-full"
              style={{ transform: `translateX(-${previewIndex * CARD_W * previewScale}px)`, transition: "transform .35s ease" }}
            >
              {cards.map((card, index) => (
                <div key={index} className="shrink-0 overflow-hidden" style={{ width: CARD_W * previewScale, height: CARD_H * previewScale }}>
                  <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left" }}>
                    <CarouselCard card={card} index={index} total={cards.length} brandName={brandName || "Brand"} paletteId={paletteId} templateId={templateId} tone={cardTone} fontId={fontId} />
                  </div>
                </div>
              ))}
            </div>

            {/* Click zones: left / right half to navigate (desktop) */}
            <button
              onClick={() => setPreviewIndex((i) => Math.max(i - 1, 0))}
              disabled={previewIndex === 0}
              className={`absolute left-0 top-0 h-full w-1/3 ${previewIndex === 0 ? "cursor-default" : "cursor-w-resize"}`}
              aria-label="Previous card"
            />
            <button
              onClick={() => setPreviewIndex((i) => Math.min(i + 1, cards.length - 1))}
              disabled={previewIndex === cards.length - 1}
              className={`absolute right-0 top-0 h-full w-1/3 ${previewIndex === cards.length - 1 ? "cursor-default" : "cursor-e-resize"}`}
              aria-label="Next card"
            />
          </div>

          {/* Arrows + counter */}
          <div className="mt-5 flex items-center gap-5">
            <button onClick={() => setPreviewIndex((i) => Math.max(i - 1, 0))} disabled={previewIndex === 0} className="rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 disabled:opacity-30" aria-label="Previous">
              <ChevronLeft size={24} />
            </button>
            <span className="text-sm font-semibold tabular-nums text-white">{previewIndex + 1} / {cards.length}</span>
            <button onClick={() => setPreviewIndex((i) => Math.min(i + 1, cards.length - 1))} disabled={previewIndex === cards.length - 1} className="rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 disabled:opacity-30" aria-label="Next">
              <ChevronRight size={24} />
            </button>
          </div>
          <p className="mt-3 text-xs text-white/50">← → to navigate · swipe on mobile · Esc to close</p>
        </div>
      )}

      {toast && <div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-(--crm-dark) px-4 py-3 text-xs font-semibold text-white shadow-xl">{toast}</div>}
    </NotesShell>
  );
}
