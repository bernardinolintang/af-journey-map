import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLocations } from "@/hooks/use-locations";
import { useMilestoneToasts } from "@/hooks/use-milestone-toasts";
import { GoogleMapView } from "@/components/GoogleMapView";
import { ProgressBar } from "@/components/ProgressBar";
import { RegionStats } from "@/components/RegionStats";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

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
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const {
    locations,
    visits,
    loading,
    toggleVisit,
    isVisited,
    visitedCount,
    totalCount,
    percentage,
    isAuthed,
  } = useLocations();

  useMilestoneToasts({
    visitedCount,
    totalCount,
    percentage,
    locations,
    isVisited,
    enabled: isAuthed,
  });

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
    <main className="flex flex-col" style={{ height: 'calc(100svh - 60px)' }}>
      <div className="px-4 sm:px-6 pt-3 pb-2 w-full space-y-2">
        <ProgressBar
          visited={visitedCount}
          total={totalCount}
          percentage={percentage}
          loggedOut={!isAuthed}
          locations={locations}
          isVisited={isVisited}
        />
        {isAuthed && locations.length > 0 && (
          <RegionStats
            locations={locations}
            isVisited={isVisited}
            activeRegion={activeRegion}
            onRegionClick={setActiveRegion}
          />
        )}
      </div>
      <div className="flex-1 px-4 sm:px-6 pb-4 min-h-0">
        <GoogleMapView
          locations={locations}
          visits={visits}
          isVisited={isVisited}
          onToggleVisit={handleToggle}
          regionFilter={activeRegion}
        />
      </div>
    </main>
  );
}
