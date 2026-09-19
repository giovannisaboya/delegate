import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/classic")({ component: Classic });

function Classic() {
  return <Navigate to="/" />;
}
