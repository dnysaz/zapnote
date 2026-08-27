import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { requireAuth, getSessionEmail } from "@/lib/auth";
import { callGemini } from "@/lib/gemini";
import { SWOT_SYSTEM_PROMPT } from "@/lib/prompts";

export interface SwotResult {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  seoScore: number;
  summary: string;
}

export async function POST(request: Request) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const email = await getSessionEmail();
    const body = (await request.json()) as { content?: string };
    const content = (body.content || "").trim();
    if (!content) return NextResponse.json({ error: "Article content is required." }, { status: 400 });

    const userPrompt = [
      "Run a SWOT analysis and SEO scoring on this article.",
      "",
      "## ARTICLE CONTENT",
      content.slice(0, 20000),
    ].join("\n");

    const raw = await callGemini({ systemPrompt: SWOT_SYSTEM_PROMPT, userPrompt, userEmail: email || undefined });

    let parsed: Partial<SwotResult>;
    try { parsed = JSON.parse(raw) as Partial<SwotResult>; }
    catch { return NextResponse.json({ error: "Invalid AI response format. Please try again." }, { status: 502 }); }

    const list = (x: unknown): string[] => (Array.isArray(x) ? x.map(String).slice(0, 8) : []);
    const result: SwotResult = {
      strengths: list(parsed.strengths),
      weaknesses: list(parsed.weaknesses),
      opportunities: list(parsed.opportunities),
      threats: list(parsed.threats),
      seoScore: typeof parsed.seoScore === "number" ? Math.max(0, Math.min(100, Math.round(parsed.seoScore))) : 0,
      summary: String(parsed.summary ?? ""),
    };
    if (!result.strengths.length && !result.summary) {
      return NextResponse.json({ error: "Empty result. Please try again." }, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("SWOT failed:", error);
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
