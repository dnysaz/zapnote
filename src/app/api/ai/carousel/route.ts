import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { requireAuth, getSessionEmail } from "@/lib/auth";
import { callGemini } from "@/lib/gemini";

// Must match the ICONS map in ContentCreator.tsx
const ALLOWED_ICONS = [
  "Sparkles", "Lightbulb", "Target", "TrendingUp", "Rocket", "CheckCircle",
  "AlertTriangle", "Heart", "Star", "Zap", "Brain", "Users", "MessageCircle",
  "BookOpen", "Search", "Clock", "Shield", "Gift", "Camera", "Coffee",
];

function buildCarouselSystemPrompt(count: number): string {
  const middleRule = count <= 2
    ? `- There are NO middle cards.`
    : `- Cards 2-${count - 1} (DISCUSSION): each covers one distinct aspect of the topic, ordered logically. body: 2-3 short points, max ~90 characters per point.`;
  return `You are a social media content creator. You write Instagram carousel posts: EXACTLY ${count} cards, punchy and scroll-stopping.

Return ONLY a strict JSON object (no markdown fences, no commentary):
{
  "cards": [
    { "icon": "Lightbulb", "title": "...", "body": ["..."] },
    ... (${count} items total)
  ]
}

Card structure:
- Card 1 (HOOK): big title that grabs attention — a question, bold claim, or general info. body: 1-2 very short lines.
${middleRule}
- Card ${count} (CONCLUSION): wrap up with the key takeaway + a call to action. body: 2-3 short lines.

Style rules:
- "icon" MUST be one of: ${ALLOWED_ICONS.join(", ")}. Pick the most fitting icon per card.
- Titles: max 60 characters, no hashtags.
- Short lines, easy to read on a phone screen. No long paragraphs.
- Write in the SAME language as the user's topic/description.
- The "cards" array MUST contain exactly ${count} items.`;
}

export async function POST(request: Request) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const email = await getSessionEmail();
    const body = (await request.json()) as { topic?: string; description?: string; language?: string; cardCount?: number };
    const topic = (body.topic || "").trim();
    const description = (body.description || "").trim();
    if (!topic) return NextResponse.json({ error: "Topic is required." }, { status: 400 });
    const count = Math.min(Math.max(Math.round(Number(body.cardCount) || 4), 2), 10);

    const language = (body.language || "").trim() || "Indonesian";
    const userPrompt = [
      `Topic: ${topic}`,
      description ? `Description / brief: ${description}` : "",
      `Language: ${language}`,
      `Create an Instagram carousel with EXACTLY ${count} cards.`,
    ].filter(Boolean).join("\n");

    const raw = await callGemini({
      systemPrompt: buildCarouselSystemPrompt(count),
      userPrompt,
      temperature: 0.9,
      maxOutputTokens: 2048,
      userEmail: email || undefined,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Failed to parse carousel." }, { status: 500 });

    interface CarouselCard {
      icon?: unknown;
      title?: unknown;
      body?: unknown;
    }
    const parsed = JSON.parse(jsonMatch[0]) as { cards?: unknown };

    const cards = Array.isArray(parsed.cards)
      ? (parsed.cards as CarouselCard[]).slice(0, count).map((card) => ({
          icon: ALLOWED_ICONS.includes(String(card.icon)) ? String(card.icon) : "Sparkles",
          title: typeof card.title === "string" ? card.title.trim().slice(0, 120) : "",
          body: Array.isArray(card.body)
            ? card.body.filter((line): line is string => typeof line === "string" && line.trim() !== "").map((l) => l.trim().slice(0, 160))
            : [],
        }))
      : [];

    if (cards.length === 0) return NextResponse.json({ error: "Empty response from AI." }, { status: 500 });
    return NextResponse.json({ cards });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg.slice(0, 300) }, { status: 500 });
  }
}
