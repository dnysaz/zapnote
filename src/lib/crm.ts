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
  kind?: "rich" | "code" | "folder";
  language?: string;
  tags?: string[];
  actionItems?: NoteActionItem[];
  createdAt: string;
  updatedAt: string;
};

// Folder system is stored via system tags (so it works in both guest
// localStorage and the auth DB without a schema migration). A folder note is
// marked with ZF_FOLDER; its location is encoded in a `__zf_parent:<id>` tag
// (empty id = root).
export const ZF_FOLDER = "__zf_folder";
const ZF_PARENT_PREFIX = "__zf_parent:";

export function isFolderNote(n: Note): boolean {
  return n.tags?.includes(ZF_FOLDER) ?? false;
}

export function parentIdOf(n: Note): string | null {
  const t = n.tags?.find((x) => x.startsWith(ZF_PARENT_PREFIX));
  return t ? t.slice(ZF_PARENT_PREFIX.length) || null : null;
}

export function folderTags(parent: string | null): string[] {
  return [ZF_FOLDER, `${ZF_PARENT_PREFIX}${parent ?? ""}`];
}

export function tagsWithParent(tags: string[] | undefined, parent: string | null): string[] {
  const base = (tags ?? []).filter((t) => !t.startsWith(ZF_PARENT_PREFIX));
  return [...base, `${ZF_PARENT_PREFIX}${parent ?? ""}`];
}

export type CodeFile = {
  name: string;
  language: string;
  content: string;
};

// A code note stores its files as a JSON array inside `content`.
export function parseCodeFiles(content: string): CodeFile[] | null {
  try {
    const parsed = JSON.parse(content);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every(
        (f) =>
          f &&
          typeof f.name === "string" &&
          typeof f.language === "string" &&
          typeof f.content === "string",
      )
    ) {
      return parsed as CodeFile[];
    }
  } catch {}
  return null;
}

export function serializeCodeFiles(files: CodeFile[]): string {
  return JSON.stringify(files);
}

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
    kind: (n.kind === "rich" || n.kind === "code" || n.kind === "folder") ? n.kind : undefined,
    language: typeof n.language === "string" ? n.language : undefined,
    tags,
    actionItems,
    createdAt: typeof n.createdAt === "string" ? n.createdAt : new Date().toISOString(),
    updatedAt: typeof n.updatedAt === "string" ? n.updatedAt : new Date().toISOString(),
  };
}
