import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql, query, type AdminRow } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate limit: 3 requests per hour per IP
    const ip = getClientIp(request);
    const rl = checkRateLimit(`forgot-pw:${ip}`, 3, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${Math.ceil(rl.resetMs / 60000)} minutes.` },
        { status: 429 }
      );
    }

    // Check if user exists
    const rows = await query<AdminRow>`SELECT email FROM admins WHERE email = ${normalizedEmail} LIMIT 1`;
    if (!rows[0]) {
      return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const sql = getSql();
    await sql`DELETE FROM verification_tokens WHERE email = ${normalizedEmail} AND type = 'reset'`;
    await sql`INSERT INTO verification_tokens (token, email, type, expires_at) VALUES (${token}, ${normalizedEmail}, 'reset', ${expiresAt.toISOString()})`;

    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Send email — skip if PLUNK_API_KEY not set
    let emailSent = false;
    if (process.env.PLUNK_API_KEY) {
      try {
        const { sendEmail, passwordResetEmailHtml } = await import("@/lib/email");
        const siteName = "ZapNote!";
        const result = await sendEmail({
          to: normalizedEmail,
          subject: `Reset your ${siteName} password`,
          html: passwordResetEmailHtml({ siteName, resetUrl, expiresIn: "1 hour" }),
        });
        emailSent = result.success;
      } catch (emailErr) {
        console.error("[forgot-password] Email send failed:", emailErr);
      }
    }

    return NextResponse.json({
      message: "If an account exists, a reset link has been sent.",
      emailSent,
    });
  } catch (error) {
    console.error("[forgot-password] Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 500 });
  }
}
