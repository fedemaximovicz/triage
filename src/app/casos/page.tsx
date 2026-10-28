import Nav from "@/components/Nav";
import { listOpenCases, type OpenCase } from "@/lib/db";
import { LEVELS, type ManchesterKey } from "@/lib/manchester";

// "Casos abiertos" — read-only list of the saved cases that were not discarded
// (ADR 0010, ticket 23). Read on every request, never a build-time snapshot.
export const dynamic = "force-dynamic";

function isLevel(value: string | null): value is ManchesterKey {
  return value !== null && value in LEVELS;
}

function formatStart(startedAt: string): string {
  return new Date(startedAt).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// The clinician's level wins over the AI's (ADR 0005), and the label says which.
function levelOf(row: OpenCase): { key: ManchesterKey | null; source: string } {
  if (row.decision && isLevel(row.nivelFinal)) {
    return { key: row.nivelFinal, source: row.decision === "aceptado" ? "confirmado" : "anulado" };
  }
  if (isLevel(row.nivelIa)) return { key: row.nivelIa, source: "sugerido por IA" };
  return { key: null, source: "" };
}

export default function CasosPage() {
  const cases = listOpenCases();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f5f6f7]">
      <Nav active="casos" />
      <main className="min-w-0 flex-1 overflow-y-auto px-10 py-8">
        <h1 className="text-[24px] font-bold tracking-[-0.01em]">Casos abiertos</h1>

        {cases.length === 0 ? (
          <p className="mt-6 text-[15px] text-[#565b63]">No hay casos guardados.</p>
        ) : (
          <table className="mt-6 w-full border-collapse text-left text-[14.5px]">
            <thead>
              <tr className="border-b border-black/[0.12] text-[12px] font-bold tracking-[0.08em] text-[#7c828c] uppercase">
                <th className="py-2.5 pr-4 font-bold">Caso</th>
                <th className="py-2.5 pr-4 font-bold">Inicio</th>
                <th className="py-2.5 pr-4 font-bold">Nivel</th>
                <th className="py-2.5 font-bold">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((row) => {
                const { key, source } = levelOf(row);
                const level = key ? LEVELS[key] : null;
                return (
                  <tr key={row.id} className="border-b border-black/[0.07] align-top">
                    <td className="py-3 pr-4 font-mono font-bold">#{row.id}</td>
                    <td className="py-3 pr-4 whitespace-nowrap text-[#2e3138]">{formatStart(row.startedAt)}</td>
                    <td className="py-3 pr-4">
                      {level ? (
                        <div className="flex items-center gap-2.5">
                          <span className="h-3.5 w-3.5 flex-none rounded-full" style={{ background: level.dot }} />
                          <span className="font-bold" style={{ color: level.ink }}>
                            {level.label}
                          </span>
                          <span className="text-[12.5px] text-[#7c828c]">{source}</span>
                        </div>
                      ) : (
                        <span className="text-[#7c828c]">sin nivel</span>
                      )}
                    </td>
                    <td className="py-3 text-[#2e3138]">
                      {row.motivo ?? <span className="text-[#7c828c]">sin motivo</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
