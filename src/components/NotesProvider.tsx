"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Note } from "@/lib/crm";

type NotesContextValue = {
  notes: Note[];
  loading: boolean;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  refresh: () => Promise<void>;
};

const NotesContext = createContext<NotesContextValue | null>(null);

async function loadNotes(): Promise<Note[]> {
  const res = await fetch("/api/notes");
  return res.json();
}

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const dataRef = useRef(notes);

  useEffect(() => { dataRef.current = notes; }, [notes]);

  const refresh = useCallback(async () => {
    try { setNotes(await loadNotes()); } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const mutate = useCallback(
    (apply: (prev: Note[]) => Note[], undo: (prev: Note[]) => Note[], request: () => Promise<void>) => {
      setNotes(apply);
      void request().catch(() => setNotes(undo));
    },
    [],
  );

  const addNote = useCallback((note: Note) => {
    void (async () => {
      setNotes((p) => [note, ...p]);
      try {
        const res = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(note) });
        if (!res.ok) throw new Error("POST /api/notes failed");
      } catch {
        setNotes((p) => p.filter((n) => n.id !== note.id));
      }
    })();
  }, []);

  const updateNote = useCallback((note: Note) => {
    const before = dataRef.current.find((n) => n.id === note.id);
    mutate(
      (prev) => prev.map((n) => (n.id === note.id ? note : n)),
      (prev) => prev.map((n) => (n.id === note.id ? (before ?? n) : n)),
      () => fetch(`/api/notes/${note.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(note) }).then((r) => { if (!r.ok) throw new Error("PATCH failed"); }),
    );
  }, [mutate]);

  const deleteNote = useCallback((id: string) => {
    const before = dataRef.current.find((n) => n.id === id);
    const index = dataRef.current.findIndex((n) => n.id === id);
    mutate(
      (prev) => prev.filter((n) => n.id !== id),
      (prev) => {
        if (!before || index < 0) return prev;
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, before);
        return next;
      },
      () => fetch(`/api/notes/${id}`, { method: "DELETE" }).then((r) => { if (!r.ok) throw new Error("DELETE failed"); }),
    );
  }, [mutate]);

  const value = useMemo<NotesContextValue>(
    () => ({ notes, loading, addNote, updateNote, deleteNote, refresh }),
    [notes, loading, addNote, updateNote, deleteNote, refresh],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesContextValue {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}
