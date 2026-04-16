import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import { useEffect } from "react";
import { GymMap } from "@/components/GymMap";
import { ProgressBar } from "@/components/ProgressBar";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Map — AF Tracker" },
      { name: "description", content: "Interactive map of all Anytime Fitness outlets in Singapore." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { locations, loading, toggleVisit, isVisited, visitedCount, totalCount, percentage } = useLocations();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      <ProgressBar visited={visitedCount} total={totalCount} percentage={percentage} />
      <GymMap locations={locations} isVisited={isVisited} onToggleVisit={toggleVisit} />
    </main>
  );
}
