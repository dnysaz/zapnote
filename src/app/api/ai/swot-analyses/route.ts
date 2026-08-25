import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { requireAuth } from "@/lib/auth";
import { query, getSql } from "@/lib/db";

interface SwotRow {
  id: string;
  title: string;
  source_content: string;
  result: Record<string, unknown>;
  created_at: string;
}

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await query<SwotRow>`SELECT id, title, source_content, result, created_at FROM swot_analyses ORDER BY created_at DESC`;
    const analyses = rows.map((r) => ({
      id: r.id,
      title: r.title,
      sourceContent: r.source_content,
      ...r.result,
      createdAt: r.created_at,
    }));
    return NextResponse.json(analyses);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as {
      id: string;
      title: string;
      sourceContent: string;
      strengths?: string[];
      weaknesses?: string[];
      opportunities?: string[];
      threats?: string[];
      seoScore?: number;
      summary?: string;
    };
    const sql = getSql();
    const result = JSON.stringify({
      strengths: body.strengths || [],
      weaknesses: body.weaknesses || [],
      opportunities: body.opportunities || [],
      threats: body.threats || [],
      seoScore: body.seoScore || 0,
      summary: body.summary || "",
    });
    await sql`INSERT INTO swot_analyses (id, title, source_content, result) VALUES (${body.id}, ${body.title}, ${body.sourceContent}, ${result}::jsonb)`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Save SWOT failed:", error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
