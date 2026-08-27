import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Send a transactional email via Resend.
 * In dev mode, Resend allows sending from onboarding@resend.dev without domain verification.
 * In production, set RESEND_FROM_EMAIL to your verified domain email.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailResult> {
  try {
    const resend = getResend();
    const from = process.env.RESEND_FROM_EMAIL || "ZapNote <onboarding@resend.dev>";

    await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Email send failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

/**
 * Generate a verification email HTML template.
 */
export function verificationEmailHtml({
  siteName,
  verifyUrl,
  expiresIn,
}: {
  siteName: string;
  verifyUrl: string;
  expiresIn: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Verify your email address</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #374151; margin-bottom: 24px;">
        Welcome to <strong>${siteName}</strong>! Please verify your email address to complete your registration.
      </p>
      <a href="${verifyUrl}" style="display: inline-block; background: #234b42; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-bottom: 24px;">
        Verify Email Address
      </a>
      <p style="font-size: 12px; color: #6b7280; line-height: 1.5;">
        This link expires in ${expiresIn}. If you didn't create an account, you can safely ignore this email.
      </p>
    </body>
    </html>
  `;
}

/**
 * Generate a password reset email HTML template.
 */
export function passwordResetEmailHtml({
  siteName,
  resetUrl,
  expiresIn,
}: {
  siteName: string;
  resetUrl: string;
  expiresIn: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Reset your password</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #374151; margin-bottom: 24px;">
        You requested a password reset for your <strong>${siteName}</strong> account.
      </p>
      <a href="${resetUrl}" style="display: inline-block; background: #234b42; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-bottom: 24px;">
        Reset Password
      </a>
      <p style="font-size: 12px; color: #6b7280; line-height: 1.5;">
        This link expires in ${expiresIn}. If you didn't request this, you can safely ignore this email.
      </p>
    </body>
    </html>
  `;
}
