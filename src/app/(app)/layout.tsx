"use client";

import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { UnifiedNotesProvider } from "@/components/UnifiedNotesProvider";

function NotesWrapper({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const isGuest = session.status === "anonymous";
  return <UnifiedNotesProvider isGuest={isGuest}>{children}</UnifiedNotesProvider>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotesWrapper>{children}</NotesWrapper>
    </AuthProvider>
  );
}
