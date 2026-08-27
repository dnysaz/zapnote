"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { normalizeNote, type Note } from "@/lib/crm";

const GUEST_STORAGE_KEY = "zapnote:guest-notes";

type NotesContextValue = {
  notes: Note[];
  loading: boolean;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;
};

const NotesContext = createContext<NotesContextValue | null>(null);

function loadGuestNotes(): Note[] {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeNote) : [];
  } catch { return []; }
}

function saveGuestNotes(notes: Note[]) {
  try { localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(notes)); } catch {}
}

export function UnifiedNotesProvider({ isGuest, children }: { isGuest: boolean; children: ReactNode }) {
  // Use lazy initializer for guest mode to avoid setState-in-effect.
  // For auth mode, empty array is fine since we load from API.
  const [notes, setNotes] = useState<Note[]>(() => (typeof window !== "undefined" ? loadGuestNotes() : []));
  // Guests load synchronously — no loading state needed
  const [loading, setLoading] = useState(!isGuest);
  const [guestLoaded, setGuestLoaded] = useState(false);
  const dataRef = useRef(notes);

  useEffect(() => { dataRef.current = notes; }, [notes]);

  // Guest mode: mark as loaded after initial render so save effect can start
  useEffect(() => {
    if (isGuest) {
      // Mark loaded AFTER mount, so save effect doesn't run first
      requestAnimationFrame(() => setGuestLoaded(true));
    }
  }, [isGuest]);

  // Guest mode: persist to localStorage ONLY after initial load is done
  useEffect(() => {
    if (isGuest && guestLoaded) saveGuestNotes(notes);
  }, [notes, isGuest, guestLoaded]);

  // Auth mode: load from API
  useEffect(() => {
    if (!isGuest) {
      let cancelled = false;
      fetch("/api/notes")
        .then((r) => r.json())
        .then((data: Note[]) => { if (!cancelled) setNotes(data); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }
  }, [isGuest]);

  const mutate = useCallback(
    (apply: (prev: Note[]) => Note[], undo: (prev: Note[]) => Note[], request?: () => Promise<void>) => {
      setNotes(apply);
      if (request) void request().catch(() => setNotes(undo));
    },
    [],
  );

  const addNote = useCallback((note: Note) => {
    if (isGuest) {
      setNotes((p) => [note, ...p]);
    } else {
      void (async () => {
        setNotes((p) => [note, ...p]);
        try {
          const res = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(note) });
          if (!res.ok) throw new Error("POST failed");
        } catch { setNotes((p) => p.filter((n) => n.id !== note.id)); }
      })();
    }
  }, [isGuest]);

  const updateNote = useCallback((note: Note) => {
    if (isGuest) {
      setNotes((p) => p.map((n) => (n.id === note.id ? note : n)));
    } else {
      const before = dataRef.current.find((n) => n.id === note.id);
      mutate(
        (prev) => prev.map((n) => (n.id === note.id ? note : n)),
        (prev) => prev.map((n) => (n.id === note.id ? (before ?? n) : n)),
        () => fetch(`/api/notes/${note.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(note) }).then((r) => { if (!r.ok) throw new Error("PATCH failed"); }),
      );
    }
  }, [isGuest, mutate]);

  const deleteNote = useCallback((id: string) => {
    if (isGuest) {
      setNotes((p) => p.filter((n) => n.id !== id));
    } else {
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
    }
  }, [isGuest, mutate]);

  const value = useMemo<NotesContextValue>(
    () => ({ notes, loading, addNote, updateNote, deleteNote }),
    [notes, loading, addNote, updateNote, deleteNote],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesContextValue {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within UnifiedNotesProvider");
  return ctx;
}
