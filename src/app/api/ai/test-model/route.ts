import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { apiKey, model } = (await request.json()) as { apiKey: string; model: string };
    if (!apiKey || !model) return NextResponse.json({ ok: false, error: "Missing apiKey or model" });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Say hello in one word." }] }],
        generationConfig: {
          maxOutputTokens: 50,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string; code?: number } };
      const msg = err.error?.message || `HTTP ${res.status}`;
      const status = msg.includes("403") || msg.includes("PERMISSION_DENIED") ? 403
        : msg.includes("404") || msg.includes("NOT_FOUND") ? 404
        : msg.includes("400") || msg.includes("INVALID_ARGUMENT") ? 400
        : 500;
      return NextResponse.json({ ok: false, error: msg.slice(0, 300) }, { status });
    }

    const data = await res.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    if (!text) return NextResponse.json({ ok: false, model, error: "Empty response from model" });
    return NextResponse.json({ ok: true, model, response: text });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg.slice(0, 300) }, { status: 500 });
  }
}
