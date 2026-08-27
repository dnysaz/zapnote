import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql } from "@/lib/db";

export async function POST() {
  try {
    const sql = getSql();
    await sql`CREATE TABLE IF NOT EXISTS admins (
      email TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      name TEXT DEFAULT '',
      email_verified BOOLEAN DEFAULT FALSE
    )`;
    // Migration: add email_verified and per-user Gemini key to existing admins
    await sql`ALTER TABLE admins ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE admins ADD COLUMN IF NOT EXISTS encrypted_gemini_key TEXT`;
    await sql`ALTER TABLE admins ADD COLUMN IF NOT EXISTS gemini_model TEXT DEFAULT 'gemini-3.5-flash'`;
    await sql`CREATE TABLE IF NOT EXISTS verification_tokens (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'verify',
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      action_items JSONB NOT NULL DEFAULT '[]'::jsonb
    )`;
    // Migration for existing installs
    await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb`;
    await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS action_items JSONB NOT NULL DEFAULT '[]'::jsonb`;
    await sql`CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'
    )`;
    await sql`CREATE TABLE IF NOT EXISTS shares (
      token TEXT PRIMARY KEY,
      doc_type TEXT NOT NULL,
      doc_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      length TEXT NOT NULL DEFAULT 'medium',
      keyword TEXT NOT NULL DEFAULT '',
      links TEXT NOT NULL DEFAULT '',
      humanize JSONB,
      verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    // Migration: rename swot -> humanize if old column exists
    await sql`ALTER TABLE articles ADD COLUMN IF NOT EXISTS humanize JSONB`;
    await sql`UPDATE articles SET humanize = swot WHERE humanize IS NULL AND swot IS NOT NULL`.catch(() => {});
    await sql`CREATE TABLE IF NOT EXISTS swot_analyses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      source_content TEXT NOT NULL DEFAULT '',
      result JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS note_chats (
      note_id TEXT PRIMARY KEY,
      messages JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
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
    await sql`INSERT INTO settings (id, data) VALUES ('site', '{"siteName":"ZapNote!","theme":"emerald"}'::jsonb) ON CONFLICT (id) DO NOTHING`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Setup failed:", error);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}
