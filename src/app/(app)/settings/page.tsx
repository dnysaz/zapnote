"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { NotesShell } from "@/components/NotesShell";
import { Check, CheckCircle2, Eye, EyeOff, Key, Loader2, Lock, Palette, Save, UserRound, XCircle, Zap } from "lucide-react";
import { THEMES, GEMINI_MODELS, FONT_SIZES, type ThemeKey, type GeminiModelId, type FontSize, DEFAULT_SETTINGS } from "@/lib/settings";

type ModelStatus = "idle" | "testing" | "ok" | "fail";

export default function SettingsView() {
  const { settings, updateSettings, loading } = useSettings();
  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey);
  const [geminiModel, setGeminiModel] = useState<GeminiModelId>(settings.geminiModel || DEFAULT_SETTINGS.geminiModel);
  const [siteName, setSiteName] = useState(settings.siteName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>(settings.theme);
  const [fontSize, setFontSize] = useState<FontSize>(settings.fontSize || "medium");

  // Account profile
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    fetch("/api/auth/account")
      .then((r) => r.json())
      .then((d: { name?: string; email?: string }) => {
        if (d.name !== undefined) setAccountName(d.name);
        if (d.email !== undefined) setAccountEmail(d.email);
      })
      .catch(() => {});
  }, []);

  // Model test states
  const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatus>>({});
  const [testing, setTesting] = useState(false);
  const [lastTestedKey, setLastTestedKey] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  /** Test all models with the current API key */
  const testAllModels = useCallback(async (key: string) => {
    if (!key.trim()) {
      setModelStatuses({});
      setLastTestedKey("");
      return;
    }
    // Skip if already tested with same key
    if (key === lastTestedKey) return;

    // Cancel previous tests
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setTesting(true);
    setLastTestedKey(key);
    // Reset all to idle first
    const initial: Record<string, ModelStatus> = {};
    GEMINI_MODELS.forEach((m) => { initial[m.id] = "idle"; });
    setModelStatuses(initial);

    // Test each model concurrently
    const promises = GEMINI_MODELS.map(async (m) => {
      setModelStatuses((prev) => ({ ...prev, [m.id]: "testing" }));
      try {
        const res = await fetch("/api/ai/test-model", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: key, model: m.id }),
          signal: controller.signal,
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        if (controller.signal.aborted) return;
        setModelStatuses((prev) => ({ ...prev, [m.id]: data.ok ? "ok" : "fail" }));
      } catch {
        if (controller.signal.aborted) return;
        setModelStatuses((prev) => ({ ...prev, [m.id]: "fail" }));
      }
    });

    await Promise.all(promises);
    if (!controller.signal.aborted) setTesting(false);
  }, [lastTestedKey]);

  async function handleSave() {
    setSaving(true);
    await updateSettings({ geminiApiKey: geminiKey, geminiModel, siteName, theme: selectedTheme, fontSize });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleAccountSave() {
    setAccountError("");
    setAccountSaved(false);

    // Validate password change
    if (newPassword || confirmPassword) {
      if (!currentPassword) { setAccountError("Current password is required to change password."); return; }
      if (newPassword.length < 8) { setAccountError("New password must be at least 8 characters."); return; }
      if (newPassword !== confirmPassword) { setAccountError("New passwords do not match."); return; }
    }

    setAccountSaving(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountName,
          ...(newPassword ? { currentPassword, newPassword } : {}),
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to update account.");
      setAccountSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setAccountSaved(false), 2500);
    } catch (e) {
      setAccountError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setAccountSaving(false);
    }
  }

  function handleTestKey() {
    testAllModels(geminiKey);
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
        </section>        {/* Theme */}
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
                  selectedTheme === key ? "border-(--crm-accent) bg-(--crm-soft)" : "border-transparent hover:bg-(--crm-hover)"
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

        {/* Font Size */}
        <section className="rounded-2xl border border-(--crm-border) bg-(--crm-panel) p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-(--crm-fg)">
            <Palette size={16} /> Font Size
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FONT_SIZES.map((fs) => (
              <button
                key={fs.key}
                onClick={() => setFontSize(fs.key)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  fontSize === fs.key ? "border-(--crm-accent) bg-(--crm-soft)" : "border-transparent hover:bg-(--crm-hover)"
                }`}
              >
                <span style={{ fontSize: `${fs.scale * 16}px` }} className="font-semibold text-(--crm-fg)">Aa</span>
                <span className="text-[11px] font-semibold text-(--crm-secondary)">{fs.label}</span>
                <span className="text-[10px] text-(--crm-muted)">{Math.round(fs.scale * 100)}%</span>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-(--crm-border-soft) bg-(--crm-surface) p-4">
            <p className="font-semibold text-(--crm-fg)">Preview text</p>
            <p className="mt-1 text-(--crm-secondary)">This is how your app will look with this font size.</p>
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

          {/* API Key + Test */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.08em] text-(--crm-brand)">API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => { setGeminiKey(e.target.value); setLastTestedKey(""); }}
                className="flex-1 rounded-xl border border-(--crm-border-input) bg-(--crm-surface) px-4 py-2.5 text-sm font-mono text-(--crm-fg) outline-none focus:border-(--crm-accent)"
                placeholder="AIzaSy..."
              />
              <button
                onClick={handleTestKey}
                disabled={!geminiKey.trim() || testing}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-(--crm-border-input) bg-(--crm-surface) px-4 py-2.5 text-xs font-semibold text-(--crm-brand) transition-colors hover:bg-(--crm-hover) disabled:opacity-50"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                {testing ? "Testing…" : "Test"}
              </button>
            </div>
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

          {/* Model Selector with status */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.08em] text-(--crm-brand)">Model</label>
            {testing && <p className="mb-2 flex items-center gap-1.5 text-[11px] text-(--crm-muted)"><Loader2 size={12} className="animate-spin" />Testing all models with your API key…</p>}
            <div className="space-y-2">
              {GEMINI_MODELS.map((m) => {
                const status = modelStatuses[m.id] || "idle";
                return (
                  <button
                    key={m.id}
                    onClick={() => setGeminiModel(m.id)}
                    className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all ${
                      geminiModel === m.id ? "border-(--crm-accent) bg-(--crm-soft)" : "border-transparent hover:bg-(--crm-hover)"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                        {status === "testing" && <Loader2 size={16} className="animate-spin text-(--crm-muted)" />}
                        {status === "ok" && <CheckCircle2 size={18} className="text-green-500" />}
                        {status === "fail" && <XCircle size={18} className="text-red-400" />}
                        {status === "idle" && <div className="h-4 w-4 rounded-full border-2 border-(--crm-border)" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-(--crm-fg)">{m.label}</p>
                        <p className="text-[11px] text-(--crm-muted)">{m.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        m.speed === "Fastest" ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                      }`}>
                        {m.speed}
                      </span>
                      {status === "ok" && <span className="text-[10px] font-semibold text-green-600">Connected</span>}
                      {status === "fail" && <span className="text-[10px] font-semibold text-red-500">Failed</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Account Profile */}
        <section className="rounded-2xl border border-(--crm-border) bg-(--crm-panel) p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-(--crm-fg)">
            <UserRound size={16} /> Account Profile
          </h3>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.08em] text-(--crm-brand)">Name</label>
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="h-10 w-full rounded-xl border border-(--crm-border-input) bg-(--crm-surface) px-4 text-sm text-(--crm-fg) outline-none focus:border-(--crm-accent)"
                placeholder="Your name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.08em] text-(--crm-brand)">Email</label>
              <input
                value={accountEmail}
                readOnly
                className="h-10 w-full cursor-not-allowed rounded-xl border border-(--crm-border-input) bg-(--crm-hover) px-4 text-sm text-(--crm-muted) outline-none"
                placeholder="name@email.com"
                type="email"
              />
              <p className="mt-1 text-[11px] text-(--crm-muted)">Email cannot be changed.</p>
            </div>

            {/* Current Password */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.08em] text-(--crm-brand)">Current Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--crm-secondary)" />
                <input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-10 w-full rounded-xl border border-(--crm-border-input) bg-(--crm-surface) pl-10 pr-10 text-sm text-(--crm-fg) outline-none focus:border-(--crm-accent)"
                  placeholder="Required to change email or password"
                />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--crm-secondary) hover:text-(--crm-text)">
                  {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.08em] text-(--crm-brand)">New Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--crm-secondary)" />
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-10 w-full rounded-xl border border-(--crm-border-input) bg-(--crm-surface) pl-10 pr-10 text-sm text-(--crm-fg) outline-none focus:border-(--crm-accent)"
                    placeholder="Min. 8 characters"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--crm-secondary) hover:text-(--crm-text)">
                    {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.08em] text-(--crm-brand)">Confirm Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--crm-secondary)" />
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10 w-full rounded-xl border border-(--crm-border-input) bg-(--crm-surface) pl-10 text-sm text-(--crm-fg) outline-none focus:border-(--crm-accent)"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
            </div>

            {accountError && <p className="rounded-xl bg-(--crm-danger-bg) px-4 py-3 text-xs font-medium text-(--crm-danger)">{accountError}</p>}

            <button
              onClick={handleAccountSave}
              disabled={accountSaving}
              className="flex items-center gap-2 rounded-xl border border-(--crm-border-input) bg-(--crm-surface) px-5 py-2.5 text-sm font-semibold text-(--crm-brand) transition-colors hover:bg-(--crm-hover) disabled:opacity-50"
            >
              <UserRound size={15} />
              {accountSaving ? "Saving…" : accountSaved ? "Saved!" : "Update Account"}
            </button>
            {accountSaved && <span className="text-xs font-medium text-green-600">Account updated successfully!</span>}
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
