import type { Location } from "@/hooks/use-locations";

export interface SearchResult {
  location: Location;
  score: number;
}

function scoreMatch(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 40;
  return 0;
}

export function searchOutlets(locations: Location[], query: string, limit = 8): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const scored: SearchResult[] = [];
  for (const location of locations) {
    const scores = [
      scoreMatch(location.name, q),
      scoreMatch(location.address, q),
      scoreMatch(location.region ?? "", q),
    ];
    const max = Math.max(...scores);
    if (max > 0) scored.push({ location, score: max });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
