import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { query, getSql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { DEFAULT_SETTINGS } from "@/lib/settings";

interface SettingsRow { id: string; data: Record<string, unknown> }

export async function GET() {
  try {
    const rows = await query<SettingsRow>`SELECT data FROM settings WHERE id = 'site' LIMIT 1`;
    const row = rows[0];
    if (!row) return NextResponse.json(DEFAULT_SETTINGS);
    return NextResponse.json({ ...DEFAULT_SETTINGS, ...row.data });
  } catch {
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const sql = getSql();
  await sql`INSERT INTO settings (id, data) VALUES ('site', ${JSON.stringify(body)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = settings.data || ${JSON.stringify(body)}::jsonb`;
  return NextResponse.json({ ok: true });
}
