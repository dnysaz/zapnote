import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { callGemini } from "@/lib/gemini";
import { HUMANIZE_SYSTEM_PROMPT } from "@/lib/prompts";
import { getSessionEmail } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const email = await getSessionEmail();
    const { content } = (await request.json()) as { content: string };
    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Trim to first 4000 chars for faster response
    const trimmed = content.length > 4000 ? content.slice(0, 4000) + "\n\n[truncated]" : content;

    const result = await callGemini({
      systemPrompt: HUMANIZE_SYSTEM_PROMPT,
      userPrompt: trimmed,
      temperature: 0.3,
      maxOutputTokens: 512,
      userEmail: email || undefined,
    });

    // Parse JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse analysis" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      score?: number;
      label?: string;
      breakdown?: Record<string, number>;
      description?: string;
      suggestions?: string[];
    };

    return NextResponse.json({
      score: parsed.score ?? 0,
      label: parsed.label ?? "Unknown",
      breakdown: parsed.breakdown ?? {},
      description: parsed.description ?? "",
      suggestions: parsed.suggestions ?? [],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg.slice(0, 300) }, { status: 500 });
  }
}
