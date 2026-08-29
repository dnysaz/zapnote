import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql } from "@/lib/db";
import type { Note } from "@/lib/crm";
import { requireAuth } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const body = (await request.json()) as Note;
  const tags = JSON.stringify(Array.isArray(body.tags) ? body.tags : []);
  const actionItems = JSON.stringify(Array.isArray(body.actionItems) ? body.actionItems : []);
  const kind = body.kind === "code" ? "code" : body.kind === "folder" ? "folder" : "rich";
  const language = typeof body.language === "string" && body.language ? body.language : null;
  try {
    await sql`UPDATE notes SET title = ${body.title}, content = ${body.content}, updated_at = ${body.updatedAt}, tags = ${tags}::jsonb, action_items = ${actionItems}::jsonb, kind = ${kind}, language = ${language} WHERE id = ${id}`;
  } catch {
    // Columns not migrated yet — update base fields only.
    await sql`UPDATE notes SET title = ${body.title}, content = ${body.content}, updated_at = ${body.updatedAt} WHERE id = ${id}`;
  }
  return NextResponse.json(body);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  await sql`DELETE FROM notes WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
