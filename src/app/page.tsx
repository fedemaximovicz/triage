import Nav from "@/components/Nav";
import CaseView from "@/components/CaseView";

// "Nuevo caso" screen — three-column shell (ADR 0001). The left nav is complete
// chrome; the center conversation and the right recommendation panel share
// state through CaseView (ticket 09), the only Client Component in the tree.
export default function Home() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f5f6f7]">
      <Nav />
      <CaseView />
    </div>
  );
}
