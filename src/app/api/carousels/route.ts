import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql, query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { Carousel, CarouselCard } from "@/lib/crm";

interface CarouselRow {
  id: string;
  title: string;
  cards: unknown;
  palette: string;
  template: string;
  tone: string;
  font_id: string | null;
  brand_name: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function rowToCarousel(row: CarouselRow): Carousel {
  const cards = Array.isArray(row.cards)
    ? (row.cards as CarouselCard[]).filter((c) => c && typeof c.title === "string")
    : [];
  return {
    id: row.id,
    title: row.title,
    cards,
    palette: row.palette || "sage",
    template: row.template || "theme1",
    tone: row.tone === "light" ? "light" : "dark",
    fontId: row.font_id || undefined,
    brandName: row.brand_name || undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await query<CarouselRow>`SELECT * FROM carousels ORDER BY updated_at DESC`;
    return NextResponse.json(rows.map(rowToCarousel));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const body = (await request.json()) as Partial<Carousel>;
  const id = body.id || Math.random().toString(36).slice(2, 10);
  const title = typeof body.title === "string" ? body.title.slice(0, 200) : "Untitled carousel";
  const cards = Array.isArray(body.cards) ? JSON.stringify(body.cards) : "[]";
  const palette = typeof body.palette === "string" ? body.palette : "sage";
  const template = typeof body.template === "string" ? body.template : "theme1";
  const tone = body.tone === "light" ? "light" : "dark";
  const fontId = typeof body.fontId === "string" ? body.fontId : null;
  const brandName = typeof body.brandName === "string" ? body.brandName : null;
  const now = new Date().toISOString();
  try {
    // Self-heal: ensure the table exists (e.g. if setup hasn't run yet).
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
    // Migration for existing installs.
    await sql`ALTER TABLE carousels ADD COLUMN IF NOT EXISTS font_id TEXT`;
    await sql`ALTER TABLE carousels ADD COLUMN IF NOT EXISTS brand_name TEXT`;
    await sql`INSERT INTO carousels (id, title, cards, palette, template, tone, font_id, brand_name, created_at, updated_at)
      VALUES (${id}, ${title}, ${cards}::jsonb, ${palette}, ${template}, ${tone}, ${fontId}, ${brandName}, ${now}, ${now})`;
  } catch {
    return NextResponse.json({ error: "Failed to save carousel." }, { status: 500 });
  }
  return NextResponse.json({ id, title, cards: body.cards ?? [], palette, template, tone, fontId, brandName, createdAt: now, updatedAt: now });
}
