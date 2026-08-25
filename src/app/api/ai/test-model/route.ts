import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { apiKey, model } = (await request.json()) as { apiKey: string; model: string };
    if (!apiKey || !model) return NextResponse.json({ ok: false, error: "Missing apiKey or model" });

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: "Say hello in one word.",
      config: { maxOutputTokens: 20 },
    });
    const text = response.text || "";
    return NextResponse.json({ ok: true, model, response: text.trim() });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = msg.includes("403") || msg.includes("PERMISSION_DENIED") ? 403
      : msg.includes("404") || msg.includes("NOT_FOUND") ? 404
      : msg.includes("400") || msg.includes("INVALID_ARGUMENT") ? 400
      : 500;
    return NextResponse.json({ ok: false, error: msg.slice(0, 300) }, { status });
  }
}
