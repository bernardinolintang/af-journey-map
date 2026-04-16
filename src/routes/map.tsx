import { createFileRoute } from "@tanstack/react-router";
import { useLocations } from "@/hooks/use-locations";
import { useAuth } from "@/hooks/use-auth";
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
  const { user } = useAuth();
  const { locations, loading, toggleVisit, isVisited, visitedCount, totalCount, percentage } = useLocations();

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      <ProgressBar visited={visitedCount} total={totalCount} percentage={percentage} isLoggedIn={!!user} />
      <GymMap locations={locations} isVisited={isVisited} onToggleVisit={toggleVisit} isLoggedIn={!!user} />
    </main>
  );
}
