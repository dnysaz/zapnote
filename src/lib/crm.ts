export type NoteActionItem = {
  text: string;
  done: boolean;
};

export type CarouselCard = {
  icon: string;
  title: string;
  body: string[];
};

export type Carousel = {
  id: string;
  title: string;
  cards: CarouselCard[];
  palette: string;
  template: string;
  tone: "light" | "dark";
  fontId?: string;
  brandName?: string;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  actionItems?: NoteActionItem[];
  createdAt: string;
  updatedAt: string;
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Normalize unknown JSON into a safe Note (guest/localStorage data may be legacy). */
export function normalizeNote(raw: unknown): Note {
  const n = (raw ?? {}) as Partial<Note> & { action_items?: unknown; tags?: unknown };
  const tags = Array.isArray(n.tags) ? n.tags.filter((t): t is string => typeof t === "string") : [];
  const rawItems = Array.isArray(n.actionItems) ? n.actionItems : Array.isArray(n.action_items) ? n.action_items : [];
  const actionItems = rawItems
    .map((item) => (typeof item === "string" ? { text: item, done: false } : item))
    .filter((item): item is NoteActionItem => !!item && typeof item.text === "string" && item.text.trim() !== "")
    .map((item) => ({ text: item.text, done: Boolean(item.done) }));
  return {
    id: String(n.id ?? uid()),
    title: typeof n.title === "string" ? n.title : "",
    content: typeof n.content === "string" ? n.content : "",
    tags,
    actionItems,
    createdAt: typeof n.createdAt === "string" ? n.createdAt : new Date().toISOString(),
    updatedAt: typeof n.updatedAt === "string" ? n.updatedAt : new Date().toISOString(),
  };
}
