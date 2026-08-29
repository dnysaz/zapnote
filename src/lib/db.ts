import { neon } from "@neondatabase/serverless";
import type { Note } from "./crm";

let _sql: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _sql = neon(url);
  }
  return _sql;
}

export async function query<T>(sqlText: TemplateStringsArray, ...values: unknown[]): Promise<T[]> {
  const result = await getSql()(sqlText, ...values);
  return result as unknown as T[];
}

export interface NoteRow {
  id: string;
  title: string;
  content: string;
  kind?: string;
  language?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AdminRow {
  email: string;
  password_hash: string;
  name: string | null;
  email_verified: boolean;
  encrypted_gemini_key: string | null;
  gemini_model: string | null;
}

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    kind: row.kind === "code" ? "code" : "rich",
    language: row.language ?? undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}
