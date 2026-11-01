// Manchester triage levels (CONTEXT.md): label, subtitle and colours shared by
// the recommendation panel and the case list.

export type ManchesterKey = "rojo" | "naranja" | "amarillo" | "verde" | "azul";

export type ManchesterLevel = {
  label: string;
  sub: string;
  ink: string;
  dot: string;
  cardBg: string;
  cardBd: string;
  aBg: string;
  aBd: string;
  aInk: string;
};

export const LEVELS: Record<ManchesterKey, ManchesterLevel> = {
  rojo: {
    label: "ROJO",
    sub: "Atención inmediata",
    ink: "#a41f14",
    dot: "#c0271a",
    cardBg: "#fceeeb",
    cardBd: "#e6a89f",
    aBg: "#f6d8d3",
    aBd: "#dca69f",
    aInk: "#8f1d12",
  },
  naranja: {
    label: "NARANJA",
    sub: "Muy urgente",
    ink: "#b0560f",
    dot: "#d06a15",
    cardBg: "#fdf2e8",
    cardBd: "#eec7a3",
    aBg: "#f8e6d3",
    aBd: "#e2be96",
    aInk: "#95490c",
  },
  amarillo: {
    label: "AMARILLO",
    sub: "Urgente",
    ink: "#876706",
    dot: "#c99a0a",
    cardBg: "#fbf6e2",
    cardBd: "#e6d68e",
    aBg: "#f4edcf",
    aBd: "#d9c98a",
    aInk: "#6f5504",
  },
  verde: {
    label: "VERDE",
    sub: "Estándar",
    ink: "#2c7137",
    dot: "#3f9a4d",
    cardBg: "#edf6ee",
    cardBd: "#a9d3af",
    aBg: "#dcefdd",
    aBd: "#a3ceaa",
    aInk: "#215c2a",
  },
  azul: {
    label: "AZUL",
    sub: "No urgente",
    ink: "#2a6493",
    dot: "#3b83bd",
    cardBg: "#eaf3fa",
    cardBd: "#a6c9e5",
    aBg: "#d9eaf6",
    aBd: "#a0c6e3",
    aInk: "#1f5079",
  },
};
