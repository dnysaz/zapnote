"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Note } from "@/lib/crm";

const STORAGE_KEY = "zapnote:guest-notes";

type NotesContextValue = {
  notes: Note[];
  loading: boolean;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  refresh: () => Promise<void>;
};

const NotesContext = createContext<NotesContextValue | null>(null);

function loadFromStorage(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveToStorage(notes: Note[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch {}
}

export function GuestNotesProvider({ children }: { children: ReactNode }) {
  // Lazy initializer: load from localStorage synchronously during first render
  // to avoid calling setState inside an effect
  const [notes, setNotes] = useState<Note[]>(loadFromStorage);
  const hasSyncedRef = useRef(false);

  // Persist to localStorage on changes (after initial render)
  useEffect(() => {
    if (hasSyncedRef.current) saveToStorage(notes);
    hasSyncedRef.current = true;
  }, [notes]);

  const refresh = useCallback(async () => {}, []);

  const addNote = useCallback((note: Note) => {
    setNotes((p) => [note, ...p]);
  }, []);

  const updateNote = useCallback((note: Note) => {
    setNotes((p) => p.map((n) => (n.id === note.id ? note : n)));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((p) => p.filter((n) => n.id !== id));
  }, []);

  const value = useMemo<NotesContextValue>(
    () => ({ notes, loading: false, addNote, updateNote, deleteNote, refresh }),
    [notes, addNote, updateNote, deleteNote, refresh],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useGuestNotes(): NotesContextValue {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useGuestNotes must be used within GuestNotesProvider");
  return ctx;
}
