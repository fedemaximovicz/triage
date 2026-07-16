import Nav from "@/components/Nav";

// "Nuevo caso" screen — three-column shell (ADR 0001). The left nav is complete
// chrome; the center conversation and right recommendation panel are empty
// placeholders filled by later tickets.
export default function Home() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f5f6f7]">
      <Nav />

      {/* Center — conversation (placeholder) */}
      <main className="relative flex min-w-0 flex-1 flex-col border-r border-black/[0.09] bg-[#f5f6f7]" />

      {/* Right — recommendation panel (placeholder) */}
      <aside className="flex w-[clamp(360px,31vw,452px)] flex-none flex-col overflow-hidden bg-[#f5f6f7]" />
    </div>
  );
}
