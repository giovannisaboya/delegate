import { AGENTS, tagOf } from "@/lib/ops/world";
import { useOps } from "@/lib/ops/store";
import type { AgentId } from "@/lib/ops/types";

export const LANES: AgentId[] = [
  "ceo",
  "buyer",
  "a-delegator",
  "b-mid",
  "c1-cheap",
  "c2-honest",
  "j1-judge",
  "j2-judge",
];

export function Seq() {
  const journal = useOps((s) => s.journal).slice(-16);
  return (
    <svg viewBox={`0 0 560 ${28 + LANES.length * 32}`} className="h-full min-h-52 w-full">
      {LANES.map((id, i) => {
        const y = 22 + i * 32;
        return (
          <g key={id}>
            <text x="8" y={y + 4} fill="#8a8f98" fontSize="11" fontFamily="JetBrains Mono">
              {tagOf(id)}
            </text>
            <line x1="48" y1={y} x2="548" y2={y} stroke="rgba(236,236,236,0.08)" />
          </g>
        );
      })}
      {journal.map((m, idx) => {
        const i1 = LANES.indexOf(m.from);
        const i2 = m.to === "*" ? i1 : LANES.indexOf(m.to);
        if (i1 < 0 || i2 < 0) return null;
        const x = 62 + idx * 28;
        return (
          <g key={m.id}>
            <line x1={x} y1={22 + i1 * 32} x2={x} y2={22 + i2 * 32} stroke="#d7d9dc" />
            <circle cx={x} cy={22 + i1 * 32} r="2.2" fill="#d7d9dc" />
          </g>
        );
      })}
    </svg>
  );
}

export function Org() {
  const bodies = useOps((s) => s.bodies);
  const trust = useOps((s) => s.trust);
  const pos: Record<AgentId, [number, number]> = {
    ceo: [70, 40],
    buyer: [70, 110],
    "a-delegator": [230, 90],
    "b-mid": [370, 50],
    "c1-cheap": [500, 30],
    "c2-honest": [500, 150],
    "j1-judge": [370, 170],
    "j2-judge": [230, 170],
  };
  const links: [AgentId, AgentId, string][] = [
    ["ceo", "buyer", "hxa"],
    ["buyer", "a-delegator", "escrow"],
    ["a-delegator", "b-mid", "a-delegator|b-mid"],
    ["b-mid", "c1-cheap", "b-mid|c1-cheap"],
    ["a-delegator", "c2-honest", "escalate"],
    ["a-delegator", "j1-judge", "verify"],
    ["a-delegator", "j2-judge", "verify"],
  ];
  return (
    <svg viewBox="0 0 560 210" className="h-full min-h-48 w-full">
      {links.map(([a, b, k]) => {
        const p = pos[a];
        const q = pos[b];
        const dead = trust[k] === 0;
        return (
          <line
            key={a + b}
            x1={p[0]}
            y1={p[1]}
            x2={q[0]}
            y2={q[1]}
            stroke={dead ? "#c56b72" : "rgba(236,236,236,0.18)"}
            strokeDasharray={dead ? "4 3" : undefined}
          />
        );
      })}
      {AGENTS.map((a) => {
        const [x, y] = pos[a.id];
        const on = bodies[a.id].action !== "sit";
        return (
          <g key={a.id}>
            <rect
              x={x - 36}
              y={y - 14}
              width={72}
              height={28}
              fill="#171a1f"
              stroke={on ? "#d7d9dc" : "rgba(236,236,236,0.12)"}
            />
            <text x={x} y={y + 4} textAnchor="middle" fill="#ececec" fontSize="11" fontFamily="JetBrains Mono">
              {a.tag}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function usd(n: number) {
  return `$${n.toFixed(4)}`;
}

export const PIPE: { id: string; label: string }[] = [
  { id: "briefing", label: "Brief" },
  { id: "received", label: "Post" },
  { id: "auctioning", label: "Auction" },
  { id: "contracting", label: "Escrow" },
  { id: "executing", label: "Run" },
  { id: "verifying", label: "Judge" },
  { id: "escalated", label: "Escalate" },
  { id: "completed", label: "Settle" },
];
