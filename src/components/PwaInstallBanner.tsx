"use client";

import { useState } from "react";
import { usePwaInstall } from "@/lib/usePwaInstall";
import { Download, X } from "lucide-react";

export function PwaInstallBanner() {
  const { isInstallable, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) return null;

  return (
    <div className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-(--crm-border) bg-(--crm-panel) px-4 py-3 sm:mx-5 sm:mb-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--crm-primary)/10">
        <Download size={16} className="text-(--crm-primary)" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-(--crm-fg)">Install ZapNote!</p>
        <p className="text-[0.65rem] text-(--crm-muted)">Add to home screen for quick access</p>
      </div>
      <button
        onClick={() => void install()}
        className="shrink-0 rounded-lg bg-(--crm-primary) px-3 py-1.5 text-[0.65rem] font-semibold text-white transition-colors hover:bg-(--crm-dark)"
      >
        Install
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-1 text-(--crm-muted) hover:text-(--crm-fg)"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
