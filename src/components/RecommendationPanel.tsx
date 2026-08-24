"use client";

import { useEffect, useRef, useState } from "react";

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

export default function RecommendationPanel() {
  const [levelKey, setLevelKey] = useState<ManchesterKey | null>(null);
  const [overridden, setOverridden] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => clearTimeout(toastTimeout.current);
  }, []);

  const level = levelKey ? LEVELS[levelKey] : null;

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
    showToast(`Nivel anulado → ${LEVELS[key].label}`);
  };

  const accept = () => {
    setAccepted(true);
    setOverrideOpen(false);
    showToast(`Triage confirmado · ${level ? level.label : "[nivel]"}`);
  };

  const toggleNote = () => {
    setNoteOpen((open) => !open);
    setOverrideOpen(false);
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
            <div className="text-[21px] font-bold tracking-[-0.01em]">[identidad del paciente]</div>
            <div className="mt-[3px] text-[13px] text-[#7c828c]">[historia · llegada]</div>
          </div>
        </div>
        <div className="flex justify-between gap-3 py-[7px] text-[13.5px]">
          <span className="text-[#7c828c]">Motivo</span>
          <span className="text-right font-bold">[motivo de consulta]</span>
        </div>
        <div className="flex justify-between gap-3 py-[7px] text-[13.5px]">
          <span className="text-[#7c828c]">Antecedentes</span>
          <span className="text-right font-bold">[antecedentes]</span>
        </div>

        {/* Vitals */}
        <div className="mt-[18px] mb-[11px] text-[12px] font-bold tracking-[0.09em] text-[#7c828c]">
          SIGNOS VITALES
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {VITALS.map((v, i) => (
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

        {/* Level card — neutral until override */}
        {level ? (
          <div
            className="flex items-center gap-[15px] rounded-[13px] px-5 py-[17px]"
            style={{ background: level.cardBg, border: `1.5px solid ${level.cardBd}` }}
          >
            <div className="h-[22px] w-[22px] flex-none rounded-full" style={{ background: level.dot }} />
            <div>
              <div className="text-[26px] leading-none font-bold tracking-[0.02em]" style={{ color: level.ink }}>
                {level.label}
              </div>
              <div className="mt-1 text-[14px] text-[#565b63]">{level.sub}</div>
            </div>
            {overridden && (
              <div className="ml-auto text-right text-[11px] leading-[1.3] font-semibold text-[#7c828c]">
                anulado
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

        {/* Confidence */}
        <div className="mt-4 mb-[7px] flex items-center justify-between">
          <span className="text-[13.5px] font-semibold">Confianza</span>
          <span className="font-mono text-[15px] font-bold">[--]%</span>
        </div>
        <div className="relative h-[13px] overflow-hidden rounded-[7px] border border-black/[0.08] bg-[#dcdee3]">
          <div className="h-full w-0 rounded-[7px] bg-[#9aa0aa] transition-[width]" />
          <div className="pointer-events-none absolute inset-0 bg-[image:repeating-linear-gradient(90deg,transparent_0_9.2%,#f5f6f7_9.2%,#f5f6f7_10%)]" />
        </div>

        {/* Reasoning */}
        <div className="mt-5 mb-[9px] text-[12px] font-bold tracking-[0.08em] text-[#565b63]">RAZONAMIENTO CLÍNICO</div>
        <div className="flex flex-col gap-[11px]">
          {REASONING.map((text, i) => (
            <div key={i} className="flex gap-2.5 text-[14.5px] leading-[1.45] text-[#2e3138]">
              <span className="flex-none font-bold text-[#a41f14]">›</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Missing info */}
        <div className="mt-5 mb-[9px] text-[12px] font-bold tracking-[0.08em] text-[#565b63]">INFORMACIÓN FALTANTE</div>
        <div className="flex flex-col gap-[9px]">
          {MISSING.map((text, i) => (
            <div key={i} className="flex gap-2.5 text-[14.5px] leading-[1.45] text-[#2e3138]">
              <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full border-[1.6px] border-[#b98a2a]" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Next steps */}
        <div className="mt-5 mb-[9px] text-[12px] font-bold tracking-[0.08em] text-[#565b63]">PRÓXIMOS PASOS</div>
        <div className="flex flex-col gap-[11px]">
          {NEXT_STEPS.map((text, i) => (
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
            accepted || !level
              ? { background: "#e2e4e8", border: "1.5px solid #b7bcc4", color: "#565b63" }
              : { background: level.aBg, border: `1.5px solid ${level.aBd}`, color: level.aInk }
          }
        >
          {accepted ? `✓ ${level ? level.label : "[nivel]"} confirmado` : `✓ Aceptar ${level ? level.label : "[nivel]"}`}
        </button>
        <div className="flex gap-2.5">
          <button
            onClick={() => {
              setOverrideOpen((open) => !open);
              setNoteOpen(false);
            }}
            className="flex-1 rounded-[11px] border-[1.5px] border-[#d2d5da] bg-[#f7f8f9] py-[13px] text-[14.5px] font-semibold text-[#2e3138] hover:bg-[#e9ebee]"
          >
            ⇄ Anular…
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
