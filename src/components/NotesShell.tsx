"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useSettings } from "@/components/SettingsProvider";
import { LogOut, NotebookPen } from "lucide-react";

export function NotesShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { session, logout } = useAuth();
  const { settings } = useSettings();
  const email = session.status === "authed" ? session.email : "";
  const initials = (email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-(--crm-bg) font-[var(--font-dm)] text-(--crm-fg)">
      <style>{`
        @keyframes vn-rise { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        .vn-rise { animation: vn-rise .55s cubic-bezier(.2,.75,.25,1) both; }
      `}</style>

      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-(--crm-border) bg-(--crm-surface) px-5 shadow-[0_1px_0_rgba(0,0,0,.03)] sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-(--crm-dark) text-(--crm-accent)"><NotebookPen size={18} /></div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-(--crm-muted)">{subtitle}</p>
            <h1 className="text-lg font-semibold tracking-[-.03em]">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-medium text-((--crm-secondary)) sm:block">{settings.siteName}</span>
          <div className="h-6 w-px bg-(--crm-border)" />
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--crm-soft) text-xs font-bold text-(--crm-fg)">{initials}</span>
            <button onClick={logout} className="rounded-lg p-2 text-(--crm-secondary) transition-colors hover:bg-(--crm-hover) hover:text-(--crm-fg)" title="Logout"><LogOut size={17} /></button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] px-5 py-7 sm:px-8">{children}</div>
    </div>
  );
}
