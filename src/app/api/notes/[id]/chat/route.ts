import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql, query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

type StoredMessage = { role: string; text: string };

function sanitize(raw: unknown): StoredMessage[] {
  return Array.isArray(raw)
    ? (raw as { role?: unknown; text?: unknown }[])
        .filter((m) => m && typeof m.text === "string" && (m.text as string).trim() && (m.role === "user" || m.role === "ai"))
        .slice(-200)
        .map((m) => ({ role: String(m.role), text: String(m.text).slice(0, 20000) }))
    : [];
}

/** Get the saved AI chat history for a note. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await query<{ messages: unknown }>`SELECT messages FROM note_chats WHERE note_id = ${id} LIMIT 1`;
    return NextResponse.json({ messages: sanitize(rows[0]?.messages) });
  } catch {
    // Table not migrated yet — treat as empty.
    return NextResponse.json({ messages: [] });
  }
}

/** Save (upsert) the AI chat history for a note. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as { messages?: unknown };
    const messages = sanitize(body.messages);
    const json = JSON.stringify(messages);
    const sql = getSql();
    await sql`INSERT INTO note_chats (note_id, messages, updated_at) VALUES (${id}, ${json}::jsonb, NOW()) ON CONFLICT (note_id) DO UPDATE SET messages = ${json}::jsonb, updated_at = NOW()`;
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg.slice(0, 300) }, { status: 500 });
  }
}
