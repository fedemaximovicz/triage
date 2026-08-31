"use client";

import { useEffect, useState } from "react";
import { chat, resetChatEngine } from "@/app/actions";

// Center column — conversation. Ported from docs/reference/mockup-nuevo-caso.html
// (ticket 02); the canned AI reply does not update the recommendation panel
// (ADR 0001, ticket 03).

type Message = { kind: "nurse" | "ai"; text: string };

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  // A reload resets this component's state but not the server's module-level
  // chat engine (ticket 07) — reset it explicitly so the model's memory can't
  // outlive the thread the clinician sees.
  useEffect(() => {
    resetChatEngine();
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || analyzing) return;
    setMessages((prev) => [...prev, { kind: "nurse", text }]);
    setInput("");
    setAnalyzing(true);
    try {
      const { response } = await chat(text);
      setMessages((prev) => [...prev, { kind: "ai", text: response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { kind: "ai", text: "No se pudo obtener una respuesta. Intentá de nuevo." },
      ]);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <main className="relative flex min-w-0 flex-1 flex-col border-r border-black/[0.09] bg-[#f5f6f7]">
      {/* Header */}
      <header className="flex flex-none items-start justify-between gap-4 border-b border-dashed border-black/[0.18] px-[30px] pt-[22px] pb-4">
        <div>
          <div className="text-[19px] text-[#7c828c]">
            Casos / <span className="font-bold text-[#262a30]">Caso #2451 · Nuevo</span>
          </div>
          <div className="mt-1 text-[13px] text-[#7c828c]">Iniciado 14:33 · Enf. M. Soto</div>
        </div>
        <div className="flex flex-none items-center gap-2 whitespace-nowrap rounded-[22px] border border-black/20 bg-[#f7f8f9] px-[15px] py-2 text-[13.5px] font-medium">
          <span className="h-2 w-2 rounded-full bg-[#3f9a4d]" />
          En seguimiento
        </div>
      </header>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-[30px] pt-[26px] pb-3">
        <div className="mx-auto flex max-w-[760px] flex-col gap-5">
          {messages.map((m, i) =>
            m.kind === "nurse" ? <NurseBubble key={i} text={m.text} /> : <AiBubble key={i} text={m.text} />,
          )}
          {analyzing && <TypingIndicator />}
        </div>
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
              disabled={analyzing}
              placeholder="Describe el estado del paciente…"
              className="min-w-0 flex-1 border-none bg-transparent py-2 font-sans text-[16px] text-[#262a30] outline-none disabled:opacity-50"
            />
            <button className="flex items-center gap-[7px] rounded-[9px] border-none bg-transparent px-3 py-[9px] font-sans text-[14px] text-[#6a6f78] hover:bg-black/5">
              <span className="text-[15px]">🖇</span>Adjuntar
            </button>
            <button
              onClick={handleSend}
              disabled={analyzing}
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
