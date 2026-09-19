import { create } from "zustand";
import type { A2AEnvelope } from "@/lib/a2a/protocol";
import type {
  AgentBody,
  AgentId,
  Attribution,
  Bid,
  EscrowStatus,
  Packet,
  Plane,
  RequestStatus,
} from "./types";
import { AGENTS, COMPANY_MEET, MEET, deskOf } from "./world";

type OpsState = {
  tick: number;
  paused: boolean;
  speed: 1 | 2 | 4;
  selected: AgentId;
  plane: Plane;
  source: "sim" | "live";
  mode: "live" | "replay";
  liveBusy: boolean;
  bodies: Record<AgentId, AgentBody>;
  targets: Record<AgentId, { x: number; y: number }>;
  packets: Packet[];
  journal: A2AEnvelope[];
  tokens: number;
  cost: number;
  a2a: number;
  lats: number[];
  lastBus: string;
  selectedEnv: string | null;
  requestId: string;
  status: RequestStatus;
  escrow: EscrowStatus;
  bids: Bid[];
  winner: AgentId | null;
  promised: number | null;
  delivered: number | null;
  humanInterventions: number;
  attribution: Attribution | null;
  trust: Record<string, number>;
  setPaused: (v: boolean) => void;
  cycleSpeed: () => void;
  select: (id: AgentId) => void;
  setPlane: (p: Plane) => void;
  setSource: (s: "sim" | "live") => void;
  setMode: (m: "live" | "replay") => void;
  setLiveBusy: (v: boolean) => void;
  patchTalk: (id: AgentId, text: string) => void;
  bumpSeq: () => number;
  openDispute: () => void;
  ingest: (e: A2AEnvelope) => void;
  step: (dt: number) => void;
};

function spawn(): Record<AgentId, AgentBody> {
  const o = {} as Record<AgentId, AgentBody>;
  for (const a of AGENTS) {
    o[a.id] = {
      id: a.id,
      x: a.desk.x,
      y: a.desk.y,
      facing: 1,
      action: "sit",
      walkPhase: Math.random() * 4,
      bubble: null,
    };
  }
  return o;
}

function spawnTargets() {
  const o = {} as Record<AgentId, { x: number; y: number }>;
  for (const a of AGENTS) o[a.id] = { x: a.desk.x, y: a.desk.y };
  return o;
}

function statusFrom(type: string, cur: RequestStatus): RequestStatus {
  if (type === "human_directive" || type === "spec_drafted") {
    return cur === "briefing" ? "briefing" : cur;
  }
  if (type === "request_received") return "received";
  if (type === "bid_submitted") return "auctioning";
  if (type === "plan_generated" || type === "plan_validated" || type === "escrow_locked") return "contracting";
  if (type === "agent_hired" || type === "task_delegated" || type === "artifact_produced") return "executing";
  if (type === "check_run" || type === "judge_verdict") return "verifying";
  if (type === "escalated") return "escalated";
  if (type === "commission_charged" || type === "escrow_released") return "completed";
  if (type === "escrow_withheld") return cur === "escalated" ? cur : "failed";
  return cur;
}

export const useOps = create<OpsState>((set, get) => ({
  tick: 0,
  paused: false,
  speed: 1,
  selected: "ceo",
  plane: "office",
  source: "live",
  mode: "live",
  liveBusy: false,
  bodies: spawn(),
  targets: spawnTargets(),
  packets: [],
  journal: [],
  tokens: 0,
  cost: 0,
  a2a: 0,
  lats: [],
  lastBus: "live · fale ou despache um job",
  selectedEnv: null,
  requestId: "req_0001",
  status: "briefing",
  escrow: "CREATED",
  bids: [],
  winner: null,
  promised: null,
  delivered: null,
  humanInterventions: 0,
  attribution: null,
  trust: {},
  setPaused: (v) => set({ paused: v }),
  cycleSpeed: () => {
    const n = get().speed === 1 ? 2 : get().speed === 2 ? 4 : 1;
    set({ speed: n });
    if (typeof window !== "undefined") {
      (window as unknown as { __opsSpeed?: number }).__opsSpeed = n;
    }
  },
  select: (id) => set({ selected: id }),
  setPlane: (plane) => set({ plane }),
  setSource: (source) => set({ source }),
  setMode: (mode) => set({ mode, source: mode === "replay" ? "sim" : "live", paused: false }),
  setLiveBusy: (liveBusy) => set({ liveBusy }),
  patchTalk: (id, text) => {
    const bodies = { ...get().bodies };
    if (!bodies[id]) return;
    bodies[id] = { ...bodies[id], action: "talk", bubble: text.slice(-80) };
    set({ bodies, lastBus: text.slice(0, 96), selected: id });
  },
  bumpSeq: () => {
    const n = (get().a2a || 0) + 1;
    set({ a2a: n });
    return n;
  },
  openDispute: () =>
    set({
      humanInterventions: get().humanInterventions + 1,
      lastBus: "dispute_opened · human_interventions +1",
    }),
  ingest: (e) => {
    const s = get();
    const L = e.ledger;
    const bodies = { ...s.bodies };
    const targets = { ...s.targets };
    for (const id of Object.keys(bodies) as AgentId[]) {
      bodies[id] = { ...bodies[id], bubble: null };
    }
    bodies[e.from] = {
      ...bodies[e.from],
      action: e.type.startsWith("tool") ? "tool" : "talk",
      bubble: (typeof L.payload.text === "string" ? L.payload.text : e.payload.text).slice(0, 56),
    };
    if (e.to !== "*" && e.to !== e.from && bodies[e.to]) {
      bodies[e.to] = { ...bodies[e.to], action: "think" };
    }

    if (L.type === "human_directive" || L.type === "spec_drafted") {
      targets.ceo = COMPANY_MEET;
      targets.buyer = { x: COMPANY_MEET.x, y: COMPANY_MEET.y + 28 };
      bodies.ceo.action = "walk";
      bodies.buyer.action = "walk";
    } else if (L.type === "request_received") {
      targets.ceo = deskOf("ceo");
      targets.buyer = deskOf("buyer");
      bodies.ceo.action = "walk";
      if (e.to !== "*") {
        targets[e.to] = deskOf(e.to);
        bodies[e.to].action = "think";
      }
    } else if (L.type === "task_delegated" && e.to !== "*") {
      targets[e.to] = deskOf(e.to);
      bodies[e.to].action = "walk";
      const mid = { x: (deskOf(e.from).x + deskOf(e.to).x) / 2, y: (deskOf(e.from).y + deskOf(e.to).y) / 2 };
      targets[e.from] = mid;
      bodies[e.from].action = "walk";
    } else if (L.type === "escalated") {
      targets["a-delegator"] = MEET;
      targets["c2-honest"] = MEET;
      bodies["a-delegator"].action = "walk";
      bodies["c2-honest"].action = "walk";
    } else if (L.type === "judge_verdict" || L.type === "check_run") {
      targets[e.from] = deskOf(e.from);
      bodies[e.from].action = "type";
    } else if (e.to !== "*" && Math.random() < 0.3) {
      const a = deskOf(e.from);
      const b = deskOf(e.to);
      targets[e.from] = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      bodies[e.from].action = "walk";
    } else {
      targets[e.from] = deskOf(e.from);
    }

    let bids = s.bids;
    let winner = s.winner;
    let escrow = s.escrow;
    let promised = s.promised;
    let delivered = s.delivered;
    let attribution = s.attribution;
    let trust = s.trust;
    let requestId = s.requestId;

    if (L.type === "request_received") {
      bids = [];
      winner = null;
      escrow = "CREATED";
      promised = null;
      delivered = null;
      attribution = null;
      requestId = L.request_id;
    }
    if (L.type === "bid_submitted" && L.agent_id) {
      const bid: Bid = {
        bid_id: L.event_id,
        agent_id: L.agent_id,
        confidence: Number(L.payload.confidence ?? 0),
        cost_usd: Number(L.payload.cost_usd ?? L.cost_usd),
        latency_s: Number(L.payload.latency_s ?? 0),
        chain: String(L.payload.chain ?? ""),
        strategy_chosen: (L.payload.strategy_chosen as Bid["strategy_chosen"]) ?? "self",
        rationale: String(L.payload.text ?? ""),
      };
      bids = [...bids.filter((b) => b.agent_id !== bid.agent_id), bid];
    }
    if (L.type === "auto_selected_by_timeout") {
      const w = L.payload.winner;
      if (typeof w === "string") winner = w as AgentId;
    }
    if (L.type === "plan_generated") {
      promised = Number(L.payload.promised_confidence ?? promised);
    }
    if (L.type === "escrow_locked") escrow = "LOCKED";
    if (L.type === "escrow_released") {
      escrow = "RELEASED";
      delivered = Number(L.payload.delivered ?? delivered);
    }
    if (L.type === "escrow_withheld") {
      escrow = "WITHHELD";
      delivered = Number(L.payload.delivered ?? delivered);
    }
    if (L.type === "escalated") escrow = "ESCALATED";
    if (L.type === "check_run" && typeof L.payload.computed === "number") {
      delivered = L.payload.computed;
    }
    if (L.type === "attribution_emitted") {
      attribution = {
        failed_hop: String(L.payload.failed_hop ?? ""),
        root_cause: (L.payload.root_cause as Attribution["root_cause"]) ?? "bad_execution",
        blamed_agent: (L.payload.blamed_agent as AgentId) ?? null,
        explanation: String(L.payload.text ?? e.payload.text),
      };
    }
    if (L.type === "axes_updated") {
      const next = { ...trust };
      for (const [k, v] of Object.entries(L.payload)) {
        if (k.includes("|") && typeof v === "number") next[k] = v;
      }
      trust = next;
    }

    const pkt: Packet = { id: e.id, from: e.from, to: e.to, type: e.type, t: 0, text: e.payload.text };

    set({
      bodies,
      targets,
      packets: [...s.packets, pkt].slice(-20),
      journal: [...s.journal, e].slice(-120),
      tokens: s.tokens + e.payload.tokens,
      cost: s.cost + (e.payload.costUsd ?? 0),
      a2a: s.a2a + 1,
      lats: [...s.lats, e.payload.latMs].slice(-48),
      lastBus: `${L.seq} ${L.type} ${e.from}→${e.to}`,
      selectedEnv: e.id,
      selected: e.from,
      status: statusFrom(L.type, s.status),
      bids,
      winner,
      escrow,
      promised,
      delivered,
      attribution,
      trust,
      requestId,
    });
  },
  step: (dt) => {
    const s = get();
    if (s.paused) {
      set({ tick: s.tick + 1 });
      return;
    }
    const bodies = { ...s.bodies };
    const targets = s.targets;
    const sp = 54 * s.speed;
    for (const id of Object.keys(bodies) as AgentId[]) {
      const b = { ...bodies[id] };
      const t = targets[id];
      if (!t) continue;
      const dx = t.x - b.x;
      const dy = t.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2.4) {
        b.x += (dx / dist) * sp * dt;
        b.y += (dy / dist) * sp * dt;
        b.facing = dx >= 0 ? 1 : -1;
        b.action = "walk";
        b.walkPhase += dt * 10 * s.speed;
      } else {
        b.x = t.x;
        b.y = t.y;
        if (b.action === "walk") b.action = b.bubble ? "talk" : "sit";
        b.walkPhase += dt * (b.action === "sit" || b.action === "idle" ? 2.2 : 10) * s.speed;
      }
      bodies[id] = b;
    }
    const packets = s.packets
      .map((p) => ({ ...p, t: p.t + dt * (1.9 * s.speed) }))
      .filter((p) => p.t < 1.15);
    set({ bodies, packets, tick: s.tick + 1 });
  },
}));

export function p50(lats: number[]) {
  if (!lats.length) return "—";
  const arr = [...lats].sort((a, b) => a - b);
  return `${arr[Math.floor(arr.length * 0.5)]}ms`;
}
