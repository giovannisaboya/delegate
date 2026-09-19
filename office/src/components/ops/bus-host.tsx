import { useEffect } from "react";
import { createSimTransport } from "@/lib/a2a/transport";
import { useOps } from "@/lib/ops/store";

export function BusHost() {
  const mode = useOps((s) => s.mode);
  const setSource = useOps((s) => s.setSource);
  const ingest = useOps((s) => s.ingest);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { __opsSpeed?: number }).__opsSpeed = useOps.getState().speed;
    }
    if (mode !== "replay") {
      setSource("live");
      return;
    }
    const t = createSimTransport();
    setSource("sim");
    const stop = t.start((e) => {
      if (!useOps.getState().paused) ingest(e);
    });
    return stop;
  }, [mode, ingest, setSource]);

  return null;
}
