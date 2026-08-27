"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

function getTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("token");
}

export default function VerifyEmailPage() {
  const [token] = useState<string | null>(getTokenFromUrl);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    () => (getTokenFromUrl() ? "loading" : "error"),
  );
  const [message, setMessage] = useState(
    () => (getTokenFromUrl() ? "" : "No verification token provided."),
  );

  useEffect(() => {
    if (!token) return;

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data: { error?: string }) => {
        if (data.error) {
          setStatus("error");
          setMessage(data.error);
        } else {
          setStatus("success");
          setMessage("Your email has been verified successfully!");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Failed to verify email. Please try again.");
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        {status === "loading" && (
          <>
            <Loader2 size={40} className="mx-auto animate-spin text-gray-300" />
            <h1 className="mt-4 text-lg font-semibold text-gray-900">Verifying your email...</h1>
            <p className="mt-2 text-sm text-gray-500">Please wait a moment.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
            <h1 className="mt-4 text-lg font-semibold text-gray-900">Email Verified!</h1>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
            <p className="mt-1 text-xs text-gray-400">You can now use all features of ZapNote!.</p>
            <Link
              href="/app/notes"
              className="mt-6 inline-block rounded-xl bg-emerald-800 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
            >
              Go to ZapNote!
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle size={40} className="mx-auto text-red-400" />
            <h1 className="mt-4 text-lg font-semibold text-gray-900">Verification Failed</h1>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/app/notes"
                className="inline-block rounded-xl bg-gray-800 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-900"
              >
                Go to App
              </Link>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-gray-500 hover:text-gray-700"
              >
                Request a new reset link
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
