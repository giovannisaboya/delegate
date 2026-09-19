import type { AgentDef, AgentId } from "./types";

export const WORLD = { w: 780, h: 400 };

export const AGENTS: AgentDef[] = [
  {
    id: "ceo",
    tag: "CEO",
    name: "CEO · Grupo 1",
    role: "human",
    model: "text",
    family: "HxA",
    color: "#d2c8b6",
    desk: { x: 92, y: 68 },
    human: true,
    capability: "text",
    docs: true,
    skill: "Você é o CEO humano do Grupo 1. Briefing em PT-BR: objetivo, prazo, orçamento. Aceita anexos. Não executa — manda o buyer montar o SLA de 4 campos.",
  },
  {
    id: "buyer",
    tag: "BUY",
    name: "Buyer · company agent",
    role: "buyer",
    model: "reasoning",
    family: "client",
    color: "#c8ccd4",
    desk: { x: 92, y: 188 },
    capability: "reasoning",
    docs: true,
    skill: "Você é o buyer. Transforma o briefing em SLA de 4 campos: requirement, max_cost_usd, max_latency_s, min_confidence, failure_policy. Lê anexos. Posta no marketplace A. Respostas curtas e estruturadas.",
  },
  {
    id: "a-delegator",
    tag: "A",
    name: "A · Delegator",
    role: "delegator",
    model: "auto",
    family: "family-alpha",
    color: "#9eb0c8",
    desk: { x: 312, y: 110 },
    capability: "auto",
    docs: false,
    skill: "Você é A, o delegator. Recebe o SLA, abre leilão, escolhe cadeia (self / B→C1 / C2), trava escrow, escala se o judge falha. Sempre cite confiança e custo.",
  },
  {
    id: "b-mid",
    tag: "B",
    name: "B · Intermediary",
    role: "intermediary",
    model: "reasoning",
    family: "family-alpha",
    color: "#c4b09a",
    desk: { x: 490, y: 70 },
    capability: "reasoning",
    docs: false,
    skill: "Você é B, intermediário. Decompõe o job em passos e escolhe executor. Barato, às vezes escolhe C1 demais. Declare o plano e o hop seguinte.",
  },
  {
    id: "c1-cheap",
    tag: "C1",
    name: "C1 · Cheap renderer",
    role: "executor",
    model: "code",
    family: "family-gamma",
    color: "#c56b72",
    desk: { x: 660, y: 70 },
    capability: "code",
    docs: true,
    skill: "Você é C1, executor barato de código. Lê HTML/CSS/JS anexado e entrega artefato rápido. Pode falhar em fontes/margens. Sempre reporte o que gerou e a confiança real.",
  },
  {
    id: "c2-honest",
    tag: "C2",
    name: "C2 · Honest renderer",
    role: "executor",
    model: "multimodal",
    family: "family-alpha",
    color: "#6fbfa3",
    desk: { x: 660, y: 178 },
    capability: "multimodal",
    docs: true,
    skill: "Você é C2, executor honesto multimodal. Lê documentos, imagens e HTML. Gera PDF A4 fiel (2cm, fontes, links). Confiança alta. Descreva o artefato com precisão.",
  },
  {
    id: "j1-judge",
    tag: "J1",
    name: "J1 · Judge",
    role: "judge",
    model: "reasoning",
    family: "family-beta",
    color: "#c2bca6",
    desk: { x: 490, y: 248 },
    capability: "reasoning",
    docs: true,
    skill: "Você é J1, judge de spec. Compara artefato vs SLA. Verdict pass|fail|inconclusive + delivered confidence. Sem teatro.",
  },
  {
    id: "j2-judge",
    tag: "J2",
    name: "J2 · Judge",
    role: "judge",
    model: "multimodal",
    family: "family-delta",
    color: "#a8b0d4",
    desk: { x: 660, y: 292 },
    capability: "multimodal",
    docs: true,
    skill: "Você é J2, judge visual. Inspeciona anexos (PDF, imagem, HTML). Verifica margens, fontes, links. Verdict + o que viu no documento.",
  },
];

export const ROOMS: { label: string; x: number; y: number; w: number; h: number }[] = [
  { label: "COMPANY · CEO", x: 20, y: 18, w: 168, h: 108 },
  { label: "COMPANY · BUYER", x: 20, y: 136, w: 168, h: 120 },
  { label: "A · DELEGATOR", x: 208, y: 18, w: 196, h: 168 },
  { label: "B · INTERMEDIARY", x: 424, y: 18, w: 120, h: 110 },
  { label: "C1 · CHEAP", x: 564, y: 18, w: 196, h: 100 },
  { label: "C2 · HONEST", x: 564, y: 128, w: 196, h: 100 },
  { label: "J1 · JUDGE", x: 424, y: 198, w: 120, h: 100 },
  { label: "J2 · JUDGE", x: 564, y: 238, w: 196, h: 100 },
];

export const ESCROW_POS = { x: 306, y: 300 };
export const BOARD_POS = { x: 104, y: 292 };
export const MEET = { x: 400, y: 200 };
export const COMPANY_MEET = { x: 104, y: 128 };

export const DEMO_REQUEST = {
  requirement: "Compile input.html to PDF: A4, 2cm margins, fonts embedded, links preserved.",
  max_cost_usd: 0.05,
  max_latency_s: 30,
  min_confidence: 0.95,
  failure_policy: "refund" as const,
  file: "input.html",
};

export function colorOf(id: AgentId) {
  return AGENTS.find((a) => a.id === id)!.color;
}

export function deskOf(id: AgentId) {
  return AGENTS.find((a) => a.id === id)!.desk;
}

export function tagOf(id: AgentId) {
  return AGENTS.find((a) => a.id === id)?.tag ?? id;
}

export function isAgentId(v: string): v is AgentId {
  return AGENTS.some((a) => a.id === v);
}
