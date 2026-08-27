import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql, query } from "@/lib/db";

interface VerificationTokenRow {
  token: string;
  email: string;
  type: string;
  expires_at: Date | string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find the token
    const sql = getSql();
    const rows = await query<VerificationTokenRow>`SELECT token, email, type, expires_at FROM verification_tokens WHERE token = ${token} AND type = 'verify'`;
    const row = rows[0];

    if (!row) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    // Check expiry
    const expiresAt = new Date(row.expires_at);
    if (expiresAt < new Date()) {
      // Delete expired token
      await sql`DELETE FROM verification_tokens WHERE token = ${token}`;
      return NextResponse.json({ error: "Token has expired" }, { status: 400 });
    }

    // Mark email as verified
    await sql`UPDATE admins SET email_verified = TRUE WHERE email = ${row.email}`;

    // Delete used token
    await sql`DELETE FROM verification_tokens WHERE token = ${token}`;

    return NextResponse.json({ message: "Email verified successfully", email: row.email });
  } catch (error) {
    console.error("Verify email failed:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
