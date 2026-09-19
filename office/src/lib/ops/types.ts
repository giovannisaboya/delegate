export const AGENT_IDS = [
  "ceo",
  "buyer",
  "a-delegator",
  "b-mid",
  "c1-cheap",
  "c2-honest",
  "j1-judge",
  "j2-judge",
] as const;
export type AgentId = (typeof AGENT_IDS)[number];
export type AgentRole = "human" | "buyer" | "delegator" | "intermediary" | "executor" | "judge";
export type AgentAction = "idle" | "walk" | "sit" | "type" | "talk" | "think" | "tool";
export type Plane = "office" | "backstage";
export type EscrowStatus = "CREATED" | "LOCKED" | "RELEASED" | "WITHHELD" | "ESCALATED" | "REFUNDED";
export type RequestStatus =
  | "briefing"
  | "received"
  | "auctioning"
  | "contracting"
  | "executing"
  | "verifying"
  | "escalated"
  | "completed"
  | "failed";
export type FailurePolicy = "refund" | "discount" | "accept_flagged";
export type Strategy = "self" | "decompose" | "outsource";
export type Verdict = "pass" | "fail" | "inconclusive";
export type RootCause = "bad_execution" | "bad_selection" | "bad_underwriting" | "spec_ambiguous";
export type A2AType = "message" | "tool.call" | "tool.result" | "broadcast" | "ack";

export const LEDGER_TYPES = [
  "human_directive",
  "spec_drafted",
  "request_received",
  "bid_submitted",
  "counter_offer",
  "auto_selected_by_timeout",
  "plan_generated",
  "plan_validated",
  "plan_rejected",
  "agent_hired",
  "task_delegated",
  "artifact_produced",
  "check_run",
  "judge_verdict",
  "escrow_locked",
  "escrow_released",
  "escrow_withheld",
  "dispute_opened",
  "stake_posted",
  "stake_refunded",
  "stake_forfeited",
  "commission_charged",
  "wallet_updated",
  "escalated",
  "attribution_emitted",
  "axes_updated",
] as const;
export type LedgerEventType = (typeof LEDGER_TYPES)[number];

export type LedgerEvent = {
  event_id: string;
  seq: number;
  ts: number;
  request_id: string;
  parent_event_id: string | null;
  type: LedgerEventType;
  agent_id: AgentId | null;
  model: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  latency_ms: number;
  payload: Record<string, unknown>;
};

export type Bid = {
  bid_id: string;
  agent_id: AgentId;
  confidence: number;
  cost_usd: number;
  latency_s: number;
  chain: string;
  strategy_chosen: Strategy;
  rationale: string;
};

export type AgentDef = {
  id: AgentId;
  tag: string;
  name: string;
  role: AgentRole;
  model: string;
  family: string;
  color: string;
  desk: { x: number; y: number };
  human?: boolean;
  capability: "text" | "reasoning" | "code" | "multimodal" | "auto";
  skill: string;
  docs: boolean;
};

export type AgentBody = {
  id: AgentId;
  x: number;
  y: number;
  facing: number;
  action: AgentAction;
  walkPhase: number;
  bubble: string | null;
};

export type Packet = {
  id: string;
  from: AgentId;
  to: AgentId | "*";
  type: A2AType;
  t: number;
  text: string;
};

export type Attribution = {
  failed_hop: string;
  root_cause: RootCause;
  blamed_agent: AgentId | null;
  explanation: string;
};
