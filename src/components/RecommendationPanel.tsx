// Right column — recommendation panel. Ported from
// docs/reference/mockup-nuevo-caso.html (ticket 04); display-only with
// placeholder content in every dynamic slot and a neutral level card — no
// Manchester colors until the clinician overrides (ticket 05, ADR 0001).

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

export default function RecommendationPanel() {
  return (
    <aside className="flex w-[clamp(360px,31vw,452px)] flex-none flex-col overflow-hidden bg-[#f5f6f7]">
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

        {/* Level card — neutral until override (ticket 05) */}
        <div className="flex items-center gap-[15px] rounded-[13px] border-[1.5px] border-[#d2d5da] bg-[#eef0f2] px-5 py-[17px]">
          <div className="h-[22px] w-[22px] flex-none rounded-full bg-[#b7bcc4]" />
          <div>
            <div className="text-[26px] leading-none font-bold tracking-[0.02em] text-[#565b63]">[nivel]</div>
            <div className="mt-1 text-[14px] text-[#565b63]">[subtítulo]</div>
          </div>
        </div>

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

      {/* Actions — wired in ticket 05 */}
      <div className="flex-none border-t border-black/[0.09] bg-[#f5f6f7] px-[26px] pt-[14px] pb-5">
        <button className="mb-2.5 w-full rounded-xl border-[1.5px] border-[#b7bcc4] bg-[#e2e4e8] py-[15px] text-[16px] font-bold text-[#565b63]">
          ✓ Aceptar [nivel]
        </button>
        <div className="flex gap-2.5">
          <button className="flex-1 rounded-[11px] border-[1.5px] border-[#d2d5da] bg-[#f7f8f9] py-[13px] text-[14.5px] font-semibold text-[#2e3138]">
            ⇄ Anular…
          </button>
          <button className="flex-1 rounded-[11px] border-[1.5px] border-[#d2d5da] bg-[#f7f8f9] py-[13px] text-[14.5px] font-semibold text-[#2e3138]">
            + Nota
          </button>
        </div>
      </div>
    </aside>
  );
}
