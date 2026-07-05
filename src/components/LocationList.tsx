import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Location, Visit } from "@/hooks/use-locations";
import { useUserLocation } from "@/hooks/use-user-location";
import { haversine, formatDistance } from "@/lib/geo";
import { searchOutlets } from "@/lib/search-outlets";
import { Check, MapPin, Search, ArrowUpDown, Map as MapIcon, Star, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationListProps {
  locations: Location[];
  visits: Visit[];
  isVisited: (id: string) => boolean;
  isFavourite: (id: string) => boolean;
  onToggleVisit: (id: string) => void;
  onToggleFavourite?: (id: string) => void;
}

type SortKey = "name" | "region" | "visited" | "nearest" | "recent";
type SortDir = "asc" | "desc";
type ListFilter = "all" | "visited" | "unvisited" | "favourites";

export function LocationList({
  locations,
  visits,
  isVisited,
  isFavourite,
  onToggleVisit,
  onToggleFavourite,
}: LocationListProps) {
  const navigate = useNavigate();
  const { position: userPos, requestLocation, isLoading: geoLoading } = useUserLocation();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filter, setFilter] = useState<ListFilter>("all");

  const visitMap = useMemo(() => {
    const m = new Map<string, Visit>();
    for (const v of visits) m.set(v.location_id, v);
    return m;
  }, [visits]);

  const distanceMap = useMemo(() => {
    if (!userPos) return null;
    const m = new Map<string, number>();
    for (const loc of locations) {
      m.set(loc.id, haversine(userPos, loc));
    }
    return m;
  }, [locations, userPos]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "recent" || key === "nearest" ? "desc" : "asc");
    }
  };

  const filtered = useMemo(() => {
    let result = [...locations];

    if (search.trim()) {
      const ids = new Set(searchOutlets(locations, search, 200).map((r) => r.location.id));
      result = result.filter((l) => ids.has(l.id));
    }

    if (filter === "visited") result = result.filter((l) => isVisited(l.id));
    if (filter === "unvisited") result = result.filter((l) => !isVisited(l.id));
    if (filter === "favourites") result = result.filter((l) => isFavourite(l.id));

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "region") cmp = (a.region ?? "").localeCompare(b.region ?? "");
      else if (sortKey === "visited") cmp = (isVisited(a.id) ? 1 : 0) - (isVisited(b.id) ? 1 : 0);
      else if (sortKey === "nearest" && distanceMap) {
        cmp = (distanceMap.get(a.id) ?? 999) - (distanceMap.get(b.id) ?? 999);
      } else if (sortKey === "recent") {
        const da = visitMap.get(a.id)?.visited_at ?? "";
        const db = visitMap.get(b.id)?.visited_at ?? "";
        cmp = da.localeCompare(db);
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [locations, search, sortKey, sortDir, filter, isVisited, isFavourite, distanceMap, visitMap]);

  const openInMap = (id: string) => {
    navigate({ to: "/", search: { loc: id } });
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, address, region…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: "all" as ListFilter, label: "All" },
            { key: "visited" as ListFilter, label: "Visited" },
            { key: "unvisited" as ListFilter, label: "Unvisited" },
            { key: "favourites" as ListFilter, label: "★ Starred" },
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={filter === key ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter(key)}
              className={`text-xs ${key === "favourites" && filter !== "favourites" ? "text-amber-400" : ""}`}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-1">Sort:</span>
        {[
          { key: "nearest" as SortKey, label: "Nearest", needsGeo: true },
          { key: "visited" as SortKey, label: "Unvisited first", needsGeo: false },
          { key: "recent" as SortKey, label: "Recently visited", needsGeo: false },
          { key: "region" as SortKey, label: "By region", needsGeo: false },
          { key: "name" as SortKey, label: "A–Z", needsGeo: false },
        ].map(({ key, label, needsGeo }) => (
          <Button
            key={key}
            variant={sortKey === key ? "secondary" : "ghost"}
            size="sm"
            className="text-xs h-7"
            onClick={() => {
              if (needsGeo && !userPos) requestLocation();
              toggleSort(key);
            }}
          >
            {label}
            {needsGeo && geoLoading && <Navigation className="w-3 h-3 ml-1 animate-pulse" />}
          </Button>
        ))}
      </div>

      {/* Result count */}
      <p className="text-xs text-muted-foreground px-1">
        Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
        <span className="font-medium text-foreground">{locations.length}</span> outlets
      </p>

      {/* Rows */}
      <div className="space-y-1.5">
        {filtered.map((loc) => {
          const visited = isVisited(loc.id);
          const visit = visitMap.get(loc.id);
          const dist = distanceMap?.get(loc.id);

          return (
            <div
              key={loc.id}
              className={`group rounded-lg border transition-all ${
                visited
                  ? "bg-primary/5 border-primary/20 hover:border-primary/40"
                  : "bg-card border-border hover:border-muted-foreground/30"
              }`}
            >
              {/* Desktop row */}
              <div className="hidden sm:grid grid-cols-[1fr_auto] gap-2 items-center px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <MapPin
                      className={`w-4 h-4 shrink-0 ${visited ? "text-primary" : "text-muted-foreground"}`}
                    />
                    {isFavourite(loc.id) && (
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                    )}
                    <span className="font-medium text-sm truncate">{loc.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        visited ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {visited ? "Visited" : "Unvisited"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate pl-6">{loc.address}</p>
                  <div className="flex items-center gap-2 pl-6 mt-1 text-[10px] text-muted-foreground">
                    {loc.region && <span>{loc.region}</span>}
                    {visit && (
                      <span>
                        ·{" "}
                        {new Date(visit.visited_at).toLocaleDateString("en-SG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    {dist !== undefined && <span>· {formatDistance(dist)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {onToggleFavourite && (
                    <button
                      type="button"
                      onClick={() => onToggleFavourite(loc.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                      title={isFavourite(loc.id) ? "Unstar" : "Star"}
                    >
                      <Star
                        className={`w-4 h-4 ${isFavourite(loc.id) ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`}
                      />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openInMap(loc.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors"
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    Map
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleVisit(loc.id)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      visited
                        ? "bg-primary text-primary-foreground"
                        : "border border-muted-foreground/30 hover:border-primary/50"
                    }`}
                    title={visited ? "Unmark visit" : "Mark visited"}
                  >
                    {visited && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Mobile card */}
              <div className="sm:hidden px-4 py-3 space-y-2">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      visited
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {visited ? <Check className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate flex items-center gap-1">
                      {isFavourite(loc.id) && (
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                      )}
                      {loc.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{loc.address}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {loc.region && (
                        <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                          {loc.region}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          visited ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {visited ? "Visited" : "Unvisited"}
                      </span>
                      {dist !== undefined && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistance(dist)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pl-11">
                  <button
                    type="button"
                    onClick={() => openInMap(loc.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold bg-muted text-foreground"
                  >
                    <MapIcon className="w-3.5 h-3.5" /> Open in map
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleVisit(loc.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/20 text-primary"
                  >
                    {visited ? "Unmark" : "Mark"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No outlets found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? `No results for "${search}"` : "Try a different filter"}
            </p>
          </div>
          {(search || filter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
              className="text-xs text-primary hover:underline font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
