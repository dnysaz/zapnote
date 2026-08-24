"use client";

import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { NotesProvider } from "@/components/NotesProvider";
import { GuestNotesProvider } from "@/components/GuestNotesProvider";

function NotesWrapper({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  if (session.status === "anonymous") {
    return <GuestNotesProvider>{children}</GuestNotesProvider>;
  }
  return <NotesProvider>{children}</NotesProvider>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotesWrapper>{children}</NotesWrapper>
    </AuthProvider>
  );
}
