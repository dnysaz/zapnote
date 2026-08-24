"use client";

import { useState } from "react";
import { Eye, EyeOff, Globe, Lock, UserRound } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";

type Props = {
  adminExists: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
  onGuest: () => void;
};

function PasswordField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--crm-secondary)" />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-(--crm-border-input) bg-(--crm-surface) pl-10 pr-11 text-sm outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-focus-border) focus:ring-2 focus:ring-(--crm-focus-ring)"
      />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-(--crm-secondary) hover:text-(--crm-text)" aria-label={show ? "Hide" : "Show"}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function AuthScreen({ adminExists, onLogin, onRegister, onGuest }: Props) {
  const { settings } = useSettings();
  const [mode, setMode] = useState<"login" | "register">(adminExists ? "login" : "register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) { setError("Email and password are required."); return; }
    if (mode === "register") {
      if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
      if (password !== confirm) { setError("Passwords do not match."); return; }
    }
    setBusy(true);
    try {
      if (mode === "login") await onLogin(email.trim(), password);
      else await onRegister(email.trim(), password);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--crm-bg) px-4 font-[var(--font-dm)] text-(--crm-fg)">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-(--crm-dark) font-[var(--font-space-mono)] text-2xl font-bold text-(--crm-accent)">V</div>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-.03em]">{settings.siteName}</h1>
          <p className="mt-1 text-sm text-(--crm-muted)">Your personal notes</p>
        </div>

        <div className="rounded-2xl border border-(--crm-border) bg-(--crm-surface) p-7 shadow-sm">
          {/* Login / Register tabs */}
          <div className="mb-6 flex rounded-xl bg-(--crm-hover) p-1">
            <button type="button" onClick={() => { setMode("login"); setError(""); }} className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${mode === "login" ? "bg-(--crm-surface) text-(--crm-text) shadow-sm" : "text-(--crm-muted)"}`}>Login</button>
            <button type="button" onClick={() => { setMode("register"); setError(""); }} className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${mode === "register" ? "bg-(--crm-surface) text-(--crm-text) shadow-sm" : "text-(--crm-muted)"}`}>Register</button>
          </div>

          {mode === "register" && (
            <p className="mb-5 rounded-xl bg-(--crm-hover) px-4 py-3 text-xs leading-5 text-(--crm-secondary)">
              Create an <strong>admin</strong> account. After registration, only login will be shown.
            </p>
          )}

          {mode === "login" && !adminExists && (
            <p className="mb-5 rounded-xl bg-(--crm-hover) px-4 py-3 text-xs leading-5 text-(--crm-secondary)">
              No account yet? Switch to <strong>Register</strong> to create one, or continue as guest.
            </p>
          )}

          {/* Email/Password form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <UserRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--crm-secondary)" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" autoComplete="email"
                className="h-12 w-full rounded-xl border border-(--crm-border-input) bg-(--crm-surface) pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-focus-border) focus:ring-2 focus:ring-(--crm-focus-ring)" />
            </div>
            <PasswordField value={password} onChange={setPassword} placeholder={mode === "register" ? "Create password (min. 8 chars)" : "Password"} />
            {mode === "register" && <PasswordField value={confirm} onChange={setConfirm} placeholder="Confirm password" />}
            {error && <p className="rounded-xl bg-(--crm-hover) px-4 py-3 text-xs font-medium text-(--crm-danger)">{error}</p>}
            <button type="submit" disabled={busy}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-(--crm-primary) text-sm font-semibold text-white transition-colors hover:bg-(--crm-dark) disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? "Processing..." : mode === "register" ? "Register" : "Login"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-(--crm-border)" />
            <span className="text-[11px] font-medium text-(--crm-muted)">or</span>
            <div className="h-px flex-1 bg-(--crm-border)" />
          </div>

          {/* Google */}
          <button disabled className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-(--crm-border-input) bg-white text-sm font-semibold text-(--crm-fg) transition-colors hover:bg-(--crm-hover) disabled:cursor-not-allowed disabled:opacity-50">
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          {/* Guest */}
          <button onClick={onGuest} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-(--crm-border) bg-transparent text-sm font-semibold text-(--crm-secondary) transition-colors hover:border-(--crm-brand) hover:bg-(--crm-hover) hover:text-(--crm-brand)">
            <Globe size={16} />Continue as Guest
          </button>
          <p className="mt-2 text-center text-[11px] text-(--crm-placeholder)">Notes saved locally in your browser only</p>
        </div>

        <p className="mt-6 text-center text-xs text-(--crm-placeholder)">{settings.siteName}</p>
      </div>
    </div>
  );
}
