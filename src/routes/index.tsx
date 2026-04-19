import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useLocations } from "@/hooks/use-locations";
import { ProgressBar } from "@/components/ProgressBar";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// Leaflet requires window — lazy-load to skip SSR and eliminate the window-not-defined error
const GymMap = lazy(() =>
  import("@/components/GymMap").then((m) => ({ default: m.GymMap }))
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AF Tracker — Track Your Anytime Fitness Visits" },
      { name: "description", content: "Interactive map of every Anytime Fitness outlet in Singapore. Track the ones you've visited." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const {
    locations,
    loading,
    toggleVisit,
    isVisited,
    visitedCount,
    totalCount,
    percentage,
    isAuthed,
  } = useLocations();

  const handleToggle = async (id: string) => {
    const { requiresAuth } = await toggleVisit(id);
    if (requiresAuth) {
      toast("Sign in to track your visits", {
        description: "Create a free account to save which outlets you've been to.",
        action: {
          label: "Sign in",
          onClick: () => navigate({ to: "/login" }),
        },
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      <ProgressBar
        visited={visitedCount}
        total={totalCount}
        percentage={percentage}
        loggedOut={!isAuthed}
      />
      <Suspense fallback={
        <div className="rounded-xl border border-border bg-muted/30 flex items-center justify-center" style={{ height: '50vh', minHeight: '350px' }}>
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }>
        <GymMap locations={locations} isVisited={isVisited} onToggleVisit={handleToggle} />
      </Suspense>
    </main>
  );
}
