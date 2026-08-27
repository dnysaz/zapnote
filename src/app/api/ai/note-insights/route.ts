import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { callGemini } from "@/lib/gemini";
import { getSessionEmail } from "@/lib/auth";

/** Convert editor HTML into plain text for the model. */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const INSIGHTS_SYSTEM_PROMPT = `You analyze a user's note and produce smart metadata. Return ONLY a strict JSON object (no markdown fences, no commentary) with EXACTLY this shape:

{
  "tags": ["tag1", "tag2"],
  "suggestedTitle": "A clear, specific title",
  "actionItems": [{"text": "action to take", "priority": "high"}]
}

Rules:
- tags: 2-5 short lowercase topical tags (single words or 2-word phrases) in the note's language. Examples: "shopping", "research", "meeting", "budget".
- suggestedTitle: max 80 characters, in the note's language. Capture the note's core topic specifically (not generic like "Note").
- actionItems: ONLY tasks/todos/deadlines explicitly present or strongly implied by the note (buy X, call Y, finish Z). Max 10 items. Each text is one concise imperative sentence in the note's language. priority is "high" | "medium" | "low". Empty array if there are no actionable tasks.
- Same language as the note for all text.`;

interface InsightsResult {
  tags?: unknown;
  suggestedTitle?: unknown;
  actionItems?: unknown;
}

function normalizeInsights(parsed: InsightsResult): {
  tags: string[];
  suggestedTitle: string;
  actionItems: { text: string; done: boolean; priority?: string }[];
} {
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.filter((t): t is string => typeof t === "string").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 5)
    : [];
  const suggestedTitle = typeof parsed.suggestedTitle === "string" ? parsed.suggestedTitle.trim().slice(0, 120) : "";
  const actionItems = Array.isArray(parsed.actionItems)
    ? (parsed.actionItems as { text?: unknown; priority?: unknown }[])
        .filter((it) => it && typeof it.text === "string" && (it.text as string).trim())
        .slice(0, 10)
        .map((it) => ({
          text: String(it.text).trim(),
          done: false,
          priority: it.priority === "high" || it.priority === "low" ? it.priority : "medium",
        }))
    : [];
  return { tags, suggestedTitle, actionItems };
}

export async function POST(request: Request) {
  try {
    const email = await getSessionEmail();
    const body = (await request.json()) as { content?: string; title?: string };
    const plain = htmlToText(body.content || "");
    if (!plain) {
      return NextResponse.json({ error: "Note is empty. Write something first." }, { status: 400 });
    }

    const noteText = plain.length > 8000 ? plain.slice(0, 8000) + "\n\n[note truncated]" : plain;
    const titleLine = body.title?.trim() ? `Current title (may be empty or a placeholder): ${body.title.trim()}` : "Current title: (empty)";
    const userPrompt = `${titleLine}\n\n## NOTE\n${noteText}`;

    const raw = await callGemini({
      systemPrompt: INSIGHTS_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.3,
      maxOutputTokens: 1024,
      userEmail: email || undefined,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse insights." }, { status: 500 });
    }
    const parsed = JSON.parse(jsonMatch[0]) as InsightsResult;
    return NextResponse.json(normalizeInsights(parsed));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg.slice(0, 300) }, { status: 500 });
  }
}
