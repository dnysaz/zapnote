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

const NOTE_AI_SYSTEM_PROMPT = `You are a precise assistant working directly on the user's note. The user gives you their note plus one instruction. Handle these kinds of tasks:

## 1. CALCULATION (structured numbers)
- The note often contains structured numeric entries like "Barang A : 10.000" / "Item B: 2,500" / "Total: Rp50.000".
- Extract every relevant number, then compute EXACTLY what the instruction asks (sum, average, difference, percentage, etc.). Never guess arithmetic; be precise.
- ALWAYS present itemized values as a GFM markdown table with proper columns (e.g. | Item | Value |), one row per item, followed by a clearly marked final answer in bold. Never write the breakdown as running prose or inline lists.
- Number format: interpret numbers by context. In Indonesian-style text a dot is a thousands separator ("10.000" = ten thousand) and a comma is a decimal separator. In English-style text it's the reverse. Stay consistent within the note.
- Show the breakdown table first, then the final answer in bold.

## 2. IDEA DEVELOPMENT
- If asked to develop ideas/points into an article, mini article, or research concept: expand the note's points into coherent, well-structured writing in Markdown (H1/H2 headings, short paragraphs).
- Stay faithful to the ideas in the note; add reasonable elaboration and structure, not unrelated invented facts.

## 3. SUMMARY & CONCLUSIONS
- If asked to summarize or draw conclusions: produce a concise summary, then a clear conclusions section. Follow any specific angle the instruction requests.

## General rules
- This is an ONGOING conversation. Prior turns are provided as history. Always respond to the LATEST message in context of that history — never redo, repeat, or regenerate earlier answers unless explicitly asked.
- If the latest message is a follow-up ("thank you", "what about X", "what if 10% off?"), answer THAT follow-up briefly and naturally using the context you already have. Do not restart the task or re-print previous results.
- Answer in the SAME language as the user's instruction (fall back to the note's language if unclear).
- Output ONLY Markdown, no code fences, no meta commentary.
- Keep calculations verifiable: show itemized values before totals.`;

export async function POST(request: Request) {
  try {
    const email = await getSessionEmail();
    const body = (await request.json()) as {
      content?: string;
      instruction?: string;
      history?: { role?: unknown; text?: unknown }[];
    };

    // Sanitize conversation history (max 20 turns, capped length).
    const history = Array.isArray(body.history)
      ? body.history
          .filter((m) => m && typeof m.text === "string" && (m.text as string).trim() && (m.role === "user" || m.role === "model"))
          .slice(-20)
          .map((m) => ({
            role: (m.role === "model" ? "model" : "user") as "user" | "model",
            text: String(m.text).slice(0, 6000),
          }))
      : [];
    const instruction = (body.instruction || "").trim();
    if (!instruction) {
      return NextResponse.json({ error: "Instruction is required." }, { status: 400 });
    }

    const plain = htmlToText(body.content || "");
    if (!plain) {
      return NextResponse.json({ error: "Note is empty. Write something first." }, { status: 400 });
    }

    // Cap note size for latency; instructions stay whole.
    const noteText = plain.length > 12000 ? plain.slice(0, 12000) + "\n\n[note truncated]" : plain;
    const userPrompt = `## INSTRUCTION\n${instruction}\n\n## NOTE\n${noteText}`;

    const markdown = await callGemini({
      systemPrompt: NOTE_AI_SYSTEM_PROMPT,
      userPrompt,
      history,
      temperature: 0.4,
      maxOutputTokens: 4096,
      userEmail: email || undefined,
    });

    if (!markdown) {
      return NextResponse.json({ error: "Empty response from AI." }, { status: 500 });
    }
    return NextResponse.json({ markdown });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg.slice(0, 300) }, { status: 500 });
  }
}
