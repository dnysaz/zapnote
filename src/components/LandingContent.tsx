"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePwaInstall } from "@/lib/usePwaInstall";
import {
  FileText,
  Sparkles,
  Zap,
  ArrowRight,
  Globe,
  Lock,
  Shield,
  PenTool,
  BarChart3,
  ChevronRight,
  Star,
  MessageSquare,
  Download,
  Palette,
  Smartphone,
} from "lucide-react";

/* ─── Animated gradient background ─── */
function GradientBlob({
  color,
  size,
  x,
  y,
  delay,
}: {
  color: string;
  size: number;
  x: string;
  y: string;
  delay: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className="absolute rounded-full blur-[120px] opacity-20 transition-all duration-[2s]"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: color,
        opacity: mounted ? 0.15 : 0,
        transform: mounted ? "scale(1)" : "scale(0.5)",
      }}
    />
  );
}

/* ─── Section fade-in ─── */
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: "opacity 0.7s cubic-bezier(.22,1,.36,1), transform 0.7s cubic-bezier(.22,1,.36,1)",
      }}
    >
      {children}
    </div>
  );
}

/* ─── Feature data ─── */
const features = [
  {
    icon: FileText,
    title: "Smart Notes",
    desc: "Rich-text editor with auto-save, tags, action items, and full-text search.",
    color: "#234b42",
    span: "col-span-1 row-span-1",
    bg: "from-[#234b42]/5 to-[#c9e979]/5",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    desc: "Built-in chat that understands your notes. Ask, summarize, brainstorm.",
    color: "#7c3aed",
    span: "col-span-1 row-span-1 lg:col-span-2",
    bg: "from-violet-500/5 to-fuchsia-500/5",
  },
  {
    icon: PenTool,
    title: "Carousel Creator",
    desc: "Turn notes into stunning social media carousels with multiple themes.",
    color: "#a0405e",
    span: "col-span-1 row-span-1",
    bg: "from-rose-500/5 to-pink-500/5",
  },
  {
    icon: BarChart3,
    title: "SWOT Analysis",
    desc: "AI-powered SWOT with SEO scores. Analyze any content in seconds.",
    color: "#a06a1e",
    span: "col-span-1 row-span-1",
    bg: "from-amber-500/5 to-orange-500/5",
  },
  {
    icon: MessageSquare,
    title: "Article Generator",
    desc: "Generate long-form articles from your notes. Humanize, optimize for SEO, export as PDF or HTML.",
    color: "#1e5f74",
    span: "col-span-1 row-span-1 lg:col-span-2",
    bg: "from-sky-500/5 to-cyan-500/5",
  },
  {
    icon: Download,
    title: "Export Anywhere",
    desc: "PDF, Word, TXT, HTML — or share via link with QR code.",
    color: "#475569",
    span: "col-span-1 row-span-1",
    bg: "from-slate-500/5 to-gray-500/5",
  },
];

const stats = [
  { value: "6", label: "Themes" },
  { value: "AI", label: "Powered" },
  { value: "AES", label: "256 Encrypted" },
  { value: "Free", label: "Forever" },
];

/* ─── Page ─── */
export function LandingContent() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);
  const { isInstallable, isInstalled, install } = usePwaInstall();

  useEffect(() => {
    function handleMouse(e: MouseEvent) {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      setMousePos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    }
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#09090b] font-[var(--font-dm)] text-white selection:bg-[#c9e979]/30 selection:text-white">
      {/* ═══════ NAV ═══════ */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#09090b]/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#234b42] to-[#477f67] font-[var(--font-space-mono)] text-sm font-bold text-[#c9e979] shadow-lg shadow-[#234b42]/20">
              Z
            </div>
            <span className="text-base font-bold tracking-[-.03em] sm:text-lg">ZapNote!</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/app/notes"
              className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-[#234b42] to-[#2d5c51] px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-[#234b42]/20 transition-all hover:shadow-xl hover:shadow-[#234b42]/30 sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-sm"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                Open App <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#173b35] to-[#234b42] opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section ref={heroRef} className="relative overflow-hidden pt-24 pb-12 sm:pt-40 sm:pb-28">
        {/* Animated blobs */}
        <GradientBlob color="#234b42" size={800} x="10%" y="-20%" delay={0} />
        <GradientBlob color="#c9e979" size={600} x="60%" y="-10%" delay={200} />
        <GradientBlob color="#7c3aed" size={500} x="30%" y="40%" delay={400} />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />

        {/* Radial glow following cursor */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle 600px at ${mousePos.x}% ${mousePos.y}%, rgba(35,75,66,0.15), transparent)`,
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="mx-auto max-w-4xl text-center">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-sm sm:mb-8 sm:px-4 sm:py-1.5 sm:text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#c9e979]/20">
                  <Zap size={11} className="text-[#c9e979]" />
                </span>
                AI-Powered Note Taking
              </div>

              {/* Headline */}
              <h1 className="text-3xl font-bold tracking-[-.05em] sm:text-5xl lg:text-[5.5rem] lg:leading-[1.05]">
                <span className="text-white">Your ideas,</span>
                <br />
                <span className="bg-gradient-to-r from-[#c9e979] via-[#a8d449] to-[#8bc34a] bg-clip-text text-transparent">
                  amplified by AI
                </span>
              </h1>

              {/* Sub */}
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/50 sm:mt-7 sm:text-lg lg:text-xl">
                The all-in-one workspace for notes, articles, carousels, and content strategy.
                <br className="hidden sm:block" />
                Write smarter. Create faster. Analyze deeper.
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/app/notes"
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-[#234b42] to-[#2d5c51] px-6 py-3 text-sm font-semibold text-white shadow-2xl shadow-[#234b42]/30 transition-all hover:shadow-[#234b42]/40 sm:rounded-2xl sm:px-8 sm:py-4 sm:text-base"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Start Writing Free
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#173b35] to-[#1f4a41] opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
                <a
                  href="#features"
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-white/60 transition-all hover:border-white/20 hover:text-white/80 sm:rounded-2xl sm:px-8 sm:py-4 sm:text-base"
                >
                  See Features
                </a>
              </div>

              {/* Stats bar */}
              <div className="mx-auto mt-10 grid max-w-lg grid-cols-4 gap-4 sm:mt-16 sm:gap-6">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-bold tracking-tight text-white">{s.value}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/30">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ═══════ APP PREVIEW ═══════ */}
          <Reveal delay={200} className="mt-10 sm:mt-20">
            <div className="mx-auto max-w-5xl">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1.5 shadow-2xl shadow-black/40 backdrop-blur-sm">
                {/* Browser chrome */}
                <div className="flex items-center gap-3 rounded-t-xl border-b border-white/[0.06] bg-white/[0.03] px-5 py-3.5">
                  <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                    <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                    <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="ml-3 flex flex-1 items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-1.5">
                    <svg className="h-3 w-3 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs text-white/40">zapnote.xyz/app/notes</span>
                  </div>
                </div>

                {/* App UI mockup */}
                <div className="flex min-h-[380px] bg-[#0c0c0e]">
                  {/* Sidebar */}
                  <div className="hidden w-60 border-r border-white/[0.06] p-5 sm:block">
                    <div className="mb-6 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#234b42] to-[#477f67] text-xs font-bold text-[#c9e979]">
                        Z
                      </div>
                      <span className="text-sm font-semibold text-white/90">ZapNote!</span>
                    </div>
                    <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[.18em] text-white/20">Workspace</p>
                    <div className="space-y-0.5">
                      {[
                        { name: "Notes", icon: FileText, active: true },
                        { name: "Articles", icon: PenTool, active: false },
                        { name: "SWOT Analysis", icon: BarChart3, active: false },
                        { name: "Creator", icon: Sparkles, active: false },
                      ].map((item) => (
                        <div
                          key={item.name}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                            item.active
                              ? "bg-white/[0.08] font-semibold text-[#c9e979]"
                              : "text-white/40"
                          }`}
                        >
                          <item.icon size={14} />
                          {item.name}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-[0.6rem] font-medium uppercase tracking-[.15em] text-white/25">Project Notes</p>
                        <h3 className="mt-0.5 text-lg font-semibold text-white/90">My Notes</h3>
                      </div>
                      <div className="rounded-lg bg-gradient-to-r from-[#234b42] to-[#2d5c51] px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-[#234b42]/20">
                        + New Note
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { title: "Product Roadmap", snippet: "Q3 priorities and key milestones for launch...", tag: "planning", tagColor: "bg-sky-500/10 text-sky-400" },
                        { title: "Meeting Notes", snippet: "Action items from this week's standup...", tag: "meetings", tagColor: "bg-violet-500/10 text-violet-400" },
                        { title: "Design Ideas", snippet: "New carousel themes and color palettes...", tag: "design", tagColor: "bg-rose-500/10 text-rose-400" },
                        { title: "Research", snippet: "Competitor analysis and market findings...", tag: "research", tagColor: "bg-amber-500/10 text-amber-400" },
                      ].map((card) => (
                        <div
                          key={card.title}
                          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
                        >
                          <p className="text-sm font-semibold text-white/80">{card.title}</p>
                          <p className="mt-1.5 text-xs text-white/30">{card.snippet}</p>
                          <div className="mt-2.5">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${card.tagColor}`}>
                              {card.tag}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════ FEATURES — BENTO GRID ═══════ */}
      <section id="features" className="relative py-16 sm:py-24 lg:py-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-[#234b42]/5 blur-[150px]" />
        </div>

        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[.2em] text-[#c9e979]/70">Features</p>
              <h2 className="mt-4 text-2xl font-bold tracking-[-.04em] sm:text-4xl lg:text-5xl">
                Everything you need
              </h2>
              <p className="mt-4 text-sm text-white/40 sm:mt-5 sm:text-lg">
                From quick notes to full articles — all powered by AI.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-3 sm:mt-16 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 auto-rows-[minmax(200px,auto)]">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={80 + i * 60} className={f.span}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.bg} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                  <div className="relative">
                    <div
                      className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: `${f.color}18` }}
                    >
                      <f.icon size={20} style={{ color: f.color }} />
                    </div>
                    <h3 className="text-lg font-semibold text-white/90">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/40">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ THEMES ═══════ */}
      <section className="relative py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#c9e979]/70 sm:text-sm">Customize</p>
              <h2 className="mt-4 text-2xl font-bold tracking-[-.04em] sm:text-4xl lg:text-5xl">
                6 beautiful themes
              </h2>
              <p className="mt-4 text-sm text-white/40 sm:mt-5 sm:text-lg">
                Switch themes instantly. Every color is crafted for readability.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:mt-16 sm:gap-5">
              {[
                { name: "Emerald", colors: ["#234b42", "#c9e979"] },
                { name: "Ocean", colors: ["#1e5f74", "#7fd3e8"] },
                { name: "Violet", colors: ["#5a4a9e", "#c4b5f0"] },
                { name: "Rose", colors: ["#a0405e", "#f0a5bb"] },
                { name: "Amber", colors: ["#a06a1e", "#f0c77f"] },
                { name: "Slate", colors: ["#475569", "#b8c4d4"] },
              ].map((t) => (
                <div
                  key={t.name}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] sm:gap-3 sm:rounded-2xl sm:p-6"
                >
                  <div className="relative">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110 sm:h-16 sm:w-16 sm:rounded-2xl"
                      style={{ background: t.colors[0], boxShadow: `0 8px 32px ${t.colors[0]}40` }}
                    >
                      <div className="h-6 w-6 rounded-full" style={{ background: `${t.colors[1]}60` }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white/60 group-hover:text-white/80 transition-colors">{t.name}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════ PWA / INSTALL ═══════ */}
      <section className="relative py-16 sm:py-24 lg:py-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c9e979]/3 blur-[150px]" />
        </div>

        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-10 sm:gap-16 lg:grid-cols-2">
            <Reveal>
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c9e979]/20 bg-[#c9e979]/5 px-4 py-1.5 text-sm font-medium text-[#c9e979]/80">
                  <Smartphone size={14} />
                  Progressive Web App
                </div>
                <h2 className="text-2xl font-bold tracking-[-.04em] sm:text-4xl lg:text-5xl">
                  Install on{' '}
                  <span className="bg-gradient-to-r from-[#c9e979] to-[#8bc34a] bg-clip-text text-transparent">
                    any device
                  </span>
                </h2>
                <p className="mt-6 text-lg leading-relaxed text-white/40">
                  ZapNote is a <strong className="text-white/70">Progressive Web App (PWA)</strong>. Install it
                  directly from your browser — no app store needed. Works offline, loads instantly,
                  and feels like a native app.
                </p>
                <div className="mt-10 space-y-5">
                  {[
                    { icon: Smartphone, text: "Install from browser — no app store required" },
                    { icon: Download, text: "Works offline — access your notes anywhere" },
                    { icon: Zap, text: "Instant loading — cached for speed" },
                    { icon: Shield, text: "Home screen icon — one tap access" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]">
                        <item.icon size={18} className="text-[#c9e979]/70" />
                      </div>
                      <span className="text-sm font-medium text-white/60">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 backdrop-blur-sm">
                <div className="mb-7 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#234b42]/20">
                    <Smartphone size={18} className="text-[#c9e979]/80" />
                  </div>
                  <h3 className="text-lg font-semibold text-white/90">How to install</h3>
                </div>
                <div className="space-y-6">
                  {[
                    {
                      platform: "iPhone / iPad",
                      steps: ["Tap the Share button", "Scroll down → 'Add to Home Screen'", "Tap 'Add' — done!"],
                    },
                    {
                      platform: "Android",
                      steps: ["Tap the 3-dot menu (⋮)", "Tap 'Install app' or 'Add to Home Screen'", "Confirm — done!"],
                    },
                    {
                      platform: "Desktop",
                      steps: ["Click the install icon in the address bar", "Or use the menu → 'Install ZapNote!'", "App opens in its own window — done!"],
                    },
                  ].map((p) => (
                    <div key={p.platform}>
                      <p className="mb-2 text-sm font-semibold text-white/80">{p.platform}</p>
                      <ol className="space-y-1 pl-0">
                        {p.steps.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/35">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[0.6rem] font-bold text-white/30">{i + 1}</span>
                            {s}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
                {isInstallable && !isInstalled && (
                  <button
                    onClick={() => void install()}
                    className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#234b42] to-[#2d5c51] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#234b42]/20 transition-all hover:shadow-xl"
                  >
                    <Download size={16} />
                    Install Now
                  </button>
                )}
                {isInstalled && (
                  <div className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-6 py-3 text-sm font-semibold text-green-400">
                    ✓ ZapNote! is installed
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════ PRIVACY / BYOK ═══════ */}
      <section className="relative py-16 sm:py-24 lg:py-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-[#234b42]/5 blur-[150px]" />
        </div>

        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-10 sm:gap-16 lg:grid-cols-2">
            <Reveal>
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c9e979]/20 bg-[#c9e979]/5 px-4 py-1.5 text-sm font-medium text-[#c9e979]/80">
                  <Shield size={14} />
                  Privacy First
                </div>
                <h2 className="text-2xl font-bold tracking-[-.04em] sm:text-4xl lg:text-5xl">
                  Your data stays{" "}
                  <span className="bg-gradient-to-r from-[#c9e979] to-[#8bc34a] bg-clip-text text-transparent">
                    yours
                  </span>
                </h2>
                <p className="mt-6 text-lg leading-relaxed text-white/40">
                  ZapNote uses <strong className="text-white/70">Bring Your Own Key (BYOK)</strong> for AI features.
                  Your Gemini API key is encrypted with AES-256 and stored per-account.
                  We never have access to your key or your data.
                </p>
                <div className="mt-10 space-y-5">
                  {[
                    { icon: Shield, text: "AES-256-GCM encryption for API keys" },
                    { icon: Lock, text: "Per-account isolated storage" },
                    { icon: Globe, text: "Guest mode — notes stay in your browser" },
                    { icon: Star, text: "Email verification & password reset" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]">
                        <item.icon size={18} className="text-[#c9e979]/70" />
                      </div>
                      <span className="text-sm font-medium text-white/60">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 backdrop-blur-sm">
                <div className="mb-7 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#234b42]/20">
                    <Palette size={18} className="text-[#c9e979]/80" />
                  </div>
                  <h3 className="text-lg font-semibold text-white/90">How it works</h3>
                </div>
                <div className="space-y-6">
                  {[
                    {
                      step: "1",
                      title: "Get your Gemini API key",
                      desc: "Free from Google AI Studio — takes 30 seconds",
                    },
                    {
                      step: "2",
                      title: "Paste it in Settings",
                      desc: "Encrypted and stored per-account, never shared",
                    },
                    {
                      step: "3",
                      title: "Use AI features",
                      desc: "Articles, carousels, SWOT analysis, and note AI assistant",
                    },
                  ].map((s) => (
                    <div key={s.step} className="flex gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#234b42] to-[#2d5c51] text-sm font-bold text-[#c9e979] shadow-lg shadow-[#234b42]/20">
                        {s.step}
                      </div>
                      <div>
                        <p className="font-semibold text-white/80">{s.title}</p>
                        <p className="mt-0.5 text-sm text-white/35">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="relative py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#234b42] via-[#1a3d34] to-[#0f2e27] px-6 py-12 text-center sm:rounded-3xl sm:px-16 sm:py-20">
              <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#c9e979]/10 blur-[100px]" />
              <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#c9e979]/5 blur-[100px]" />
              <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c9e979]/5 blur-[80px]" />

              <div className="relative">
                <h2 className="text-2xl font-bold tracking-[-.04em] text-white sm:text-4xl lg:text-5xl">
                  Ready to supercharge<br className="hidden sm:block" /> your notes?
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-sm text-white/50 sm:mt-6 sm:text-lg">
                  Start writing smarter today. No credit card required. Free forever for basic usage.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
                  <Link
                    href="/app/notes"
                    className="group relative overflow-hidden rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#234b42] shadow-2xl shadow-black/20 transition-all hover:shadow-white/10 sm:rounded-2xl sm:px-10 sm:py-4 sm:text-base"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Get Started Free
                      <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </span>
                    <div className="absolute inset-0 bg-gray-50 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-white/[0.06] bg-[#09090b]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#234b42] to-[#477f67] text-[0.6rem] font-bold text-[#c9e979]">
              Z
            </div>
            <span className="text-sm font-semibold text-white/50">ZapNote!</span>
          </div>
          <p className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} ZapNote! &middot; Built with Next.js & Gemini AI
          </p>
        </div>
      </footer>
    </div>
  );
}
