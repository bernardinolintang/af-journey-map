import type { Location, Visit } from "@/hooks/use-locations";
import { haversine, type LatLng } from "@/lib/geo";

export interface RegionStat {
  region: string;
  total: number;
  visited: number;
  pct: number;
}

export function computeRegionStats(
  locations: Location[],
  isVisited: (id: string) => boolean,
): RegionStat[] {
  const map: Record<string, { total: number; visited: number }> = {};
  for (const loc of locations) {
    const r = loc.region || "Other";
    if (!map[r]) map[r] = { total: 0, visited: 0 };
    map[r].total++;
    if (isVisited(loc.id)) map[r].visited++;
  }
  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([region, { total, visited }]) => ({
      region,
      total,
      visited,
      pct: total > 0 ? Math.round((visited / total) * 100) : 0,
    }));
}

export function bestAndWeakestRegions(stats: RegionStat[]): {
  best: RegionStat | null;
  weakest: RegionStat | null;
} {
  if (stats.length === 0) return { best: null, weakest: null };
  const sorted = [...stats].sort((a, b) => b.pct - a.pct || b.visited - a.visited);
  return {
    best: sorted[0] ?? null,
    weakest: sorted[sorted.length - 1] ?? null,
  };
}

export function findNearestUnvisited(
  locations: Location[],
  isVisited: (id: string) => boolean,
  from?: LatLng | null,
): Location | null {
  const unvisited = locations.filter((l) => !isVisited(l.id));
  if (!unvisited.length) return null;
  if (!from) return unvisited[0];
  return unvisited.reduce((best, loc) =>
    haversine(from, loc) < haversine(from, best) ? loc : best,
  );
}

export function findLatestVisited(
  locations: Location[],
  visits: Visit[],
): { location: Location; visit: Visit } | null {
  if (!visits.length) return null;
  const sorted = [...visits].sort(
    (a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime(),
  );
  for (const visit of sorted) {
    const location = locations.find((l) => l.id === visit.location_id);
    if (location) return { location, visit };
  }
  return null;
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  achieved: boolean;
}

export function computeAchievements(
  visitedCount: number,
  totalCount: number,
  percentage: number,
  regionStats: RegionStat[],
): Achievement[] {
  const central = regionStats.find((r) => r.region === "Central");
  return [
    {
      id: "first-10",
      label: "First 10 Visits",
      description: "Visit 10 outlets",
      achieved: visitedCount >= 10,
    },
    {
      id: "25pct",
      label: "25% Complete",
      description: "Reach 25% completion",
      achieved: percentage >= 25,
    },
    {
      id: "50pct",
      label: "50% Complete",
      description: "Reach 50% completion",
      achieved: percentage >= 50,
    },
    {
      id: "central-explorer",
      label: "Central Explorer",
      description: "Complete all Central outlets",
      achieved: central?.pct === 100,
    },
    {
      id: "islandwide",
      label: "Islandwide Grinder",
      description: "Visit every outlet in Singapore",
      achieved: totalCount > 0 && visitedCount >= totalCount,
    },
  ];
}
