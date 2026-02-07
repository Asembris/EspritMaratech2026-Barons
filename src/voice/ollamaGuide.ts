import type { PageContext } from "./pageContexts";
import { GUIDE_SYSTEM_PROMPT } from "./guideSystemPrompt";

const OLLAMA_BASE_URL =
  import.meta.env.VITE_OLLAMA_URL || "http://localhost:11434";

function cleanForTTS(text: string): string {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join("\n");
}

function explainError(e: any): string {
  if (e?.name === "AbortError") return "timeout";
  if (typeof e?.message === "string") return e.message;
  if (typeof e === "string") return e;
  return "fetch failed";
}

export async function askGuideLLM(opts: {
  ctx: PageContext;
  question: string;
}): Promise<string> {
  const { ctx, question } = opts;

  const userPrompt =
    `CONTEXTE_DE_PAGE: ${JSON.stringify(ctx)}\n` +
    `QUESTION_UTILISATEUR: "${question}"`;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "phi3:instruct",
        stream: false,
        messages: [
          { role: "system", content: GUIDE_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        options: {
          temperature: 0.2,
          num_predict: 180,
        },
      }),
    });

    // ✅ IMPORTANT: treat non-OK as failure (so caller .catch runs)
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`);
    }

    const data = await res.json().catch(() => null);

    const text =
      data?.message?.content ??
      data?.response ??
      "";

    const cleaned = cleanForTTS(text);

    // If we somehow got an empty answer, treat as failure
    if (!cleaned) {
      throw new Error("empty response");
    }

    return cleaned;
  } catch (e) {
    // ✅ throw so VoiceCommandButton can show "Ollama failed"
    throw new Error(explainError(e));
  } finally {
    window.clearTimeout(timeoutId);
  }
}
