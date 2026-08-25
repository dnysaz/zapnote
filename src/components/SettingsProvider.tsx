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

export function applyFontSize(fontSize?: string) {
  const key = fontSize || "medium";
  const found = FONT_SIZES.find((f) => f.key === key);
  const scale = found?.scale ?? 1;
  document.documentElement.style.setProperty("--vn-scale", String(scale));
}

/** Parse #hex to rgb components */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** Mix a color with white at given percentage */
function mixWithWhite(hex: string, pct: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mr = Math.round(r + (255 - r) * (pct / 100));
  const mg = Math.round(g + (255 - g) * (pct / 100));
  const mb = Math.round(b + (255 - b) * (pct / 100));
  return `rgb(${mr},${mg},${mb})`;
}

/** Lighten a hex color */
function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const lr = Math.min(255, r + amount);
  const lg = Math.min(255, g + amount);
  const lb = Math.min(255, b + amount);
  return `rgb(${lr},${lg},${lb})`;
}

/** Darken a hex color */
function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.max(0, r - amount)},${Math.max(0, g - amount)},${Math.max(0, b - amount)})`;
}

export function applyTheme(theme?: string) {
  const colors = THEMES[(theme || "emerald") as keyof typeof THEMES];
  if (!colors) return;
  const root = document.documentElement;
  // Set base theme colors
  for (const key of THEME_VAR_KEYS) {
    root.style.setProperty(`--crm-${key}`, colors[key]);
  }
  // Set derived colors (replicate color-mix from globals.css)
  root.style.setProperty("--crm-bg", mixWithWhite(colors.primary, 95));
  root.style.setProperty("--crm-panel", mixWithWhite(colors.primary, 97));
  root.style.setProperty("--crm-surface", mixWithWhite(colors.primary, 96));
  root.style.setProperty("--crm-hover", mixWithWhite(colors.primary, 92));
  root.style.setProperty("--crm-border", mixWithWhite(colors.primary, 88));
  root.style.setProperty("--crm-border-soft", mixWithWhite(colors.primary, 92));
  root.style.setProperty("--crm-border-input", mixWithWhite(colors.primary, 87));
  root.style.setProperty("--crm-focus-ring", mixWithWhite(colors.primary, 86));
  root.style.setProperty("--crm-focus-border", mixWithWhite(colors.primary, 45));
  root.style.setProperty("--crm-fg", darken(colors.primary, 20));
  root.style.setProperty("--crm-body", lighten(colors.primary, 55));
  root.style.setProperty("--crm-secondary", lighten(colors.primary, 40));
  root.style.setProperty("--crm-muted", lighten(colors.primary, 50));
  root.style.setProperty("--crm-label", lighten(colors.primary, 55));
  root.style.setProperty("--crm-faint", lighten(colors.primary, 60));
  root.style.setProperty("--crm-placeholder", lighten(colors.primary, 65));
  root.style.setProperty("--crm-brand", mixWithWhite(colors.primary, 30));
  root.style.setProperty("--crm-avatar-bg", mixWithWhite(colors.primary, 86));
  root.style.setProperty("--crm-avatar-text", lighten(colors.primary, 10));
  root.style.setProperty("--crm-danger", mixWithWhite(colors.primary, 45));
  root.style.setProperty("--crm-danger-bg", mixWithWhite(colors.primary, 88));
  root.style.setProperty("--crm-danger-border", mixWithWhite(colors.primary, 78));
  // Status chip colors
  root.style.setProperty("--crm-st-draft-bg", mixWithWhite(colors.primary, 91));
  root.style.setProperty("--crm-st-active-bg", mixWithWhite(colors.primary, 86));
  root.style.setProperty("--crm-st-process-bg", mixWithWhite(colors.accent, 65));
  root.style.setProperty("--crm-st-done-bg", mixWithWhite(colors.primary, 80));
  root.style.setProperty("--crm-st-cancel-bg", mixWithWhite(colors.primary, 88));
  // Derived card colors
  root.style.setProperty("--crm-card", colors.card);
  root.style.setProperty("--crm-card-border", colors.cardBorder);
  root.style.setProperty("--crm-card-track", colors.cardTrack);
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
