import { useMemo, useRef, useState, useCallback } from 'react';
import type { Location } from '@/hooks/use-locations';

interface RegionStatsProps {
  locations: Location[];
  isVisited: (id: string) => boolean;
  activeRegion: string | null;
  onRegionClick: (region: string | null) => void;
}

export function RegionStats({ locations, isVisited, activeRegion, onRegionClick }: RegionStatsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 8;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(!atEnd);
    if (atEnd) {
      setActiveIndex(stats.length - 1);
    } else {
      const cardWidth = el.scrollWidth / stats.length;
      setActiveIndex(Math.round(el.scrollLeft / cardWidth));
    }
  }, [stats.length]);

  return (
    <div className="sm:contents">
      {/* Mobile carousel wrapper */}
      <div className="relative sm:hidden">
        {/* Left fade */}
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 transition-opacity duration-200 rounded-l-xl"
          style={{
            opacity: canScrollLeft ? 1 : 0,
            background: 'linear-gradient(to right, var(--color-background, #0c0f1a) 10%, transparent)',
          }}
        />
        {/* Right fade */}
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 transition-opacity duration-200 rounded-r-xl"
          style={{
            opacity: canScrollRight ? 1 : 0,
            background: 'linear-gradient(to left, var(--color-background, #0c0f1a) 10%, transparent)',
          }}
        />

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-1"
        >
          {stats.map(({ region, total, visited, pct }) => {
            const active = activeRegion === region;
            return (
              <button
                key={region}
                type="button"
                onClick={() => onRegionClick(active ? null : region)}
                className={`snap-start shrink-0 w-[44vw] text-left rounded-xl px-3 py-2.5 flex flex-col gap-1.5 border transition-all ${
                  active
                    ? 'bg-violet-500/30 border-violet-400 ring-2 ring-violet-400/60 shadow-[0_0_12px_rgba(139,92,246,0.35)]'
                    : 'bg-card border-border'
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

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mt-2">
          {stats.map((s, i) => (
            <button
              key={s.region}
              type="button"
              aria-label={`Go to ${s.region}`}
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                const cardWidth = el.scrollWidth / stats.length;
                el.scrollTo({ left: cardWidth * i, behavior: 'smooth' });
                setActiveIndex(i);
              }}
              className={`rounded-full transition-all duration-200 ${
                i === activeIndex
                  ? 'w-4 h-1.5 bg-primary'
                  : 'w-1.5 h-1.5 bg-muted-foreground/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Tablet / desktop grid (unchanged) */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-2">
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
    </div>
  );
}
