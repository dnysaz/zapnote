import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { requireAuth, getSessionEmail } from "@/lib/auth";
import { callGemini } from "@/lib/gemini";
import { ARTICLE_SYSTEM_PROMPT, LENGTH_SPECS, STYLE_SPECS, type ArticleLength, type ArticleStyle } from "@/lib/prompts";

export interface ArticleFormData {
  topic: string;
  description: string;
  length: ArticleLength;
  style: ArticleStyle;
  keyword: string;
  links: string;
  language: string;
}

export async function POST(request: Request) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const email = await getSessionEmail();
    const body = (await request.json()) as Partial<ArticleFormData>;
    const topic = (body.topic || "").trim();
    const description = (body.description || "").trim();
    if (!topic) return NextResponse.json({ error: "Topic is required." }, { status: 400 });
    if (!description) return NextResponse.json({ error: "Description is required." }, { status: 400 });

    const length: ArticleLength = body.length === "short" || body.length === "long" ? body.length : "medium";
    const style: ArticleStyle = ["casual", "professional", "news", "humor", "research"].includes(body.style as ArticleStyle) ? body.style as ArticleStyle : "professional";
    const keyword = (body.keyword || "").trim().slice(0, 120);
    const links = (body.links || "").trim();
    const language = (body.language || "English").trim() || "English";

    const spec = LENGTH_SPECS[length];
    const styleSpec = STYLE_SPECS[style];
    const userPrompt = [
      `Write a ${spec.label.toLowerCase()} article (${spec.words}) about: ${topic}`,
      "",
      keyword ? `## TARGET KEYWORD\n${keyword}\nOptimize for this keyword naturally.` : "## TARGET KEYWORD\n(none)",
      "",
      "## BRIEF",
      description,
      "",
      links ? `## LINKS TO EMBED\n${links}` : "",
      "",
      `## LANGUAGE\n${language}`,
      "",
      `## WRITING STYLE\n${styleSpec.label}: ${styleSpec.instruction}`,
      "",
      spec.instructions,
    ].join("\n");

    const markdown = await callGemini({ systemPrompt: ARTICLE_SYSTEM_PROMPT, userPrompt, temperature: 1.1, userEmail: email || undefined });
    return NextResponse.json({ markdown, topic, keyword, length, style, links, language });
  } catch (error) {
    console.error("Article generation failed:", error);
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
