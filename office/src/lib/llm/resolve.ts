import { CAPABILITIES } from "./models";

export { CAPABILITIES };
export type { Capability } from "./models";
export const NL_BASE = "https://api.neuralake.cloud/v1";
export const XAI_BASE = "https://api.x.ai/v1";

export type Upstream = {
  base: string;
  key: string;
  provider: "neuralake" | "xai";
  modelFor: (cap: string) => string;
};

export function cleanKey(raw: string) {
  return raw.replace(/\s+/g, "").trim();
}

export function resolveUpstream(userKey?: string | null): Upstream | null {
  const nl = userKey ? cleanKey(userKey) : "";
  if (nl) {
    return {
      base: NL_BASE,
      key: nl,
      provider: "neuralake",
      modelFor: (cap) => (CAPABILITIES as readonly string[]).includes(cap) ? cap : "text",
    };
  }
  const xai = process.env.XAI_API_KEY;
  if (xai) {
    return {
      base: XAI_BASE,
      key: xai,
      provider: "xai",
      modelFor: () => "grok-4.5",
    };
  }
  return null;
}

export function hintOf(key: string) {
  if (key.length < 8) return "••••";
  return `${key.slice(0, 5)}…${key.slice(-4)}`;
}
