import { query } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/settings";

const GEMINI_ENDPOINT = (apiKey: string, model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

interface SettingsRow { data: Record<string, unknown> }

async function getSettings(): Promise<{ apiKey: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const model = process.env.GEMINI_MODEL || "";
  if (apiKey && model) return { apiKey, model };
  try {
    const rows = await query<SettingsRow>`SELECT data FROM settings WHERE id = 'site' LIMIT 1`;
    const data = rows[0]?.data || {};
    return {
      apiKey: apiKey || (typeof data.geminiApiKey === "string" ? data.geminiApiKey : ""),
      model: model || (typeof data.geminiModel === "string" ? data.geminiModel : DEFAULT_SETTINGS.geminiModel),
    };
  } catch { /* db not ready */ }
  return { apiKey, model: model || DEFAULT_SETTINGS.geminiModel };
}

export interface GeminiCallOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export async function callGemini(options: GeminiCallOptions): Promise<string> {
  const { apiKey, model } = await getSettings();
  if (!apiKey) throw new Error("Gemini API key is not configured. Go to Settings to add it.");

  const models = [model, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"].filter((m, i, a) => a.indexOf(m) === i);
  let lastError = "";
  let lastStatus = 0;

  for (const model of models) {
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
