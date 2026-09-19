import { createFileRoute } from "@tanstack/react-router";
import { AGENT_IDS, LEDGER_TYPES } from "@/lib/ops/types";
import { resolveUpstream } from "@/lib/llm/resolve";

const SYS = `Você é o orquestrador A2A do marketplace Underwrite (NeuraLake).
Responda SOMENTE JSON válido, sem markdown: {"events":[...]}
Cada event: {"from","to","type","text","payload"}
from/to ∈ ceo,buyer,a-delegator,b-mid,c1-cheap,c2-honest,j1-judge,j2-judge (* só em to).
type ∈ ${LEDGER_TYPES.join(",")}.
text: PT-BR, ≤90 caracteres, fala operacional (não narrar).
Fluxo obrigatório:
1) human_directive CEO→buyer (pedido)
2) spec_drafted buyer→ceo (SLA 4 campos)
3) request_received buyer→a-delegator
4) 2–3 bid_submitted
5) auto_selected_by_timeout
6) plan_generated + plan_validated
7) escrow_locked + stake_posted
8) hire/delegate/artifact
9) check_run + judge_verdict j1 e j2
10) escrow_released OU withheld + escalated + C2 + released
Máx 18 events. payload só dados (confidence, cost_usd, chain, winner, status, delivered, hired_agent).`;

export const Route = createFileRoute("/api/turn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const up = resolveUpstream(request.headers.get("x-neuralake-key"));
        if (!up) return Response.json({ ok: false, error: "API indisponível" }, { status: 503 });
        let job = "";
        let model = "reasoning";
        try {
          const body = (await request.json()) as { job?: string; model?: string };
          job = (body.job ?? "").slice(0, 800);
          model = body.model ?? "reasoning";
        } catch {
          return Response.json({ ok: false, error: "JSON inválido" }, { status: 400 });
        }
        if (!job.trim()) return Response.json({ ok: false, error: "job vazio" }, { status: 400 });

        const res = await fetch(`${up.base}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${up.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: up.modelFor(model),
            temperature: 0.25,
            max_tokens: 900,
            messages: [
              { role: "system", content: SYS },
              { role: "user", content: `Job do CEO: ${job}` },
            ],
          }),
        });
        if (!res.ok) {
          const err = await res.text().catch(() => res.statusText);
          return Response.json({ ok: false, error: `upstream ${res.status}: ${err.slice(0, 180)}` }, { status: 502 });
        }
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const raw = data.choices?.[0]?.message?.content ?? "";
        const jsonText = raw.replace(/^```json\s*|\s*```$/g, "").trim();
        let parsed: { events?: unknown };
        try {
          parsed = JSON.parse(jsonText) as { events?: unknown };
        } catch {
          return Response.json({ ok: false, error: "modelo não retornou JSON" }, { status: 502 });
        }
        if (!Array.isArray(parsed.events)) {
          return Response.json({ ok: false, error: "events ausente" }, { status: 502 });
        }
        const allowFrom = new Set(AGENT_IDS as readonly string[]);
        const allowType = new Set(LEDGER_TYPES as readonly string[]);
        const events = parsed.events.slice(0, 18).filter((e) => {
          if (!e || typeof e !== "object") return false;
          const o = e as Record<string, unknown>;
          const from = typeof o.from === "string" ? o.from : "";
          const type = typeof o.type === "string" ? o.type : "";
          const to = o.to === "*" || (typeof o.to === "string" && allowFrom.has(o.to));
          return allowFrom.has(from) && allowType.has(type) && to && typeof o.text === "string";
        });
        if (!events.length) return Response.json({ ok: false, error: "nenhum event válido" }, { status: 502 });
        return Response.json({ ok: true, events });
      },
    },
  },
});
