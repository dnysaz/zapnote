import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSql, query, type AdminRow } from "@/lib/db";
import { hashPassword, setSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const existing = await query<AdminRow>`SELECT email FROM admins WHERE email = ${email}`;
    if (existing.length > 0) return NextResponse.json({ error: "An admin account already exists." }, { status: 409 });

    const hash = await hashPassword(password);
    const sql = getSql();
    await sql`INSERT INTO admins (email, password_hash) VALUES (${email}, ${hash})`;
    await setSession(email);
    return NextResponse.json({ email, name: "" });
  } catch (error) {
    console.error("Register failed:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
