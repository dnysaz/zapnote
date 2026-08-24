"use client";

import { AuthProvider } from "@/components/AuthProvider";
import { NotesProvider } from "@/components/NotesProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotesProvider>{children}</NotesProvider>
    </AuthProvider>
  );
}
