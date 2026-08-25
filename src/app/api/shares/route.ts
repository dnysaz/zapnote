import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function makeToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function POST(request: Request) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as { docType?: string; docId?: string };
    if (body.docType !== "note" && body.docType !== "article") return NextResponse.json({ error: "docType must be note or article" }, { status: 400 });
    if (!body.docId) return NextResponse.json({ error: "docId is required" }, { status: 400 });
    const sql = getSql();
    const token = makeToken();
    await sql`INSERT INTO shares (token, doc_type, doc_id) VALUES (${token}, ${body.docType}, ${body.docId})`;
    const sharePath = body.docType === "article" ? `/share/article/${token}` : `/share/note/${token}`;
    return NextResponse.json({ token, url: sharePath });
  } catch (error) {
    console.error("Create share failed:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
