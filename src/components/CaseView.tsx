"use client";

import { useState } from "react";
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

export default function CaseView() {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  return (
    <>
      <Chat onRecommendation={setRecommendation} />
      <RecommendationPanel recommendation={recommendation} />
    </>
  );
}
