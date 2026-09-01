"use client";

import { useEffect, useRef, useState } from "react";
import type { Recommendation } from "@/components/CaseView";

// Right column — recommendation panel. Ported from
// docs/reference/mockup-nuevo-caso.html (ticket 04 display, ticket 05
// actions); Anular/Aceptar/+ Nota are pure front-end state, no backend
// (ADR 0001). Manchester colors apply only once the clinician overrides.

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

type ManchesterKey = "rojo" | "naranja" | "amarillo" | "verde" | "azul";

type ManchesterLevel = {
  label: string;
  sub: string;
  ink: string;
  dot: string;
  cardBg: string;
  cardBd: string;
  aBg: string;
  aBd: string;
  aInk: string;
};

const LEVELS: Record<ManchesterKey, ManchesterLevel> = {
  rojo: {
    label: "ROJO",
    sub: "Atención inmediata",
    ink: "#a41f14",
    dot: "#c0271a",
    cardBg: "#fceeeb",
    cardBd: "#e6a89f",
    aBg: "#f6d8d3",
    aBd: "#dca69f",
    aInk: "#8f1d12",
  },
  naranja: {
    label: "NARANJA",
    sub: "Muy urgente",
    ink: "#b0560f",
    dot: "#d06a15",
    cardBg: "#fdf2e8",
    cardBd: "#eec7a3",
    aBg: "#f8e6d3",
    aBd: "#e2be96",
    aInk: "#95490c",
  },
  amarillo: {
    label: "AMARILLO",
    sub: "Urgente",
    ink: "#876706",
    dot: "#c99a0a",
    cardBg: "#fbf6e2",
    cardBd: "#e6d68e",
    aBg: "#f4edcf",
    aBd: "#d9c98a",
    aInk: "#6f5504",
  },
  verde: {
    label: "VERDE",
    sub: "Estándar",
    ink: "#2c7137",
    dot: "#3f9a4d",
    cardBg: "#edf6ee",
    cardBd: "#a9d3af",
    aBg: "#dcefdd",
    aBd: "#a3ceaa",
    aInk: "#215c2a",
  },
  azul: {
    label: "AZUL",
    sub: "No urgente",
    ink: "#2a6493",
    dot: "#3b83bd",
    cardBg: "#eaf3fa",
    cardBd: "#a6c9e5",
    aBg: "#d9eaf6",
    aBd: "#a0c6e3",
    aInk: "#1f5079",
  },
};

const ORDER: ManchesterKey[] = ["rojo", "naranja", "amarillo", "verde", "azul"];

const TOAST_DURATION_MS = 2800;
const ANULAR_CONFIRM_MS = 4000;

// ADR 0005: confianza is interpreted 0–100; a value ≤ 1 is a fraction
// (0.95 → 95%), and exactly 1 is discarded — it's genuinely ambiguous
// between "1%" and "100%", and guessing puts a wrong number on the card.
function normalizeConfianza(value: number | undefined): number | null {
  if (value === undefined || value === 1) return null;
  return Math.round(value <= 1 ? value * 100 : value);
}

export default function RecommendationPanel({ recommendation }: { recommendation: Recommendation | null }) {
  const [levelKey, setLevelKey] = useState<ManchesterKey | null>(null);
  const [overridden, setOverridden] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
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

  // ADR 0005 precedence: once a human decision is in force (Anular or
  // Aceptar), no later AI turn moves the card — it shows `levelKey`, not
  // the AI's `display.nivel`. Before any decision, the card shows the AI's
  // suggestion provisionally. `shownLevelKey` is also what Aceptar fixes
  // when clicked, whichever of the two is currently on screen.
  const aiLevelKey = display.nivel ?? null;
  const humanDecisionActive = overridden || accepted;
  const shownLevelKey = levelKey ?? aiLevelKey;
  const cardLevel = shownLevelKey ? LEVELS[shownLevelKey] : null;
  const isProvisional = !humanDecisionActive && aiLevelKey !== null;
  const aiSuggestsDifferently = humanDecisionActive && aiLevelKey !== null && aiLevelKey !== levelKey;
  const confianzaPct = normalizeConfianza(display.confianza);

  const showToast = (message: string) => {
    setToast(message);
    clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  };

  const pickLevel = (key: ManchesterKey) => {
    setLevelKey(key);
    setOverridden(true);
    setAccepted(false);
    setOverrideOpen(false);
    setAnularConfirmPending(false);
    showToast(`Nivel anulado → ${LEVELS[key].label}`);
  };

  const accept = () => {
    if (!shownLevelKey) return;
    setLevelKey(shownLevelKey);
    setAccepted(true);
    setOverrideOpen(false);
    setAnularConfirmPending(false);
    clearTimeout(anularConfirmTimeout.current);
    showToast(`Triage confirmado · ${LEVELS[shownLevelKey].label}`);
  };

  // Anular is always available (ADR 0005 rejects blocking it after
  // Aceptar), but un-confirming a confirmed triage needs a second click on
  // this same button rather than opening the picker on the first one.
  const handleAnularClick = () => {
    if (overrideOpen) {
      setOverrideOpen(false);
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
    setOverrideOpen(true);
    setNoteOpen(false);
  };

  const toggleNote = () => {
    setNoteOpen((open) => !open);
    setOverrideOpen(false);
  };

  const reiniciarCaso = () => {
    setLevelKey(null);
    setOverridden(false);
    setAccepted(false);
    setOverrideOpen(false);
    setAnularConfirmPending(false);
    clearTimeout(anularConfirmTimeout.current);
    setDisplay({});
  };

  return (
    <aside className="relative flex w-[clamp(360px,31vw,452px)] flex-none flex-col overflow-hidden bg-[#f5f6f7]">
      {toast && (
        <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[#262a30] px-5 py-[11px] text-[13.5px] font-medium whitespace-nowrap text-[#f5f6f7] shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
          {toast}
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-[26px] pt-6 pb-2">
        {/* Patient */}
        <div className="mb-4 flex items-start gap-3.5">
          <div className="h-[52px] w-[52px] flex-none rounded-full border border-black/[0.15] bg-[image:repeating-linear-gradient(135deg,#dcdee2_0_6px,#d3d6db_6px_12px)]" />
          <div className="pt-0.5">
            <div className="text-[21px] font-bold tracking-[-0.01em]">Paciente sin identificar</div>
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
        <div className="grid grid-cols-3 gap-2.5">
          {(display.signosVitales ?? VITALS).map((v, i) => (
            <div key={i} className="rounded-[10px] border-[1.5px] border-[#d2d5da] bg-[#f7f8f9] px-3 py-2.5">
              <div className="mb-[3px] text-[11.5px] text-[#7c828c]">{v.label}</div>
              <div>
                <span className="text-[20px] font-bold">{v.value}</span>{" "}
                <span className="text-[11.5px] text-[#7c828c]">{v.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="my-5 border-t border-dashed border-black/20" />

        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[12px] font-bold tracking-[0.09em] text-[#565b63]">RECOMENDACIÓN IA</span>
          <span className="text-[12px] italic text-[#9aa0aa]">se actualiza en vivo</span>
        </div>

        {/* Level card — AI suggestion shows provisionally until a human
            decision fixes it in full-weight colour (ADR 0005, reverses
            spec Q15b/Q16b) */}
        {cardLevel ? (
          <div
            className="flex items-center gap-[15px] rounded-[13px] px-5 py-[17px]"
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
                  Sugerido por IA · sin confirmar
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
          </div>
        ) : (
          <div className="flex items-center gap-[15px] rounded-[13px] border-[1.5px] border-[#d2d5da] bg-[#eef0f2] px-5 py-[17px]">
            <div className="h-[22px] w-[22px] flex-none rounded-full bg-[#b7bcc4]" />
            <div>
              <div className="text-[26px] leading-none font-bold tracking-[0.02em] text-[#565b63]">[nivel]</div>
              <div className="mt-1 text-[14px] text-[#565b63]">[subtítulo]</div>
            </div>
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

        {/* Confidence — hidden once a human decision is in force (ADR 0005):
            that number is the model's self-report, and showing it next to a
            level a person chose would attribute it to the person. */}
        {!humanDecisionActive && (
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
      <div className="relative flex-none border-t border-black/[0.09] bg-[#f5f6f7] px-[26px] pt-[14px] pb-5">
        {noteOpen && (
          <div className="mb-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota del clínico para este caso…"
              className="h-16 w-full resize-none rounded-[10px] border-[1.5px] border-[#d2d5da] bg-[#fbfbfc] px-3 py-2.5 font-sans text-[14px] text-[#262a30] outline-none"
            />
          </div>
        )}

        {overrideOpen && (
          <div className="absolute right-[26px] bottom-[118px] left-[26px] z-[15] rounded-[13px] border-[1.5px] border-[#262a30] bg-[#fbfbfc] p-2.5 shadow-[0_12px_34px_rgba(0,0,0,0.2)]">
            <div className="px-2 pt-1.5 pb-2 text-[12px] font-bold tracking-[0.06em] text-[#7c828c]">
              ANULAR → SELECCIONA NIVEL MANCHESTER
            </div>
            {ORDER.map((key) => {
              const lv = LEVELS[key];
              return (
                <div
                  key={key}
                  onClick={() => pickLevel(key)}
                  className="flex cursor-pointer items-center gap-3 rounded-[9px] px-2.5 py-2.5 hover:bg-black/5"
                >
                  <span className="h-4 w-4 flex-none rounded-full" style={{ background: lv.dot }} />
                  <span className="w-[82px] text-[15px] font-bold" style={{ color: lv.ink }}>
                    {lv.label}
                  </span>
                  <span className="text-[13px] text-[#7c828c]">{lv.sub}</span>
                </div>
              );
            })}
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
        <button
          onClick={reiniciarCaso}
          className="mt-2.5 w-full text-center text-[12.5px] font-semibold text-[#9aa0aa] hover:text-[#2e3138]"
        >
          ↺ Reiniciar caso
        </button>
      </div>
    </aside>
  );
}
