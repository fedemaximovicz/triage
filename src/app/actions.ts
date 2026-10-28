"use server";

import { SimpleChatEngine, type ChatMessage } from "llamaindex";
import { Ollama } from "@llamaindex/ollama";
import {
  insertCase,
  saveDecision as writeDecision,
  saveNote as writeNote,
  saveTurn,
} from "@/lib/db";
import { retrieveContext, warmIndex } from "@/lib/rag";

// Server-side model access: a local Ollama through LlamaIndex.TS (ADR 0008,
// superseding ADR 0004).
//
// Debt: chatEngine below is a module-level singleton shared by every request
// and every case. Faithful to the base project's shape, wrong once several
// cases are open.

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
2. Al final de tu respuesta agregá siempre un bloque de código que empiece con una línea \`\`\`json y termine con una línea \`\`\`, con esta forma exacta. Omití cualquier campo que no puedas determinar con lo que el clínico escribió — nunca inventes un valor, y nunca inventes la identidad del paciente:
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
3. "nivel" tiene que ser exactamente una de esas cinco palabras en minúscula — nunca otro valor. En cuanto el clínico te haya dado cualquier dato clínico (un síntoma, una edad, un signo vital), incluí siempre "nivel" y "confianza" con tu mejor lectura provisional, aunque sea incierta: es una sugerencia que el clínico confirma, no una decisión. Omití "nivel" sólo si todavía no te dio ningún dato clínico.
4. "confianza" tiene que ser un número entero de 0 a 100 (por ejemplo 85), nunca una fracción de 0 a 1.
5. El bloque \`\`\`json es obligatorio en cada respuesta y va siempre al final, nunca en medio de la prosa ni sin las marcas \`\`\`. Si no sabés el valor de un campo, omitilo: no lo dejes vacío ("" o []) y no copies los valores de ejemplo como "string".`;
}

// The prompt inicial de triage (ADR 0007): sent as the clinician's turn when a
// case starts, and never shown in the thread. Wording is provisional — it is
// tuned against the real model, and a model that answers with a list of
// questions has not met the ticket.
const INITIAL_TRIAGE_PROMPT = `Acaba de empezar un caso de triage nuevo y todavía no sabés nada del paciente. Vas a entrevistar al clínico de a una pregunta por vez. Saludá en una sola frase y hacé UNA sola pregunta, la más útil ahora; nunca una lista ni varias preguntas juntas. En cada respuesta seguí pidiendo lo que todavía falte para el triage, y nunca des la entrevista por terminada. En cuanto el clínico te dé algo útil, completá "nivel" y "confianza" con tu mejor lectura provisional, y corregila cuando el cuadro cambie. Como en todas tus respuestas, cerrá con el bloque \`\`\`json.`;

const JSON_FENCE = /```(?:json)?\s*([\s\S]*?)```/gi;

// Splits the raw model text into the clinician-facing prose and the JSON
// text of the last fenced code block. Without a fence it accepts a bare JSON
// object that runs to the end of the reply, which is how a small model that
// ignores the fence instruction usually writes it (ADR 0003). If neither is
// there, jsonText is null and the caller treats the recommendation as
// unavailable rather than guessing at one.
function extractJsonBlock(text: string): { prose: string; jsonText: string | null } {
  const matches = [...text.matchAll(JSON_FENCE)];
  if (matches.length > 0) {
    const last = matches[matches.length - 1];
    return { prose: text.slice(0, last.index).trim(), jsonText: last[1].trim() };
  }

  // The earliest "{" whose remainder parses is the whole outer object; a stray
  // "{" in the prose never parses to the end of the text.
  for (let i = text.indexOf("{"); i !== -1; i = text.indexOf("{", i + 1)) {
    const candidate = text.slice(i).trim();
    try {
      JSON.parse(candidate);
    } catch {
      continue;
    }
    const prose = text.slice(0, i).replace(/\s*-{3,}\s*$/, "").trim();
    return { prose, jsonText: candidate };
  }
  return { prose: text.trim(), jsonText: null };
}

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.2:3b";
const DEFAULT_NUM_CTX = 8192;

// Ollama truncates silently at num_ctx, and its own default (4096) is too small
// for an interview that carries the full JSON every turn — so it is always set
// explicitly (ADR 0008). A missing or unparseable value falls back to the default.
function numCtx(): number {
  const parsed = Number.parseInt(process.env.OLLAMA_NUM_CTX ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_NUM_CTX;
}

let chatEngine: SimpleChatEngine | null = null;

// Lazy rather than module-level: the env is read when a turn needs the model,
// not while the module loads. Nothing is checked up front — with Ollama stopped
// or the model not pulled, chat() rejects and the UI shows the error bubble.
function activeEngine(): SimpleChatEngine {
  chatEngine ??= new SimpleChatEngine({
    llm: new Ollama({
      model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
      config: { host: process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL },
      options: { temperature: 0, num_ctx: numCtx() },
    }),
  });
  return chatEngine;
}

// The contexto recuperado for one turn (ADR 0009). The model is told it is
// reference material, not ground truth: the clinician's words win.
function buildContextMessage(fragments: string[]): ChatMessage {
  const passages = fragments.map((fragment, i) => `[${i + 1}] ${fragment}`).join("\n\n");
  return {
    role: "system",
    content: `Material de referencia sobre el protocolo de triage Manchester, buscado para este mensaje (no se lo menciones al clínico):

${passages}

Usalo sólo como referencia. Lo que el clínico dijo sobre el paciente tiene prioridad sobre este material, e ignorá los pasajes que no tengan que ver con el caso.`,
  };
}

export async function chat(caseId: number, query: string) {
  // Retrieval uses only the clinician's own text, never the instructed message
  // (ADR 0009), and runs before anything is written to the history so a failed
  // lookup leaves the conversation as it was.
  const fragments = await retrieveContext(query);
  const result = await runTurn(query, fragments);
  // Saved only once the model has answered, both messages together: a failed
  // turn leaves nothing behind. The nurse row holds the clinician's raw text,
  // not the instructed message or the contexto recuperado (ADR 0010).
  saveTurn(
    caseId,
    [
      { kind: "nurse", text: query },
      { kind: "ai", text: result.response },
    ],
    result.recommendation,
  );
  return result;
}

async function runTurn(query: string, fragments: string[]) {
  // SimpleChatEngine.chat() can't take a message for one turn only, so its few
  // steps are done here by hand. The context is added to the list sent with
  // this call but never to memory, so the next turn doesn't resend it and
  // ADR 0008's num_ctx isn't spent on it. No fragments, no message. It goes
  // right before the current user message, not after it: llama3.2 answered a
  // trailing system turn with a stray "assistant" prefix.
  const engine = activeEngine();
  await engine.memory.add({ role: "user", content: buildInstructedMessage(query) });
  const history = await engine.memory.getLLM(engine.llm);
  const messages =
    fragments.length > 0
      ? [...history.slice(0, -1), buildContextMessage(fragments), history[history.length - 1]]
      : history;
  const result = await engine.llm.chat({ messages, stream: false });
  await engine.memory.add(result.message);

  const content = result.message.content;
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

// Iniciar caso (ADR 0006/0007). The reset is awaited before the prompt goes
// out, or the first question of a new case would be answered with the previous
// case in the model's context. No retrieval: the prompt is fixed text, not
// something the clinician wrote, so searching the knowledge base with it would
// only inject unrelated fragments (ADR 0009). The index is warmed alongside the
// turn, not before it: warmIndex() isn't awaited and never rejects, so the
// opening turn doesn't depend on it, and the first clinician turn finds it
// ready or waits for it.
//
// The case row already exists (createCase), so a failed opening turn leaves a
// started case with no messages (ADR 0007). Only the AI's reply is saved; the
// prompt inicial never is (ADR 0010).
export async function startCase(caseId: number) {
  await resetChatEngine();
  warmIndex();
  const result = await runTurn(INITIAL_TRIAGE_PROMPT, []);
  saveTurn(caseId, [{ kind: "ai", text: result.response }], result.recommendation);
  return result;
}

// Creates the case row on the server and returns its number and start time
// (ADR 0010). Separate from startCase so a failed opening turn doesn't lose the
// number the server just assigned. `discardId` is the case being thrown away,
// marked `descartado` before the new one is created.
export async function createCase(discardId?: number) {
  return insertCase(discardId);
}

// Saves the clinician's decision from the panel (ADR 0010). Server actions are
// callable by anyone who can reach the app, so the arguments are checked rather
// than trusted: a decision always comes with one of the five levels, and
// Deshacer sends null for both.
export async function saveDecision(
  caseId: number,
  decision: "aceptado" | "anulado" | null,
  nivel: ManchesterKey | null,
) {
  if (!Number.isInteger(caseId)) throw new Error("Invalid case number");
  if (decision === null) {
    if (nivel !== null) throw new Error("A level needs a decision");
  } else if (
    (decision !== "aceptado" && decision !== "anulado") ||
    nivel === null ||
    !MANCHESTER_KEYS.includes(nivel)
  ) {
    throw new Error("Invalid decision");
  }
  writeDecision(caseId, decision, nivel);
}

// Saves the clinician's note; an empty or blank one is stored as null.
export async function saveNote(caseId: number, note: string) {
  if (!Number.isInteger(caseId) || typeof note !== "string") throw new Error("Invalid note");
  writeNote(caseId, note.trim() === "" ? null : note);
}

export async function resetChatEngine() {
  // Dropping the engine drops its memory: the next turn builds a fresh one.
  chatEngine = null;
}
