import type { AgentId, LedgerEvent, LedgerEventType } from "@/lib/ops/types";

export type Beat = {
  type: LedgerEventType;
  from: AgentId;
  to: AgentId | "*";
  text: string;
  model?: string;
  cost?: number;
  lat?: number;
  tokens?: number;
  holdMs?: number;
  payload?: Record<string, unknown>;
};

function briefing(learned: boolean): Beat[] {
  if (learned) {
    return [
      {
        type: "human_directive",
        from: "ceo",
        to: "buyer",
        holdMs: 3800,
        text: "Mesmo job. O mercado já aprendeu a não contratar B?",
      },
      {
        type: "spec_drafted",
        from: "buyer",
        to: "ceo",
        holdMs: 3400,
        text: "Trust A↔B = 0. SLA igual: $0.05 · 30s · 0.95 · refund.",
      },
      {
        type: "human_directive",
        from: "ceo",
        to: "buyer",
        holdMs: 3200,
        text: "Autorizado. Posta. Eu não escolho o modelo.",
      },
    ];
  }
  return [
    {
      type: "human_directive",
      from: "ceo",
      to: "buyer",
      holdMs: 4200,
      text: "Preciso do relatório em PDF. A4, 2cm, fontes embutidas, links intactos.",
    },
    {
      type: "spec_drafted",
      from: "buyer",
      to: "ceo",
      holdMs: 4000,
      text: "SLA de 4 campos: teto $0.05, 30s, confiança ≥ 0.95, refund se falhar.",
    },
    {
      type: "human_directive",
      from: "ceo",
      to: "buyer",
      holdMs: 3600,
      text: "Não escolho modelo. Compra o SLA. Autorizo o marketplace.",
    },
    {
      type: "spec_drafted",
      from: "buyer",
      to: "ceo",
      holdMs: 2800,
      text: "Draft fechado. Acionando o marketplace.",
    },
  ];
}

/** Cycle 0 = CEO briefing then README demo. Cycle 1 = briefing + learned trust. */
export function cycleBeats(n: number): Beat[] {
  const learned = n % 2 === 1;
  const req = {
    requirement: "Compile input.html to PDF: A4, 2cm margins, fonts embedded, links preserved.",
    max_cost_usd: 0.05,
    max_latency_s: 30,
    min_confidence: 0.95,
    failure_policy: "refund",
  };
  const open: Beat[] = [
    ...briefing(learned),
    {
      type: "request_received",
      from: "buyer",
      to: "a-delegator",
      holdMs: 2400,
      text: "4-field SLA posted",
      payload: req,
    },
    {
      type: "bid_submitted",
      from: "a-delegator",
      to: "buyer",
      holdMs: 2200,
      text: learned ? "bid 96% $0.021 A→C2" : "bid 96% $0.021 A→B→C1",
      cost: 0.021,
      payload: {
        confidence: 0.96,
        cost_usd: 0.021,
        latency_s: 18,
        chain: learned ? "A→C2" : "A→B→C1",
        strategy_chosen: learned ? "outsource" : "decompose",
      },
    },
    {
      type: "bid_submitted",
      from: "c2-honest",
      to: "buyer",
      holdMs: 2000,
      text: "bid 96% $0.038 self",
      cost: 0.038,
      payload: { confidence: 0.96, cost_usd: 0.038, latency_s: 22, chain: "C2", strategy_chosen: "self" },
    },
    {
      type: "bid_submitted",
      from: "c1-cheap",
      to: "buyer",
      holdMs: 2000,
      text: "bid 98% $0.006 self",
      cost: 0.006,
      payload: { confidence: 0.98, cost_usd: 0.006, latency_s: 8, chain: "C1", strategy_chosen: "self" },
    },
    {
      type: "auto_selected_by_timeout",
      from: "buyer",
      to: "a-delegator",
      holdMs: 2600,
      text: "cheapest compliant = A",
      payload: { winner: "a-delegator" },
    },
    {
      type: "plan_generated",
      from: "a-delegator",
      to: "buyer",
      holdMs: 2400,
      text: learned ? "plan A→C2" : "plan A→B→C1",
      payload: { promised_confidence: 0.96, chain: learned ? "A→C2" : "A→B→C1" },
    },
    {
      type: "plan_validated",
      from: "a-delegator",
      to: "buyer",
      holdMs: 1800,
      text: "budget/latency/depth ok",
    },
    {
      type: "escrow_locked",
      from: "buyer",
      to: "a-delegator",
      holdMs: 2400,
      cost: 0.021,
      text: "escrow buyer → A $0.021",
      payload: { status: "LOCKED", amount_usd: 0.021 },
    },
    {
      type: "stake_posted",
      from: "a-delegator",
      to: "buyer",
      holdMs: 1800,
      cost: 0.002,
      text: "stake $0.002",
    },
  ];

  if (learned) {
    return [
      ...open,
      {
        type: "agent_hired",
        from: "a-delegator",
        to: "c2-honest",
        holdMs: 2600,
        text: "A skips B — trust_pairwise(A,B)=0",
        payload: { hired_agent: "c2-honest" },
      },
      {
        type: "task_delegated",
        from: "a-delegator",
        to: "c2-honest",
        holdMs: 2200,
        text: "render PDF",
        payload: { to_agent: "c2-honest" },
      },
      {
        type: "artifact_produced",
        from: "c2-honest",
        to: "a-delegator",
        holdMs: 2400,
        text: "artifact ok, self 97%",
        payload: { self_report: 0.97 },
      },
      {
        type: "check_run",
        from: "j1-judge",
        to: "c2-honest",
        holdMs: 2600,
        text: "rubric pass 4/4",
        payload: { passed: true, computed: 0.956 },
      },
      {
        type: "judge_verdict",
        from: "j1-judge",
        to: "a-delegator",
        holdMs: 2200,
        text: "PASS family-beta",
        payload: { verdict: "pass", model_family: "family-beta" },
      },
      {
        type: "judge_verdict",
        from: "j2-judge",
        to: "a-delegator",
        holdMs: 2200,
        text: "PASS family-delta",
        payload: { verdict: "pass", model_family: "family-delta" },
      },
      {
        type: "escrow_released",
        from: "buyer",
        to: "a-delegator",
        holdMs: 2800,
        cost: 0.021,
        text: "delivered 96% ≥ floor 95%",
        payload: { status: "RELEASED", delivered: 0.96 },
      },
      {
        type: "commission_charged",
        from: "a-delegator",
        to: "buyer",
        holdMs: 2400,
        cost: 0.001,
        text: "commission $0.001 on $0.021",
      },
      {
        type: "human_directive",
        from: "buyer",
        to: "ceo",
        holdMs: 3600,
        text: "SLA cumprido. Certificate 96%. human_interventions: 0.",
      },
    ];
  }

  return [
    ...open,
    {
      type: "agent_hired",
      from: "a-delegator",
      to: "b-mid",
      holdMs: 2400,
      text: "A subcontracts B",
      payload: { hired_agent: "b-mid" },
    },
    {
      type: "task_delegated",
      from: "a-delegator",
      to: "b-mid",
      holdMs: 2000,
      text: "normalize + render",
      payload: { to_agent: "b-mid" },
    },
    {
      type: "agent_hired",
      from: "b-mid",
      to: "c1-cheap",
      holdMs: 2800,
      text: "B hires C1 cheapest, no history",
      payload: { hired_agent: "c1-cheap" },
    },
    {
      type: "task_delegated",
      from: "b-mid",
      to: "c1-cheap",
      holdMs: 2000,
      text: "render",
      payload: { to_agent: "c1-cheap" },
    },
    {
      type: "artifact_produced",
      from: "c1-cheap",
      to: "b-mid",
      holdMs: 2800,
      text: "self-declares 98%, layout overflow",
      payload: { self_report: 0.98 },
    },
    {
      type: "check_run",
      from: "j1-judge",
      to: "c1-cheap",
      holdMs: 3000,
      text: "3 rubric fails · computed 41%",
      payload: { passed: false, computed: 0.41 },
    },
    {
      type: "escrow_withheld",
      from: "b-mid",
      to: "c1-cheap",
      holdMs: 2600,
      cost: 0.006,
      text: "promised 98% delivered 41%",
      payload: { status: "WITHHELD", promised: 0.98, delivered: 0.41 },
    },
    {
      type: "stake_forfeited",
      from: "c1-cheap",
      to: "b-mid",
      holdMs: 2000,
      cost: 0.0012,
      text: "stake $0.0012 forfeited",
    },
    {
      type: "escrow_withheld",
      from: "a-delegator",
      to: "b-mid",
      holdMs: 2400,
      cost: 0.012,
      text: "B delivered 41% < floor 95%",
      payload: { status: "WITHHELD", delivered: 0.41 },
    },
    {
      type: "attribution_emitted",
      from: "a-delegator",
      to: "b-mid",
      holdMs: 3200,
      text: "bad_selection → B hired C1 without history",
      payload: {
        root_cause: "bad_selection",
        blamed_agent: "b-mid",
        failed_hop: "c1-cheap",
      },
    },
    {
      type: "axes_updated",
      from: "b-mid",
      to: "c1-cheap",
      holdMs: 2600,
      text: "trust_pairwise(B,C1)=0 trust_pairwise(A,B)=0",
      payload: { "b-mid|c1-cheap": 0, "a-delegator|b-mid": 0 },
    },
    {
      type: "human_directive",
      from: "ceo",
      to: "buyer",
      holdMs: 3400,
      text: "41% não serve. Escala dentro do orçamento. Sem intervenção humana no juiz.",
    },
    {
      type: "escalated",
      from: "a-delegator",
      to: "c2-honest",
      holdMs: 2800,
      text: "re-plan C2, $0.0195 and 16.5s left",
      payload: { hired_agent: "c2-honest", status: "ESCALATED" },
    },
    {
      type: "escrow_locked",
      from: "a-delegator",
      to: "c2-honest",
      holdMs: 2200,
      cost: 0.016,
      text: "escrow A → C2 $0.016",
      payload: { status: "LOCKED", amount_usd: 0.016 },
    },
    {
      type: "task_delegated",
      from: "a-delegator",
      to: "c2-honest",
      holdMs: 2000,
      text: "render PDF",
      payload: { to_agent: "c2-honest" },
    },
    {
      type: "artifact_produced",
      from: "c2-honest",
      to: "a-delegator",
      holdMs: 2400,
      text: "artifact ok, self 97%",
      payload: { self_report: 0.97 },
    },
    {
      type: "check_run",
      from: "j1-judge",
      to: "c2-honest",
      holdMs: 2800,
      text: "rubric pass 4/4 · 95.6%",
      payload: { passed: true, computed: 0.956 },
    },
    {
      type: "judge_verdict",
      from: "j1-judge",
      to: "a-delegator",
      holdMs: 2200,
      text: "PASS family-beta",
      payload: { verdict: "pass", model_family: "family-beta" },
    },
    {
      type: "judge_verdict",
      from: "j2-judge",
      to: "a-delegator",
      holdMs: 2200,
      text: "PASS family-delta",
      payload: { verdict: "pass", model_family: "family-delta" },
    },
    {
      type: "escrow_released",
      from: "a-delegator",
      to: "c2-honest",
      holdMs: 2400,
      cost: 0.016,
      text: "C2 delivered 96% ≥ 95%",
      payload: { status: "RELEASED", delivered: 0.96 },
    },
    {
      type: "escrow_released",
      from: "buyer",
      to: "a-delegator",
      holdMs: 2600,
      cost: 0.021,
      text: "A delivered 96% ≥ 95%",
      payload: { status: "RELEASED", delivered: 0.96 },
    },
    {
      type: "stake_refunded",
      from: "a-delegator",
      to: "buyer",
      holdMs: 1800,
      text: "stake refunded",
    },
    {
      type: "commission_charged",
      from: "a-delegator",
      to: "buyer",
      holdMs: 2200,
      cost: 0.001,
      text: "commission $0.001 on $0.021",
    },
    {
      type: "human_directive",
      from: "buyer",
      to: "ceo",
      holdMs: 4000,
      text: "PDF ok. C1 queimou. B queimou selection. human_interventions: 0.",
    },
  ];
}

export function beatToLedger(beat: Beat, seq: number, requestId: string, parent: string | null): LedgerEvent {
  return {
    event_id: `evt_${seq.toString(16).padStart(4, "0")}`,
    seq,
    ts: Date.now(),
    request_id: requestId,
    parent_event_id: parent,
    type: beat.type,
    agent_id: beat.from,
    model: beat.model ?? (beat.from === "ceo" ? "human" : "auto"),
    tokens_in: beat.tokens ?? 40,
    tokens_out: beat.tokens ?? 18,
    cost_usd: beat.cost ?? 0,
    latency_ms: beat.lat ?? 80 + Math.floor(Math.random() * 120),
    payload: { ...beat.payload, to_agent: beat.to === "*" ? undefined : beat.to, text: beat.text },
  };
}
