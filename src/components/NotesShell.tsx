"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useSettings } from "@/components/SettingsProvider";
import { Bot, Globe, LogOut, Menu, NotebookPen, PenLine, Settings, X } from "lucide-react";

const SIDEBAR_KEY = "vinotes:sidebar:minimized";

const navItems = [
  { label: "Notes", href: "/notes", icon: NotebookPen },
  { label: "Articles", href: "/articles", icon: PenLine, authOnly: true },
  { label: "SWOT Analysis", href: "/swot", icon: Bot, authOnly: true },
];

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function NotesShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const [mobileNav, setMobileNav] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [minimized, setMinimized] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem(SIDEBAR_KEY) === "1"; } catch { return false; }
  });
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { settings } = useSettings();
  const isGuest = session.status === "anonymous";
  const email = session.status === "authed" ? session.email : "";
  const name = session.status === "authed" && (session as { name?: string }).name ? (session as { name?: string }).name : email;
  const initials = isGuest ? "G" : (name || email || "U").slice(0, 2).toUpperCase();
  const compact = minimized && !mobileNav;
  const skipFirstPersist = useRef(true);

  useIsomorphicLayoutEffect(() => { setMounted(true); }, []);

  useIsomorphicLayoutEffect(() => {
    if (skipFirstPersist.current) { skipFirstPersist.current = false; return; }
    try { window.localStorage.setItem(SIDEBAR_KEY, minimized ? "1" : "0"); } catch {}
  }, [minimized]);

  const visibleNav = navItems.filter((item) => !item.authOnly || !isGuest);

  return (
    <div className="min-h-screen bg-(--crm-bg) font-[var(--font-dm)] text-(--crm-fg)">
      <style>{`
        @keyframes vn-rise { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        .vn-rise { animation: vn-rise .55s cubic-bezier(.2,.75,.25,1) both; }
      `}</style>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className={`${mobileNav ? "fixed inset-0 z-40 flex" : "hidden"} shrink-0 flex-col border-r border-(--crm-border) bg-(--crm-dark) px-5 py-6 text-(--crm-faint) md:sticky md:top-0 md:flex md:h-screen md:overflow-y-auto ${minimized ? "md:w-[76px] md:px-3" : "md:w-[220px] md:px-4"} ${mounted ? "transition-[width] duration-300" : ""}`}>
          {/* Logo */}
          <div className={`flex items-center justify-between px-2 ${minimized ? "mb-8" : "mb-10"}`}>
            <button type="button" onClick={() => setMinimized((prev) => !prev)} title={minimized ? "Expand sidebar" : "Minimize sidebar"} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--crm-accent) font-[var(--font-space-mono)] text-sm font-bold text-(--crm-dark)">V</div>
              {!compact && <span className="block truncate text-[17px] font-semibold leading-tight tracking-[-.03em] text-white">{settings.siteName}</span>}
            </button>
            <button className="shrink-0 md:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={20} /></button>
          </div>

          {/* Workspace label */}
          {!compact && <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[.18em] text-(--crm-faint)">Workspace</p>}

          {/* Nav items */}
          <nav className="space-y-1">
            {visibleNav.map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href} title={label} onClick={() => setMobileNav(false)} className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-sm transition-colors ${compact ? "justify-center px-2" : "px-3 text-left"} ${pathname === href ? "bg-(--crm-active) text-white" : "text-(--crm-faint) hover:bg-(--crm-darker) hover:text-white"}`}>
                <Icon size={17} className="shrink-0" />{!compact && label}
              </Link>
            ))}
          </nav>

          {/* Manage section */}
          {!compact && <p className="mb-3 mt-8 px-2 text-[10px] font-semibold uppercase tracking-[.18em] text-(--crm-faint)">Manage</p>}
          <nav className="space-y-1">
            <Link href="/settings" title="Settings" onClick={() => setMobileNav(false)} className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-sm transition-colors ${compact ? "justify-center px-2" : "px-3 text-left"} ${pathname === "/settings" ? "bg-(--crm-active) text-white" : "text-(--crm-faint) hover:bg-(--crm-darker) hover:text-white"}`}>
              <Settings size={17} className="shrink-0" />{!compact && "Settings"}
            </Link>
          </nav>

          {/* Footer — guest badge + logout */}
          <div className="mt-auto pt-6">
            {!compact && isGuest && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-dashed border-(--crm-faint) px-3 py-2">
                <Globe size={13} className="shrink-0 text-(--crm-faint)" />
                <span className="text-[11px] font-semibold text-(--crm-faint)">Guest Mode</span>
              </div>
            )}
            <button onClick={logout} className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-sm transition-colors ${compact ? "justify-center px-2" : "px-3 text-left"} text-(--crm-faint) hover:bg-(--crm-darker) hover:text-white`} title={isGuest ? "Exit guest mode" : "Logout"}>
              <LogOut size={17} className="shrink-0" />{!compact && (isGuest ? "Exit Guest" : "Logout")}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-[76px] shrink-0 items-center justify-between border-b border-(--crm-border) bg-(--crm-surface) px-5 shadow-[0_1px_0_rgba(0,0,0,.03)] sm:px-8">
            <div className="flex items-center gap-3">
              <button className="rounded-lg p-2 hover:bg-(--crm-hover) md:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[.16em] text-(--crm-muted)">{subtitle}</p>
                <h1 className="mt-0.5 text-xl font-semibold tracking-[-.03em]">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isGuest && <span className="flex items-center gap-1 rounded-full border border-dashed border-(--crm-border) bg-(--crm-hover) px-2.5 py-1 text-[11px] font-semibold text-(--crm-muted)"><Globe size={12} />Guest</span>}
              <div className="h-6 w-px bg-(--crm-border)" />
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--crm-soft) text-xs font-bold text-(--crm-fg)">{initials}</span>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-7 sm:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
