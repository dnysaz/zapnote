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

/** Fixed font colors — NEVER change with the theme (gray-800/900 based). */
const FONT_COLORS: Record<string, string> = {
  fg: "#111827", // gray-900
  body: "#1f2937", // gray-800
  secondary: "#374151", // gray-700
  muted: "#6b7280", // gray-500
  label: "#9ca3af", // gray-400
  faint: "#a3aab2",
  placeholder: "#d1d5db", // gray-300
  "avatar-text": "#374151",
  text: "#1f2937",
};

/** Mix a color with white at given percentage */
function mixWithWhite(hex: string, pct: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mr = Math.round(r + (255 - r) * (pct / 100));
  const mg = Math.round(g + (255 - g) * (pct / 100));
  const mb = Math.round(b + (255 - b) * (pct / 100));
  return `rgb(${mr},${mg},${mb})`;
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
  // Font colors stay fixed regardless of theme.
  for (const [key, value] of Object.entries(FONT_COLORS)) {
    root.style.setProperty(`--crm-${key}`, value);
  }
  root.style.setProperty("--crm-brand", mixWithWhite(colors.primary, 30));
  root.style.setProperty("--crm-avatar-bg", mixWithWhite(colors.primary, 86));
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

export function SettingsProvider({ isGuest = false, children }: { isGuest?: boolean; children: ReactNode }) {
  // Use lazy initializer so guest gets DEFAULT_SETTINGS without setState-in-effect
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  // Guests load synchronously — no loading state needed
  const [loading, setLoading] = useState(!isGuest);

  // Apply settings immediately whenever they change (for real-time preview)
  useEffect(() => {
    applyTheme(settings.theme);
    applyFontSize(settings.fontSize);
  }, [settings.theme, settings.fontSize]);

  // Guests always get default settings — apply on mount via effect (external system sync)
  useEffect(() => {
    if (isGuest) {
      applyTheme(DEFAULT_SETTINGS.theme);
      applyFontSize(DEFAULT_SETTINGS.fontSize);
      return;
    }

    // Fetch settings from DB on mount, then apply
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: SiteSettings) => {
        if (cancelled) return;
        const merged = { ...DEFAULT_SETTINGS, ...data };
        setSettings(merged);
        // Apply immediately after fetch — before React re-render
        applyTheme(merged.theme);
        applyFontSize(merged.fontSize);
      })
      .catch(() => {
        if (cancelled) return;
        // Apply defaults on error
        applyTheme(DEFAULT_SETTINGS.theme);
        applyFontSize(DEFAULT_SETTINGS.fontSize);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isGuest]);

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
