import { useEffect, useRef } from "react";
import { AGENTS, BOARD_POS, ESCROW_POS, MEET, ROOMS, WORLD, colorOf, tagOf } from "@/lib/ops/world";
import { useOps } from "@/lib/ops/store";
import type { AgentBody, AgentId, Packet } from "@/lib/ops/types";

type Pal = {
  floor: string;
  room: string;
  stroke: string;
  ink: string;
  muted: string;
  desk: string;
  screen: string;
  grid: string;
  bubble: string;
  bubbleFg: string;
  scan: string;
};

function pal(): Pal {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    floor: v("--office-floor") || "#e8e2d6",
    room: v("--office-room") || "#fffcf6",
    stroke: v("--office-stroke") || "rgba(28,27,24,0.14)",
    ink: v("--office-ink") || "#1c1b18",
    muted: v("--office-muted") || "#6b6860",
    desk: v("--office-desk") || "#ddd6c8",
    screen: v("--office-screen") || "#cfc8ba",
    grid: v("--office-grid") || "rgba(28,27,24,0.06)",
    bubble: v("--office-bubble") || "#1c1b18",
    bubbleFg: v("--office-bubble-fg") || "#fffcf6",
    scan: v("--office-scan") || "transparent",
  };
}

function drawRoom(ctx: CanvasRenderingContext2D, r: (typeof ROOMS)[number], t: number, p: Pal) {
  ctx.fillStyle = p.room;
  ctx.strokeStyle = p.stroke;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = p.muted;
  ctx.font = "500 9px 'JetBrains Mono', monospace";
  ctx.fillText(r.label, r.x + 8, r.y + 15);
  const pulse = 0.15 + Math.sin(t * 3) * 0.08;
  ctx.fillStyle = p.ink;
  ctx.globalAlpha = pulse;
  ctx.fillRect(r.x + r.w - 10, r.y + 8, 4, 4);
  ctx.globalAlpha = 1;
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, typing: boolean, phase: number, p: Pal) {
  ctx.fillStyle = p.desk;
  ctx.fillRect(x - 26, y + 6, 52, 14);
  ctx.fillStyle = p.screen;
  ctx.fillRect(x - 12, y - 10, 20, 14);
  const glow = typing ? 0.35 + Math.abs(Math.sin(phase * 6)) * 0.45 : 0.12;
  ctx.fillStyle = `rgba(47, 122, 100, ${glow})`;
  ctx.fillRect(x - 10, y - 8, 16, 9);
}

function bezier(ax: number, ay: number, bx: number, by: number, t: number): [number, number] {
  const cx = (ax + bx) / 2;
  const cy = Math.min(ay, by) - 32;
  const u = 1 - t;
  return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by];
}

function drawPacket(ctx: CanvasRenderingContext2D, pkt: Packet, bodies: Record<AgentId, AgentBody>, p: Pal) {
  const a = bodies[pkt.from];
  const b = pkt.to === "*" ? { x: MEET.x, y: MEET.y } : bodies[pkt.to];
  if (!a || !b) return;
  const t = Math.min(1, Math.max(0, pkt.t));
  const [x, y] = bezier(a.x, a.y - 10, b.x, b.y - 10, t);
  ctx.strokeStyle = p.stroke;
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = -t * 24;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - 8);
  const [mx, my] = bezier(a.x, a.y - 10, b.x, b.y - 10, 0.5);
  ctx.quadraticCurveTo(mx, my - 8, b.x, b.y - 8);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = colorOf(pkt.from);
  ctx.fillRect(x - 4, y - 4, 8, 8);
  ctx.fillStyle = p.muted;
  ctx.font = "400 8px 'JetBrains Mono', monospace";
  ctx.fillText(pkt.id, x + 7, y - 2);
}

function drawOctopus(ctx: CanvasRenderingContext2D, b: AgentBody, color: string, human: boolean, p: Pal) {
  const ph = b.walkPhase;
  const walk = b.action === "walk";
  const tap = b.action === "type" || b.action === "tool";
  const talk = b.action === "talk";
  const think = b.action === "think";
  const bob = walk ? Math.sin(ph * 2) * 1.6 : tap ? Math.sin(ph * 4) * 0.5 : 0;
  const x = b.x;
  const y = b.y + bob;
  const face = b.facing >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.2 * face, 1.2);

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 13, 12, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const amp = walk ? 5.2 : tap ? 3.4 : talk ? 2.4 : 1.6;
  const n = 8;
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * 2 - 1;
    const baseX = t * 6.5;
    const sway = Math.sin(ph * (walk ? 3.2 : 2.2) + i * 0.7) * amp;
    const tapNudge = tap && Math.abs(t) > 0.45 ? Math.sin(ph * 6 + i) * 3.2 : 0;
    ctx.lineWidth = 2.1 - Math.abs(t) * 0.35;
    ctx.beginPath();
    ctx.moveTo(baseX * 0.4, 2);
    ctx.quadraticCurveTo(baseX * 1.1 + sway * 0.35, 8, baseX * 1.35 + sway + tapNudge, 15 + Math.abs(t) * 2);
    ctx.stroke();
  }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, -2, 9.2, 8.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 3.2, 7.4, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = human ? "#f0ebe3" : "#f4f1ea";
  ctx.beginPath();
  ctx.ellipse(-3.4, -3.2, 2.5, 3.1, 0, 0, Math.PI * 2);
  ctx.ellipse(3.4, -3.2, 2.5, 3.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1e24";
  ctx.beginPath();
  ctx.arc(-3.1 + (think ? Math.sin(ph) * 0.4 : 0), -3.1, 1.15, 0, Math.PI * 2);
  ctx.arc(3.7, -3.1, 1.15, 0, Math.PI * 2);
  ctx.fill();

  if (talk) {
    ctx.fillStyle = "#1a1e24";
    ctx.beginPath();
    ctx.ellipse(0, 2.2, 2.2, 1.4 + Math.abs(Math.sin(ph * 6)) * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (human) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-5, -10);
    ctx.lineTo(-3, -14);
    ctx.lineTo(0, -11);
    ctx.lineTo(3, -14);
    ctx.lineTo(5, -10);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "600 6px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("H", 0, -16);
  }

  ctx.restore();
  ctx.fillStyle = p.muted;
  ctx.font = "500 8px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${tagOf(b.id)}`, x, y - 26);
  ctx.textAlign = "start";
  if (b.bubble) {
    const label = b.bubble.length > 46 ? `${b.bubble.slice(0, 46)}…` : b.bubble;
    ctx.font = "400 9px 'JetBrains Mono', monospace";
    const w = Math.min(230, ctx.measureText(label).width + 12);
    const bx = x - w / 2;
    const by = y - 48;
    ctx.fillStyle = p.bubble;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, 16, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = p.bubbleFg;
    ctx.fillText(label, bx + 6, by + 11);
  }
}

export function OfficeCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const selected = useOps((s) => s.selected);
  const select = useOps((s) => s.select);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    const fit = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = Math.max(220, parent.clientHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      useOps.getState().step(dt);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const p = pal();
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = p.floor;
      ctx.fillRect(0, 0, w, h);
      const sc = Math.min(w / WORLD.w, h / WORLD.h);
      const ox = (w - WORLD.w * sc) / 2;
      const oy = (h - WORLD.h * sc) / 2;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(sc, sc);
      ctx.strokeStyle = p.grid;
      for (let gx = 0; gx < WORLD.w; gx += 24) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, WORLD.h);
        ctx.stroke();
      }
      const tsec = now / 1000;
      for (const room of ROOMS) drawRoom(ctx, room, tsec, p);

      const st = useOps.getState();
      ctx.fillStyle = p.room;
      ctx.strokeStyle = p.stroke;
      ctx.fillRect(BOARD_POS.x - 52, BOARD_POS.y, 128, 70);
      ctx.strokeRect(BOARD_POS.x - 52, BOARD_POS.y, 128, 70);
      ctx.fillStyle = p.muted;
      ctx.font = "500 8px 'JetBrains Mono', monospace";
      ctx.fillText("SLA · 4 FIELDS", BOARD_POS.x - 44, BOARD_POS.y + 14);
      ctx.fillStyle = p.ink;
      ctx.fillText("html → PDF A4", BOARD_POS.x - 44, BOARD_POS.y + 30);
      ctx.fillStyle = p.muted;
      ctx.fillText("max $0.05 · 30s", BOARD_POS.x - 44, BOARD_POS.y + 44);
      ctx.fillText("min conf 0.95", BOARD_POS.x - 44, BOARD_POS.y + 56);

      const lock =
        st.escrow === "LOCKED"
          ? "#9a6b1f"
          : st.escrow === "RELEASED"
            ? "#2f7a64"
            : st.escrow === "WITHHELD" || st.escrow === "REFUNDED"
              ? "#b4454c"
              : st.escrow === "ESCALATED"
                ? "#9a6b1f"
                : p.muted;
      ctx.fillStyle = p.room;
      ctx.strokeStyle = lock;
      ctx.fillRect(ESCROW_POS.x - 48, ESCROW_POS.y - 18, 96, 36);
      ctx.strokeRect(ESCROW_POS.x - 48, ESCROW_POS.y - 18, 96, 36);
      ctx.fillStyle = lock;
      ctx.font = "500 8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`ESCROW ${st.escrow}`, ESCROW_POS.x, ESCROW_POS.y - 2);
      ctx.fillText(st.delivered !== null ? `conf ${st.delivered}` : "awaiting", ESCROW_POS.x, ESCROW_POS.y + 12);
      ctx.textAlign = "start";

      for (const a of AGENTS) {
        const typing = st.bodies[a.id].action === "type" || st.bodies[a.id].action === "tool";
        drawDesk(ctx, a.desk.x, a.desk.y, typing, st.bodies[a.id].walkPhase, p);
      }
      for (const pkt of st.packets) drawPacket(ctx, pkt, st.bodies, p);
      const order = (Object.keys(st.bodies) as AgentId[]).sort((a, b) => st.bodies[a].y - st.bodies[b].y);
      for (const id of order) {
        const def = AGENTS.find((x) => x.id === id)!;
        drawOctopus(ctx, st.bodies[id], def.color, !!def.human, p);
        if (st.selected === id) {
          ctx.strokeStyle = p.ink;
          ctx.globalAlpha = 0.45;
          ctx.beginPath();
          ctx.arc(st.bodies[id].x, st.bodies[id].y + 2, 18, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
      if (p.scan !== "transparent" && p.scan) {
        ctx.fillStyle = p.scan;
        for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const hit = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const sc = Math.min(w / WORLD.w, h / WORLD.h);
    const ox = (w - WORLD.w * sc) / 2;
    const oy = (h - WORLD.h * sc) / 2;
    const x = (ev.clientX - rect.left - ox) / sc;
    const y = (ev.clientY - rect.top - oy) / sc;
    const bodies = useOps.getState().bodies;
    let best: AgentId | null = null;
    let bestD = 26;
    for (const id of Object.keys(bodies) as AgentId[]) {
      const d = Math.hypot(bodies[id].x - x, bodies[id].y - y);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    if (best) select(best);
  };

  return (
    <canvas
      ref={ref}
      className="block h-full w-full touch-none"
      onClick={hit}
      aria-label="Office"
      data-selected={selected}
    />
  );
}
