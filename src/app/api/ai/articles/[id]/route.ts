import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const sql = getSql();
  const sets: string[] = [];
  if (body.title !== undefined) await sql`UPDATE articles SET title = ${body.title}, updated_at = NOW() WHERE id = ${id}`;
  if (body.content !== undefined) await sql`UPDATE articles SET content = ${body.content}, updated_at = NOW() WHERE id = ${id}`;
  if (body.keyword !== undefined) await sql`UPDATE articles SET keyword = ${body.keyword}, updated_at = NOW() WHERE id = ${id}`;
  if (body.swot !== undefined) await sql`UPDATE articles SET swot = ${JSON.stringify(body.swot)}::jsonb, updated_at = NOW() WHERE id = ${id}`;
  if (body.verified !== undefined) await sql`UPDATE articles SET verified = ${body.verified}, updated_at = NOW() WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  await sql`DELETE FROM articles WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
