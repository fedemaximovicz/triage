import Nav from "@/components/Nav";
import Chat from "@/components/Chat";
import RecommendationPanel from "@/components/RecommendationPanel";

// "Nuevo caso" screen — three-column shell (ADR 0001). The left nav is complete
// chrome; the center conversation is built out per ticket 02; the right
// recommendation panel renders placeholder content per ticket 04 (actions are
// wired in ticket 05).
export default function Home() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f5f6f7]">
      <Nav />
      <Chat />
      <RecommendationPanel />
    </div>
  );
}
