import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSessionEmail } from "@/lib/auth";
import { query, type AdminRow } from "@/lib/db";

export async function GET() {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ authed: false });
  }
  const rows = await query<AdminRow>`SELECT email, name, email_verified FROM admins WHERE email = ${email}`;
  const admin = rows[0];
  return NextResponse.json({ authed: true, email: admin?.email ?? email, name: admin?.name ?? "", emailVerified: admin?.email_verified ?? false });
}
