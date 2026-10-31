"use client";

import { useEffect, useRef, useState } from "react";
import { saveDecision, saveNote, savePatientName } from "@/app/actions";
import type { ClinicianData, Recommendation, Vital } from "@/components/CaseView";
import { LEVELS, type ManchesterKey } from "@/lib/manchester";

// Right column — recommendation panel. Ported from
// docs/reference/mockup-nuevo-caso.html (ticket 04 display, ticket 05
// actions). Anular/Aceptar/Deshacer/+ Nota update the panel's own state
// first and are then saved with the case, fire-and-forget (ADR 0010).
// Clicking the level card picks a level without saving it; only Aceptar or
// Anular save a decision. Manchester colors apply only once the clinician overrides.

const REASONING = ["[razonamiento clínico]", "[razonamiento clínico]", "[razonamiento clínico]"];
const MISSING = ["[dato faltante]", "[dato faltante]", "[dato faltante]"];
const NEXT_STEPS = ["[próximo paso]", "[próximo paso]", "[próximo paso]"];

const VITALS: { label: string; value: string; unit: string }[] = [
  { label: "[signo]", value: "[--]", unit: "[ud]" },
  { label: "[signo]", value: "[--]", unit: "[ud]" },
  { label: "[signo]", value: "[--]", unit: "[ud]" },
  { label: "[signo]", value: "[--]", unit: "[ud]" },
  { label: "[signo]", value: "[--]", unit: "[ud]" },
];

const ORDER: ManchesterKey[] = ["rojo", "naranja", "amarillo", "verde", "azul"];

// Matches the server's cap on what the clinician sends with a turn.
const MAX_FIELD_LENGTH = 100;

// The vital being edited below the grid. `editing` is the label of the vital
// being corrected (its label stays fixed), or null for a new one.
type VitalDraft = Vital & { editing: string | null };

// A clinician vital replaces the model's vital with the same label.
function sameLabel(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

const TOAST_DURATION_MS = 2800;
const ANULAR_CONFIRM_MS = 4000;

// ADR 0005: confianza is interpreted 0–100; a value ≤ 1 is a fraction
// (0.95 → 95%), and exactly 1 is discarded — it's genuinely ambiguous
// between "1%" and "100%", and guessing puts a wrong number on the card.
function normalizeConfianza(value: number | undefined): number | null {
  if (value === undefined || value === 1) return null;
  return Math.round(value <= 1 ? value * 100 : value);
}

export default function RecommendationPanel({
  recommendation,
  hasCase,
  caseNumber,
  onClinicianDataChange,
}: {
  recommendation: Recommendation | null;
  hasCase: boolean;
  caseNumber: number | null;
  onClinicianDataChange: (data: ClinicianData) => void;
}) {
  const [levelKey, setLevelKey] = useState<ManchesterKey | null>(null);
  const [overridden, setOverridden] = useState(false);
  const [accepted, setAccepted] = useState(false);
  // Which level picker is open: the one under the card, or Anular's.
  const [picker, setPicker] = useState<"tarjeta" | "anular" | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  // The note text the server last received, so an unchanged note isn't re-sent.
  const lastSavedNote = useRef("");
  const [patientName, setPatientName] = useState("");
  const lastSavedPatientName = useRef("");
  // Vitals the clinician corrected or added. No AI turn overwrites them; the
  // model keeps updating only the ones nobody touched. Not saved with the case.
  const [clinicianVitals, setClinicianVitals] = useState<Vital[]>([]);
  const [vitalDraft, setVitalDraft] = useState<VitalDraft | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Set only for the toast Aceptar/Anular raise, so Deshacer can release
  // whichever of the two just happened — cleared with the toast itself.
  const [toastUndo, setToastUndo] = useState<(() => void) | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Anular after Aceptar needs a second click on the same button (ADR 0005)
  // instead of blocking or a modal — this holds that one-shot confirmation.
  const [anularConfirmPending, setAnularConfirmPending] = useState(false);
  const anularConfirmTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // What the panel is currently showing, reconciled from each turn's
  // recommendation (ADR 0005). Starts empty so every field renders its
  // placeholder until the first valid recommendation arrives.
  const [display, setDisplay] = useState<Recommendation>({});
  // Tracks which `recommendation` prop value `display` was last reconciled
  // from, so the merge below runs once per incoming turn during render
  // (React's "adjusting state when a prop changes" pattern) rather than in
  // an effect, which would cost an extra render for no benefit here.
  const [reconciledFrom, setReconciledFrom] = useState(recommendation);

  useEffect(() => {
    return () => {
      clearTimeout(toastTimeout.current);
      clearTimeout(anularConfirmTimeout.current);
    };
  }, []);

  // Keeps CaseView's copy current so the next turn carries it as context.
  useEffect(() => {
    onClinicianDataChange({ paciente: patientName.trim(), signosVitales: clinicianVitals });
  }, [patientName, clinicianVitals, onClinicianDataChange]);

  // ADR 0005: a valid recommendation replaces every field the panel was
  // showing; a field this turn didn't supply falls back to its placeholder,
  // not the previous turn's value. nivel and confianza are the one
  // exception — they persist together when this turn didn't re-triage.
  // A null recommendation (malformed JSON, or Chat not reporting one on a
  // failed call) leaves `display` untouched.
  if (recommendation !== reconciledFrom) {
    setReconciledFrom(recommendation);
    if (recommendation) {
      const keepLevel = recommendation.nivel === undefined;
      setDisplay({
        ...recommendation,
        nivel: keepLevel ? display.nivel : recommendation.nivel,
        confianza: keepLevel ? display.confianza : recommendation.confianza,
      });
    }
  }

  // ADR 0005 precedence: once the clinician sets a level (picked from the
  // card, or fixed with Anular or Aceptar), no later AI turn moves the card —
  // it shows `levelKey`, not the AI's `display.nivel`. Before that, the card
  // shows the AI's suggestion provisionally. A level picked from the card is
  // provisional too until Aceptar. `shownLevelKey` is what Aceptar fixes
  // when clicked, whichever level is currently on screen.
  const aiLevelKey = display.nivel ?? null;
  const humanDecisionActive = overridden || accepted;
  const humanLevelActive = levelKey !== null;
  const shownLevelKey = levelKey ?? aiLevelKey;
  const cardLevel = shownLevelKey ? LEVELS[shownLevelKey] : null;
  const isProvisional = !humanDecisionActive && shownLevelKey !== null;
  const aiSuggestsDifferently = humanLevelActive && aiLevelKey !== null && aiLevelKey !== levelKey;
  const confianzaPct = normalizeConfianza(display.confianza);

  // The model's vitals, each replaced in place by the clinician's vital with
  // the same label, then the clinician's vitals the model doesn't have.
  const aiVitals = display.signosVitales ?? [];
  const shownVitals = [
    ...aiVitals.map((v) => {
      const own = clinicianVitals.find((c) => sameLabel(c.label, v.label));
      return { vital: own ?? v, byClinician: own !== undefined };
    }),
    ...clinicianVitals
      .filter((c) => !aiVitals.some((v) => sameLabel(v.label, c.label)))
      .map((vital) => ({ vital, byClinician: true })),
  ];

  const showToast = (message: string, undo?: () => void) => {
    setToast(message);
    setToastUndo(() => undo ?? null);
    clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToast(null);
      setToastUndo(null);
    }, TOAST_DURATION_MS);
  };

  // Saves go to the case this panel was mounted for. They never block or undo
  // the panel: a failure is only logged (ADR 0010, ticket 22).
  const persistDecision = (decision: "aceptado" | "anulado" | null, nivel: ManchesterKey | null) => {
    if (caseNumber === null) return;
    saveDecision(caseNumber, decision, nivel).catch((error) =>
      console.error("No se pudo guardar la decisión", error),
    );
  };

  // Called when the clinician leaves the note field or closes it. On failure
  // the text counts as unsent again, so the next blur retries it.
  const persistNote = () => {
    if (caseNumber === null || note === lastSavedNote.current) return;
    const previous = lastSavedNote.current;
    lastSavedNote.current = note;
    saveNote(caseNumber, note).catch((error) => {
      if (lastSavedNote.current === note) lastSavedNote.current = previous;
      console.error("No se pudo guardar la nota", error);
    });
  };

  // Same as the note: saved when the clinician leaves the name field, only
  // if it changed, and retried on the next blur if the save failed.
  const persistPatientName = () => {
    const name = patientName.trim();
    if (caseNumber === null || name === lastSavedPatientName.current) return;
    const previous = lastSavedPatientName.current;
    lastSavedPatientName.current = name;
    savePatientName(caseNumber, name).catch((error) => {
      if (lastSavedPatientName.current === name) lastSavedPatientName.current = previous;
      console.error("No se pudo guardar el nombre del paciente", error);
    });
  };

  // Releases whichever human decision the toast's Deshacer refers to: the
  // level returns to the AI's control and the confidence bar reappears
  // (ADR 0006). Only ever undoes the most recent decision, not a stack.
  const undoDecision = () => {
    persistDecision(null, null);
    setLevelKey(null);
    setOverridden(false);
    setAccepted(false);
    clearTimeout(toastTimeout.current);
    setToast(null);
    setToastUndo(null);
  };

  const pickLevel = (key: ManchesterKey) => {
    persistDecision("anulado", key);
    setLevelKey(key);
    setOverridden(true);
    setAccepted(false);
    setPicker(null);
    setAnularConfirmPending(false);
    showToast(`Nivel anulado → ${LEVELS[key].label}`, undoDecision);
  };

  // Picking from the card only moves the card: nothing is saved until
  // Aceptar. A decision already in force is released, so the saved decision
  // never disagrees with the level on screen.
  const chooseLevel = (key: ManchesterKey) => {
    if (humanDecisionActive) persistDecision(null, null);
    setLevelKey(key);
    setOverridden(false);
    setAccepted(false);
    setPicker(null);
    setAnularConfirmPending(false);
    clearTimeout(anularConfirmTimeout.current);
  };

  // A corrected vital keeps its place in the clinician's list; a new label is
  // appended. Signo and valor are required, unidad isn't.
  const saveVitalDraft = () => {
    if (!vitalDraft) return;
    const vital = {
      label: vitalDraft.label.trim(),
      value: vitalDraft.value.trim(),
      unit: vitalDraft.unit.trim(),
    };
    if (!vital.label || !vital.value) return;
    setClinicianVitals((prev) =>
      prev.some((c) => sameLabel(c.label, vital.label))
        ? prev.map((c) => (sameLabel(c.label, vital.label) ? vital : c))
        : [...prev, vital],
    );
    setVitalDraft(null);
  };

  // Drops the clinician's version; the model's vital, if any, shows again.
  const removeClinicianVital = (label: string) => {
    setClinicianVitals((prev) => prev.filter((c) => !sameLabel(c.label, label)));
    setVitalDraft(null);
  };

  const toggleCardPicker = () => {
    setPicker((open) => (open === "tarjeta" ? null : "tarjeta"));
  };

  const accept = () => {
    if (!shownLevelKey) return;
    persistDecision("aceptado", shownLevelKey);
    setLevelKey(shownLevelKey);
    setAccepted(true);
    setPicker(null);
    setAnularConfirmPending(false);
    clearTimeout(anularConfirmTimeout.current);
    showToast(`Triage confirmado · ${LEVELS[shownLevelKey].label}`, undoDecision);
  };

  // Anular is always available (ADR 0005 rejects blocking it after
  // Aceptar), but un-confirming a confirmed triage needs a second click on
  // this same button rather than opening the picker on the first one.
  const handleAnularClick = () => {
    if (picker === "anular") {
      setPicker(null);
      return;
    }
    if (accepted && !anularConfirmPending) {
      setAnularConfirmPending(true);
      clearTimeout(anularConfirmTimeout.current);
      anularConfirmTimeout.current = setTimeout(() => setAnularConfirmPending(false), ANULAR_CONFIRM_MS);
      return;
    }
    clearTimeout(anularConfirmTimeout.current);
    setAnularConfirmPending(false);
    setPicker("anular");
    setNoteOpen(false);
  };

  const toggleNote = () => {
    if (noteOpen) persistNote();
    setNoteOpen((open) => !open);
    setPicker(null);
  };

  // The handlers are named only inside onClick: passing one in as an argument
  // reads, to the React Compiler, as touching its refs during render.
  const levelOptions = (from: "tarjeta" | "anular") =>
    ORDER.map((key) => {
      const lv = LEVELS[key];
      return (
        <div
          key={key}
          onClick={() => (from === "tarjeta" ? chooseLevel(key) : pickLevel(key))}
          className="flex cursor-pointer items-center gap-3 rounded-[9px] px-2.5 py-2.5 hover:bg-black/5"
        >
          <span className="h-4 w-4 flex-none rounded-full" style={{ background: lv.dot }} />
          <span className="w-[82px] text-[15px] font-bold" style={{ color: lv.ink }}>
            {lv.label}
          </span>
          <span className="text-[13px] text-[#7c828c]">{lv.sub}</span>
        </div>
      );
    });

  return (
    <aside className="relative flex w-[clamp(360px,31vw,452px)] flex-none flex-col overflow-hidden bg-[#f5f6f7]">
      {toast && (
        <div className="absolute top-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#262a30] px-5 py-[11px] text-[13.5px] font-medium whitespace-nowrap text-[#f5f6f7] shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
          <span>{toast}</span>
          {toastUndo && (
            <button onClick={toastUndo} className="font-bold text-[#f5f6f7] underline underline-offset-2">
              Deshacer
            </button>
          )}
        </div>
      )}
      {/* No case yet (ADR 0006): the panel is dimmed behind a message and its
          action buttons are not shown. */}
      {!hasCase && (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-[26px]">
          <div className="rounded-xl bg-[#f5f6f7]/90 px-5 py-3 text-center text-[15px] font-semibold text-[#565b63]">
            Iniciá un caso para ver la recomendación
          </div>
        </div>
      )}
      <div
        className={`flex-1 overflow-y-auto px-[26px] pt-6 pb-2${hasCase ? "" : " pointer-events-none opacity-40 select-none"}`}
        aria-hidden={!hasCase}
      >
        {/* Patient */}
        <div className="mb-4 flex items-start gap-3.5">
          <div className="h-[52px] w-[52px] flex-none rounded-full border border-black/[0.15] bg-[image:repeating-linear-gradient(135deg,#dcdee2_0_6px,#d3d6db_6px_12px)]" />
          <div className="min-w-0 flex-1 pt-0.5">
            <input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              onBlur={persistPatientName}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              placeholder="Paciente sin identificar"
              maxLength={MAX_FIELD_LENGTH}
              aria-label="Nombre del paciente"
              className="-mx-1.5 w-full rounded-md border border-transparent bg-transparent px-1.5 text-[21px] font-bold tracking-[-0.01em] text-[#262a30] outline-none placeholder:text-[#262a30] hover:border-[#d2d5da] focus:border-[#b7bcc4] focus:bg-[#fbfbfc] focus:placeholder:text-[#9aa0aa]"
            />
            <div className="mt-[3px] text-[13px] text-[#7c828c]">Sin datos de admisión</div>
          </div>
        </div>
        <div className="flex justify-between gap-3 py-[7px] text-[13.5px]">
          <span className="flex-none text-[#7c828c]">Motivo</span>
          <span className="min-w-0 flex-1 text-right font-bold">{display.motivo ?? "[motivo de consulta]"}</span>
        </div>
        <div className="flex justify-between gap-3 py-[7px] text-[13.5px]">
          <span className="flex-none text-[#7c828c]">Antecedentes</span>
          <span className="min-w-0 flex-1 text-right font-bold">
            {display.antecedentes ?? "[antecedentes]"}
          </span>
        </div>

        {/* Vitals */}
        <div className="mt-[18px] mb-[11px] flex items-baseline justify-between">
          <span className="text-[12px] font-bold tracking-[0.09em] text-[#7c828c]">SIGNOS VITALES</span>
          <span className="text-[11px] italic text-[#9aa0aa]">leído de la conversación</span>
        </div>
        {/* Click a vital to correct it; placeholders aren't editable, only
            the add card next to them. */}
        <div className="grid grid-cols-3 gap-2.5">
          {shownVitals.length > 0
            ? shownVitals.map(({ vital: v, byClinician }, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setVitalDraft({ ...v, editing: v.label })}
                  className={`cursor-pointer rounded-[10px] border-[1.5px] px-3 py-2.5 text-left hover:bg-[#eef0f2] ${
                    byClinician ? "border-[#157f74] bg-[#f7f8f9]" : "border-[#d2d5da] bg-[#f7f8f9]"
                  }`}
                >
                  <div className="mb-[3px] truncate text-[11.5px] text-[#7c828c]">
                    {v.label}
                    {byClinician && <span className="font-semibold text-[#157f74]"> · clínico</span>}
                  </div>
                  <div className="truncate">
                    <span className="text-[20px] font-bold">{v.value}</span>{" "}
                    <span className="text-[11.5px] text-[#7c828c]">{v.unit}</span>
                  </div>
                </button>
              ))
            : VITALS.map((v, i) => (
                <div key={i} className="rounded-[10px] border-[1.5px] border-[#d2d5da] bg-[#f7f8f9] px-3 py-2.5">
                  <div className="mb-[3px] text-[11.5px] text-[#7c828c]">{v.label}</div>
                  <div>
                    <span className="text-[20px] font-bold">{v.value}</span>{" "}
                    <span className="text-[11.5px] text-[#7c828c]">{v.unit}</span>
                  </div>
                </div>
              ))}
          <button
            type="button"
            onClick={() => setVitalDraft({ label: "", value: "", unit: "", editing: null })}
            className="cursor-pointer rounded-[10px] border-[1.5px] border-dashed border-[#b7bcc4] px-3 py-2.5 text-[13px] font-semibold text-[#565b63] hover:bg-[#eef0f2]"
          >
            + Signo vital
          </button>
        </div>

        {vitalDraft && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveVitalDraft();
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setVitalDraft(null);
            }}
            className="mt-2.5 rounded-[10px] border-[1.5px] border-[#b7bcc4] bg-[#fbfbfc] p-2.5"
          >
            <div className="flex gap-2">
              <input
                value={vitalDraft.label}
                onChange={(e) => setVitalDraft({ ...vitalDraft, label: e.target.value })}
                disabled={vitalDraft.editing !== null}
                autoFocus={vitalDraft.editing === null}
                maxLength={MAX_FIELD_LENGTH}
                placeholder="Signo"
                aria-label="Signo vital"
                className="min-w-0 flex-[2] rounded-md border border-[#d2d5da] bg-white px-2 py-1.5 text-[13.5px] outline-none focus:border-[#7c828c] disabled:bg-[#eef0f2] disabled:text-[#565b63]"
              />
              <input
                value={vitalDraft.value}
                onChange={(e) => setVitalDraft({ ...vitalDraft, value: e.target.value })}
                autoFocus={vitalDraft.editing !== null}
                maxLength={MAX_FIELD_LENGTH}
                placeholder="Valor"
                aria-label="Valor"
                className="min-w-0 flex-[1.5] rounded-md border border-[#d2d5da] bg-white px-2 py-1.5 text-[13.5px] outline-none focus:border-[#7c828c]"
              />
              <input
                value={vitalDraft.unit}
                onChange={(e) => setVitalDraft({ ...vitalDraft, unit: e.target.value })}
                maxLength={MAX_FIELD_LENGTH}
                placeholder="Unidad"
                aria-label="Unidad"
                className="min-w-0 flex-1 rounded-md border border-[#d2d5da] bg-white px-2 py-1.5 text-[13.5px] outline-none focus:border-[#7c828c]"
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              {vitalDraft.editing !== null &&
                clinicianVitals.some((c) => sameLabel(c.label, vitalDraft.label)) && (
                  <button
                    type="button"
                    onClick={() => removeClinicianVital(vitalDraft.label)}
                    className="text-[12.5px] font-semibold text-[#a41f14] hover:underline"
                  >
                    Quitar mi dato
                  </button>
                )}
              <button
                type="button"
                onClick={() => setVitalDraft(null)}
                className="ml-auto rounded-[8px] px-3 py-1.5 text-[13px] font-semibold text-[#565b63] hover:bg-black/5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!vitalDraft.label.trim() || !vitalDraft.value.trim()}
                className="rounded-[8px] bg-[#262a30] px-3 py-1.5 text-[13px] font-semibold text-[#f5f6f7] hover:bg-black disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          </form>
        )}

        <div className="my-5 border-t border-dashed border-black/20" />

        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[12px] font-bold tracking-[0.09em] text-[#565b63]">RECOMENDACIÓN IA</span>
          <span className="text-[12px] italic text-[#9aa0aa]">se actualiza en vivo</span>
        </div>

        {/* Level card — AI suggestion shows provisionally until a human
            decision fixes it in full-weight colour (ADR 0005, reverses
            spec Q15b/Q16b). Clicking it opens the level picker below. */}
        {cardLevel ? (
          <button
            type="button"
            onClick={toggleCardPicker}
            aria-expanded={picker === "tarjeta"}
            className="flex w-full cursor-pointer items-center gap-[15px] rounded-[13px] px-5 py-[17px] text-left hover:brightness-[0.97]"
            style={{
              background: cardLevel.cardBg,
              border: `1.5px ${isProvisional ? "dashed" : "solid"} ${cardLevel.cardBd}`,
            }}
          >
            <div
              className="h-[22px] w-[22px] flex-none rounded-full"
              style={{ background: cardLevel.dot, opacity: isProvisional ? 0.7 : 1 }}
            />
            <div>
              <div
                className="text-[26px] leading-none font-bold tracking-[0.02em]"
                style={{ color: cardLevel.ink, opacity: isProvisional ? 0.85 : 1 }}
              >
                {cardLevel.label}
              </div>
              <div className="mt-1 text-[14px] text-[#565b63]">{cardLevel.sub}</div>
              {isProvisional && (
                <div className="mt-1 text-[11px] font-semibold tracking-[0.04em] text-[#9aa0aa] uppercase">
                  {humanLevelActive ? "Elegido por clínico · sin confirmar" : "Sugerido por IA · sin confirmar"}
                </div>
              )}
            </div>
            {humanDecisionActive && (
              <div className="ml-auto text-right text-[11px] leading-[1.3] font-semibold text-[#7c828c]">
                {accepted ? "confirmado" : "anulado"}
                <br />
                por clínico
              </div>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleCardPicker}
            aria-expanded={picker === "tarjeta"}
            className="flex w-full cursor-pointer items-center gap-[15px] rounded-[13px] border-[1.5px] border-[#d2d5da] bg-[#eef0f2] px-5 py-[17px] text-left hover:bg-[#e6e8eb]"
          >
            <div className="h-[22px] w-[22px] flex-none rounded-full bg-[#b7bcc4]" />
            <div>
              <div className="text-[26px] leading-none font-bold tracking-[0.02em] text-[#565b63]">[nivel]</div>
              <div className="mt-1 text-[14px] text-[#565b63]">[subtítulo]</div>
            </div>
          </button>
        )}

        {picker === "tarjeta" && (
          <div className="mt-2 rounded-[13px] border-[1.5px] border-[#262a30] bg-[#fbfbfc] p-2.5 shadow-[0_12px_34px_rgba(0,0,0,0.2)]">
            <div className="px-2 pt-1.5 pb-2 text-[12px] font-bold tracking-[0.06em] text-[#7c828c]">
              SELECCIONA NIVEL MANCHESTER
            </div>
            {levelOptions("tarjeta")}
          </div>
        )}

        {aiSuggestsDifferently && aiLevelKey && (
          <div className="mt-2 text-[12.5px] text-[#7c828c]">
            IA sugiere:{" "}
            <span className="font-semibold" style={{ color: LEVELS[aiLevelKey].ink }}>
              {LEVELS[aiLevelKey].label}
            </span>
          </div>
        )}

        {/* Confidence — hidden once the clinician set the level (ADR 0005):
            that number is the model's self-report, and showing it next to a
            level a person chose would attribute it to the person. */}
        {!humanLevelActive && (
          <>
            <div className="mt-4 mb-[7px] flex items-center justify-between">
              <span className="text-[13.5px] font-semibold">Confianza</span>
              <span className="font-mono text-[15px] font-bold">
                {confianzaPct !== null ? `${confianzaPct}%` : "[--]%"}
              </span>
            </div>
            <div className="relative h-[13px] overflow-hidden rounded-[7px] border border-black/[0.08] bg-[#dcdee3]">
              <div
                className="h-full rounded-[7px] bg-[#9aa0aa] transition-[width]"
                style={{ width: confianzaPct !== null ? `${confianzaPct}%` : "0%" }}
              />
              <div className="pointer-events-none absolute inset-0 bg-[image:repeating-linear-gradient(90deg,transparent_0_9.2%,#f5f6f7_9.2%,#f5f6f7_10%)]" />
            </div>
          </>
        )}

        {/* Reasoning */}
        <div className="mt-5 mb-[9px] text-[12px] font-bold tracking-[0.08em] text-[#565b63]">RAZONAMIENTO CLÍNICO</div>
        <div className="flex flex-col gap-[11px]">
          {(display.razonamiento ?? REASONING).map((text, i) => (
            <div key={i} className="flex gap-2.5 text-[14.5px] leading-[1.45] text-[#2e3138]">
              <span className="flex-none font-bold text-[#a41f14]">›</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Missing info */}
        <div className="mt-5 mb-[9px] text-[12px] font-bold tracking-[0.08em] text-[#565b63]">INFORMACIÓN FALTANTE</div>
        <div className="flex flex-col gap-[9px]">
          {(display.informacionFaltante ?? MISSING).map((text, i) => (
            <div key={i} className="flex gap-2.5 text-[14.5px] leading-[1.45] text-[#2e3138]">
              <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full border-[1.6px] border-[#b98a2a]" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Next steps */}
        <div className="mt-5 mb-[9px] text-[12px] font-bold tracking-[0.08em] text-[#565b63]">PRÓXIMOS PASOS</div>
        <div className="flex flex-col gap-[11px]">
          {(display.proximosPasos ?? NEXT_STEPS).map((text, i) => (
            <div key={i} className="flex gap-[11px] text-[14.5px] leading-[1.45] text-[#2e3138]">
              <span className="mt-0.5 flex-none font-mono text-[11px] font-bold text-[#7c828c]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div hidden={!hasCase} className="relative flex-none border-t border-black/[0.09] bg-[#f5f6f7] px-[26px] pt-[14px] pb-5">
        {noteOpen && (
          <div className="mb-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={persistNote}
              placeholder="Nota del clínico para este caso…"
              className="h-16 w-full resize-none rounded-[10px] border-[1.5px] border-[#d2d5da] bg-[#fbfbfc] px-3 py-2.5 font-sans text-[14px] text-[#262a30] outline-none"
            />
          </div>
        )}

        {picker === "anular" && (
          <div className="absolute right-[26px] bottom-[118px] left-[26px] z-[15] rounded-[13px] border-[1.5px] border-[#262a30] bg-[#fbfbfc] p-2.5 shadow-[0_12px_34px_rgba(0,0,0,0.2)]">
            <div className="px-2 pt-1.5 pb-2 text-[12px] font-bold tracking-[0.06em] text-[#7c828c]">
              ANULAR → SELECCIONA NIVEL MANCHESTER
            </div>
            {levelOptions("anular")}
          </div>
        )}

        <button
          onClick={accept}
          className="mb-2.5 w-full rounded-xl py-[15px] text-[16px] font-bold"
          style={
            accepted || !cardLevel
              ? { background: "#e2e4e8", border: "1.5px solid #b7bcc4", color: "#565b63" }
              : { background: cardLevel.aBg, border: `1.5px solid ${cardLevel.aBd}`, color: cardLevel.aInk }
          }
        >
          {accepted
            ? `✓ ${cardLevel ? cardLevel.label : "[nivel]"} confirmado`
            : `✓ Aceptar ${cardLevel ? cardLevel.label : "[nivel]"}`}
        </button>
        <div className="flex gap-2.5">
          <button
            onClick={handleAnularClick}
            className="flex-1 rounded-[11px] border-[1.5px] border-[#d2d5da] bg-[#f7f8f9] py-[13px] text-[14.5px] font-semibold text-[#2e3138] hover:bg-[#e9ebee]"
          >
            {anularConfirmPending ? "⇄ ¿Anular triage confirmado?" : "⇄ Anular…"}
          </button>
          <button
            onClick={toggleNote}
            className="flex-1 rounded-[11px] border-[1.5px] border-[#d2d5da] bg-[#f7f8f9] py-[13px] text-[14.5px] font-semibold text-[#2e3138] hover:bg-[#e9ebee]"
          >
            + Nota
          </button>
        </div>
      </div>
    </aside>
  );
}
