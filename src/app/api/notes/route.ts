import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql, query, rowToNote } from "@/lib/db";
import type { NoteRow } from "@/lib/db";
import type { Note } from "@/lib/crm";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let rows: (NoteRow & { tags?: unknown; action_items?: unknown })[] = [];
  try {
    rows = await query<NoteRow & { tags?: unknown; action_items?: unknown }>`SELECT * FROM notes ORDER BY updated_at DESC`;
  } catch {
    // Columns not migrated yet — fall back to base columns.
    rows = await query<NoteRow & { tags?: unknown; action_items?: unknown }>`SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC`;
  }
  return NextResponse.json(rows.map((row) => ({
    ...rowToNote(row),
    tags: Array.isArray(row.tags) ? row.tags.filter((t): t is string => typeof t === "string") : [],
    actionItems: Array.isArray(row.action_items)
      ? (row.action_items as { text?: unknown; done?: unknown }[])
          .filter((it) => it && typeof it.text === "string")
          .map((it) => ({ text: String(it.text), done: Boolean(it.done) }))
      : [],
  })));
}

export async function POST(request: Request) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const body = (await request.json()) as Note;
  const tags = JSON.stringify(Array.isArray(body.tags) ? body.tags : []);
  const actionItems = JSON.stringify(Array.isArray(body.actionItems) ? body.actionItems : []);
  try {
    await sql`INSERT INTO notes (id, title, content, created_at, updated_at, tags, action_items) VALUES (${body.id}, ${body.title}, ${body.content}, ${body.createdAt}, ${body.updatedAt}, ${tags}::jsonb, ${actionItems}::jsonb)`;
  } catch {
    // Columns not migrated yet — save without them.
    await sql`INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (${body.id}, ${body.title}, ${body.content}, ${body.createdAt}, ${body.updatedAt})`;
  }
  return NextResponse.json(body);
}
