"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AuthScreen } from "@/components/AuthScreen";

type Session =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authed"; email: string; name: string; emailVerified: boolean }
  | { status: "anonymous" };

type AuthContextValue = {
  session: Session;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  resendVerification: () => Promise<void>;
  markEmailVerified: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const GUEST_KEY = "zapnote:guest";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { authed: boolean; email?: string; name?: string; emailVerified?: boolean }) => {
        if (cancelled) return;
        if (data.authed) {
          try { localStorage.removeItem(GUEST_KEY); } catch {}
          setSession({ status: "authed", email: data.email ?? "", name: data.name ?? "", emailVerified: data.emailVerified ?? false });
          return;
        }
        try {
          if (localStorage.getItem(GUEST_KEY) === "1") {
            setSession({ status: "anonymous" });
            return;
          }
        } catch {}
        setSession({ status: "guest" });
      })
      .catch(() => {
        try {
          if (localStorage.getItem(GUEST_KEY) === "1") {
            if (!cancelled) setSession({ status: "anonymous" });
            return;
          }
        } catch {}
        if (!cancelled) setSession({ status: "guest" });
      });

    return () => { cancelled = true; };
  }, []);

  async function postAuth(path: string, body: unknown) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json()) as { email?: string; name?: string; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
    return { email: data.email ?? "", name: data.name ?? "" };
  }

  const login = async (email: string, password: string) => {
    const { email: authedEmail, name } = await postAuth("/api/auth/login", { email, password });
    try { localStorage.removeItem(GUEST_KEY); } catch {}
    // Fetch email_verified status after login
    let emailVerified = false;
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json() as { emailVerified?: boolean };
      emailVerified = meData.emailVerified ?? false;
    } catch {}
    setSession({ status: "authed", email: authedEmail, name, emailVerified });
  };

  const register = async (email: string, password: string) => {
    const { email: authedEmail, name } = await postAuth("/api/auth/register", { email, password });
    try { localStorage.removeItem(GUEST_KEY); } catch {}
    // New registration → email not verified yet
    setSession({ status: "authed", email: authedEmail, name, emailVerified: false });
  };

  const loginAsGuest = useCallback(() => {
    try { localStorage.setItem(GUEST_KEY, "1"); } catch {}
    setSession({ status: "anonymous" });
  }, []);

  const logout = async () => {
    const wasGuest = session.status === "anonymous";
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    if (!wasGuest) {
      try { localStorage.removeItem(GUEST_KEY); } catch {}
    }
    setSession({ status: "guest" });
  };

  const resendVerification = async () => {
    const res = await fetch("/api/auth/send-verification", { method: "POST" });
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      throw new Error(data.error || "Failed to send verification email.");
    }
  };

  const markEmailVerified = useCallback(() => {
    setSession((prev) => prev.status === "authed" ? { ...prev, emailVerified: true } : prev);
  }, []);

  if (session.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--crm-bg) font-[var(--font-dm)]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-(--crm-soft) border-t-(--crm-mid)" />
      </div>
    );
  }

  if (session.status === "guest") {
    return <AuthScreen onLogin={login} onRegister={register} onGuest={loginAsGuest} />;
  }

  return <AuthContext.Provider value={{ session, login, register, loginAsGuest, logout, resendVerification, markEmailVerified }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
