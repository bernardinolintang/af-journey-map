import { useState, useMemo } from 'react';
import type { Location } from '@/hooks/use-locations';
import { Check, MapPin, Search, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationListProps {
  locations: Location[];
  isVisited: (id: string) => boolean;
  onToggleVisit: (id: string) => void;
}

type SortKey = 'name' | 'region' | 'visited';
type SortDir = 'asc' | 'desc';

export function LocationList({ locations, isVisited, onToggleVisit }: LocationListProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState<'all' | 'visited' | 'unvisited'>('all');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let result = [...locations];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        (l.region?.toLowerCase().includes(q))
      );
    }

    if (filter === 'visited') result = result.filter(l => isVisited(l.id));
    if (filter === 'unvisited') result = result.filter(l => !isVisited(l.id));

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'region') cmp = (a.region ?? '').localeCompare(b.region ?? '');
      else if (sortKey === 'visited') cmp = (isVisited(a.id) ? 1 : 0) - (isVisited(b.id) ? 1 : 0);
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [locations, search, sortKey, sortDir, filter, isVisited]);

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search outlets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'visited', 'unvisited'] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize text-xs"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div className="hidden sm:grid grid-cols-[1fr_1fr_120px_80px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort('name')}>
          Name <ArrowUpDown className="w-3 h-3" />
        </button>
        <span>Address</span>
        <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort('region')}>
          Region <ArrowUpDown className="w-3 h-3" />
        </button>
        <button className="flex items-center gap-1 justify-center hover:text-foreground transition-colors" onClick={() => toggleSort('visited')}>
          Status <ArrowUpDown className="w-3 h-3" />
        </button>
      </div>

      {/* Rows */}
      <div className="space-y-1.5">
        {filtered.map(loc => {
          const visited = isVisited(loc.id);
          return (
            <div
              key={loc.id}
              className={`group rounded-lg border transition-all cursor-pointer ${
                visited
                  ? 'bg-primary/5 border-primary/20 hover:border-primary/40'
                  : 'bg-card border-border hover:border-muted-foreground/30'
              }`}
              onClick={() => onToggleVisit(loc.id)}
            >
              {/* Desktop row */}
              <div className="hidden sm:grid grid-cols-[1fr_1fr_120px_80px] gap-2 items-center px-4 py-3">
                <div className="flex items-center gap-2">
                  <MapPin className={`w-4 h-4 shrink-0 ${visited ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-medium text-sm truncate">{loc.name}</span>
                </div>
                <span className="text-xs text-muted-foreground truncate">{loc.address}</span>
                <span className="text-xs text-muted-foreground">{loc.region || '—'}</span>
                <div className="flex justify-center">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                    visited
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-muted-foreground/30 group-hover:border-primary/50'
                  }`}>
                    {visited && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>

              {/* Mobile card */}
              <div className="sm:hidden flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  visited
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {visited ? <Check className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{loc.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{loc.address}</p>
                </div>
                {loc.region && (
                  <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full shrink-0">
                    {loc.region}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No outlets found matching your search.
        </div>
      )}
    </div>
  );
}
