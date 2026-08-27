import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { Carousel } from "@/lib/crm";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const body = (await request.json()) as Partial<Carousel>;
  const title = typeof body.title === "string" ? body.title.slice(0, 200) : "Untitled carousel";
  const cards = Array.isArray(body.cards) ? JSON.stringify(body.cards) : "[]";
  const palette = typeof body.palette === "string" ? body.palette : "sage";
  const template = typeof body.template === "string" ? body.template : "theme1";
  const tone = body.tone === "light" ? "light" : "dark";
  const fontId = typeof body.fontId === "string" ? body.fontId : null;
  const brandName = typeof body.brandName === "string" ? body.brandName : null;
  const now = new Date().toISOString();
  try {
    await sql`CREATE TABLE IF NOT EXISTS carousels (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      cards JSONB NOT NULL DEFAULT '[]'::jsonb,
      palette TEXT NOT NULL DEFAULT 'sage',
      template TEXT NOT NULL DEFAULT 'theme1',
      tone TEXT NOT NULL DEFAULT 'dark',
      font_id TEXT,
      brand_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`ALTER TABLE carousels ADD COLUMN IF NOT EXISTS font_id TEXT`;
    await sql`ALTER TABLE carousels ADD COLUMN IF NOT EXISTS brand_name TEXT`;
    await sql`UPDATE carousels SET title = ${title}, cards = ${cards}::jsonb, palette = ${palette}, template = ${template}, tone = ${tone}, font_id = ${fontId}, brand_name = ${brandName}, updated_at = ${now} WHERE id = ${id}`;
  } catch {
    return NextResponse.json({ error: "Carousels table not ready. Run setup first." }, { status: 500 });
  }
  return NextResponse.json({ id, title, cards: body.cards ?? [], palette, template, tone, fontId, brandName, updatedAt: now });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  try {
    await sql`DELETE FROM carousels WHERE id = ${id}`;
  } catch {
    return NextResponse.json({ error: "Carousels table not ready." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
