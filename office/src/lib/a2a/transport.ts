import type { A2AEnvelope, A2ATransport } from "./protocol";
import { ledgerToEnvelope, parseLedgerEvent } from "./protocol";
import { beatToLedger, cycleBeats, type Beat } from "./sim-script";

function holdOf(beat: Beat, speed: number) {
  const base = beat.holdMs ?? 1800;
  return Math.max(700, Math.round(base / speed));
}

export function createSimTransport(): A2ATransport {
  let cycle = 0;
  let beats = cycleBeats(0);
  let i = 0;
  let seq = 1;
  let lastId: string | null = null;
  let requestId = "req_0001";
  let onEvent: ((e: A2AEnvelope) => void) | null = null;
  let timer: number | null = null;

  const emit = () => {
    let wrapped = false;
    if (i >= beats.length) {
      wrapped = true;
      cycle += 1;
      beats = cycleBeats(cycle);
      i = 0;
      requestId = `req_${(cycle + 1).toString(16).padStart(4, "0")}`;
      lastId = null;
    }
    const beat = beats[i]!;
    i += 1;
    const ledger = beatToLedger(beat, seq++, requestId, lastId);
    lastId = ledger.event_id;
    onEvent?.(ledgerToEnvelope(ledger, ledger.parent_event_id));
    return { beat, wrapped };
  };

  return {
    source: "sim",
    start(handler) {
      onEvent = handler;
      const loop = () => {
        const speed = (window as unknown as { __opsSpeed?: number }).__opsSpeed ?? 1;
        const { beat, wrapped } = emit();
        const gap = wrapped ? Math.max(2800, 4800 / speed) : holdOf(beat, speed);
        timer = window.setTimeout(loop, gap);
      };
      timer = window.setTimeout(loop, 1100);
      return () => {
        if (timer) window.clearTimeout(timer);
        onEvent = null;
      };
    },
  };
}

export function createLiveTransport(base: string, key?: string, requestId?: string): A2ATransport {
  return {
    source: "live",
    start(handler) {
      let after = 0;
      let rid = requestId ?? "";
      let stop = false;
      const headers: Record<string, string> = {};
      if (key) headers.Authorization = `Bearer ${key}`;

      const tick = async () => {
        if (stop) return;
        try {
          if (!rid) {
            const list = await fetch(`${base.replace(/\/$/, "")}/api/v1/requests`, { headers });
            if (list.ok) {
              const data = (await list.json()) as { requests?: { request_id: string }[] };
              rid = data.requests?.[0]?.request_id ?? "";
            }
          }
          if (!rid) return;
          const res = await fetch(
            `${base.replace(/\/$/, "")}/api/v1/requests/${rid}/events?after=${after}`,
            { headers },
          );
          if (!res.ok) return;
          const data = (await res.json()) as { events?: unknown[] };
          for (const raw of data.events ?? []) {
            const ev = parseLedgerEvent(raw);
            if (!ev) continue;
            after = Math.max(after, ev.seq);
            handler(ledgerToEnvelope(ev, ev.parent_event_id));
          }
        } catch {
          /* live backend optional */
        }
      };

      void tick();
      const id = window.setInterval(tick, 700);
      return () => {
        stop = true;
        window.clearInterval(id);
      };
    },
  };
}

export function createTransport(): A2ATransport {
  const url = import.meta.env.VITE_UNDERWRITE_URL as string | undefined;
  const key = import.meta.env.VITE_UNDERWRITE_API_KEY as string | undefined;
  const rid = import.meta.env.VITE_UNDERWRITE_REQUEST_ID as string | undefined;
  if (url) return createLiveTransport(url, key, rid);
  return createSimTransport();
}
