"use server";

import { GoogleGenAI, type Chat } from "@google/genai";

// Server-side model access, calling @google/genai directly (ADR 0004). The
// LlamaIndex-based version (ADR 0002, ticket 06) is parked, unused, in
// llamaindex-engine.ts for when Ollama is installed — @llamaindex/google's
// Gemini provider can't reach a model this API key still supports (see ADR
// 0004 for the exact crash).
//
// Debt: chatSession below is a module-level singleton shared by every request
// and every case. Faithful to the base project's shape, wrong once several
// cases are open.

interface LCDoc {
  pageContent: string;
  metadata: Record<string, unknown>;
}

// Recommendation contract — ADR 0003. Every field is independently optional:
// the model may omit or botch any of them, and each is validated on its own
// rather than the object being accepted or rejected as a whole.
type ManchesterKey = "rojo" | "naranja" | "amarillo" | "verde" | "azul";

const MANCHESTER_KEYS: readonly ManchesterKey[] = ["rojo", "naranja", "amarillo", "verde", "azul"];

interface Vital {
  label: string;
  value: string;
  unit: string;
}

interface Recommendation {
  motivo?: string;
  antecedentes?: string;
  signosVitales?: Vital[];
  nivel?: ManchesterKey;
  confianza?: number;
  razonamiento?: string[];
  informacionFaltante?: string[];
  proximosPasos?: string[];
}

function isVital(value: unknown): value is Vital {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Vital).label === "string" &&
    typeof (value as Vital).value === "string" &&
    typeof (value as Vital).unit === "string"
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

// Validates a parsed JSON value field by field. Returns null only when `raw`
// itself isn't a usable object at all (ADR 0003: that is the "malformed"
// case); a field that individually fails its check is dropped, not the whole
// object — the caller decides what a missing field falls back to.
function validateRecommendation(raw: unknown): Recommendation | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;
  const recommendation: Recommendation = {};

  if (typeof obj.motivo === "string") recommendation.motivo = obj.motivo;
  if (typeof obj.antecedentes === "string") recommendation.antecedentes = obj.antecedentes;

  if (Array.isArray(obj.signosVitales)) {
    const vitals = obj.signosVitales.filter(isVital).slice(0, 5);
    if (vitals.length > 0) recommendation.signosVitales = vitals;
  }

  // Rejected, not coerced (ADR 0003): a value outside the five Manchester
  // keys is dropped rather than mapped to the nearest one or defaulted.
  if (typeof obj.nivel === "string" && MANCHESTER_KEYS.includes(obj.nivel as ManchesterKey)) {
    recommendation.nivel = obj.nivel as ManchesterKey;
  }

  if (typeof obj.confianza === "number" && Number.isFinite(obj.confianza)) {
    recommendation.confianza = obj.confianza;
  }

  if (isStringArray(obj.razonamiento) && obj.razonamiento.length > 0) {
    recommendation.razonamiento = obj.razonamiento;
  }
  if (isStringArray(obj.informacionFaltante) && obj.informacionFaltante.length > 0) {
    recommendation.informacionFaltante = obj.informacionFaltante;
  }
  if (isStringArray(obj.proximosPasos) && obj.proximosPasos.length > 0) {
    recommendation.proximosPasos = obj.proximosPasos;
  }

  return recommendation;
}

// Appended to every clinician message (ADR 0003): the recommendation is
// recomputed on each turn, so the instruction has to travel with each turn
// too rather than being configured once as a system prompt.
function buildInstructedMessage(query: string): string {
  return `${query}

---
Instrucciones para tu respuesta (no se las menciones al clínico):
1. Respondé primero en prosa, en español, dirigido al clínico, como en cualquier conversación.
2. Al final de tu respuesta agregá un bloque de código \`\`\`json con esta forma exacta. Omití cualquier campo que no puedas determinar con lo que el clínico escribió — nunca inventes un valor, y nunca inventes la identidad del paciente:
{
  "motivo": "string",
  "antecedentes": "string",
  "signosVitales": [{ "label": "string", "value": "string", "unit": "string" }],
  "nivel": "rojo | naranja | amarillo | verde | azul",
  "confianza": 0,
  "razonamiento": ["string"],
  "informacionFaltante": ["string"],
  "proximosPasos": ["string"]
}
3. "nivel" tiene que ser exactamente una de esas cinco palabras en minúscula, o tiene que estar ausente si no podés determinarlo — nunca otro valor.
4. "confianza" tiene que ser un número entero de 0 a 100 (por ejemplo 85), nunca una fracción de 0 a 1.`;
}

const JSON_FENCE = /```(?:json)?\s*([\s\S]*?)```/gi;

// Splits the raw model text into the clinician-facing prose and the JSON
// text of the last fenced code block, if any. No fenced block at all means
// the model didn't follow the instructions — jsonText is null and the caller
// treats the recommendation as unavailable rather than guessing at one.
function extractJsonBlock(text: string): { prose: string; jsonText: string | null } {
  const matches = [...text.matchAll(JSON_FENCE)];
  if (matches.length === 0) return { prose: text.trim(), jsonText: null };

  const last = matches[matches.length - 1];
  return { prose: text.slice(0, last.index).trim(), jsonText: last[1].trim() };
}

// gemini-2.5-flash (ticket 06's original pin) is deprecated for this API key;
// Google's own 404 pointed at this replacement (ADR 0004).
const MODEL = "gemini-3.6-flash";

let ai: GoogleGenAI | null = null;

// Lazy rather than module-level (the base project built the LLM at import time):
// a missing key would otherwise throw while the module loads, taking down every
// route instead of just this action.
function ensureClient(): GoogleGenAI {
  if (ai) return ai;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY no está definida. Copiá .env.example a .env.local y completá el valor.",
    );
  }

  ai = new GoogleGenAI({ apiKey });
  return ai;
}

let chatSession: Chat | null = null;

function activeSession(): Chat {
  chatSession ??= ensureClient().chats.create({ model: MODEL, config: { temperature: 0 } });
  return chatSession;
}

export async function chat(query: string) {
  const result = await activeSession().sendMessage({ message: buildInstructedMessage(query) });
  const rawText = result.text ?? "";

  const { prose, jsonText } = extractJsonBlock(rawText);

  let recommendation: Recommendation | null = null;
  if (jsonText) {
    try {
      recommendation = validateRecommendation(JSON.parse(jsonText));
    } catch {
      // Not valid JSON at all — ADR 0003 treats this the same as no block found.
      recommendation = null;
    }
  }

  return { response: prose, recommendation };
}

export async function processDocs(lcDocs: LCDoc[]) {
  // Not implemented against @google/genai directly (ADR 0004) — RAG was
  // already out of scope (ticket 06/08). The working version lives in
  // llamaindex-engine.ts; wire that back in once Ollama is available.
  void lcDocs;
}

export async function resetChatEngine() {
  chatSession = null;
}
