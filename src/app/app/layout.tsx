"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { UnifiedNotesProvider } from "@/components/UnifiedNotesProvider";
import { SettingsProvider } from "@/components/SettingsProvider";
import { VerificationBanner } from "@/components/VerificationBanner";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";

const AUTH_ONLY_PATHS = ["/app/settings", "/app/articles", "/app/swot", "/app/creator"];

function NotesWrapper({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const isGuest = session.status === "anonymous";
  return <UnifiedNotesProvider isGuest={isGuest}>{children}</UnifiedNotesProvider>;
}

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isGuest = session.status === "anonymous";
  const blocked = isGuest && AUTH_ONLY_PATHS.includes(pathname);

  useEffect(() => {
    if (blocked) router.replace("/app/notes");
    // router from useRouter is stable; only re-run when the blocked state flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked]);

  // Don't render protected pages for guests — redirect happens instantly.
  if (blocked) return null;

  return (
    <>
      <VerificationBanner />
      <PwaInstallBanner />
      {children}
    </>
  );
}

function AppProviders({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const isGuest = session.status === "anonymous";
  // Guests always get default settings; authed users get their saved config.
  return <SettingsProvider isGuest={isGuest}>{children}</SettingsProvider>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotesWrapper>
        <AppProviders>
          <RouteGuard>{children}</RouteGuard>
        </AppProviders>
      </NotesWrapper>
    </AuthProvider>
  );
}
