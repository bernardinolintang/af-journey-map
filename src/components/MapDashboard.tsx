import { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp, Target } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { ProgressBar } from "@/components/ProgressBar";
import { RegionStats } from "@/components/RegionStats";
import type { Location, Visit } from "@/hooks/use-locations";
import { useUserLocation } from "@/hooks/use-user-location";
import { formatDistance, haversine } from "@/lib/geo";
import { findNearestUnvisited } from "@/lib/journey-stats";

const STORAGE_KEY = "af-dashboard-collapsed";

function readInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === "1";
  return window.matchMedia("(max-width: 639px)").matches;
}

interface MapDashboardProps {
  visited: number;
  total: number;
  percentage: number;
  loggedOut?: boolean;
  locations: Location[];
  visits: Visit[];
  isVisited: (id: string) => boolean;
  displayName?: string | null;
  activeRegion: string | null;
  onRegionClick: (region: string | null) => void;
}

export function MapDashboard({
  visited,
  total,
  percentage,
  loggedOut,
  locations,
  visits,
  isVisited,
  displayName,
  activeRegion,
  onRegionClick,
}: MapDashboardProps) {
  const navigate = useNavigate();
  const { position: userPos } = useUserLocation();
  const [collapsed, setCollapsed] = useState(readInitialCollapsed);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || loggedOut) return;
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed, hydrated, loggedOut]);

  const nearestUnvisited = useMemo(
    () => (locations.length ? findNearestUnvisited(locations, isVisited, userPos) : null),
    [locations, isVisited, userPos],
  );

  const nearestDistance = useMemo(() => {
    if (!nearestUnvisited || !userPos) return null;
    return formatDistance(haversine(userPos, nearestUnvisited));
  }, [nearestUnvisited, userPos]);

  if (loggedOut) {
    return (
      <ProgressBar
        visited={visited}
        total={total}
        percentage={percentage}
        loggedOut
        locations={locations}
        visits={visits}
        isVisited={isVisited}
      />
    );
  }

  if (!hydrated) {
    return (
      <div className="h-11 bg-card border border-border rounded-xl flex items-center px-3">
        <div className="w-24 h-1.5 bg-muted rounded-full animate-pulse" />
      </div>
    );
  }

  const compactBar = (
    <div className="h-11 flex items-center gap-2 sm:gap-3 px-3 bg-card border border-border rounded-xl">
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-12 sm:w-14 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
          <div
            className="h-full bg-gradient-to-r from-primary to-af-purple-light rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs font-bold whitespace-nowrap">
          <span className="text-af-orange">{visited}</span>
          <span className="text-muted-foreground font-medium">/{total}</span>
          <span className="text-primary ml-1">{percentage}%</span>
        </span>
      </div>

      {nearestUnvisited ? (
        <button
          type="button"
          onClick={() => navigate({ to: "/", search: { loc: nearestUnvisited.id } })}
          className="flex-1 min-w-0 text-left flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        >
          <Target className="w-3 h-3 text-af-orange shrink-0" />
          <span className="text-xs truncate">
            <span className="text-muted-foreground">Next: </span>
            <span className="font-semibold text-foreground">{nearestUnvisited.name}</span>
            {nearestDistance && (
              <span className="text-muted-foreground hidden sm:inline"> · {nearestDistance}</span>
            )}
          </span>
        </button>
      ) : (
        <span className="flex-1 text-xs text-muted-foreground truncate">All outlets visited 🏆</span>
      )}

      {activeRegion && (
        <span className="hidden sm:inline text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
          {activeRegion}
        </span>
      )}

      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-1 rounded-lg transition-colors"
        title="Expand stats"
        aria-expanded={false}
      >
        <span className="hidden sm:inline">Stats</span>
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );

  const expandedPanel = (
    <div className="space-y-2">
      <ProgressBar
        visited={visited}
        total={total}
        percentage={percentage}
        locations={locations}
        visits={visits}
        isVisited={isVisited}
        displayName={displayName}
      />
      {locations.length > 0 && (
        <RegionStats
          locations={locations}
          isVisited={isVisited}
          activeRegion={activeRegion}
          onRegionClick={onRegionClick}
        />
      )}
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className="w-full flex items-center justify-center gap-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={true}
      >
        <ChevronUp className="w-3.5 h-3.5" />
        Minimize stats · maximize map
      </button>
    </div>
  );

  return (
    <div className="relative">
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
          collapsed ? "max-h-11 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
        aria-hidden={!collapsed}
      >
        {compactBar}
      </div>

      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
          collapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[800px] opacity-100"
        }`}
        aria-hidden={collapsed}
      >
        {expandedPanel}
      </div>
    </div>
  );
}
