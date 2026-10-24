"use client";

import { useRef, useState } from "react";
import Chat from "@/components/Chat";
import RecommendationPanel from "@/components/RecommendationPanel";

// Client wrapper around the conversation and the recommendation panel — they
// share the latest recommendation here (ticket 09) so page.tsx itself can
// stay a Server Component.

// Mirrors the Recommendation contract validated in actions.ts (ADR 0003).
// Duplicated rather than imported: actions.ts is a "use server" module, and
// this is the client-side shape Chat and RecommendationPanel both need.
export type ManchesterKey = "rojo" | "naranja" | "amarillo" | "verde" | "azul";

export type Vital = { label: string; value: string; unit: string };

export type Recommendation = {
  motivo?: string;
  antecedentes?: string;
  signosVitales?: Vital[];
  nivel?: ManchesterKey;
  confianza?: number;
  razonamiento?: string[];
  informacionFaltante?: string[];
  proximosPasos?: string[];
};

// A case's identity: the fact both Chat's header/composer and the panel's
// empty state read to know whether a case is open (ticket 10). `null` means
// no case, matching the app's opening state (ADR 0006).
export type Case = { number: number; startedAt: Date };

// In-memory counter, deliberately reset on reload (ADR 0006) — the real
// number comes from a database row id once one exists.
const FIRST_CASE_NUMBER = 2451;

export default function CaseView() {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const nextCaseNumber = useRef(FIRST_CASE_NUMBER);

  const startCase = () => {
    setActiveCase({ number: nextCaseNumber.current, startedAt: new Date() });
    nextCaseNumber.current += 1;
  };

  // Descartar caso (ADR 0006, ticket 14): throws the current case away and
  // opens the next one in the same act. Clearing `recommendation` here, and
  // keying RecommendationPanel below by case number, is what resets the
  // panel's override/acceptance/note/Anular-picker state — that state is
  // local to RecommendationPanel and has no other way in from here.
  const discardCase = () => {
    setRecommendation(null);
    startCase();
  };

  return (
    <>
      <Chat case={activeCase} onStartCase={startCase} onDiscardCase={discardCase} onRecommendation={setRecommendation} />
      <RecommendationPanel
        key={activeCase?.number ?? "none"}
        recommendation={recommendation}
        hasCase={activeCase !== null}
      />
    </>
  );
}
