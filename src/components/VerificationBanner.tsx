"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Mail, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export function VerificationBanner() {
  const { session, resendVerification, markEmailVerified } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState("");

  // Only show for logged-in users with unverified email
  if (session.status !== "authed" || session.emailVerified || dismissed) return null;

  async function handleResend() {
    setBusy(true);
    setError("");
    try {
      await resendVerification();
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 pt-4 sm:px-8">
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Mail size={16} className="mt-0.5 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          {sent ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0 text-green-500" />
              <p className="text-xs font-medium text-green-700">
                Verification email sent to <strong>{session.email}</strong>. Check your inbox.
              </p>
              <button
                onClick={markEmailVerified}
                className="ml-auto shrink-0 text-[11px] font-semibold text-green-600 underline hover:text-green-800"
              >
                I verified it
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium text-amber-800">
                Please verify your email address. We sent a verification link to <strong>{session.email}</strong>.
              </p>
              <div className="mt-1.5 flex items-center gap-3">
                <button
                  onClick={() => void handleResend()}
                  disabled={busy}
                  className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 underline hover:text-amber-900 disabled:opacity-60"
                >
                  {busy ? <Loader2 size={11} className="animate-spin" /> : null}
                  {busy ? "Sending..." : "Resend email"}
                </button>
                {error && <span className="text-[11px] font-medium text-red-500">{error}</span>}
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-0.5 text-amber-400 hover:text-amber-600"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
