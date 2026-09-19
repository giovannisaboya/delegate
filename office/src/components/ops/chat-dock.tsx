import { useEffect, useRef, useState } from "react";
import { KeyRound, Mic, MicOff, Paperclip, Send, Volume2, X } from "lucide-react";
import { AGENTS } from "@/lib/ops/world";
import { useOps } from "@/lib/ops/store";
import type { AgentId } from "@/lib/ops/types";
import {
  type Attachment,
  type ChatTurn,
  llmHeaders,
  loadNlKey,
  partsFrom,
  readAttachment,
  saveNlKey,
  streamChat,
} from "@/lib/llm/client";
import { playLiveJob } from "@/lib/ops/live-cycle";

type ChatMsg = { role: "user" | "assistant"; content: string; agent: string };

type BrowserRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type Status = {
  configured: boolean;
  provider: "neuralake" | "xai" | null;
  key_hint?: string;
};

function tts(text: string) {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("pt"));
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function ChatDock() {
  const selected = useOps((s) => s.selected);
  const liveBusy = useOps((s) => s.liveBusy);
  const patchTalk = useOps((s) => s.patchTalk);
  const setLiveBusy = useOps((s) => s.setLiveBusy);

  const [threads, setThreads] = useState<Partial<Record<AgentId, ChatMsg[]>>>({});
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [keyOpen, setKeyOpen] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [mic, setMic] = useState(false);
  const [conv, setConv] = useState(false);
  const [speak, setSpeak] = useState(false);
  const [dispatch, setDispatch] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const recRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const agent = AGENTS.find((a) => a.id === selected) ?? AGENTS[0]!;
  const msgs = threads[selected] ?? [];

  const refreshStatus = async () => {
    const res = await fetch("/api/status", { headers: llmHeaders() });
    if (res.ok) setStatus((await res.json()) as Status);
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [msgs]);

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setErr(null);
    try {
      const next: Attachment[] = [...files];
      for (const f of Array.from(list).slice(0, 3)) {
        if (next.length >= 3) break;
        next.push(await readAttachment(f));
      }
      setFiles(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "anexo falhou");
    }
  };

  const send = async (raw: string) => {
    const job = raw.trim();
    if ((!job && !files.length) || liveBusy) return;
    setErr(null);
    setText("");
    const attached = files;
    setFiles([]);
    const label = attached.length ? `${job || "anexo"} [${attached.map((f) => f.name).join(", ")}]` : job;
    const history = [...msgs, { role: "user" as const, content: label, agent: "you" }];
    setThreads((t) => ({ ...t, [selected]: history }));
    setLiveBusy(true);
    patchTalk(selected, "…");

    const voice = conv || speak;
    const sys = `${agent.skill}${voice ? " Responda em 1–3 frases, como fala." : ""} Capacidade: ${agent.capability}. Documentos: ${agent.docs ? "aceitos" : "só texto extraído"}.`;

    const turns: ChatTurn[] = [
      { role: "system", content: sys },
      ...history.slice(0, -1).slice(-8).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: partsFrom(job || "Analise o anexo.", attached) },
    ];

    const model = attached.some((f) => f.kind === "image") ? "multimodal" : agent.capability;
    let acc = "";
    const stream = await streamChat({
      model,
      voice,
      messages: turns,
      onToken: (tkn) => {
        acc += tkn;
        patchTalk(selected, acc);
      },
    });

    if (!stream.ok) {
      setErr(stream.error);
      setLiveBusy(false);
      return;
    }
    setThreads((t) => ({
      ...t,
      [selected]: [...(t[selected] ?? history), { role: "assistant", content: stream.text, agent: agent.tag }],
    }));
    setLiveBusy(false);
    if (voice) await tts(stream.text);

    if (dispatch) {
      const brief = [job, ...attached.map((f) => f.kind === "text" && f.text ? `arquivo ${f.name}:\n${f.text.slice(0, 1500)}` : `arquivo ${f.name}`)].join("\n\n");
      const run = await playLiveJob(brief, agent.capability === "text" ? "reasoning" : agent.capability);
      if (!run.ok) setErr(run.error);
    }

    if (conv) startMic();
  };

  const startMic = () => {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => BrowserRec }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => BrowserRec }).webkitSpeechRecognition;
    if (!SR) {
      setErr("Microfone precisa de Chrome ou Edge");
      return;
    }
    recRef.current?.stop();
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const said = ev.results[0]?.[0]?.transcript ?? "";
      if (said) void send(said);
    };
    rec.onend = () => setMic(false);
    rec.onerror = () => setMic(false);
    recRef.current = rec;
    setMic(true);
    rec.start();
  };

  return (
    <div className="shrink-0 border-t border-border bg-surface">
      <div ref={box} className="max-h-24 overflow-auto px-3 py-2">
        {msgs.length === 0 ? (
          <p className="text-xs text-muted">
            {agent.tag} · {agent.capability}
            {agent.docs ? " · aceita documentos" : ""} — {agent.skill.slice(0, 140)}
          </p>
        ) : (
          msgs.slice(-6).map((m, i) => (
            <p key={i} className="text-xs leading-relaxed">
              <span className="font-mono text-muted">{m.role === "user" ? "VOCÊ" : m.agent} · </span>
              {m.content}
            </p>
          ))
        )}
      </div>
      {files.length ? (
        <div className="flex flex-wrap gap-1 px-3 pb-1">
          {files.map((f) => (
            <span key={f.name} className="inline-flex items-center gap-1 border border-border bg-elevated px-2 py-1 font-mono text-xs">
              {f.name}
              <button type="button" onClick={() => setFiles(files.filter((x) => x.name !== f.name))} aria-label="remover">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {err ? <div className="px-3 pb-1 font-mono text-xs text-err">{err}</div> : null}
      <form
        className="flex flex-wrap items-end gap-2 border-t border-border px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <span className="inline-flex min-h-11 items-center border border-border bg-elevated px-2 font-mono text-xs">
          {agent.tag} · {agent.capability}
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(text);
            }
          }}
          rows={1}
          placeholder={`Mensagem para ${agent.tag}…`}
          className="min-h-11 min-w-48 flex-1 resize-none border border-border bg-elevated px-3 py-2 text-sm"
        />
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          multiple
          accept=".html,.htm,.txt,.md,.json,.csv,.css,.js,.ts,.xml,.svg,.pdf,image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 border border-border bg-elevated px-3 text-xs"
        >
          <Paperclip className="size-3.5" />
          Anexo
        </button>
        <button
          type="submit"
          disabled={liveBusy || (!text.trim() && !files.length)}
          className="inline-flex min-h-11 items-center gap-2 bg-accent px-3 text-xs text-accent-fg disabled:opacity-40"
        >
          <Send className="size-3.5" />
          Enviar
        </button>
        <button
          type="button"
          onClick={() => (mic ? recRef.current?.stop() : startMic())}
          className="inline-flex min-h-11 items-center gap-2 border border-border bg-elevated px-3 text-xs"
        >
          {mic ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
          Mic
        </button>
        <button
          type="button"
          onClick={() => setKeyOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 border border-border bg-elevated px-3 text-xs"
        >
          <KeyRound className="size-3.5" />
          Chave
        </button>
        <label className="flex min-h-11 items-center gap-2 font-mono text-xs text-muted">
          <input type="checkbox" checked={dispatch} onChange={(e) => setDispatch(e.target.checked)} />
          despachar
        </label>
        <label className="flex min-h-11 items-center gap-2 font-mono text-xs text-muted">
          <input type="checkbox" checked={speak} onChange={(e) => setSpeak(e.target.checked)} />
          <Volume2 className="size-3.5" />
        </label>
        <label className="flex min-h-11 items-center gap-2 font-mono text-xs text-muted">
          <input
            type="checkbox"
            checked={conv}
            onChange={(e) => {
              setConv(e.target.checked);
              if (e.target.checked) {
                setSpeak(true);
                startMic();
              } else recRef.current?.stop();
            }}
          />
          conversa
        </label>
        <span className="ml-auto font-mono text-xs text-subtle">
          {status?.configured ? `${status.provider} · ${status.key_hint ?? ""}` : "cole a chave NeuraLake"}
        </span>
      </form>

      {keyOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4">
          <form
            className="w-full max-w-md border border-border bg-surface p-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveNlKey(keyDraft);
              setKeyDraft("");
              setKeyOpen(false);
              void refreshStatus();
            }}
          >
            <div className="text-sm font-medium">Chave NeuraLake</div>
            <p className="mt-1 text-xs text-muted">
              Cola exatamente como veio no painel. Fica só neste browser. Sem chave, o site usa Grok (xAI) injetado.
            </p>
            <input
              type="password"
              autoComplete="off"
              value={keyDraft || loadNlKey()}
              onChange={(e) => setKeyDraft(e.target.value)}
              className="mt-3 min-h-11 w-full border border-border bg-elevated px-3 font-mono text-xs"
              placeholder="nlk-…"
            />
            <div className="mt-3 flex gap-2">
              <button type="submit" className="min-h-11 flex-1 bg-accent text-xs text-accent-fg">
                Salvar
              </button>
              <button type="button" className="min-h-11 flex-1 border border-border text-xs" onClick={() => setKeyOpen(false)}>
                Fechar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
