import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSessionEmail, hashPassword, verifyPassword } from "@/lib/auth";
import { getSql, query, type AdminRow } from "@/lib/db";

export async function GET() {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query<AdminRow>`SELECT email, name, email_verified FROM admins WHERE email = ${email}`;
  const admin = rows[0];
  return NextResponse.json({
    email: admin?.email ?? email,
    name: admin?.name ?? "",
    emailVerified: admin?.email_verified ?? false,
  });
}

export async function PATCH(request: Request) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      name?: string;
      currentPassword?: string;
      newPassword?: string;
      newEmail?: string;
    };

    const sql = getSql();

    // Update name
    if (body.name !== undefined) {
      await sql`UPDATE admins SET name = ${body.name} WHERE email = ${email}`;
    }

    // Change email
    if (body.newEmail && body.newEmail.trim().toLowerCase() !== email) {
      const newEmail = body.newEmail.trim().toLowerCase();
      if (!body.currentPassword) {
        return NextResponse.json({ error: "Current password is required to change email." }, { status: 400 });
      }
      // Verify current password
      const rows = await query<AdminRow>`SELECT password_hash FROM admins WHERE email = ${email}`;
      const admin = rows[0];
      if (!admin) return NextResponse.json({ error: "Account not found." }, { status: 404 });
      const valid = await verifyPassword(body.currentPassword, admin.password_hash);
      if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });

      // Check if new email already exists
      const existing = await query<AdminRow>`SELECT email FROM admins WHERE email = ${newEmail}`;
      if (existing.length > 0) {
        return NextResponse.json({ error: "This email is already in use." }, { status: 409 });
      }

      await sql`UPDATE admins SET email = ${newEmail} WHERE email = ${email}`;
    }

    // Change password
    if (body.newPassword) {
      if (!body.currentPassword) {
        return NextResponse.json({ error: "Current password is required." }, { status: 400 });
      }
      if (body.newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
      }

      const rows = await query<AdminRow>`SELECT password_hash FROM admins WHERE email = ${email}`;
      const admin = rows[0];
      if (!admin) return NextResponse.json({ error: "Account not found." }, { status: 404 });

      const valid = await verifyPassword(body.currentPassword, admin.password_hash);
      if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });

      const newHash = await hashPassword(body.newPassword);
      await sql`UPDATE admins SET password_hash = ${newHash} WHERE email = ${email}`;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Account update failed:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
