// Parked, not wired up (ADR 0004). This is ticket 06's LlamaIndex-based chat
// engine, unchanged except for the recommendation contract added in ADR 0003.
// Nothing imports this file — actions.ts calls @google/genai directly instead,
// because @llamaindex/google's Gemini provider can't reach a model this API
// key still supports (see ADR 0004 for the exact crash). This file exists so
// the LlamaIndex path doesn't have to be rebuilt from scratch once Ollama is
// installed and the project reconnects to it, per ADR 0002's original intent.
//
// To bring this back: wire chat/processDocs/resetChatEngine below into
// actions.ts's exports in place of the @google/genai versions. The
// Recommendation contract (ADR 0003) is duplicated here rather than imported
// from actions.ts so this file stays self-contained while parked.

import {
  ContextChatEngine,
  Document,
  Settings,
  SimpleChatEngine,
  VectorStoreIndex,
} from "llamaindex";
import { GEMINI_MODEL, Gemini, GeminiEmbedding } from "@llamaindex/google";

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
    const vitals = obj.signosVitales.filter(isVital);
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

  if (isStringArray(obj.razonamiento)) recommendation.razonamiento = obj.razonamiento;
  if (isStringArray(obj.informacionFaltante)) recommendation.informacionFaltante = obj.informacionFaltante;
  if (isStringArray(obj.proximosPasos)) recommendation.proximosPasos = obj.proximosPasos;

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
3. "nivel" tiene que ser exactamente una de esas cinco palabras en minúscula, o tiene que estar ausente si no podés determinarlo — nunca otro valor.`;
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

// Chunking for the future RAG path. Settings has no chunkOverlap in 0.12.1 (the
// base project set 20); it needs a node parser, deferred to the RAG ticket.
const CHUNK_SIZE = 300;
const SIMILARITY_TOP_K = 2;

let modelsReady = false;

// Lazy rather than module-level (the base project built the LLM at import time):
// a missing key would otherwise throw while the module loads, taking down every
// route instead of just this action.
function ensureModels() {
  if (modelsReady) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY no está definida. Copiá .env.example a .env.local y completá el valor.",
    );
  }

  // The provider defaults to GOOGLE_API_KEY, so the key is passed explicitly —
  // to the embedding too, which has its own separate default.
  Settings.llm = new Gemini({
    model: GEMINI_MODEL.GEMINI_2_5_FLASH_LATEST,
    temperature: 0,
    apiKey,
  });
  Settings.embedModel = new GeminiEmbedding({ apiKey });
  Settings.chunkSize = CHUNK_SIZE;

  modelsReady = true;
}

let chatEngine: ContextChatEngine | null = null;
let simpleEngine: SimpleChatEngine | null = null;

// ContextChatEngine once documents are indexed, SimpleChatEngine before that.
// Both implement BaseChatEngine, so chat() does not care which it gets.
function activeEngine(): ContextChatEngine | SimpleChatEngine {
  if (chatEngine) return chatEngine;
  simpleEngine ??= new SimpleChatEngine({ llm: Settings.llm });
  return simpleEngine;
}

export async function chat(query: string) {
  ensureModels();

  const result = await activeEngine().chat({ message: buildInstructedMessage(query) });
  const content = result.message.content;

  // EngineResponse.response is deprecated in 0.12.1; read the message instead.
  const rawText =
    typeof content === "string"
      ? content
      : content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("");

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
  if (lcDocs.length === 0) return;
  ensureModels();

  const docs = lcDocs.map(
    (lcDoc) => new Document({ text: lcDoc.pageContent, metadata: lcDoc.metadata }),
  );

  // fromDocuments reads the LLM and embed model off Settings — the
  // serviceContext argument the base project passed no longer exists.
  const index = await VectorStoreIndex.fromDocuments(docs);
  const retriever = index.asRetriever({ similarityTopK: SIMILARITY_TOP_K });

  if (chatEngine) await chatEngine.reset();
  chatEngine = new ContextChatEngine({ retriever, chatModel: Settings.llm });
}

export async function resetChatEngine() {
  // reset() returns a promise in 0.12.1; the base project called it synchronously.
  if (chatEngine) await chatEngine.reset();
  if (simpleEngine) await simpleEngine.reset();
}
