import { query, type AdminRow } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { decrypt } from "@/lib/encryption";

async function getUserApiKey(email: string): Promise<{ apiKey: string; model: string }> {
  try {
    const rows = await query<AdminRow>`SELECT encrypted_gemini_key, gemini_model FROM admins WHERE email = ${email} LIMIT 1`;
    const row = rows[0];
    if (row?.encrypted_gemini_key) {
      try {
        return {
          apiKey: decrypt(row.encrypted_gemini_key),
          model: row.gemini_model || DEFAULT_SETTINGS.geminiModel,
        };
      } catch {
        // Decryption failed — key may be corrupted
      }
    }
  } catch { /* db not ready */ }
  return { apiKey: "", model: DEFAULT_SETTINGS.geminiModel };
}

export interface GeminiCallOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Prior conversation turns for multi-turn chat (oldest first). */
  history?: { role: "user" | "model"; text: string }[];
  /** User email for per-user API key lookup. */
  userEmail?: string;
}

const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.7-flash"]; // 3.6-flash removed: returns empty

async function callGeminiDirect(apiKey: string, model: string, options: GeminiCallOptions): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: options.systemPrompt }] },
    contents: [
      ...(options.history ?? []).map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      { role: "user", parts: [{ text: options.userPrompt }] },
    ],
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
  // Try per-user key first (BYOK), then fall back to env var
  let apiKey = "";
  let model = options.userEmail ? (await getUserApiKey(options.userEmail)).model : DEFAULT_SETTINGS.geminiModel;

  if (options.userEmail) {
    const userCreds = await getUserApiKey(options.userEmail);
    if (userCreds.apiKey) {
      apiKey = userCreds.apiKey;
      model = userCreds.model;
    }
  }

  if (!apiKey) {
    apiKey = process.env.GEMINI_API_KEY || "";
    model = process.env.GEMINI_MODEL || model;
  }

  if (!apiKey) throw new Error("Gemini API key is not configured. Go to Settings to add your own API key.");

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
