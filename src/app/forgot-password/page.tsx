"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { DEFAULT_SETTINGS } from "@/lib/settings";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const settings = DEFAULT_SETTINGS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email is required."); return; }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json() as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--crm-bg) px-4 font-[var(--font-dm)] text-(--crm-fg)">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-(--crm-dark) font-[var(--font-space-mono)] text-2xl font-bold text-(--crm-accent)">{(settings.siteName || "V").charAt(0).toUpperCase()}</div>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-.03em]">Forgot Password</h1>
          <p className="mt-1 text-sm text-(--crm-muted)">We&apos;ll send you a reset link</p>
        </div>

        <div className="rounded-2xl border border-(--crm-border) bg-(--crm-surface) p-7 shadow-sm">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 size={28} className="text-green-500" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Check your email</h2>
              <p className="mt-2 text-sm text-(--crm-muted)">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
              </p>
              <p className="mt-1 text-xs text-(--crm-placeholder)">The link expires in 1 hour.</p>
              <Link
                href="/app/notes"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-(--crm-brand) hover:underline"
              >
                <ArrowLeft size={14} />Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-(--crm-muted)">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--crm-secondary)" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  autoComplete="email"
                  autoFocus
                  className="h-12 w-full rounded-xl border border-(--crm-border-input) bg-(--crm-surface) pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-(--crm-placeholder) focus:border-(--crm-focus-border) focus:ring-2 focus:ring-(--crm-focus-ring)"
                />
              </div>
              {error && (
                <p className="rounded-xl bg-(--crm-hover) px-4 py-3 text-xs font-medium text-(--crm-danger)">{error}</p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-(--crm-primary) text-sm font-semibold text-white transition-colors hover:bg-(--crm-dark) disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : "Send Reset Link"}
              </button>
              <Link
                href="/app/notes"
                className="flex items-center justify-center gap-2 text-sm font-semibold text-(--crm-secondary) hover:text-(--crm-fg)"
              >
                <ArrowLeft size={14} />Back to login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
