"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useSettings } from "@/components/SettingsProvider";
import { Bot, Download, Globe, Lock, LogOut, Menu, NotebookPen, PenLine, PenTool, Settings, Sparkles, X, Zap } from "lucide-react";
import { usePwaInstall } from "@/lib/usePwaInstall"

const SIDEBAR_KEY = "zapnote:sidebar:minimized";

const navItems = [
  { label: "Notes", href: "/app/notes", icon: NotebookPen },
  { label: "Articles", href: "/app/articles", icon: PenLine, authOnly: true, aiOnly: true },
  { label: "SWOT Analysis", href: "/app/swot", icon: Bot, authOnly: true, aiOnly: true },
  { label: "Creator", href: "/app/creator", icon: PenTool, authOnly: true, aiOnly: true },
];

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function NotesShell({ title, subtitle, children, headerExtra }: { title: string; subtitle: string; children: ReactNode; headerExtra?: ReactNode }) {
  const [mobileNav, setMobileNav] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [minimized, setMinimized] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem(SIDEBAR_KEY) === "1"; } catch { return false; }
  });
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { settings } = useSettings();
  const logoLetter = (settings.siteName || "V").charAt(0).toUpperCase();
  const isGuest = session.status === "anonymous";
  const email = session.status === "authed" ? session.email : "";
  const name = session.status === "authed" && (session as { name?: string }).name ? (session as { name?: string }).name : email;
  const initials = isGuest ? "G" : (name || email || "U").slice(0, 2).toUpperCase();
  const compact = minimized && !mobileNav;
  const skipFirstPersist = useRef(true);
  const { isInstallable, isInstalled, install } = usePwaInstall();
  const [installDismissed, setInstallDismissed] = useState(false);

  useIsomorphicLayoutEffect(() => { setMounted(true); }, []);

  useIsomorphicLayoutEffect(() => {
    if (skipFirstPersist.current) { skipFirstPersist.current = false; return; }
    try { window.localStorage.setItem(SIDEBAR_KEY, minimized ? "1" : "0"); } catch {}
  }, [minimized]);

  const hasApiKey = settings.hasGeminiApiKey ?? false;
  const visibleNav = navItems.filter((item) => !item.authOnly || !isGuest);

  const sidebarWidth = compact ? "4.5rem" : "14rem";
  const sidebarPadX = compact ? "0.75rem" : "1.25rem";

  return (
    <div className="h-dvh overflow-hidden bg-(--crm-bg) font-[var(--font-dm)] text-(--crm-fg)">
      <style>{`
        @keyframes vn-rise { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        .vn-rise { animation: vn-rise .55s cubic-bezier(.2,.75,.25,1) both; }
      `}</style>
      <div className="flex h-dvh overflow-hidden">
        {/* Sidebar — hidden on mobile unless toggled */}
        <aside
          style={{ width: sidebarWidth, paddingLeft: sidebarPadX, paddingRight: sidebarPadX }}
          className={`${mobileNav ? "fixed inset-0 z-40 flex" : "hidden"} shrink-0 flex-col border-r border-(--crm-border) bg-(--crm-dark) py-6 text-(--crm-faint) md:sticky md:top-0 md:flex md:h-screen md:overflow-y-auto ${mounted ? "transition-[width,padding] duration-300" : ""}`}
        >
          {/* Logo */}
          <div className={`flex items-center justify-between px-2 ${minimized ? "mb-8" : "mb-10"}`}>
            <button type="button" onClick={() => setMinimized((prev) => !prev)} title={minimized ? "Expand sidebar" : "Minimize sidebar"} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--crm-accent) font-[var(--font-space-mono)] text-sm font-bold text-(--crm-dark)">{logoLetter}</div>
              {!compact && <span className="block truncate text-[1.0625rem] font-semibold leading-tight tracking-[-.03em] text-white">{settings.siteName}</span>}
            </button>
            <button className="shrink-0 md:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={20} /></button>
          </div>

          {!compact && <p className="mb-3 px-2 text-[0.63rem] font-semibold uppercase tracking-[.18em] text-(--crm-faint)">Workspace</p>}

          <nav className="space-y-1">
            {visibleNav.map(({ label, href, icon: Icon, aiOnly }) => {
              const locked = aiOnly && !hasApiKey;
              return (
                <Link
                  key={href}
                  href={locked ? "/app/settings" : href}
                  title={locked ? `Set up Gemini API key in Settings to use ${label}` : label}
                  onClick={() => setMobileNav(false)}
                  className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-sm transition-colors ${compact ? "justify-center px-2" : "px-3 text-left"} ${locked ? "opacity-50" : ""} ${pathname === href ? "bg-(--crm-active) text-white" : "text-(--crm-faint) hover:bg-(--crm-darker) hover:text-white"}`}
                >
                  <Icon size={17} className="shrink-0" />{!compact && label}
                  {!compact && locked && <Lock size={12} className="ml-auto shrink-0 opacity-60" />}
                </Link>
              );
            })}
          </nav>

          {!compact && !isGuest && <p className="mb-3 mt-8 px-2 text-[0.63rem] font-semibold uppercase tracking-[.18em] text-(--crm-faint)">Manage</p>}
          {!isGuest && (
            <nav className="space-y-1">
              <Link href="/app/settings" title="Settings" onClick={() => setMobileNav(false)} className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-sm transition-colors ${compact ? "justify-center px-2" : "px-3 text-left"} ${pathname === "/app/settings" ? "bg-(--crm-active) text-white" : "text-(--crm-faint) hover:bg-(--crm-darker) hover:text-white"}`}>
                <Settings size={17} className="shrink-0" />{!compact && "Settings"}
              </Link>
            </nav>
          )}

          <div className="mt-auto pt-6">
            {!compact && !isGuest && !hasApiKey && (
              <Link href="/app/settings" onClick={() => setMobileNav(false)} className="mb-3 flex items-start gap-2.5 rounded-lg border border-dashed border-(--amber) px-3 py-2.5 transition-colors hover:bg-(--crm-darker)" style={{ borderColor: "rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.06)" }}>
                <Sparkles size={13} className="mt-0.5 shrink-0" style={{ color: "#f59e0b" }} />
                <div>
                  <p className="text-[0.69rem] font-semibold" style={{ color: "#f59e0b" }}>AI Not Configured</p>
                  <p className="mt-0.5 text-[0.6rem] leading-4 text-(--crm-faint)">Add your Gemini API key in Settings to unlock AI features.</p>
                </div>
              </Link>
            )}
            {!compact && !isGuest && hasApiKey && (
              <div className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2">
                <Zap size={13} className="shrink-0 text-green-400" />
                <span className="text-[0.69rem] font-semibold text-green-400">AI Ready</span>
              </div>
            )}
            {!compact && isGuest && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-dashed border-(--crm-faint) px-3 py-2">
                <Globe size={13} className="shrink-0 text-(--crm-faint)" />
                <span className="text-[0.69rem] font-semibold text-(--crm-faint)">Guest Mode</span>
              </div>
            )}
            {isInstallable && !isInstalled && !installDismissed && !compact && (
              <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-dashed border-(--crm-border) bg-(--crm-hover) px-3 py-2.5">
                <Download size={13} className="mt-0.5 shrink-0 text-(--crm-primary)" />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.69rem] font-semibold text-(--crm-fg)">Install ZapNote!</p>
                  <p className="mt-0.5 text-[0.6rem] leading-4 text-(--crm-muted)">Add to home screen for quick access</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => void install()} className="rounded-md bg-(--crm-primary) px-2 py-1 text-[0.6rem] font-semibold text-white transition-colors hover:bg-(--crm-dark)">Install</button>
                  <button onClick={() => setInstallDismissed(true)} className="rounded p-0.5 text-(--crm-muted) hover:text-(--crm-fg)" aria-label="Dismiss">
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
            <button onClick={logout} className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-sm transition-colors ${compact ? "justify-center px-2" : "px-3 text-left"} text-(--crm-faint) hover:bg-(--crm-darker) hover:text-white`} title={isGuest ? "Exit guest mode" : "Logout"}>
              <LogOut size={17} className="shrink-0" />{!compact && (isGuest ? "Exit Guest" : "Logout")}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {/* Header — compact on mobile */}
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-(--crm-border) bg-(--crm-surface) px-4 shadow-[0_1px_0_rgba(0,0,0,.03)] sm:h-[76px] sm:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <button className="rounded-lg p-1.5 hover:bg-(--crm-hover) md:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button>
              <div className="hidden shrink-0 sm:block">
                <p className="text-[0.6rem] font-medium uppercase tracking-[.16em] text-(--crm-muted) sm:text-[0.69rem]">{subtitle}</p>
                <h1 className="mt-0.5 text-base font-semibold tracking-[-.03em] sm:text-xl">{title}</h1>
              </div>
              {headerExtra && <div className="flex min-w-0 flex-1 max-w-[320px]">{headerExtra}</div>}
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {isGuest && <span className="hidden items-center gap-1 rounded-full border border-dashed border-(--crm-border) bg-(--crm-hover) px-2 py-0.5 text-[0.6rem] font-semibold text-(--crm-muted) sm:flex"><Globe size={10} />Guest</span>}
              <div className="hidden h-5 w-px bg-(--crm-border) sm:block" />
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--crm-soft) text-[0.65rem] font-bold text-(--crm-fg) sm:h-8 sm:w-8 sm:text-xs">{initials}</span>
              </div>
            </div>
          </header>

          <div className="flex min-h-0 w-full flex-1 flex-col px-3 py-4 sm:mx-auto sm:max-w-[1200px] sm:px-5 sm:py-7 sm:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
