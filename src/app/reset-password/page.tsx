"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Lock, Loader2, CheckCircle2, XCircle } from "lucide-react";

function getTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("token");
}

export default function ResetPasswordPage() {
  const [token] = useState<string | null>(getTokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--crm-bg) px-4">
        <div className="w-full max-w-md rounded-2xl border border-(--crm-border) bg-(--crm-surface) p-8 text-center shadow-sm">
          <XCircle size={40} className="mx-auto text-red-400" />
          <h1 className="mt-4 text-lg font-semibold text-(--crm-fg)">Invalid Link</h1>
          <p className="mt-2 text-sm text-(--crm-muted)">
            This reset link is invalid. Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-(--crm-brand) hover:underline"
          >
            <ArrowLeft size={14} />Request new link
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--crm-bg) px-4">
        <div className="w-full max-w-md rounded-2xl border border-(--crm-border) bg-(--crm-surface) p-8 text-center shadow-sm">
          <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
          <h1 className="mt-4 text-lg font-semibold text-(--crm-fg)">Password Updated!</h1>
          <p className="mt-2 text-sm text-(--crm-muted)">
            Your password has been updated. You can now log in with your new password.
          </p>
          <Link
            href="/app/notes"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-(--crm-primary) px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-(--crm-dark)"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to reset password.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--crm-bg) px-4">
      <div className="w-full max-w-md rounded-2xl border border-(--crm-border) bg-(--crm-surface) p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-(--crm-primary)">
            <Lock size={20} className="text-white" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-(--crm-fg)">Reset Password</h1>
          <p className="mt-1 text-sm text-(--crm-muted)">Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--crm-secondary)" />
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min. 8 chars)"
              className="h-12 w-full rounded-xl border border-(--crm-border-input) bg-(--crm-surface) pl-10 pr-11 text-sm outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-focus-border) focus:ring-2 focus:ring-(--crm-focus-ring)"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--crm-secondary) hover:text-(--crm-text)">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--crm-secondary)" />
            <input
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              className="h-12 w-full rounded-xl border border-(--crm-border-input) bg-(--crm-surface) pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-focus-border) focus:ring-2 focus:ring-(--crm-focus-ring)"
            />
          </div>

          {error && <p className="rounded-xl bg-(--crm-danger-bg) px-4 py-3 text-xs font-medium text-(--crm-danger)">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-(--crm-primary) text-sm font-semibold text-white transition-colors hover:bg-(--crm-dark) disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : "Reset Password"}
          </button>
          <Link
            href="/app/notes"
            className="flex items-center justify-center gap-2 text-sm font-semibold text-(--crm-secondary) hover:text-(--crm-fg)"
          >
            <ArrowLeft size={14} />Back to login
          </Link>
        </form>
      </div>
    </div>
  );
}
