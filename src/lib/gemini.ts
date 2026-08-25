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

export async function callGemini(options: GeminiCallOptions): Promise<string> {
  const { apiKey, model } = await getSettings();
  if (!apiKey) throw new Error("Gemini API key is not configured. Go to Settings to add it.");

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
    contents: options.userPrompt,
    config: {
      systemInstruction: options.systemPrompt,
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
    },
  });

  const text = response.text;
  if (!text || !text.trim()) {
    throw new Error("The AI returned an empty response. Please try again.");
  }
  return text.trim();
}
