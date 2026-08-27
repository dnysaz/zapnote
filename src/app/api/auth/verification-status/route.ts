import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { query, type AdminRow } from "@/lib/db";
import { getSessionEmail } from "@/lib/auth";

export async function GET() {
  try {
    const email = await getSessionEmail();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await query<AdminRow>`SELECT email_verified FROM admins WHERE email = ${email}`;
    const admin = rows[0];

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json({ verified: admin.email_verified });
  } catch (error) {
    console.error("Check verification status failed:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
