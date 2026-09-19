import { AGENT_IDS, LEDGER_TYPES, type A2AType, type AgentId, type LedgerEvent, type LedgerEventType } from "@/lib/ops/types";
import { isAgentId } from "@/lib/ops/world";

export type A2AEnvelope = {
  v: 1;
  id: string;
  ts: number;
  from: AgentId;
  to: AgentId | "*";
  type: A2AType;
  parentId: string | null;
  correlationId: string;
  spanId: string;
  parentSpan: string | null;
  payload: {
    text: string;
    tool?: string;
    tokens: number;
    model: string;
    latMs: number;
    costUsd?: number;
  };
  ledger: LedgerEvent;
};

export function isLedgerType(v: string): v is LedgerEventType {
  return (LEDGER_TYPES as readonly string[]).includes(v);
}

export function parseLedgerEvent(raw: unknown): LedgerEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.type !== "string" || !isLedgerType(o.type)) return null;
  const agent = typeof o.agent_id === "string" && isAgentId(o.agent_id) ? o.agent_id : null;
  return {
    event_id: typeof o.event_id === "string" ? o.event_id : `evt_${Date.now()}`,
    seq: typeof o.seq === "number" ? o.seq : 0,
    ts: typeof o.ts === "number" ? o.ts : Date.now(),
    request_id: typeof o.request_id === "string" ? o.request_id : "req_live",
    parent_event_id: typeof o.parent_event_id === "string" ? o.parent_event_id : null,
    type: o.type,
    agent_id: agent,
    model: typeof o.model === "string" ? o.model : null,
    tokens_in: typeof o.tokens_in === "number" ? o.tokens_in : 0,
    tokens_out: typeof o.tokens_out === "number" ? o.tokens_out : 0,
    cost_usd: typeof o.cost_usd === "number" ? o.cost_usd : 0,
    latency_ms: typeof o.latency_ms === "number" ? o.latency_ms : 0,
    payload: o.payload && typeof o.payload === "object" ? (o.payload as Record<string, unknown>) : {},
  };
}

function counterparty(e: LedgerEvent): AgentId | "*" {
  const p = e.payload;
  for (const k of ["to_agent", "counterparty", "hired_agent", "executor", "from_agent"]) {
    const v = p[k];
    if (typeof v === "string" && isAgentId(v)) return v;
  }
  if (e.type === "human_directive" || e.type === "spec_drafted") return "buyer";
  if (e.type === "request_received") return "a-delegator";
  if (e.type === "bid_submitted") return "buyer";
  if (e.type.startsWith("judge")) return "a-delegator";
  return "*";
}

export function ledgerToEnvelope(e: LedgerEvent, parentId: string | null): A2AEnvelope {
  const from = e.agent_id && (AGENT_IDS as readonly string[]).includes(e.agent_id) ? e.agent_id : "buyer";
  const to = counterparty(e);
  const toolish = e.type === "check_run" || e.type === "artifact_produced" || e.type.startsWith("escrow");
  return {
    v: 1,
    id: e.event_id,
    ts: e.ts,
    from,
    to,
    type: toolish ? "tool.call" : "message",
    parentId,
    correlationId: e.request_id,
    spanId: e.event_id,
    parentSpan: e.parent_event_id,
    payload: {
      text: formatLedgerLine(e),
      tool: toolish ? e.type : undefined,
      tokens: e.tokens_in + e.tokens_out,
      model: e.model ?? "auto",
      latMs: e.latency_ms,
      costUsd: e.cost_usd,
    },
    ledger: e,
  };
}

export function formatLedgerLine(e: LedgerEvent) {
  const extra = Object.keys(e.payload)
    .slice(0, 3)
    .map((k) => `${k}=${String(e.payload[k]).slice(0, 28)}`)
    .join(" ");
  return `${e.type} ${e.agent_id ?? ""} ${extra}`.trim();
}

export type A2ATransport = {
  source: "sim" | "live";
  start: (onEvent: (e: A2AEnvelope) => void) => () => void;
};
