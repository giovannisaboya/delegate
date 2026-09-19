export const CAPABILITIES = ["text", "reasoning", "code", "multimodal", "auto"] as const;
export type Capability = (typeof CAPABILITIES)[number];
