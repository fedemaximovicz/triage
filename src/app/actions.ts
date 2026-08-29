"use server";

import {
  ContextChatEngine,
  Document,
  Settings,
  SimpleChatEngine,
  VectorStoreIndex,
} from "llamaindex";
import { GEMINI_MODEL, Gemini, GeminiEmbedding } from "@llamaindex/google";

// Server-side model access. Ported from the base chat-with-pdf project's
// actions.ts, with Gemini in place of Ollama (ADR 0002, ticket 06).
//
// The RAG path (processDocs / VectorStoreIndex / ContextChatEngine) is kept with
// the base project's shape but nothing feeds it yet — until it does, chat() runs
// through a SimpleChatEngine.
//
// Debt: the engines below are module-level singletons shared by every request and
// every case. Faithful to the base project, wrong once several cases are open.

interface LCDoc {
  pageContent: string;
  metadata: Record<string, unknown>;
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

  const result = await activeEngine().chat({ message: query });
  const content = result.message.content;

  // EngineResponse.response is deprecated in 0.12.1; read the message instead.
  const response =
    typeof content === "string"
      ? content
      : content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("");

  return { response };
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
