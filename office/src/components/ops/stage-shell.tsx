import { Link } from "@tanstack/react-router";
import { Pause, Play, Gauge, Scale, Columns2, Building2, LayoutPanelLeft } from "lucide-react";
import { AGENTS, DEMO_REQUEST, tagOf } from "@/lib/ops/world";
import { p50, useOps } from "@/lib/ops/store";
import type { Plane } from "@/lib/ops/types";
import { OfficeCanvas } from "./office-canvas";
import { Org, PIPE, Seq, usd } from "./ops-diagrams";
import { ChatDock } from "./chat-dock";

export function StageShell() {
  const paused = useOps((s) => s.paused);
  const speed = useOps((s) => s.speed);
  const selected = useOps((s) => s.selected);
  const bodies = useOps((s) => s.bodies);
  const journal = useOps((s) => s.journal);
  const plane = useOps((s) => s.plane);
  const escrow = useOps((s) => s.escrow);
  const status = useOps((s) => s.status);
  const bids = useOps((s) => s.bids);
  const winner = useOps((s) => s.winner);
  const lastBus = useOps((s) => s.lastBus);
  const lats = useOps((s) => s.lats);
  const packets = useOps((s) => s.packets);
  const promised = useOps((s) => s.promised);
  const delivered = useOps((s) => s.delivered);
  const human = useOps((s) => s.humanInterventions);
  const attribution = useOps((s) => s.attribution);
  const requestId = useOps((s) => s.requestId);
  const cost = useOps((s) => s.cost);
  const source = useOps((s) => s.source);
  const mode = useOps((s) => s.mode);
  const liveBusy = useOps((s) => s.liveBusy);
  const setPaused = useOps((s) => s.setPaused);
  const cycleSpeed = useOps((s) => s.cycleSpeed);
  const select = useOps((s) => s.select);
  const setPlane = useOps((s) => s.setPlane);
  const setMode = useOps((s) => s.setMode);
  const openDispute = useOps((s) => s.openDispute);

  const def = AGENTS.find((a) => a.id === selected)!;
  const last = [...journal].reverse().find((m) => m.from === selected);
  const env = journal.find((e) => e.id === useOps.getState().selectedEnv) ?? journal[journal.length - 1];
  const miss = delivered !== null && promised !== null && delivered < DEMO_REQUEST.min_confidence;
  const pipeId = status === "failed" ? "completed" : status;

  const planes: { id: Plane; label: string; icon: typeof Building2 }[] = [
    { id: "office", label: "Office", icon: Building2 },
    { id: "backstage", label: "Ledger", icon: Columns2 },
  ];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2">
        <div className="min-w-0">
          <div className="text-sm font-medium tracking-tight">NeuraLake</div>
          <div className="font-mono text-xs text-muted">
            {mode} · {status} · {source}
            {liveBusy ? " · busy" : ""}
          </div>
        </div>
        <div className="flex border border-border bg-elevated">
          {planes.map((p) => {
            const Icon = p.icon;
            const on = plane === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlane(p.id)}
                className={`inline-flex min-h-11 items-center gap-2 px-3 text-xs ${on ? "bg-accent text-accent-fg" : "text-muted"}`}
              >
                <Icon className="size-3.5" />
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border bg-elevated">
            {(["live", "replay"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`inline-flex min-h-11 px-3 text-xs ${mode === m ? "bg-accent text-accent-fg" : "text-muted"}`}
              >
                {m}
              </button>
            ))}
          </div>
          <Link
            to="/classic"
            className="inline-flex min-h-11 items-center gap-2 border border-border bg-elevated px-3 text-xs text-muted"
          >
            <LayoutPanelLeft className="size-3.5" />
            Classic
          </Link>
          <span className="hidden font-mono text-xs text-muted sm:inline">human_interventions: {human}</span>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 border border-border bg-elevated px-3 text-xs"
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 border border-border bg-elevated px-3 text-xs"
            onClick={cycleSpeed}
          >
            <Gauge className="size-3.5" />
            {speed}x
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {plane === "office" ? (
          <OfficeCanvas />
        ) : (
          <div className="grid h-full grid-rows-2">
            <div className="min-h-0 overflow-auto border-b border-border p-4">
              <div className="mb-2 font-mono text-xs tracking-wide text-muted uppercase">Sequence · ledger</div>
              <Seq />
            </div>
            <div className="min-h-0 overflow-auto p-4">
              <div className="mb-2 font-mono text-xs tracking-wide text-muted uppercase">Chain · trust_pairwise</div>
              <Org />
            </div>
          </div>
        )}

        <aside className="pointer-events-none absolute inset-y-4 right-4 hidden w-72 lg:block">
          <div className="pointer-events-auto flex h-full flex-col overflow-hidden border border-border bg-surface/95">
            <div className="border-b border-border px-3 py-2 font-mono text-xs tracking-wide text-muted uppercase">
              Inspector
            </div>
            <div className="border-b border-border px-3 py-3">
              <div className="text-sm font-medium">{def.name}</div>
              <div className="font-mono text-xs text-muted">
                {def.tag} · {def.role} · {bodies[selected].action}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
              <div className="font-mono text-xs text-muted">
                max {usd(DEMO_REQUEST.max_cost_usd)} · {DEMO_REQUEST.max_latency_s}s · {DEMO_REQUEST.min_confidence} ·{" "}
                {DEMO_REQUEST.failure_policy}
              </div>
              <div className="mt-2 font-mono text-xs">
                promised {promised ?? "—"} · delivered{" "}
                <span className={miss ? "text-err" : "text-ok"}>{delivered ?? "—"}</span>
              </div>
              <div className="mt-1 font-mono text-xs text-muted">
                {requestId} · {escrow} · {usd(cost)}
              </div>
              {bids.map((b) => (
                <div
                  key={b.bid_id}
                  className={`mt-1 font-mono text-xs ${b.agent_id === winner ? "text-fg" : "text-muted"}`}
                >
                  {tagOf(b.agent_id)} {b.confidence} · {usd(b.cost_usd)}
                </div>
              ))}
              {attribution ? (
                <div className="mt-2 font-mono text-xs text-err">
                  {attribution.root_cause} → {attribution.blamed_agent}
                </div>
              ) : null}
              <p className="mt-3 text-sm leading-relaxed">{last?.payload.text ?? DEMO_REQUEST.requirement}</p>
              {env ? (
                <pre className="mt-3 overflow-auto font-mono text-xs text-muted whitespace-pre-wrap">
                  {JSON.stringify({ seq: env.ledger.seq, type: env.ledger.type, agent_id: env.ledger.agent_id }, null, 2)}
                </pre>
              ) : null}
            </div>
            <button
              type="button"
              onClick={openDispute}
              className="m-3 inline-flex min-h-11 items-center justify-center gap-2 border border-border bg-elevated text-xs"
            >
              <Scale className="size-3.5" />
              open dispute
            </button>
          </div>
        </aside>
      </div>

      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-t border-border bg-surface px-3 py-2">
        {PIPE.map((step, i) => {
          const on = step.id === pipeId;
          const done = PIPE.findIndex((s) => s.id === pipeId) > i && status !== "failed";
          return (
            <div key={step.id} className="flex items-center gap-1">
              {i > 0 ? <span className="text-subtle">/</span> : null}
              <span className={`font-mono text-xs ${on ? "text-fg" : done ? "text-ok" : "text-subtle"}`}>{step.label}</span>
            </div>
          );
        })}
        <span className="ml-auto hidden font-mono text-xs text-muted sm:inline">p50 {p50(lats)}</span>
      </div>

      <div className="flex shrink-0 gap-px overflow-x-auto border-t border-border bg-surface">
        {AGENTS.map((a) => {
          const live = bodies[a.id].action !== "sit" && bodies[a.id].action !== "idle";
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => select(a.id)}
              className={`flex min-h-11 min-w-16 flex-col items-start justify-center border-r border-border px-3 ${
                selected === a.id ? "bg-elevated" : ""
              }`}
            >
              <span className="flex items-center gap-2 font-mono text-xs">
                <span className={`size-1.5 ${live ? "bg-ok" : "bg-subtle"}`} />
                {a.tag}
              </span>
              <span className="font-mono text-xs text-muted">{bodies[a.id].action}</span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-border px-3 py-2 lg:hidden">
        <div className="font-mono text-xs text-muted">
          {tagOf(selected)} · {status} · {escrow}
        </div>
        <p className="truncate text-sm">{last?.payload.text ?? DEMO_REQUEST.requirement}</p>
      </div>

      {mode === "live" ? <ChatDock /> : null}

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-3 py-1.5 font-mono text-xs text-subtle">
        <span className="truncate">{lastBus}</span>
        <span className="shrink-0">inflight {packets.length} · human_interventions: {human}</span>
      </footer>
    </div>
  );
}
