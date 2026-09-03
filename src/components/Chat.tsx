"use client";

import { useState } from "react";
import { chat, openCase, retryOpenCase } from "@/app/actions";
import type { Case, Recommendation } from "@/components/CaseView";

// Center column — conversation. Ported from docs/reference/mockup-nuevo-caso.html
// (ticket 02). Each successful chat() call hands its recommendation up to
// CaseView (ticket 09) — a null recommendation or a failed call reports
// nothing, per ADR 0005: the panel is left untouched, the failure surfaces
// only in the thread below.

type Message = { kind: "nurse" | "ai"; text: string };

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function Chat({
  case: activeCase,
  onStartCase,
  onDiscardCase,
  onRecommendation,
}: {
  case: Case | null;
  onStartCase: () => void;
  onDiscardCase: () => void;
  onRecommendation: (recommendation: Recommendation | null) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [openingFailed, setOpeningFailed] = useState(false);
  const [ownMessageSent, setOwnMessageSent] = useState(false);
  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const composerDisabled = analyzing || !activeCase;

  // Shared by the opening call and its Reintentar (ticket 13): same typing
  // indicator, composer block, and success/failure bubble, differing only in
  // which action sends the fixed prompt — openCase resets the session first,
  // retryOpenCase does not (ADR 0007: a retry must not reset it a second time).
  const runOpeningTurn = async (call: () => Promise<{ response: string; recommendation: Recommendation | null }>) => {
    setAnalyzing(true);
    try {
      const { response, recommendation } = await call();
      setMessages((prev) => [...prev, { kind: "ai", text: response }]);
      onRecommendation(recommendation);
      setOpeningFailed(false);
    } catch {
      setMessages((prev) => [
        ...prev,
        { kind: "ai", text: "No se pudo obtener una respuesta. Intentá de nuevo." },
      ]);
      setOpeningFailed(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || composerDisabled) return;
    setOwnMessageSent(true);
    setMessages((prev) => [...prev, { kind: "nurse", text }]);
    setInput("");
    setAnalyzing(true);
    try {
      const { response, recommendation } = await chat(text);
      setMessages((prev) => [...prev, { kind: "ai", text: response }]);
      onRecommendation(recommendation);
    } catch {
      setMessages((prev) => [
        ...prev,
        { kind: "ai", text: "No se pudo obtener una respuesta. Intentá de nuevo." },
      ]);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStartCase = () => {
    onStartCase();
    runOpeningTurn(openCase);
  };

  const handleRetryOpening = () => runOpeningTurn(retryOpenCase);

  // Descartar caso (ADR 0006, ticket 14): clears this thread's own state,
  // hands the case-level reset (new number/time, panel clear) up to
  // CaseView, then opens the fresh case exactly like handleStartCase does —
  // reset chained ahead of the initial prompt (ticket 11).
  const handleDiscardCase = () => {
    setDiscardModalOpen(false);
    setMessages([]);
    setOwnMessageSent(false);
    setOpeningFailed(false);
    onDiscardCase();
    runOpeningTurn(openCase);
  };

  return (
    <main className="relative flex min-w-0 flex-1 flex-col border-r border-black/[0.09] bg-[#f5f6f7]">
      {/* Header */}
      <header className="flex flex-none items-start justify-between gap-4 border-b border-dashed border-black/[0.18] px-[30px] pt-[22px] pb-4">
        <div>
          <div className="text-[19px] text-[#7c828c]">
            Casos
            {activeCase && (
              <>
                {" / "}
                <span className="font-bold text-[#262a30]">Caso #{activeCase.number}</span>
              </>
            )}
          </div>
          {activeCase && (
            <div className="mt-1 text-[13px] text-[#7c828c]">
              Iniciado {formatTime(activeCase.startedAt)} · Enf. M. Soto
            </div>
          )}
        </div>
        {activeCase && (
          <div className="flex flex-none items-center gap-3">
            <div className="flex items-center gap-2 whitespace-nowrap rounded-[22px] border border-black/20 bg-[#f7f8f9] px-[15px] py-2 text-[13.5px] font-medium">
              <span className="h-2 w-2 rounded-full bg-[#3f9a4d]" />
              En seguimiento
            </div>
            <button
              onClick={() => setDiscardModalOpen(true)}
              className="text-[13px] font-semibold text-[#7c828c] hover:text-[#262a30]"
            >
              Descartar caso
            </button>
          </div>
        )}
      </header>

      {discardModalOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-[400px] rounded-[14px] border-[1.5px] border-[#262a30] bg-[#fbfbfc] p-6 shadow-[0_12px_34px_rgba(0,0,0,0.25)]">
            <div className="text-[17px] font-bold text-[#262a30]">¿Descartar el caso actual?</div>
            <p className="mt-2 text-[14px] leading-normal text-[#565b63]">
              Se pierde toda la conversación, la recomendación, la nota y la decisión del clínico
              sobre este caso. Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                onClick={() => setDiscardModalOpen(false)}
                className="rounded-[9px] border-[1.5px] border-[#d2d5da] bg-[#f7f8f9] px-4 py-2 font-sans text-[14px] font-semibold text-[#2e3138] hover:bg-[#e9ebee]"
              >
                Cancelar
              </button>
              <button
                onClick={handleDiscardCase}
                className="rounded-[9px] border-[1.5px] border-[#262a30] bg-[#262a30] px-4 py-2 font-sans text-[14px] font-semibold text-[#f5f6f7] hover:bg-black"
              >
                Descartar caso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-[30px] pt-[26px] pb-3">
        {activeCase ? (
          <div className="mx-auto flex max-w-[760px] flex-col gap-5">
            {messages.map((m, i) =>
              m.kind === "nurse" ? <NurseBubble key={i} text={m.text} /> : <AiBubble key={i} text={m.text} />,
            )}
            {analyzing && <TypingIndicator />}
            {openingFailed && !ownMessageSent && !analyzing && (
              <div className="pl-12">
                <button
                  onClick={handleRetryOpening}
                  className="rounded-[9px] border-[1.5px] border-[#262a30] bg-transparent px-4 py-2 font-sans text-[14px] font-semibold text-[#262a30] hover:bg-black/5"
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <button
              onClick={handleStartCase}
              className="flex items-center gap-1.5 rounded-[11px] border-[1.5px] border-[#262a30] bg-[#262a30] px-[26px] py-[14px] font-sans text-[16px] font-semibold text-[#f5f6f7] hover:bg-black"
            >
              Iniciar caso ▸
            </button>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex-none px-[30px] pt-4 pb-[22px]">
        <div className="mx-auto max-w-[760px]">
          <div className="mb-3 flex items-center gap-[9px] rounded-xl border-[1.5px] border-dashed border-black/[0.22] px-4 py-[11px] text-[13.5px] text-[#7c828c]">
            <span className="text-[15px]">⤒</span> Arrastra PDF, informe de ambulancia o analítica para adjuntar
          </div>
          <div className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-[#262a30] bg-[#f7f8f9] py-2 pr-2 pl-[18px]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={composerDisabled}
              placeholder="Describe el estado del paciente…"
              className="min-w-0 flex-1 border-none bg-transparent py-2 font-sans text-[16px] text-[#262a30] outline-none disabled:opacity-50"
            />
            <button className="flex items-center gap-[7px] rounded-[9px] border-none bg-transparent px-3 py-[9px] font-sans text-[14px] text-[#6a6f78] hover:bg-black/5">
              <span className="text-[15px]">🖇</span>Adjuntar
            </button>
            <button
              onClick={handleSend}
              disabled={composerDisabled}
              className="flex items-center gap-1.5 rounded-[11px] border-[1.5px] border-[#262a30] bg-[#262a30] px-[22px] py-[11px] font-sans text-[15px] font-semibold text-[#f5f6f7] hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#262a30]"
            >
              Enviar ▸
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full border-[1.5px] border-[#262a30] bg-[#f7f8f9] text-[11px] font-bold text-[#262a30]">
        AI
      </div>
      <div className="flex items-center gap-[5px] rounded-[4px_16px_16px_16px] border-[1.5px] border-[#262a30] bg-[#fbfbfc] px-[18px] py-4">
        <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#262a30]" />
        <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#262a30] [animation-delay:0.2s]" />
        <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#262a30] [animation-delay:0.4s]" />
      </div>
    </div>
  );
}

function NurseBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] rounded-[16px_16px_4px_16px] border-[1.5px] border-[#d2d5da] bg-[#e7e9ec] px-[18px] py-3.5 text-[16px] leading-normal text-[#2e3138]">
        {text}
      </div>
    </div>
  );
}

function AiBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full border-[1.5px] border-[#262a30] bg-[#f7f8f9] text-[11px] font-bold text-[#262a30]">
        AI
      </div>
      <div className="max-w-[82%] rounded-[4px_16px_16px_16px] border-[1.5px] border-[#262a30] bg-[#fbfbfc] px-[18px] py-[15px] text-[16px] leading-normal text-[#2e3138]">
        {text}
      </div>
    </div>
  );
}
