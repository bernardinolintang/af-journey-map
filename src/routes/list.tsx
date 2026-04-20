import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLocations } from "@/hooks/use-locations";
import { LocationList } from "@/components/LocationList";
import { ProgressBar } from "@/components/ProgressBar";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/list")({
  head: () => ({
    meta: [
      { title: "Outlet List — AF Tracker" },
      { name: "description", content: "Browse and filter every Anytime Fitness outlet in Singapore." },
    ],
  }),
  component: ListPage,
});

function ListPage() {
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
      <LocationList locations={locations} isVisited={isVisited} onToggleVisit={handleToggle} />
    </main>
  );
}
