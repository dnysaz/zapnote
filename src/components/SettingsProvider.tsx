"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_SETTINGS, FONT_SIZES, type SiteSettings } from "@/lib/settings";

type SettingsContextValue = {
  settings: SiteSettings;
  updateSettings: (patch: Partial<SiteSettings>) => Promise<void>;
  loading: boolean;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Apply font size to document
  useEffect(() => {
    const fontSize = settings.fontSize || "medium";
    const size = FONT_SIZES.find((f) => f.key === fontSize)?.size || "16px";
    document.documentElement.style.setProperty("--vn-font-size", size);
    document.documentElement.style.fontSize = size;
  }, [settings.fontSize]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: SiteSettings) => setSettings({ ...DEFAULT_SETTINGS, ...data }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateSettings = useCallback(async (patch: Partial<SiteSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
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
