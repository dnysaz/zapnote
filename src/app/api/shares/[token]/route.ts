import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { query, rowToNote } from "@/lib/db";
import type { NoteRow } from "@/lib/db";

type ShareRow = { doc_type: string; doc_id: string };

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rows = await query<ShareRow>`SELECT doc_type, doc_id FROM shares WHERE token = ${token}`;
  const share = rows[0];
  if (!share) return NextResponse.json({ error: "Share link not found" }, { status: 404 });
  if (share.doc_type === "note") {
    const noteRows = await query<NoteRow>`SELECT * FROM notes WHERE id = ${share.doc_id}`;
    const note = noteRows[0];
    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
    return NextResponse.json({ docType: "note", doc: rowToNote(note) });
  }
  if (share.doc_type === "article") {
    const articleRows = await query<{ id: string; title: string; content: string }>`SELECT id, title, content FROM articles WHERE id = ${share.doc_id}`;
    const article = articleRows[0];
    if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });
    return NextResponse.json({ docType: "article", doc: article });
  }
  return NextResponse.json({ ok: true, docType: share.doc_type });
}
