import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};
  let healthy = true;

  // Database check
  try {
    const sql = getSql();
    await sql`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
    healthy = false;
  }

  // Environment check
  checks.authSecret = process.env.AUTH_SECRET ? "set" : "missing";
  checks.databaseUrl = process.env.DATABASE_URL ? "set" : "missing";
  if (!process.env.AUTH_SECRET) healthy = false;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    },
    { status: healthy ? 200 : 503 },
  );
}
