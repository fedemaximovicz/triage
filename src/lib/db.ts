import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

// Local persistence for cases (ADR 0010): one SQLite file through Node's
// built-in node:sqlite, opened on first use. Server-only — import it from
// server actions, never from a client component.

const DB_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DB_DIR, "triage.db");

// The first case in an empty database is #2451. AUTOINCREMENT hands out
// max(sequence, highest id) + 1, so the sequence is seeded one below.
const FIRST_CASE_NUMBER = 2451;

let db: DatabaseSync | null = null;

function openDb(): DatabaseSync {
  mkdirSync(DB_DIR, { recursive: true });
  const database = new DatabaseSync(DB_PATH);
  database.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at  TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'en_curso' CHECK (status IN ('en_curso', 'descartado')),
      nivel_ia    TEXT,
      motivo      TEXT,
      decision    TEXT CHECK (decision IN ('aceptado', 'anulado')),
      nivel_final TEXT,
      nota        TEXT,
      paciente    TEXT,
      updated_at  TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id    INTEGER NOT NULL REFERENCES cases(id),
      kind       TEXT NOT NULL CHECK (kind IN ('nurse', 'ai')),
      text       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    INSERT INTO sqlite_sequence (name, seq)
      SELECT 'cases', ${FIRST_CASE_NUMBER - 1}
      WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'cases');
  `);
  // CREATE TABLE IF NOT EXISTS leaves an older database as it was, so a cases
  // table from before the patient name existed gets the column added here.
  const columns = database.prepare("PRAGMA table_info(cases)").all();
  if (!columns.some((column) => column.name === "paciente")) {
    database.exec("ALTER TABLE cases ADD COLUMN paciente TEXT");
  }
  return database;
}

export function getDb(): DatabaseSync {
  db ??= openDb();
  return db;
}

function inTransaction<T>(work: (database: DatabaseSync) => T): T {
  const database = getDb();
  database.exec("BEGIN");
  try {
    const result = work(database);
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

// Inserts a case in progress and returns what the header shows. When the
// clinician is discarding the current case, it is marked `descartado` first,
// in the same transaction: its messages stay (ADR 0010).
export function insertCase(discardId?: number): { number: number; startedAt: string } {
  const startedAt = new Date().toISOString();
  return inTransaction((database) => {
    if (discardId !== undefined) {
      database
        .prepare("UPDATE cases SET status = 'descartado', updated_at = ? WHERE id = ?")
        .run(startedAt, discardId);
    }
    const result = database
      .prepare("INSERT INTO cases (started_at, updated_at) VALUES (?, ?)")
      .run(startedAt, startedAt);
    return { number: Number(result.lastInsertRowid), startedAt };
  });
}

// Saves what one turn left in the conversation, in order and together, and
// updates the case's last AI level and motivo. A field the turn didn't carry
// leaves the saved value as it was (ADR 0010).
export function saveTurn(
  caseId: number,
  messages: { kind: "nurse" | "ai"; text: string }[],
  recommendation: { nivel?: string; motivo?: string } | null,
): void {
  const now = new Date().toISOString();
  inTransaction((database) => {
    const insert = database.prepare(
      "INSERT INTO messages (case_id, kind, text, created_at) VALUES (?, ?, ?, ?)",
    );
    for (const message of messages) insert.run(caseId, message.kind, message.text, now);
    database
      .prepare(
        "UPDATE cases SET nivel_ia = COALESCE(?, nivel_ia), motivo = COALESCE(?, motivo), updated_at = ? WHERE id = ?",
      )
      .run(recommendation?.nivel ?? null, recommendation?.motivo ?? null, now, caseId);
  });
}

// Saves the clinician's decision on the panel (Aceptar, Anular, Deshacer).
// Both fields are replaced together, null clearing them: the decision and the
// level it fixed are one fact (ADR 0010).
export function saveDecision(
  caseId: number,
  decision: "aceptado" | "anulado" | null,
  nivelFinal: string | null,
): void {
  getDb()
    .prepare("UPDATE cases SET decision = ?, nivel_final = ?, updated_at = ? WHERE id = ?")
    .run(decision, nivelFinal, new Date().toISOString(), caseId);
}

export type OpenCase = {
  id: number;
  startedAt: string;
  nivelIa: string | null;
  motivo: string | null;
  decision: "aceptado" | "anulado" | null;
  nivelFinal: string | null;
  paciente: string | null;
};

// The saved cases that were not discarded, newest first, for Casos abiertos.
// Read-only: no messages, no note (ADR 0010).
export function listOpenCases(): OpenCase[] {
  const rows = getDb()
    .prepare(
      "SELECT id, started_at, nivel_ia, motivo, decision, nivel_final, paciente FROM cases WHERE status = 'en_curso' ORDER BY id DESC",
    )
    .all();
  return rows.map((row) => ({
    id: Number(row.id),
    startedAt: String(row.started_at),
    nivelIa: (row.nivel_ia as string | null) ?? null,
    motivo: (row.motivo as string | null) ?? null,
    decision: (row.decision as OpenCase["decision"]) ?? null,
    nivelFinal: (row.nivel_final as string | null) ?? null,
    paciente: (row.paciente as string | null) ?? null,
  }));
}

// Saves the clinician's note; null is an empty note.
export function saveNote(caseId: number, nota: string | null): void {
  getDb()
    .prepare("UPDATE cases SET nota = ?, updated_at = ? WHERE id = ?")
    .run(nota, new Date().toISOString(), caseId);
}

// Saves the patient's name as the clinician typed it; null is no name.
export function savePatientName(caseId: number, paciente: string | null): void {
  getDb()
    .prepare("UPDATE cases SET paciente = ?, updated_at = ? WHERE id = ?")
    .run(paciente, new Date().toISOString(), caseId);
}
