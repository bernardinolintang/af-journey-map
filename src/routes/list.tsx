import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import { LocationList } from "@/components/LocationList";
import { ProgressBar } from "@/components/ProgressBar";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/list")({
  head: () => ({
    meta: [
      { title: "Outlet List — AF Tracker" },
      { name: "description", content: "Browse and filter all Anytime Fitness outlets in Singapore." },
    ],
  }),
  component: ListPage,
});

function ListPage() {
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
      <LocationList locations={locations} isVisited={isVisited} onToggleVisit={toggleVisit} isLoggedIn={!!user} />
    </main>
  );
}
