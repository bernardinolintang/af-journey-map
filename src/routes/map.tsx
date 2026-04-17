import { createFileRoute, redirect } from "@tanstack/react-router";

// /map redirects to / — the map lives at the root
export const Route = createFileRoute("/map")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
