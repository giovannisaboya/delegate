import { useEffect, useState } from "react";
import { Pause, Play, Gauge, Scale, Sun, Moon } from "lucide-react";
import { AGENTS, DEMO_REQUEST, tagOf } from "@/lib/ops/world";
import { p50, useOps } from "@/lib/ops/store";
import { OfficeCanvas } from "./office-canvas";
import { usd } from "./ops-diagrams";
import { ChatDock } from "./chat-dock";
import { applyTheme, readTheme } from "./theme-host";

export function OpsShell() {
  const paused = useOps((s) => s.paused);
  const speed = useOps((s) => s.speed);
  const selected = useOps((s) => s.selected);
  const bodies = useOps((s) => s.bodies);
  const journal = useOps((s) => s.journal);
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
  const setMode = useOps((s) => s.setMode);
  const openDispute = useOps((s) => s.openDispute);
  const [theme, setTheme] = useState<"day" | "night">("day");
  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const def = AGENTS.find((a) => a.id === selected)!;
  const last = [...journal].reverse().find((m) => m.from === selected);
  const env = journal.find((e) => e.id === useOps.getState().selectedEnv) ?? journal[journal.length - 1];
  const miss = delivered !== null && promised !== null && delivered < DEMO_REQUEST.min_confidence;

  const toggleTheme = () => {
    const next = theme === "day" ? "night" : "day";
    applyTheme(next);
    setTheme(next);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2">
        <div className="min-w-0">
          <div className="text-sm font-medium tracking-tight">NeuraLake</div>
          <div className="font-mono text-xs text-muted">
            office · {status} · {source}
            {liveBusy ? " · busy" : ""}
          </div>
        </div>
        <div className="flex border border-border bg-elevated">
          {(["live", "replay"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`inline-flex min-h-11 px-3 text-xs ${mode === m ? "bg-accent text-accent-fg" : "text-muted"}`}
            >
              {m === "live" ? "Ao vivo" : "Replay"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-xs text-muted sm:inline">
            human_interventions: {human} · p50 {p50(lats)}
          </span>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 border border-border bg-elevated px-3 text-xs"
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            {paused ? "Tocar" : "Pausar"}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 border border-border bg-elevated px-3 text-xs"
            onClick={cycleSpeed}
          >
            <Gauge className="size-3.5" />
            {speed}x
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex min-h-11 items-center gap-2 border border-border bg-elevated px-3 text-xs"
            aria-label={theme === "day" ? "Noite" : "Dia"}
          >
            {theme === "day" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
            {theme === "day" ? "Noite" : "Dia"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
          <div className="border-b border-border px-3 py-2 font-mono text-xs tracking-wide text-muted uppercase">
            Catalog
          </div>
          <div className="flex-1 overflow-auto">
            {AGENTS.map((a) => {
              const on = selected === a.id;
              const live = bodies[a.id].action !== "sit" && bodies[a.id].action !== "idle";
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => select(a.id)}
                  className={`flex w-full min-h-14 flex-col items-start gap-0.5 border-b border-border px-3 py-2 text-left ${on ? "bg-elevated" : ""}`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className={`size-1.5 ${live ? "bg-ok" : "bg-subtle"}`} />
                      <span className="font-mono text-xs">{a.tag}</span>
                    </span>
                    <span className="font-mono text-xs text-muted">{bodies[a.id].action}</span>
                  </div>
                  <span className="truncate text-xs text-muted">
                    {a.capability} · {a.docs ? "docs" : "texto"}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-60 flex-1">
            <OfficeCanvas />
          </div>
          <div className="flex max-h-28 gap-px overflow-x-auto border-t border-border lg:hidden">
            {AGENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => select(a.id)}
                className={`min-h-11 shrink-0 border-r border-border px-3 font-mono text-xs ${selected === a.id ? "bg-elevated" : ""}`}
              >
                {a.tag}
              </button>
            ))}
          </div>
        </main>

        <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-surface lg:flex">
          <div className="border-b border-border px-3 py-2 font-mono text-xs tracking-wide text-muted uppercase">
            Inspector
          </div>
          <div className="border-b border-border px-3 py-3">
            <div className="text-sm font-medium">{def.name}</div>
            <div className="font-mono text-xs text-muted">
              {def.capability} · {def.docs ? "aceita docs" : "só texto"} · {bodies[selected].action}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">{def.skill}</p>
          </div>
          <div className="border-b border-border px-3 py-3">
            <div className="mb-1 font-mono text-xs tracking-wide text-muted uppercase">Request · 4 fields</div>
            <div className="text-sm leading-relaxed">{DEMO_REQUEST.requirement}</div>
            <div className="mt-2 font-mono text-xs text-muted">
              max {usd(DEMO_REQUEST.max_cost_usd)} · {DEMO_REQUEST.max_latency_s}s · min conf {DEMO_REQUEST.min_confidence}{" "}
              · {DEMO_REQUEST.failure_policy}
            </div>
            <div className="mt-2 font-mono text-xs">
              promised {promised ?? "—"} · delivered{" "}
              <span className={miss ? "text-err" : "text-ok"}>{delivered ?? "—"}</span>
            </div>
            <div className="mt-1 font-mono text-xs text-muted">
              {requestId} · escrow {escrow} · spent {usd(cost)}
            </div>
            {bids.map((b) => (
              <div key={b.bid_id} className={`mt-1 font-mono text-xs ${b.agent_id === winner ? "text-fg" : "text-muted"}`}>
                {tagOf(b.agent_id)} {b.confidence} · {usd(b.cost_usd)} · {b.chain}
              </div>
            ))}
            {attribution ? (
              <div className="mt-2 font-mono text-xs text-err">
                {attribution.root_cause} → {attribution.blamed_agent}
              </div>
            ) : null}
            <button
              type="button"
              onClick={openDispute}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 border border-border bg-elevated text-xs"
            >
              <Scale className="size-3.5" />
              open dispute
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
            <div className="mb-1 font-mono text-xs tracking-wide text-muted uppercase">Ledger line</div>
            <p className="text-sm leading-relaxed">{last?.payload.text ?? "—"}</p>
            {env ? (
              <pre className="mt-4 overflow-auto font-mono text-xs leading-relaxed text-muted whitespace-pre-wrap">
                {JSON.stringify(
                  {
                    event_id: env.ledger.event_id,
                    seq: env.ledger.seq,
                    type: env.ledger.type,
                    agent_id: env.ledger.agent_id,
                    cost_usd: env.ledger.cost_usd,
                    payload: env.ledger.payload,
                  },
                  null,
                  2,
                )}
              </pre>
            ) : null}
          </div>
        </aside>
      </div>

      {mode === "live" ? <ChatDock /> : null}

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-3 py-1.5 font-mono text-xs text-subtle">
        <span className="truncate">{lastBus}</span>
        <span className="shrink-0">
          inflight {packets.length} · human_interventions: {human}
        </span>
      </footer>
    </div>
  );
}
