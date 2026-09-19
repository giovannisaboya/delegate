const KEY = "neuralake_api_key";

export function loadNlKey() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY) ?? "";
}

export function saveNlKey(v: string) {
  const k = v.replace(/\s+/g, "").trim();
  if (k) localStorage.setItem(KEY, k);
  else localStorage.removeItem(KEY);
}

export function llmHeaders() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const k = loadNlKey();
  if (k) h["x-neuralake-key"] = k;
  return h;
}

export type ChatPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatTurn = { role: "system" | "user" | "assistant"; content: string | ChatPart[] };

export type Attachment = {
  name: string;
  mime: string;
  kind: "text" | "image" | "binary";
  text?: string;
  dataUrl?: string;
  bytes: number;
};

const TEXT_OK = /\.(html?|txt|md|json|csv|css|js|ts|xml|svg)$/i;
const IMG_OK = /^image\/(png|jpe?g|webp|gif)$/i;

function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1024;
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * s));
      c.height = Math.max(1, Math.round(img.height * s));
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("imagem ilegível"));
    };
    img.src = url;
  });
}

export async function readAttachment(file: File): Promise<Attachment> {
  if (file.size > 1_200_000) throw new Error(`${file.name} > 1.2MB`);
  if (IMG_OK.test(file.type)) {
    return {
      name: file.name,
      mime: file.type,
      kind: "image",
      dataUrl: await shrinkImage(file),
      bytes: file.size,
    };
  }
  if (TEXT_OK.test(file.name) || file.type.startsWith("text/") || file.type === "application/json") {
    const raw = await file.text();
    return {
      name: file.name,
      mime: file.type || "text/plain",
      kind: "text",
      text: raw.slice(0, 12000),
      bytes: file.size,
    };
  }
  return { name: file.name, mime: file.type || "application/octet-stream", kind: "binary", bytes: file.size };
}

export function partsFrom(job: string, files: Attachment[]): ChatPart[] {
  const parts: ChatPart[] = [];
  const bits = [job];
  for (const f of files) {
    if (f.kind === "text" && f.text) bits.push(`\n\n--- arquivo ${f.name} ---\n${f.text}`);
    else if (f.kind === "binary") bits.push(`\n[anexo ${f.name} · ${f.mime} · ${f.bytes}b — binário, descreva o que precisa]`);
    else bits.push(`\n[imagem anexada: ${f.name}]`);
  }
  parts.push({ type: "text", text: bits.join("") });
  for (const f of files) {
    if (f.kind === "image" && f.dataUrl) parts.push({ type: "image_url", image_url: { url: f.dataUrl } });
  }
  return parts;
}

export async function streamChat(input: {
  model: string;
  messages: ChatTurn[];
  voice: boolean;
  onToken: (t: string) => void;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: llmHeaders(),
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      temperature: input.voice ? 0.6 : 0.7,
      max_tokens: input.voice ? 180 : 420,
    }),
  });
  if (!res.ok || !res.body) {
    const err = await res.text().catch(() => res.statusText);
    return { ok: false, error: err.slice(0, 240) || `HTTP ${res.status}` };
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data) as { content?: string; error?: string };
        if (json.error) return { ok: false, error: json.error };
        if (json.content) {
          text += json.content;
          input.onToken(json.content);
        }
      } catch {
        /* ignore keep-alive */
      }
    }
  }
  return { ok: true, text };
}

export async function dispatchJob(job: string, model: string) {
  const res = await fetch("/api/turn", {
    method: "POST",
    headers: llmHeaders(),
    body: JSON.stringify({ job, model }),
  });
  const body = (await res.json()) as { ok: boolean; events?: unknown; error?: string };
  if (!res.ok || !body.ok) return { ok: false as const, error: body.error ?? `HTTP ${res.status}` };
  return { ok: true as const, events: body.events };
}
