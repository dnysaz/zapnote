import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql } from "@/lib/db";

export async function POST() {
  try {
    const sql = getSql();
    await sql`CREATE TABLE IF NOT EXISTS admins (
      email TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      name TEXT DEFAULT ''
    )`;
    await sql`CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
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
      swot JSONB,
      verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`INSERT INTO settings (id, data) VALUES ('site', '{"siteName":"ViNotes","theme":"emerald"}'::jsonb) ON CONFLICT (id) DO NOTHING`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Setup failed:", error);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}
