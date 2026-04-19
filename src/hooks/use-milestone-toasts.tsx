import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import type { Location } from './use-locations';

const MILESTONES = [25, 50, 75, 100] as const;

interface UseMilestoneToastsOptions {
  visitedCount: number;
  totalCount: number;
  percentage: number;
  locations: Location[];
  isVisited: (id: string) => boolean;
  enabled: boolean;
}

function getCelebrated(): Set<string> {
  try {
    const raw = localStorage.getItem('af-celebrated');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markCelebrated(key: string) {
  const set = getCelebrated();
  set.add(key);
  localStorage.setItem('af-celebrated', JSON.stringify([...set]));
}

function buildRegionMap(locations: Location[], isVisited: (id: string) => boolean) {
  const map: Record<string, { total: number; visited: number }> = {};
  for (const loc of locations) {
    const r = loc.region || 'Other';
    if (!map[r]) map[r] = { total: 0, visited: 0 };
    map[r].total++;
    if (isVisited(loc.id)) map[r].visited++;
  }
  return map;
}

function fireConfetti(opts?: confetti.Options) {
  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.25 },
    colors: ['#7C42ED', '#A78BFA', '#F5A623', '#FCD34D', '#ffffff', '#c4a8ff'],
    ...opts,
  });
}

export function useMilestoneToasts({
  visitedCount,
  totalCount,
  percentage,
  locations,
  isVisited,
  enabled,
}: UseMilestoneToastsOptions) {
  const prevVisitedRef = useRef<number | null>(null);

  // Keep up-to-date refs so the effect doesn't need them as deps
  const locationsRef = useRef(locations);
  const isVisitedRef = useRef(isVisited);
  const percentageRef = useRef(percentage);
  const totalCountRef = useRef(totalCount);

  useEffect(() => { locationsRef.current = locations; });
  useEffect(() => { isVisitedRef.current = isVisited; });
  useEffect(() => { percentageRef.current = percentage; });
  useEffect(() => { totalCountRef.current = totalCount; });

  useEffect(() => {
    if (!enabled || totalCountRef.current === 0) return;

    const prev = prevVisitedRef.current;
    const currentPct = percentageRef.current;
    const currentTotal = totalCountRef.current;
    const locs = locationsRef.current;
    const visited = isVisitedRef.current;

    // ── First load: silently initialise already-achieved milestones ──────────
    if (prev === null) {
      prevVisitedRef.current = visitedCount;

      const celebrated = getCelebrated();

      for (const m of MILESTONES) {
        if (currentPct >= m && !celebrated.has(`pct-${m}`)) {
          markCelebrated(`pct-${m}`);
        }
      }

      const regionMap = buildRegionMap(locs, visited);
      for (const [region, { total, visited: rv }] of Object.entries(regionMap)) {
        if (rv === total && total > 0 && !celebrated.has(`region-${region}`)) {
          markCelebrated(`region-${region}`);
        }
      }
      return;
    }

    prevVisitedRef.current = visitedCount;

    // Only trigger on increases (marking, not un-marking)
    if (visitedCount <= prev) return;

    const celebrated = getCelebrated();
    const prevPct = currentTotal > 0 ? Math.round((prev / currentTotal) * 100) : 0;

    // ── Overall percentage milestones ─────────────────────────────────────────
    for (const m of MILESTONES) {
      const key = `pct-${m}`;
      if (!celebrated.has(key) && currentPct >= m && prevPct < m) {
        markCelebrated(key);

        if (m === 100) {
          // Grand finale: triple burst from three angles
          fireConfetti({ particleCount: 200, spread: 120, origin: { y: 0.4 } });
          setTimeout(() => fireConfetti({ particleCount: 150, spread: 90, origin: { x: 0.1, y: 0.5 }, angle: 60 }), 350);
          setTimeout(() => fireConfetti({ particleCount: 150, spread: 90, origin: { x: 0.9, y: 0.5 }, angle: 120 }), 700);
          toast('🏆 LEGEND STATUS!', {
            description: `You've conquered ALL ${currentTotal} Anytime Fitness outlets in Singapore. Absolute beast mode.`,
            duration: 8000,
          });
        } else {
          fireConfetti();
          const msgs: Record<number, { title: string; desc: string }> = {
            25: { title: '🎉 Quarter done!', desc: `${visitedCount} of ${currentTotal} outlets — you're on a roll!` },
            50: { title: '🔥 Halfway there!', desc: `${visitedCount} of ${currentTotal} outlets crushed. Keep going!` },
            75: { title: '⚡ 75% complete!', desc: `${visitedCount} of ${currentTotal} outlets. The finish line is close!` },
          };
          const { title, desc } = msgs[m];
          toast(title, { description: desc, duration: 5000 });
        }
        break; // at most one overall milestone per toggle
      }
    }

    // ── Region completions ────────────────────────────────────────────────────
    const regionMap = buildRegionMap(locs, visited);
    for (const [region, { total, visited: regionVisited }] of Object.entries(regionMap)) {
      const key = `region-${region}`;
      if (!celebrated.has(key) && regionVisited === total && total > 0) {
        markCelebrated(key);
        fireConfetti({ particleCount: 60, spread: 50, origin: { y: 0.3 } });
        toast(`🗺️ ${region} complete!`, {
          description: `All ${total} outlet${total !== 1 ? 's' : ''} in ${region} checked off!`,
          duration: 5000,
        });
        break; // at most one region toast per toggle to avoid spam
      }
    }
  }, [visitedCount, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}
