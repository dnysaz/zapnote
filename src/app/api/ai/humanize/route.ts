import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { callGemini } from "@/lib/gemini";
import { HUMANIZE_SYSTEM_PROMPT } from "@/lib/prompts";

export async function POST(request: Request) {
  try {
    const { content } = (await request.json()) as { content: string };
    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const result = await callGemini({
      systemPrompt: HUMANIZE_SYSTEM_PROMPT,
      userPrompt: `Analyze this article for human-likeness:\n\n${content}`,
      temperature: 0.5,
      maxOutputTokens: 2048,
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
