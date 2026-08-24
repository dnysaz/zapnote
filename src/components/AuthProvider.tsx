"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AuthScreen } from "@/components/AuthScreen";

type Session =
  | { status: "loading" }
  | { status: "guest"; adminExists: boolean }
  | { status: "authed"; email: string; name: string }
  | { status: "anonymous" };

type AuthContextValue = {
  session: Session;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const GUEST_KEY = "vinotes:guest";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: "loading" });

  useEffect(() => {
    // Check if user chose guest mode previously
    try {
      if (localStorage.getItem(GUEST_KEY) === "1") {
        setSession({ status: "anonymous" });
        return;
      }
    } catch {}

    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { authed: boolean; email?: string; name?: string; adminExists: boolean }) => {
        if (data.authed) setSession({ status: "authed", email: data.email ?? "", name: data.name ?? "" });
        else setSession({ status: "guest", adminExists: data.adminExists });
      })
      .catch(() => setSession({ status: "guest", adminExists: true }));
  }, []);

  async function postAuth(path: string, body: unknown) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json()) as { email?: string; name?: string; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
    return { email: data.email ?? "", name: data.name ?? "" };
  }

  const login = async (email: string, password: string) => {
    const { email: authedEmail, name } = await postAuth("/api/auth/login", { email, password });
    setSession({ status: "authed", email: authedEmail, name });
  };

  const register = async (email: string, password: string) => {
    const { email: authedEmail, name } = await postAuth("/api/auth/register", { email, password });
    setSession({ status: "authed", email: authedEmail, name });
  };

  const loginAsGuest = useCallback(() => {
    try { localStorage.setItem(GUEST_KEY, "1"); } catch {}
    setSession({ status: "anonymous" });
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    try { localStorage.removeItem(GUEST_KEY); } catch {}
    setSession({ status: "guest", adminExists: true });
  };

  if (session.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--crm-bg) font-[var(--font-dm)]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-(--crm-soft) border-t-(--crm-mid)" />
      </div>
    );
  }

  if (session.status === "guest") {
    return <AuthScreen adminExists={session.adminExists} onLogin={login} onRegister={register} onGuest={loginAsGuest} />;
  }

  if (session.status === "anonymous") {
    return <AuthContext.Provider value={{ session, login, register, loginAsGuest, logout }}>{children}</AuthContext.Provider>;
  }

  return <AuthContext.Provider value={{ session, login, register, loginAsGuest, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
