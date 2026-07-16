import Nav from "@/components/Nav";
import Chat from "@/components/Chat";

// "Nuevo caso" screen — three-column shell (ADR 0001). The left nav is complete
// chrome; the center conversation is built out per ticket 02; the right
// recommendation panel is an empty placeholder filled by later tickets.
export default function Home() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f5f6f7]">
      <Nav />
      <Chat />

      {/* Right — recommendation panel (placeholder) */}
      <aside className="flex w-[clamp(360px,31vw,452px)] flex-none flex-col overflow-hidden bg-[#f5f6f7]" />
    </div>
  );
}
