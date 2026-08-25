"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_SETTINGS, FONT_SIZES, THEMES, THEME_VAR_KEYS, type SiteSettings } from "@/lib/settings";

type SettingsContextValue = {
  settings: SiteSettings;
  updateSettings: (patch: Partial<SiteSettings>) => Promise<void>;
  loading: boolean;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function applyFontSize(fontSize?: string) {
  const key = fontSize || "medium";
  const found = FONT_SIZES.find((f) => f.key === key);
  const scale = found?.scale ?? 1;
  document.documentElement.style.setProperty("--vn-scale", String(scale));
}

function applyTheme(theme?: string) {
  const colors = THEMES[(theme || "emerald") as keyof typeof THEMES];
  if (!colors) return;
  const root = document.documentElement;
  for (const key of THEME_VAR_KEYS) {
    root.style.setProperty(`--crm-${key}`, colors[key]);
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Apply settings immediately whenever they change (for real-time preview)
  useEffect(() => {
    applyTheme(settings.theme);
    applyFontSize(settings.fontSize);
  }, [settings.theme, settings.fontSize]);

  // Fetch settings from DB on mount, then apply
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: SiteSettings) => {
        const merged = { ...DEFAULT_SETTINGS, ...data };
        setSettings(merged);
        // Apply immediately after fetch — before React re-render
        applyTheme(merged.theme);
        applyFontSize(merged.fontSize);
      })
      .catch(() => {
        // Apply defaults on error
        applyTheme(DEFAULT_SETTINGS.theme);
        applyFontSize(DEFAULT_SETTINGS.fontSize);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateSettings = useCallback(async (patch: Partial<SiteSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    // Apply immediately for real-time feedback
    if (patch.theme) applyTheme(patch.theme);
    if (patch.fontSize) applyFontSize(patch.fontSize);
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  }, []);

  const value = useMemo(() => ({ settings, updateSettings, loading }), [settings, updateSettings, loading]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
