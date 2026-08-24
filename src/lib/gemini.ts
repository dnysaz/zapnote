const GEMINI_MODELS = (process.env.GEMINI_MODEL || "gemini-2.5-flash,gemini-2.0-flash,gemini-1.5-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const GEMINI_ENDPOINT = (apiKey: string, model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

export function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY || "";
}

export interface GeminiCallOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export async function callGemini(options: GeminiCallOptions): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured. Add it in .env.local");

  let lastError = "";
  let lastStatus = 0;

  for (const model of GEMINI_MODELS) {
    const res = await fetch(GEMINI_ENDPOINT(apiKey, model), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: options.systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: options.userPrompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxOutputTokens ?? 8192,
        },
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
      if (!text.trim()) { lastError = "empty response"; continue; }
      return text.trim();
    }

    const detail = await res.text().catch(() => "");
    lastError = detail.slice(0, 300);
    lastStatus = res.status;
    console.error(`Gemini API error (model: ${model}):`, res.status, lastError);
    if (res.status === 403) break;
    if (res.status === 400) continue;
  }

  if (lastStatus === 403) throw new Error("Google denied access to your Gemini API project (HTTP 403). Generate a new key in Google AI Studio.");
  if (lastError) throw new Error(`AI service error (HTTP ${lastStatus || "n/a"}). ${lastError}`);
  throw new Error("The AI returned an empty response. Please try again.");
}
