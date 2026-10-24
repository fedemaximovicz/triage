import { createHash } from "node:crypto";
import { readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  Document,
  MetadataMode,
  SentenceSplitter,
  Settings,
  storageContextFromDefaults,
  VectorStoreIndex,
} from "llamaindex";
import { OllamaEmbedding } from "@llamaindex/ollama";

// Retrieval over the base de conocimiento (ADR 0009). Server-only: it is not a
// "use server" module, so none of this is callable from the browser.

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
const KNOWLEDGE_EXTENSIONS = [".md", ".txt"];

// The persisted index (ADR 0009). A build goes into STAGING_DIR and replaces
// INDEX_DIR only once it has fully succeeded; HASH_FILE inside it is written
// last and says which knowledge/ and embedding model the index was built from.
const INDEX_DIR = path.join(process.cwd(), ".rag-index");
const STAGING_DIR = path.join(process.cwd(), ".rag-index.tmp");
const HASH_FILE = "knowledge.hash";

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

function embedModelName(): string {
  return process.env.OLLAMA_EMBED_MODEL || DEFAULT_EMBED_MODEL;
}

// Only .md/.txt files directly inside knowledge/ are indexed; anything else is
// ignored. A missing folder is the normal state until the documents exist, so
// it reads as empty rather than as an error. Any other failure (permissions, an
// unreadable file) throws and ends the turn in the error bubble (ADR 0009).
//
// `hash` identifies what the index is built from: the contents of the indexed
// files (not their modification times, which are unreliable) and the embedding
// model, since vectors from different models can't be compared. Chunk size and
// overlap are not in it: changing those constants means deleting .rag-index/.
async function readKnowledgeDocuments(): Promise<{ documents: Document[]; hash: string }> {
  let entries;
  try {
    entries = await readdir(KNOWLEDGE_DIR, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { documents: [], hash: "" };
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

  const hash = createHash("sha256")
    .update(JSON.stringify([embedModelName(), documents.map((document) => [document.id_, document.text])]))
    .digest("hex");
  return { documents, hash };
}

// The index saved in INDEX_DIR, when it was built from exactly this knowledge/
// and embedding model; null when there is none or it is stale. A saved index that
// can't be read back is treated as stale rather than as a failure: the build
// that follows replaces it.
async function loadSavedIndex(hash: string, embedModel: OllamaEmbedding): Promise<VectorStoreIndex | null> {
  let savedHash: string;
  try {
    savedHash = await readFile(path.join(INDEX_DIR, HASH_FILE), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  if (savedHash !== hash) return null;

  try {
    // Loading embeds nothing. The model is scoped here because the index keeps
    // the one in Settings at construction to embed later queries.
    return await Settings.withEmbedModel(embedModel, async () => {
      const storageContext = await storageContextFromDefaults({ persistDir: INDEX_DIR });
      return VectorStoreIndex.init({ storageContext });
    });
  } catch (error) {
    console.warn("[rag] the saved index could not be read, rebuilding it:", error);
    return null;
  }
}

// Resolves to null when there is nothing to index. Nothing is cached for that
// case, so dropping files into knowledge/ is picked up on the next turn. A stale
// INDEX_DIR is left alone in that case; it is simply not loaded.
async function openIndex(): Promise<VectorStoreIndex | null> {
  const { documents, hash } = await readKnowledgeDocuments();
  if (documents.length === 0) {
    console.warn("[rag] knowledge/ is missing or has no .md/.txt files: turns run without RAG.");
    return null;
  }

  const embedModel = new OllamaEmbedding({
    model: embedModelName(),
    config: { host: process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL },
  });

  const saved = await loadSavedIndex(hash, embedModel);
  if (saved) return saved;

  // The stores write to disk as they are filled, so a build that dies midway
  // leaves its debris in STAGING_DIR only, never in INDEX_DIR. A leftover from a
  // crashed build is cleared first so it can't be loaded back into this one.
  await rm(STAGING_DIR, { recursive: true, force: true });
  try {
    // fromDocuments reads the splitter and the embedding model from Settings, and
    // the index keeps the embedding model it was built with for later queries.
    // Scoping them to this call leaves the global Settings alone. The storage
    // context reads the embedding model from Settings too, so it is made inside.
    const built = await Settings.withNodeParser(splitter, () =>
      Settings.withEmbedModel(embedModel, async () => {
        const storageContext = await storageContextFromDefaults({ persistDir: STAGING_DIR });
        return VectorStoreIndex.fromDocuments(documents, { storageContext });
      }),
    );

    await writeFile(path.join(STAGING_DIR, HASH_FILE), hash);

    // Not atomic: dropping the hash file first means a crash between the two
    // steps below leaves a directory nobody trusts, and the next build replaces it.
    await rm(path.join(INDEX_DIR, HASH_FILE), { force: true });
    await rm(INDEX_DIR, { recursive: true, force: true });
    await rename(STAGING_DIR, INDEX_DIR);
    return built;
  } catch (error) {
    await rm(STAGING_DIR, { recursive: true, force: true });
    throw error;
  }
}

// Kept in memory once opened, backed by INDEX_DIR across restarts. The index is
// shared by every case, so Descartar caso never touches it.
let index: VectorStoreIndex | null = null;
let building: Promise<VectorStoreIndex | null> | null = null;

// At most one load or build in flight: turns that arrive while it runs wait for
// the same promise instead of embedding the corpus again. A failure caches
// nothing, so the next turn starts again from scratch.
export function getIndex(): Promise<VectorStoreIndex | null> {
  if (index) return Promise.resolve(index);

  building ??= openIndex()
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
