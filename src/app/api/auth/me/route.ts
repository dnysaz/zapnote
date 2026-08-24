import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSessionEmail } from "@/lib/auth";
import { query, type AdminRow } from "@/lib/db";

export async function GET() {
  const email = await getSessionEmail();
  if (!email) {
    const rows = await query<AdminRow>`SELECT email FROM admins LIMIT 1`;
    return NextResponse.json({ authed: false, adminExists: rows.length > 0 });
  }
  const rows = await query<AdminRow>`SELECT email, name FROM admins WHERE email = ${email}`;
  const admin = rows[0];
  return NextResponse.json({ authed: true, email: admin?.email ?? email, name: admin?.name ?? "" });
}
