import { useMemo } from 'react';
import type { Location } from '@/hooks/use-locations';

interface RegionStatsProps {
  locations: Location[];
  isVisited: (id: string) => boolean;
  activeRegion: string | null;
  onRegionClick: (region: string | null) => void;
}

export function RegionStats({ locations, isVisited, activeRegion, onRegionClick }: RegionStatsProps) {
  const stats = useMemo(() => {
    const map: Record<string, { total: number; visited: number }> = {};
    for (const loc of locations) {
      const r = loc.region || 'Other';
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
  }, [locations, isVisited]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {stats.map(({ region, total, visited, pct }) => {
        const active = activeRegion === region;
        return (
          <button
            key={region}
            type="button"
            onClick={() => onRegionClick(active ? null : region)}
            className={`text-left rounded-xl px-3 py-2.5 flex flex-col gap-1.5 border transition-all ${
              active
                ? 'bg-violet-500/30 border-violet-400 ring-2 ring-violet-400/60 shadow-[0_0_12px_rgba(139,92,246,0.35)]'
                : 'bg-card border-border hover:border-primary/30 hover:bg-primary/5'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-foreground truncate">{region}</span>
              <span className={`text-[10px] font-bold shrink-0 ${pct === 100 ? 'text-af-orange' : 'text-primary'}`}>
                {pct}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: pct === 100 ? 'oklch(0.72 0.17 55)' : 'oklch(0.52 0.24 295)',
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {visited} / {total} outlets
            </p>
          </button>
        );
      })}
    </div>
  );
}
