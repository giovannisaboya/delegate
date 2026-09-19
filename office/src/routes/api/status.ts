import { createFileRoute } from "@tanstack/react-router";
import { CAPABILITIES, hintOf, resolveUpstream } from "@/lib/llm/resolve";

export const Route = createFileRoute("/api/status")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const userKey = request.headers.get("x-neuralake-key");
        const up = resolveUpstream(userKey);
        if (!up) {
          return Response.json({
            configured: false,
            provider: null,
            models: CAPABILITIES,
            base_url: null,
          });
        }
        return Response.json({
          configured: true,
          provider: up.provider,
          models: CAPABILITIES,
          base_url: up.base,
          key_hint: userKey ? hintOf(userKey) : up.provider === "xai" ? "xai · injected" : hintOf(up.key),
        });
      },
    },
  },
});
