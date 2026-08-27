import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql, query, type AdminRow } from "@/lib/db";
import { hashPassword, setSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmail, verificationEmailHtml } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    // Rate limit: 3 registration attempts per hour per IP
    const ip = getClientIp(request);
    const { allowed, resetMs } = checkRateLimit(`register:${ip}`, 3, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Try again in ${Math.ceil(resetMs / 60000)} minutes.` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(resetMs / 1000)) } },
      );
    }

    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const existing = await query<AdminRow>`SELECT email FROM admins WHERE email = ${email}`;
    if (existing.length > 0) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

    const hash = await hashPassword(password);
    const sql = getSql();
    await sql`INSERT INTO admins (email, password_hash) VALUES (${email}, ${hash})`;
    await setSession(email);

    // Send verification email
    try {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await sql`INSERT INTO verification_tokens (token, email, type, expires_at) VALUES (${token}, ${email}, 'verify', ${expiresAt.toISOString()})`;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
      const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
      await sendEmail({
        to: email,
        subject: "Verify your email for ZapNote!",
        html: verificationEmailHtml({ siteName: "ZapNote!", verifyUrl, expiresIn: "24 hours" }),
      });
    } catch (e) {
      console.error("Failed to send verification email:", e);
      // Don't fail registration if email fails
    }

    return NextResponse.json({ email, name: "" });
  } catch (error) {
    console.error("Register failed:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
