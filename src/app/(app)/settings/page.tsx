"use client";

import { useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { NotesShell } from "@/components/NotesShell";
import { Check, Key, Palette, Save, Zap } from "lucide-react";
import { THEMES, GEMINI_MODELS, type ThemeKey, type GeminiModelId, DEFAULT_SETTINGS } from "@/lib/settings";

export default function SettingsView() {
  const { settings, updateSettings, loading } = useSettings();
  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey);
  const [geminiModel, setGeminiModel] = useState<GeminiModelId>(settings.geminiModel || DEFAULT_SETTINGS.geminiModel);
  const [siteName, setSiteName] = useState(settings.siteName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>(settings.theme);

  async function handleSave() {
    setSaving(true);
    await updateSettings({ geminiApiKey: geminiKey, geminiModel, siteName, theme: selectedTheme });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <NotesShell title="Settings" subtitle="App configuration">
        <p className="text-sm text-(--crm-muted)">Loading settings…</p>
      </NotesShell>
    );
  }

  return (
    <NotesShell title="Settings" subtitle="App configuration">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Site Name */}
        <section className="rounded-2xl border border-(--crm-border) bg-(--crm-panel) p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-(--crm-fg)">
            <Palette size={16} /> App Name
          </h3>
          <input
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="w-full rounded-xl border border-(--crm-border-input) bg-(--crm-surface) px-4 py-2.5 text-sm text-(--crm-fg) outline-none focus:border-(--crm-accent)"
            placeholder="ViNotes"
          />
        </section>

        {/* Theme */}
        <section className="rounded-2xl border border-(--crm-border) bg-(--crm-panel) p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-(--crm-fg)">
            <Palette size={16} /> Theme Color
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {Object.entries(THEMES).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => setSelectedTheme(key as ThemeKey)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                  selectedTheme === key
                    ? "border-(--crm-accent) bg-(--crm-soft)"
                    : "border-transparent hover:bg-(--crm-hover)"
                }`}
              >
                <div className="flex h-8 w-8 rounded-full" style={{ background: theme.primary }}>
                  <div className="m-auto h-3 w-3 rounded-full" style={{ background: theme.accent }} />
                </div>
                <span className="text-[11px] font-semibold text-(--crm-secondary)">{theme.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-(--crm-border-soft) p-4" style={{ background: THEMES[selectedTheme].soft }}>
            <p className="text-sm font-semibold" style={{ color: THEMES[selectedTheme].primary }}>Preview text</p>
            <p className="mt-1 text-xs" style={{ color: THEMES[selectedTheme].mid }}>This is how your app will look with this theme.</p>
          </div>
        </section>

        {/* Gemini AI Settings */}
        <section className="rounded-2xl border border-(--crm-border) bg-(--crm-panel) p-6">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-(--crm-fg)">
            <Zap size={16} /> Gemini AI
          </h3>
          <p className="mb-5 text-xs text-(--crm-muted)">
            Powers Article Generator and SWOT Analysis. Get your key at{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="font-semibold text-(--crm-accent) underline">
              Google AI Studio
            </a>
          </p>

          {/* API Key */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.08em] text-(--crm-brand)">API Key</label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full rounded-xl border border-(--crm-border-input) bg-(--crm-surface) px-4 py-2.5 text-sm font-mono text-(--crm-fg) outline-none focus:border-(--crm-accent)"
              placeholder="AIzaSy..."
            />
            <div className="mt-2 flex items-center gap-2">
              {geminiKey ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-green-600">
                  <Check size={12} /> API key set
                </span>
              ) : (
                <span className="text-[11px] font-medium text-(--crm-muted)">No API key configured</span>
              )}
            </div>
          </div>

          {/* Model Selector */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.08em] text-(--crm-brand)">Model</label>
            <div className="space-y-2">
              {GEMINI_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setGeminiModel(m.id)}
                  className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all ${
                    geminiModel === m.id
                      ? "border-(--crm-accent) bg-(--crm-soft)"
                      : "border-transparent hover:bg-(--crm-hover)"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-(--crm-fg)">{m.label}</p>
                    <p className="text-[11px] text-(--crm-muted)">{m.id}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    m.speed === "Smartest" ? "bg-purple-100 text-purple-700"
                    : m.speed === "Fastest" ? "bg-green-100 text-green-700"
                    : m.speed === "Smart" ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                  }`}>
                    {m.speed}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex items-center gap-3 pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-(--crm-primary) px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-(--crm-dark) disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? "Saving…" : saved ? "Saved!" : "Save Settings"}
          </button>
          {saved && (
            <span className="text-xs font-medium text-green-600">All settings saved successfully!</span>
          )}
        </div>
      </div>
    </NotesShell>
  );
}
