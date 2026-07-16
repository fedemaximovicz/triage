// Left navigation — static chrome ported from docs/reference/mockup-nuevo-caso.html.
// "Nuevo caso" is the active screen; the other items are visible but inert (no
// routing yet — see ticket 01 and ADR 0001).

export default function Nav() {
  return (
    <nav className="flex w-[clamp(208px,18vw,244px)] flex-none flex-col border-r border-black/[0.09] bg-[#edeef1] px-4 py-[22px]">
      {/* Logo */}
      <div className="flex items-center gap-[11px] px-2 pt-[6px] pb-[26px]">
        <div className="h-0 w-0 border-x-[11px] border-b-[19px] border-x-transparent border-b-[#157f74]" />
        <span className="text-[20px] font-bold tracking-[-0.01em]">TriageAI</span>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-[3px]">
        {/* Inicio */}
        <div className="flex cursor-pointer items-center gap-3 rounded-[9px] px-3 py-2.5 text-[#565b63] hover:bg-black/[0.045]">
          <span className="block h-4 w-4 rounded-[3px] border-[1.6px] border-current" />
          <span className="text-[15px]">Inicio</span>
        </div>

        {/* Casos abiertos */}
        <div className="flex cursor-pointer items-center gap-3 rounded-[9px] px-3 py-2.5 text-[#565b63] hover:bg-black/[0.045]">
          <span className="block h-4 w-4 rounded-[3px] border-[1.6px] border-t-[5px] border-current" />
          <span className="text-[15px]">Casos abiertos</span>
        </div>

        {/* Nuevo caso — active */}
        <div
          aria-current="page"
          className="flex items-center gap-3 rounded-[10px] border border-black/[0.12] bg-[#e2e4e8] px-3 py-[11px] font-semibold text-[#262a30] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          <span className="relative block h-4 w-4">
            <span className="absolute left-[7px] top-px h-3.5 w-0.5 rounded-[2px] bg-current" />
            <span className="absolute left-px top-[7px] h-0.5 w-3.5 rounded-[2px] bg-current" />
          </span>
          <span className="text-[15px]">Nuevo caso</span>
        </div>

        {/* Documentos */}
        <div className="flex cursor-pointer items-center gap-3 rounded-[9px] px-3 py-2.5 text-[#565b63] hover:bg-black/[0.045]">
          <span className="relative block h-4 w-[14px] rounded-[2px] border-[1.6px] border-current">
            <span className="absolute left-0.5 right-0.5 top-1 h-[1.6px] bg-current" />
            <span className="absolute left-0.5 right-0.5 top-2 h-[1.6px] bg-current" />
          </span>
          <span className="text-[15px]">Documentos</span>
        </div>

        {/* Estadísticas */}
        <div className="flex cursor-pointer items-center gap-3 rounded-[9px] px-3 py-2.5 text-[#565b63] hover:bg-black/[0.045]">
          <span className="relative block h-4 w-4 rounded-full border-[1.6px] border-current">
            <span className="absolute left-[7px] top-[3px] h-1.5 w-[1.6px] bg-current" />
            <span className="absolute left-[7px] top-[7px] h-[1.6px] w-[5px] bg-current" />
          </span>
          <span className="text-[15px]">Estadísticas</span>
        </div>
      </div>

      {/* User footer */}
      <div className="mt-auto flex items-center gap-[11px] border-t border-black/[0.08] px-2.5 py-3">
        <div className="h-[34px] w-[34px] flex-none rounded-full border border-black/[0.12] bg-[#d3d6db]" />
        <div className="leading-[1.25]">
          <div className="text-[13.5px] font-semibold">M. Soto</div>
          <div className="text-[11.5px] text-[#7c828c]">Enfermería · Turno tarde</div>
        </div>
      </div>
    </nav>
  );
}
