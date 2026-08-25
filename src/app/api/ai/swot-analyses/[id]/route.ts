import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { requireAuth } from "@/lib/auth";
import { getSql } from "@/lib/db";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const sql = getSql();
  await sql`DELETE FROM swot_analyses WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
