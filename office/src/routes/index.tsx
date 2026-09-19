import { createFileRoute } from "@tanstack/react-router";
import { OpsShell } from "@/components/ops/ops-shell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <OpsShell />;
}
