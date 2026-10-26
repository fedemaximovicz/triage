"use client";

import { useRef, useState } from "react";
import { chat, startCase as startModelCase } from "@/app/actions";
import Chat from "@/components/Chat";
import Nav from "@/components/Nav";
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

// The case in progress (ADR 0006). null means the app is in its empty state.
// Held here so the conversation and the panel read the same fact.
export type ActiveCase = { number: number; startedAt: Date };
export type Message = { kind: "nurse" | "ai"; text: string };

// In-memory counter: starts over on reload (ADR 0006).
const FIRST_CASE_NUMBER = 2451;

export default function CaseView() {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [activeCase, setActiveCase] = useState<ActiveCase | null>(null);
  const nextCaseNumber = useRef(FIRST_CASE_NUMBER);
  const [messages, setMessages] = useState<Message[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const requestPending = useRef(false);
  const discardDialog = useRef<HTMLDialogElement>(null);

  // Both entry points use the same lifecycle. Guard synchronously against
  // double clicks before React has rendered the disabled controls.
  const startCase = async () => {
    if (requestPending.current) return;
    requestPending.current = true;
    setAnalyzing(true);
    setMessages([]);
    setRecommendation(null);
    setActiveCase({ number: nextCaseNumber.current++, startedAt: new Date() });
    try {
      const result = await startModelCase();
      setMessages([{ kind: "ai", text: result.response }]);
      setRecommendation(result.recommendation);
    } catch {
      setMessages([{ kind: "ai", text: "No se pudo obtener una respuesta. Intentá de nuevo." }]);
    } finally {
      requestPending.current = false;
      setAnalyzing(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!activeCase || !text.trim() || requestPending.current) return;
    requestPending.current = true;
    setAnalyzing(true);
    setMessages((prev) => [...prev, { kind: "nurse", text }]);
    try {
      const result = await chat(text);
      setMessages((prev) => [...prev, { kind: "ai", text: result.response }]);
      setRecommendation(result.recommendation);
    } catch {
      setMessages((prev) => [
        ...prev,
        { kind: "ai", text: "No se pudo obtener una respuesta. Intentá de nuevo." },
      ]);
    } finally {
      requestPending.current = false;
      setAnalyzing(false);
    }
  };

  const handleNewCase = () => {
    if (requestPending.current) return;
    if (activeCase) {
      discardDialog.current?.showModal();
    } else {
      void startCase();
    }
  };

  return (
    <>
      <Nav onNewCase={handleNewCase} disabled={analyzing} />
      <Chat
        key={`chat-${activeCase?.number ?? "empty"}`}
        activeCase={activeCase}
        onStartCase={startCase}
        messages={messages}
        analyzing={analyzing}
        onSend={sendMessage}
      />
      <RecommendationPanel
        key={`recommendation-${activeCase?.number ?? "empty"}`}
        recommendation={recommendation}
        hasCase={activeCase !== null}
      />
      <dialog
        ref={discardDialog}
        aria-labelledby="discard-case-title"
        aria-describedby="discard-case-description"
        className="fixed inset-0 m-auto max-w-md rounded-2xl border border-black/20 bg-[#f5f6f7] p-6 text-[#262a30] shadow-xl backdrop:bg-black/40"
      >
        <h2 id="discard-case-title" className="text-xl font-bold">¿Descartar el caso actual?</h2>
        <p id="discard-case-description" className="mt-3 text-[15px] leading-normal">
          Se perderán la conversación, la recomendación, la decisión de triage y las notas
          del caso #{activeCase?.number}. Se iniciará un caso nuevo.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => discardDialog.current?.close()}
            className="rounded-[9px] border border-black/20 px-4 py-2 font-semibold hover:bg-black/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={analyzing}
            onClick={() => {
              discardDialog.current?.close();
              void startCase();
            }}
            className="rounded-[9px] bg-[#262a30] px-4 py-2 font-semibold text-[#f5f6f7] hover:bg-black disabled:opacity-50"
          >
            Descartar e iniciar caso
          </button>
        </div>
      </dialog>
    </>
  );
}
