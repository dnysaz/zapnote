import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql, query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

interface ArticleRow { id: string; title: string; content: string; length: string; keyword: string; links: string; humanize: unknown; verified: boolean; created_at: Date | string; updated_at: Date | string }

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await query<ArticleRow>`SELECT * FROM articles ORDER BY updated_at DESC`;
  return NextResponse.json(rows.map((r) => ({
    id: r.id, title: r.title, content: r.content, length: r.length, keyword: r.keyword, links: r.links,
    humanize: r.humanize, verified: r.verified,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
  })));
}

export async function POST(request: Request) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const sql = getSql();
  await sql`INSERT INTO articles (id, title, content, length, keyword, links, humanize, verified, created_at, updated_at)
    VALUES (${body.id}, ${body.title}, ${body.content}, ${body.length}, ${body.keyword}, ${body.links}, ${JSON.stringify(body.humanize) || null}, ${body.verified || false}, ${body.createdAt}, ${body.updatedAt})`;
  return NextResponse.json(body);
}
