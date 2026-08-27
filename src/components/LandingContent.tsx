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
      className="absolute rounded-full blur-[120px] transition-all duration-[2s]"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: color,
        opacity: mounted ? 0.12 : 0,
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
    bg: "from-emerald-50 to-green-50",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    desc: "Built-in chat that understands your notes. Ask, summarize, brainstorm.",
    color: "#7c3aed",
    span: "col-span-1 row-span-1 lg:col-span-2",
    bg: "from-violet-50 to-fuchsia-50",
  },
  {
    icon: PenTool,
    title: "Carousel Creator",
    desc: "Turn notes into stunning social media carousels with multiple themes.",
    color: "#a0405e",
    span: "col-span-1 row-span-1",
    bg: "from-rose-50 to-pink-50",
  },
  {
    icon: BarChart3,
    title: "SWOT Analysis",
    desc: "AI-powered SWOT with SEO scores. Analyze any content in seconds.",
    color: "#a06a1e",
    span: "col-span-1 row-span-1",
    bg: "from-amber-50 to-orange-50",
  },
  {
    icon: MessageSquare,
    title: "Article Generator",
    desc: "Generate long-form articles from your notes. Humanize, optimize for SEO, export as PDF or HTML.",
    color: "#1e5f74",
    span: "col-span-1 row-span-1 lg:col-span-2",
    bg: "from-sky-50 to-cyan-50",
  },
  {
    icon: Download,
    title: "Export Anywhere",
    desc: "PDF, Word, TXT, HTML — or share via link with QR code.",
    color: "#475569",
    span: "col-span-1 row-span-1",
    bg: "from-slate-50 to-gray-50",
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
    <div className="min-h-screen overflow-x-hidden bg-white font-[var(--font-dm)] text-gray-900 selection:bg-[#234b42]/10 selection:text-[#234b42]">
      {/* ═══════ NAV ═══════ */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-200/80 bg-white/80 backdrop-blur-xl">
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
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section ref={heroRef} className="relative overflow-hidden pt-24 pb-12 sm:pt-40 sm:pb-28">
        <GradientBlob color="#234b42" size={800} x="10%" y="-20%" delay={0} />
        <GradientBlob color="#c9e979" size={600} x="60%" y="-10%" delay={200} />
        <GradientBlob color="#7c3aed" size={500} x="30%" y="40%" delay={400} />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />

        <div
          className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle 600px at ${mousePos.x}% ${mousePos.y}%, rgba(35,75,66,0.06), transparent)`,
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#234b42]/10 bg-[#234b42]/5 px-3 py-1 text-xs font-medium text-[#234b42] sm:mb-8 sm:px-4 sm:py-1.5 sm:text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#234b42]/10">
                  <Zap size={11} className="text-[#234b42]" />
                </span>
                AI-Powered Note Taking
              </div>

              <h1 className="text-3xl font-bold tracking-[-.05em] sm:text-5xl lg:text-[5.5rem] lg:leading-[1.05]">
                <span className="text-gray-900">Your ideas,</span>
                <br />
                <span className="bg-gradient-to-r from-[#234b42] via-[#2d6b5a] to-[#477f67] bg-clip-text text-transparent">
                  amplified by AI
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-gray-500 sm:mt-7 sm:text-lg lg:text-xl">
                The all-in-one workspace for notes, articles, carousels, and content strategy.
                <br className="hidden sm:block" />
                Write smarter. Create faster. Analyze deeper.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
                <Link
                  href="/app/notes"
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-[#234b42] to-[#2d5c51] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#234b42]/20 transition-all hover:shadow-xl hover:shadow-[#234b42]/30 sm:rounded-2xl sm:px-8 sm:py-4 sm:text-base"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Start Writing Free
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
                <a
                  href="#features"
                  className="flex items-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 sm:rounded-2xl sm:px-8 sm:py-4 sm:text-base"
                >
                  See Features
                </a>
              </div>

              <div className="mx-auto mt-10 grid max-w-lg grid-cols-4 gap-4 sm:mt-16 sm:gap-6">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-bold tracking-tight text-gray-900">{s.value}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ═══════ APP PREVIEW ═══════ */}
          <Reveal delay={200} className="mt-10 sm:mt-20">
            <div className="mx-auto max-w-5xl">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-1.5 shadow-2xl shadow-gray-200/50">
                <div className="flex items-center gap-3 rounded-t-xl border-b border-gray-200 bg-white px-5 py-3.5">
                  <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                    <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                    <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="ml-3 flex flex-1 items-center gap-2 rounded-lg bg-gray-100 px-4 py-1.5">
                    <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs text-gray-400">zapnote.xyz/app/notes</span>
                  </div>
                </div>

                <div className="flex min-h-[380px] bg-white">
                  <div className="hidden w-60 border-r border-gray-100 p-5 sm:block">
                    <div className="mb-6 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#234b42] to-[#477f67] text-xs font-bold text-[#c9e979]">Z</div>
                      <span className="text-sm font-semibold text-gray-800">ZapNote!</span>
                    </div>
                    <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[.18em] text-gray-400">Workspace</p>
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
                            item.active ? "bg-[#234b42]/10 font-semibold text-[#234b42]" : "text-gray-500"
                          }`}
                        >
                          <item.icon size={14} />
                          {item.name}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-[0.6rem] font-medium uppercase tracking-[.15em] text-gray-400">Project Notes</p>
                        <h3 className="mt-0.5 text-lg font-semibold text-gray-800">My Notes</h3>
                      </div>
                      <div className="rounded-lg bg-gradient-to-r from-[#234b42] to-[#2d5c51] px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-[#234b42]/20">
                        + New Note
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { title: "Product Roadmap", snippet: "Q3 priorities and key milestones for launch...", tag: "planning", tagColor: "bg-sky-50 text-sky-600" },
                        { title: "Meeting Notes", snippet: "Action items from this week's standup...", tag: "meetings", tagColor: "bg-violet-50 text-violet-600" },
                        { title: "Design Ideas", snippet: "New carousel themes and color palettes...", tag: "design", tagColor: "bg-rose-50 text-rose-600" },
                        { title: "Research", snippet: "Competitor analysis and market findings...", tag: "research", tagColor: "bg-amber-50 text-amber-600" },
                      ].map((card) => (
                        <div key={card.title} className="rounded-xl border border-gray-100 p-3.5 transition-colors hover:border-gray-200 hover:shadow-sm">
                          <p className="text-sm font-semibold text-gray-800">{card.title}</p>
                          <p className="mt-1.5 text-xs text-gray-400">{card.snippet}</p>
                          <div className="mt-2.5">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${card.tagColor}`}>{card.tag}</span>
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

      {/* ═══════ FEATURES ═══════ */}
      <section id="features" className="relative py-16 sm:py-24 lg:py-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-[#234b42]/3 blur-[150px]" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#234b42] sm:text-sm">Features</p>
              <h2 className="mt-4 text-2xl font-bold tracking-[-.04em] sm:text-4xl lg:text-5xl">Everything you need</h2>
              <p className="mt-4 text-sm text-gray-500 sm:mt-5 sm:text-lg">From quick notes to full articles — all powered by AI.</p>
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 auto-rows-[minmax(200px,auto)]">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={80 + i * 60} className={f.span}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-100">
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.bg} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                  <div className="relative">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${f.color}10` }}>
                      <f.icon size={20} style={{ color: f.color }} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ THEMES ═══════ */}
      <section className="relative border-t border-gray-100 py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#234b42] sm:text-sm">Customize</p>
              <h2 className="mt-4 text-2xl font-bold tracking-[-.04em] sm:text-4xl lg:text-5xl">6 beautiful themes</h2>
              <p className="mt-4 text-sm text-gray-500 sm:mt-5 sm:text-lg">Switch themes instantly. Every color is crafted for readability.</p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:mt-16 sm:gap-5">
              {[
                { name: "Emerald", color: "#234b42" },
                { name: "Ocean", color: "#1e5f74" },
                { name: "Violet", color: "#5a4a9e" },
                { name: "Rose", color: "#a0405e" },
                { name: "Amber", color: "#a06a1e" },
                { name: "Slate", color: "#475569" },
              ].map((t) => (
                <div key={t.name} className="group flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg sm:gap-3 sm:rounded-2xl sm:p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl shadow-md transition-transform duration-300 group-hover:scale-110 sm:h-16 sm:w-16 sm:rounded-2xl sm:shadow-lg" style={{ background: t.color, boxShadow: `0 4px 20px ${t.color}25` }}>
                    <div className="h-5 w-5 rounded-full bg-white/30 sm:h-6 sm:w-6" />
                  </div>
                  <span className="text-sm font-semibold text-gray-600 group-hover:text-gray-800 transition-colors">{t.name}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════ PWA ═══════ */}
      <section className="relative border-t border-gray-100 py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-10 sm:gap-16 lg:grid-cols-2">
            <Reveal>
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#234b42]/10 bg-[#234b42]/5 px-4 py-1.5 text-sm font-medium text-[#234b42]">
                  <Smartphone size={14} />
                  Progressive Web App
                </div>
                <h2 className="text-2xl font-bold tracking-[-.04em] sm:text-4xl lg:text-5xl">
                  Install on <span className="bg-gradient-to-r from-[#234b42] to-[#477f67] bg-clip-text text-transparent">any device</span>
                </h2>
                <p className="mt-6 text-base leading-relaxed text-gray-500">
                  ZapNote is a <strong className="text-gray-700">Progressive Web App (PWA)</strong>. Install it directly from your browser — no app store needed. Works offline, loads instantly.
                </p>
                <div className="mt-10 space-y-5">
                  {[
                    { icon: Smartphone, text: "Install from browser — no app store required" },
                    { icon: Download, text: "Works offline — access your notes anywhere" },
                    { icon: Zap, text: "Instant loading — cached for speed" },
                    { icon: Shield, text: "Home screen icon — one tap access" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#234b42]/5">
                        <item.icon size={18} className="text-[#234b42]" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8">
                <div className="mb-7 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#234b42]/10">
                    <Smartphone size={18} className="text-[#234b42]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">How to install</h3>
                </div>
                <div className="space-y-6">
                  {[
                    { platform: "iPhone / iPad", steps: ["Tap the Share button", "Scroll down → 'Add to Home Screen'", "Tap 'Add' — done!"] },
                    { platform: "Android", steps: ["Tap the 3-dot menu (⋮)", "Tap 'Install app' or 'Add to Home Screen'", "Confirm — done!"] },
                    { platform: "Desktop", steps: ["Click the install icon in the address bar", "Or use the menu → 'Install ZapNote!'", "App opens in its own window — done!"] },
                  ].map((p) => (
                    <div key={p.platform}>
                      <p className="mb-2 text-sm font-semibold text-gray-800">{p.platform}</p>
                      <ol className="space-y-1 pl-0">
                        {p.steps.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#234b42]/10 text-[0.6rem] font-bold text-[#234b42]">{i + 1}</span>
                            {s}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
                {isInstallable && !isInstalled && (
                  <button onClick={() => void install()} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#234b42] to-[#2d5c51] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#234b42]/20 transition-all hover:shadow-xl">
                    <Download size={16} /> Install Now
                  </button>
                )}
                {isInstalled && (
                  <div className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-6 py-3 text-sm font-semibold text-green-700">
                    ✓ ZapNote! is installed
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════ PRIVACY ═══════ */}
      <section className="relative border-t border-gray-100 py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-10 sm:gap-16 lg:grid-cols-2">
            <Reveal>
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#234b42]/10 bg-[#234b42]/5 px-4 py-1.5 text-sm font-medium text-[#234b42]">
                  <Shield size={14} /> Privacy First
                </div>
                <h2 className="text-2xl font-bold tracking-[-.04em] sm:text-4xl lg:text-5xl">
                  Your data stays <span className="bg-gradient-to-r from-[#234b42] to-[#477f67] bg-clip-text text-transparent">yours</span>
                </h2>
                <p className="mt-6 text-base leading-relaxed text-gray-500">
                  ZapNote uses <strong className="text-gray-700">Bring Your Own Key (BYOK)</strong> for AI features. Your Gemini API key is encrypted with AES-256 and stored per-account.
                </p>
                <div className="mt-10 space-y-5">
                  {[
                    { icon: Shield, text: "AES-256-GCM encryption for API keys" },
                    { icon: Lock, text: "Per-account isolated storage" },
                    { icon: Globe, text: "Guest mode — notes stay in your browser" },
                    { icon: Star, text: "Email verification & password reset" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#234b42]/5">
                        <item.icon size={18} className="text-[#234b42]" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8">
                <div className="mb-7 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#234b42]/10">
                    <Palette size={18} className="text-[#234b42]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">How it works</h3>
                </div>
                <div className="space-y-6">
                  {[
                    { step: "1", title: "Get your Gemini API key", desc: "Free from Google AI Studio — takes 30 seconds" },
                    { step: "2", title: "Paste it in Settings", desc: "Encrypted and stored per-account, never shared" },
                    { step: "3", title: "Use AI features", desc: "Articles, carousels, SWOT analysis, and note AI assistant" },
                  ].map((s) => (
                    <div key={s.step} className="flex gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#234b42] to-[#2d5c51] text-sm font-bold text-[#c9e979] shadow-md shadow-[#234b42]/15">
                        {s.step}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{s.title}</p>
                        <p className="mt-0.5 text-sm text-gray-500">{s.desc}</p>
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-[#234b42]/20 bg-gradient-to-br from-[#234b42] via-[#1a3d34] to-[#0f2e27] px-6 py-12 text-center sm:rounded-3xl sm:px-16 sm:py-20">
              <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#c9e979]/10 blur-[100px]" />
              <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#c9e979]/5 blur-[100px]" />
              <div className="relative">
                <h2 className="text-2xl font-bold tracking-[-.04em] text-white sm:text-4xl lg:text-5xl">
                  Ready to supercharge<br className="hidden sm:block" /> your notes?
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-sm text-white/60 sm:mt-6 sm:text-lg">
                  Start writing smarter today. No credit card required. Free forever for basic usage.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
                  <Link
                    href="/app/notes"
                    className="group relative overflow-hidden rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#234b42] shadow-2xl transition-all hover:shadow-white/20 sm:rounded-2xl sm:px-10 sm:py-4 sm:text-base"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Get Started Free
                      <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#234b42] to-[#477f67] text-[0.6rem] font-bold text-[#c9e979]">Z</div>
            <span className="text-sm font-semibold text-gray-600">ZapNote!</span>
          </div>
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} ZapNote! &middot; Built with Next.js & Gemini AI</p>
        </div>
      </footer>
    </div>
  );
}
