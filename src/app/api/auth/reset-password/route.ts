import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql, query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

interface TokenRow {
  token: string;
  email: string;
  type: string;
  expires_at: Date | string;
}

export async function POST(request: Request) {
  try {
    const { token, password } = (await request.json()) as { token?: string; password?: string };

    if (!token?.trim()) {
      return NextResponse.json({ error: "Token is required." }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const sql = getSql();

    // Find the token
    const rows = await query<TokenRow>`SELECT token, email, type, expires_at FROM verification_tokens WHERE token = ${token.trim()} AND type = 'reset'`;
    const row = rows[0];

    if (!row) {
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    }

    // Check expiry
    const expiresAt = new Date(row.expires_at);
    if (expiresAt < new Date()) {
      await sql`DELETE FROM verification_tokens WHERE token = ${token.trim()}`;
      return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
    }

    // Hash new password
    const newHash = await hashPassword(password);

    // Update password
    await sql`UPDATE admins SET password_hash = ${newHash} WHERE email = ${row.email}`;

    // Mark email as verified (if they can reset, they must have access to their email)
    await sql`UPDATE admins SET email_verified = TRUE WHERE email = ${row.email}`;

    // Delete used token
    await sql`DELETE FROM verification_tokens WHERE token = ${token.trim()}`;

    return NextResponse.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    console.error("Reset password failed:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
