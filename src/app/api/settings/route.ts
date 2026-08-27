import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { query, getSql } from "@/lib/db";
import { getSessionEmail } from "@/lib/auth";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { encrypt } from "@/lib/encryption";
import type { AdminRow } from "@/lib/db";

interface SettingsRow { id: string; data: Record<string, unknown> }

export async function GET() {
  const email = await getSessionEmail();
  try {
    const rows = await query<SettingsRow>`SELECT data FROM settings WHERE id = 'site' LIMIT 1`;
    const row = rows[0];
    const raw: Record<string, unknown> = row?.data || {};
    // Strip legacy Gemini fields from global settings (may still exist in old DB data)
    const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS, ...raw };
    delete merged.geminiApiKey;
    delete merged.geminiModel;
    const safe = merged as unknown as typeof DEFAULT_SETTINGS;

    // Check per-user Gemini key
    let hasGeminiApiKey = false;
    let geminiModel = DEFAULT_SETTINGS.geminiModel;
    if (email) {
      const userRows = await query<AdminRow>`SELECT encrypted_gemini_key, gemini_model FROM admins WHERE email = ${email} LIMIT 1`;
      const user = userRows[0];
      hasGeminiApiKey = Boolean(user?.encrypted_gemini_key);
      geminiModel = ((user?.gemini_model as string) || DEFAULT_SETTINGS.geminiModel) as typeof DEFAULT_SETTINGS.geminiModel;
    }

    return NextResponse.json({ ...safe, geminiModel, hasGeminiApiKey });
  } catch {
    return NextResponse.json({ ...DEFAULT_SETTINGS, hasGeminiApiKey: false });
  }
}

export async function PATCH(request: Request) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;
  const sql = getSql();

  // Handle Gemini key per-user (encrypted)
  const { geminiApiKey, geminiModel, ...rest } = body;

  // Save Gemini key to admins table (encrypted)
  if (typeof geminiApiKey === "string" && geminiApiKey.trim()) {
    const encrypted = encrypt(geminiApiKey.trim());
    await sql`UPDATE admins SET encrypted_gemini_key = ${encrypted} WHERE email = ${email}`;
  }

  // Save Gemini model to admins table
  if (typeof geminiModel === "string") {
    await sql`UPDATE admins SET gemini_model = ${geminiModel} WHERE email = ${email}`;
  }

  // Save other settings to global settings table (theme, siteName, fontSize)
  if (Object.keys(rest).length > 0) {
    await sql`INSERT INTO settings (id, data) VALUES ('site', ${JSON.stringify(rest)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = settings.data || ${JSON.stringify(rest)}::jsonb`;
  }

  return NextResponse.json({ ok: true });
}
