import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { query, type AdminRow } from "@/lib/db";
import { verifyPassword, setSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limit: 5 attempts per 15 minutes per IP
    const ip = getClientIp(request);
    const { allowed, remaining, resetMs } = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${Math.ceil(resetMs / 60000)} minutes.` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(resetMs / 1000)) } },
      );
    }

    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

    const rows = await query<AdminRow>`SELECT email, password_hash, name FROM admins WHERE email = ${email}`;
    const admin = rows[0];
    if (!admin) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    const valid = await verifyPassword(password, admin.password_hash);
    if (!valid) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    await setSession(admin.email);
    const response = NextResponse.json({ email: admin.email, name: admin.name ?? "" });
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
