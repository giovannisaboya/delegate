import { ledgerToEnvelope } from "@/lib/a2a/protocol";
import { beatToLedger, type Beat } from "@/lib/a2a/sim-script";
import { dispatchJob } from "@/lib/llm/client";
import type { AgentId, LedgerEventType } from "@/lib/ops/types";
import { isAgentId } from "@/lib/ops/world";
import { useOps } from "@/lib/ops/store";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function playLiveJob(job: string, model: string) {
  const ops = useOps.getState();
  if (ops.liveBusy) return { ok: false as const, error: "já em curso" };
  ops.setLiveBusy(true);
  ops.setMode("live");
  try {
    const res = await dispatchJob(job, model);
    if (!res.ok) return res;
    const list = Array.isArray(res.events) ? res.events : [];
    let parent: string | null = null;
    const requestId = `req_${Date.now().toString(16).slice(-4)}`;
    for (const raw of list) {
      while (useOps.getState().paused) await sleep(200);
      const o = raw as Record<string, unknown>;
      const from = typeof o.from === "string" && isAgentId(o.from) ? o.from : null;
      const type = o.type as LedgerEventType;
      if (!from) continue;
      const toRaw = o.to;
      const to: AgentId | "*" = toRaw === "*" ? "*" : typeof toRaw === "string" && isAgentId(toRaw) ? toRaw : "buyer";
      const beat: Beat = {
        type,
        from,
        to,
        text: String(o.text ?? "").slice(0, 120),
        payload: o.payload && typeof o.payload === "object" ? (o.payload as Record<string, unknown>) : {},
      };
      const seq = useOps.getState().bumpSeq();
      const ledger = beatToLedger(beat, seq, requestId, parent);
      parent = ledger.event_id;
      useOps.getState().ingest(ledgerToEnvelope(ledger, ledger.parent_event_id));
      const speed = useOps.getState().speed;
      await sleep(Math.max(700, 1600 / speed));
    }
    return { ok: true as const };
  } finally {
    useOps.getState().setLiveBusy(false);
  }
}
