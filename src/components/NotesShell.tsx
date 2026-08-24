"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useSettings } from "@/components/SettingsProvider";
import { Bot, Globe, LogOut, NotebookPen, PenLine } from "lucide-react";

const navItems = [
  { label: "Notes", href: "/notes", icon: NotebookPen },
  { label: "Articles", href: "/articles", icon: PenLine, authOnly: true },
  { label: "SWOT Analysis", href: "/swot", icon: Bot, authOnly: true },
];

export function NotesShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { session, logout } = useAuth();
  const { settings } = useSettings();
  const pathname = usePathname();
  const isGuest = session.status === "anonymous";
  const email = session.status === "authed" ? session.email : "";
  const initials = isGuest ? "G" : (email || "U").slice(0, 2).toUpperCase();
  const visibleNav = navItems.filter((item) => !item.authOnly || !isGuest);

  return (
    <div className="min-h-screen bg-(--crm-bg) font-[var(--font-dm)] text-(--crm-fg)">
      <style>{`
        @keyframes vn-rise { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        .vn-rise { animation: vn-rise .55s cubic-bezier(.2,.75,.25,1) both; }
        @keyframes vn-slide { from { opacity:0; transform:translateX(48px) } to { opacity:1; transform:translateX(0) } }
        .crm-slide-in { animation: vn-slide .3s cubic-bezier(0.2, 0.75, 0.25, 1) both; }
      `}</style>

      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-(--crm-border) bg-(--crm-surface) px-5 shadow-[0_1px_0_rgba(0,0,0,.03)] sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-(--crm-dark) text-(--crm-accent)"><NotebookPen size={18} /></div>
          <span className="text-lg font-semibold tracking-[-.03em]">{settings.siteName}</span>
        </div>
        <nav className="hidden items-center gap-1 sm:flex">
          {visibleNav.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${pathname === href ? "bg-(--crm-focus-ring) text-(--crm-text) shadow-sm" : "text-(--crm-muted) hover:bg-(--crm-hover) hover:text-(--crm-body)"}`}><Icon size={14} />{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {isGuest && <span className="flex items-center gap-1 rounded-full border border-dashed border-(--crm-border) bg-(--crm-hover) px-2.5 py-1 text-[11px] font-semibold text-(--crm-muted)"><Globe size={12} />Guest</span>}
          <div className="h-6 w-px bg-(--crm-border)" />
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--crm-soft) text-xs font-bold text-(--crm-fg)">{initials}</span>
            <button onClick={logout} className="rounded-lg p-2 text-(--crm-secondary) transition-colors hover:bg-(--crm-hover) hover:text-(--crm-fg)" title={isGuest ? "Exit guest mode" : "Logout"}><LogOut size={17} /></button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 border-b border-(--crm-border) bg-(--crm-surface) px-5 py-2 sm:hidden">
        {visibleNav.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${pathname === href ? "bg-(--crm-focus-ring) text-(--crm-text) shadow-sm" : "text-(--crm-muted) hover:bg-(--crm-hover)"}`}><Icon size={14} />{label}</Link>
        ))}
      </nav>

      <div className="mx-auto w-full max-w-[1200px] px-5 py-7 sm:px-8">{children}</div>
    </div>
  );
}
