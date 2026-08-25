import { GoogleGenAI } from "@google/genai";
import { query } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/settings";

interface SettingsRow { data: Record<string, unknown> }

async function getSettings(): Promise<{ apiKey: string; model: string }> {
  const envKey = process.env.GEMINI_API_KEY || "";
  const envModel = process.env.GEMINI_MODEL || "";
  if (envKey && envModel) return { apiKey: envKey, model: envModel };
  try {
    const rows = await query<SettingsRow>`SELECT data FROM settings WHERE id = 'site' LIMIT 1`;
    const data = rows[0]?.data || {};
    return {
      apiKey: envKey || (typeof data.geminiApiKey === "string" ? data.geminiApiKey : ""),
      model: envModel || (typeof data.geminiModel === "string" ? data.geminiModel : DEFAULT_SETTINGS.geminiModel),
    };
  } catch { /* db not ready */ }
  return { apiKey: envKey, model: envModel || DEFAULT_SETTINGS.geminiModel };
}

export interface GeminiCallOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

const FALLBACK_MODELS = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash"];

export async function callGemini(options: GeminiCallOptions): Promise<string> {
  const { apiKey, model } = await getSettings();
  if (!apiKey) throw new Error("Gemini API key is not configured. Go to Settings to add it.");

  const ai = new GoogleGenAI({ apiKey });

  // Build ordered list: primary model first, then fallbacks (skip duplicates)
  const models = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];

  let lastError: string = "";
  for (const m of models) {
    try {
      const response = await ai.models.generateContent({
        model: m,
        contents: options.userPrompt,
        config: {
          systemInstruction: options.systemPrompt,
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxOutputTokens ?? 8192,
        },
      });
      const text = response.text;
      if (text && text.trim()) return text.trim();
      lastError = `Model ${m} returned empty response`;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = `${m}: ${msg.slice(0, 120)}`;
      // If quota/permission error, try next model; if auth error, stop
      if (msg.includes("API_KEY_INVALID") || msg.includes("PERMISSION_DENIED")) {
        throw new Error(`Invalid API key. Please check your Gemini API key in Settings.`);
      }
    }
  }
  throw new Error(`All models failed. Last error: ${lastError}`);
}
