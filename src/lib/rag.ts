import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Document, MetadataMode, SentenceSplitter, Settings, VectorStoreIndex } from "llamaindex";
import { OllamaEmbedding } from "@llamaindex/ollama";

// Retrieval over the base de conocimiento (ADR 0009). Server-only: it is not a
// "use server" module, so none of this is callable from the browser.

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
const KNOWLEDGE_EXTENSIONS = [".md", ".txt"];

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_EMBED_MODEL = "bge-m3";

const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 50;
const TOP_K = 3;

// PLACEHOLDER — not calibrated. There are no real protocol documents yet, so
// this number is a guess at a cosine-similarity cut-off for bge-m3. Calibrate
// it against the real base de conocimiento before trusting what it lets through.
const SIMILARITY_THRESHOLD = 0.5;

// Settings in 0.12.1 has no chunkOverlap, so the overlap needs an explicit splitter.
const splitter = new SentenceSplitter({ chunkSize: CHUNK_SIZE, chunkOverlap: CHUNK_OVERLAP });

// Only .md/.txt files directly inside knowledge/ are indexed; anything else is
// ignored. A missing folder is the normal state until the documents exist, so
// it reads as empty rather than as an error. Any other failure (permissions, an
// unreadable file) throws and ends the turn in the error bubble (ADR 0009).
async function readKnowledgeDocuments(): Promise<Document[]> {
  let entries;
  try {
    entries = await readdir(KNOWLEDGE_DIR, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const fileNames = entries
    .filter((entry) => entry.isFile() && KNOWLEDGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort();

  const documents: Document[] = [];
  for (const fileName of fileNames) {
    const text = await readFile(path.join(KNOWLEDGE_DIR, fileName), "utf8");
    if (text.trim()) documents.push(new Document({ text, id_: fileName, metadata: { fileName } }));
  }
  return documents;
}

// Resolves to null when there is nothing to index. Nothing is cached for that
// case, so dropping files into knowledge/ is picked up on the next turn.
async function buildIndex(): Promise<VectorStoreIndex | null> {
  const documents = await readKnowledgeDocuments();
  if (documents.length === 0) {
    console.warn("[rag] knowledge/ is missing or has no .md/.txt files: turns run without RAG.");
    return null;
  }

  const embedModel = new OllamaEmbedding({
    model: process.env.OLLAMA_EMBED_MODEL || DEFAULT_EMBED_MODEL,
    config: { host: process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL },
  });

  // fromDocuments reads the splitter and the embedding model from Settings, and
  // the index keeps the embedding model it was built with for later queries.
  // Scoping them to this call leaves the global Settings alone.
  return Settings.withNodeParser(splitter, () =>
    Settings.withEmbedModel(embedModel, () => VectorStoreIndex.fromDocuments(documents)),
  );
}

// In memory only for now (ticket 18 persists it). The index is shared by every
// case, so Descartar caso never touches it.
let index: VectorStoreIndex | null = null;
let building: Promise<VectorStoreIndex | null> | null = null;

// At most one build in flight: turns that arrive while it runs wait for the
// same promise instead of embedding the corpus again. A failed build caches
// nothing, so the next turn starts again from scratch.
export function getIndex(): Promise<VectorStoreIndex | null> {
  if (index) return Promise.resolve(index);

  building ??= buildIndex()
    .then((built) => {
      index = built;
      return built;
    })
    .finally(() => {
      building = null;
    });
  return building;
}

// The fragments of the base de conocimiento closest to `clinicianText`, best
// first. `clinicianText` must be the clinician's own words — never the
// instructed message, whose JSON instructions would drown them (ADR 0009).
// Empty when there is no index or no fragment passes the threshold; an
// indexing or embedding failure rejects.
export async function retrieveContext(clinicianText: string): Promise<string[]> {
  const knowledge = await getIndex();
  if (!knowledge) return [];

  const results = await knowledge.asRetriever({ similarityTopK: TOP_K }).retrieve({ query: clinicianText });

  return results
    .filter((result) => (result.score ?? 0) >= SIMILARITY_THRESHOLD)
    .map((result) => result.node.getContent(MetadataMode.NONE));
}
