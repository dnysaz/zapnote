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

const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.7-flash"]; // 3.6-flash removed: returns empty

async function callGeminiDirect(apiKey: string, model: string, options: GeminiCallOptions): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: options.systemPrompt }] },
    contents: [{ parts: [{ text: options.userPrompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text.trim();
}

export async function callGemini(options: GeminiCallOptions): Promise<string> {
  const { apiKey, model } = await getSettings();
  if (!apiKey) throw new Error("Gemini API key is not configured. Go to Settings to add it.");

  // Build ordered list: primary model first, then fallbacks (skip duplicates)
  const models = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];

  let lastError = "";
  for (const m of models) {
    try {
      const text = await callGeminiDirect(apiKey, m, options);
      if (text) return text;
      lastError = `${m}: empty response`;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = `${m}: ${msg.slice(0, 120)}`;
      if (msg.includes("API_KEY_INVALID") || msg.includes("PERMISSION_DENIED")) {
        throw new Error("Invalid API key. Please check your Gemini API key in Settings.");
      }
    }
  }
  throw new Error(`All models failed. Last error: ${lastError}`);
}
