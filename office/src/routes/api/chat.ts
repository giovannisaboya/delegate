import { createFileRoute } from "@tanstack/react-router";
import { resolveUpstream } from "@/lib/llm/resolve";

type Part = { type?: string; text?: string; image_url?: { url?: string } };
type Msg = { role: string; content: string | Part[] };

function hasImage(messages: Msg[]) {
  return messages.some(
    (m) => Array.isArray(m.content) && m.content.some((p) => p.type === "image_url" && p.image_url?.url),
  );
}

function slim(messages: Msg[]) {
  return messages.slice(-16).map((m, i, arr) => {
    if (!Array.isArray(m.content) || i === arr.length - 1) return m;
    const text = m.content
      .filter((p) => p.type === "text")
      .map((p) => p.text ?? "")
      .join("\n");
    return { role: m.role, content: text };
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const up = resolveUpstream(request.headers.get("x-neuralake-key"));
        if (!up) {
          return Response.json({ error: "Nenhuma API disponível. Cole a chave NeuraLake." }, { status: 503 });
        }
        let body: { model?: string; messages?: Msg[]; temperature?: number; max_tokens?: number };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "JSON inválido" }, { status: 400 });
        }
        const messages = Array.isArray(body.messages) ? slim(body.messages) : [];
        if (!messages.length) return Response.json({ error: "messages vazio" }, { status: 400 });
        const vision = hasImage(messages);
        const model = up.modelFor(vision ? "multimodal" : (body.model ?? "text"));
        const upstream = await fetch(`${up.base}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${up.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            temperature: typeof body.temperature === "number" ? body.temperature : 0.7,
            max_tokens: Math.min(typeof body.max_tokens === "number" ? body.max_tokens : 420, 700),
          }),
        });
        if (!upstream.ok || !upstream.body) {
          const err = await upstream.text().catch(() => upstream.statusText);
          return Response.json({ error: `upstream ${upstream.status}: ${err.slice(0, 200)}` }, { status: 502 });
        }

        const stream = new ReadableStream({
          async start(controller) {
            const reader = upstream.body!.getReader();
            const dec = new TextDecoder();
            const enc = new TextEncoder();
            let buf = "";
            const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const chunks = buf.split("\n");
                buf = chunks.pop() ?? "";
                for (const line of chunks) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const data = trimmed.slice(5).trim();
                  if (!data || data === "[DONE]") continue;
                  try {
                    const json = JSON.parse(data) as {
                      choices?: { delta?: { content?: string | null } }[];
                      error?: { message?: string };
                    };
                    if (json.error?.message) {
                      send({ error: json.error.message });
                      continue;
                    }
                    if (!json.choices?.length) continue;
                    const content = json.choices[0]?.delta?.content ?? "";
                    if (content) send({ content });
                  } catch {
                    /* keep-alive */
                  }
                }
              }
              controller.enqueue(enc.encode("data: [DONE]\n\n"));
            } catch (e) {
              send({ error: e instanceof Error ? e.message : "stream falhou" });
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
