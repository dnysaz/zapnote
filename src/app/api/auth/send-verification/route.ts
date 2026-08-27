import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql, query, type AdminRow } from "@/lib/db";
import { getSessionEmail } from "@/lib/auth";
import { sendEmail, verificationEmailHtml } from "@/lib/email";
import crypto from "crypto";

export async function POST() {
  try {
    const email = await getSessionEmail();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if already verified
    const rows = await query<AdminRow>`SELECT email, email_verified FROM admins WHERE email = ${email}`;
    const admin = rows[0];
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }
    if (admin.email_verified) {
      return NextResponse.json({ message: "Email already verified" });
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token
    const sql = getSql();
    // Delete old tokens for this email
    await sql`DELETE FROM verification_tokens WHERE email = ${email} AND type = 'verify'`;
    // Insert new token
    await sql`INSERT INTO verification_tokens (token, email, type, expires_at) VALUES (${token}, ${email}, 'verify', ${expiresAt.toISOString()})`;

    // Build verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    // Send email
    const siteName = "ZapNote!";
    const result = await sendEmail({
      to: email,
      subject: `Verify your email for ${siteName}`,
      html: verificationEmailHtml({
        siteName,
        verifyUrl,
        expiresIn: "24 hours",
      }),
    });

    if (!result.success) {
      console.error("Failed to send verification email:", result.error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Send verification failed:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
