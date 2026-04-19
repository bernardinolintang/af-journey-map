import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import type { Location, Visit } from '@/hooks/use-locations';
import {
  Check, X, Map as MapIcon, Satellite, Box, Locate, Navigation,
  Search, BarChart2, X as CloseIcon,
} from 'lucide-react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const MAP_ID = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string) || undefined;

const SG_BOUNDS = { north: 1.478, south: 1.205, east: 104.094, west: 103.595 };

const DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1f2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8896b3' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3045' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2d3555' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#374370' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1a1f2e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a6fa5' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e2535' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2e1a' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1a2035' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#3a4060' }] },
];

// ---------------------------------------------------------------------------
// Haversine distance in km
// ---------------------------------------------------------------------------
function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ---------------------------------------------------------------------------
// Outlet marker pin
// ---------------------------------------------------------------------------
function MarkerPin({ visited, nearest }: { visited: boolean; nearest?: boolean }) {
  return (
    <div style={{
      width: nearest ? 36 : 30,
      height: nearest ? 46 : 38,
      cursor: 'pointer',
      filter: nearest
        ? 'drop-shadow(0 0 10px rgba(250,180,50,0.9))'
        : visited
          ? 'drop-shadow(0 0 6px rgba(124,66,237,0.8))'
          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
      transition: 'all 0.2s ease',
    }}>
      <svg
        width={nearest ? 36 : 30}
        height={nearest ? 46 : 38}
        viewBox="0 0 30 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15 0C6.72 0 0 6.72 0 15c0 11.25 15 23 15 23s15-11.75 15-23C30 6.72 23.28 0 15 0z"
          fill={nearest ? '#F5A623' : visited ? '#7C42ED' : '#374151'}
          stroke={nearest ? '#FCD34D' : visited ? '#A78BFA' : '#6B7280'}
          strokeWidth="1.5"
        />
        <circle cx="15" cy="14" r="6" fill="rgba(255,255,255,0.22)" />
        {nearest && (
          <path d="M12 14l2 2 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {!nearest && visited && (
          <path d="M11.5 14l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </div>
  );
}

// Blue GPS dot for user location
function UserDot() {
  return (
    <div style={{ position: 'relative', width: 20, height: 20 }}>
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        background: 'rgba(66,133,244,0.2)',
        animation: 'ping 1.5s ease-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 3,
        borderRadius: '50%',
        background: '#4285F4',
        border: '2px solid white',
        boxShadow: '0 2px 6px rgba(66,133,244,0.6)',
      }} />
    </div>
  );
}

type MapMode = 'roadmap' | 'satellite' | '3d';
type MapFilter = 'all' | 'visited' | 'unvisited';

// ---------------------------------------------------------------------------
// Map controls bar (bottom-center)
// ---------------------------------------------------------------------------
function MapControls({
  mode, onModeChange,
  mapFilter, onFilterChange,
  onRecenter, onNearMe, gpsLoading,
  onToggleStats, statsOpen,
  onToggleSearch,
}: {
  mode: MapMode; onModeChange: (m: MapMode) => void;
  mapFilter: MapFilter; onFilterChange: (f: MapFilter) => void;
  onRecenter: () => void; onNearMe: () => void; gpsLoading: boolean;
  onToggleStats: () => void; statsOpen: boolean;
  onToggleSearch: () => void;
}) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 pointer-events-none">
      {/* Filter row */}
      <div className="flex items-center bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-1 gap-0.5 shadow-2xl pointer-events-auto">
        {(['all', 'visited', 'unvisited'] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all capitalize ${
              mapFilter === f
                ? 'bg-violet-600 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >{f}</button>
        ))}
      </div>

      {/* Main controls row */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {/* Map type */}
        <div className="flex items-center bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-1 gap-0.5 shadow-2xl">
          {([
            { id: 'roadmap' as MapMode, icon: <MapIcon className="w-3.5 h-3.5" />, label: 'Map' },
            { id: 'satellite' as MapMode, icon: <Satellite className="w-3.5 h-3.5" />, label: 'Sat' },
            { id: '3d' as MapMode, icon: <Box className="w-3.5 h-3.5" />, label: '3D' },
          ] as const).map(({ id, icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onModeChange(id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === id ? 'bg-violet-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {icon}<span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Near Me */}
        <button
          type="button"
          onClick={onNearMe}
          disabled={gpsLoading}
          className="h-9 px-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all shadow-2xl text-xs font-semibold disabled:opacity-50"
          title="Find nearest unvisited outlet"
        >
          <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-pulse' : ''}`} />
          <span className="hidden sm:inline">Near Me</span>
        </button>

        {/* Search toggle */}
        <button
          type="button"
          onClick={onToggleSearch}
          className="w-9 h-9 flex items-center justify-center bg-black/70 backdrop-blur-md border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all shadow-2xl"
          title="Search outlets"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Stats toggle */}
        <button
          type="button"
          onClick={onToggleStats}
          className={`w-9 h-9 flex items-center justify-center backdrop-blur-md border border-white/10 rounded-xl transition-all shadow-2xl ${
            statsOpen ? 'bg-violet-600 text-white' : 'bg-black/70 text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title="Region stats"
        >
          <BarChart2 className="w-4 h-4" />
        </button>

        {/* Recenter */}
        <button
          type="button"
          onClick={onRecenter}
          className="w-9 h-9 flex items-center justify-center bg-black/70 backdrop-blur-md border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all shadow-2xl"
          title="Recenter map"
        >
          <Locate className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Region stats overlay (top-right corner)
// ---------------------------------------------------------------------------
interface RegionEntry { region: string; total: number; visited: number; pct: number }

function StatsOverlay({ stats, onClose }: { stats: RegionEntry[]; onClose: () => void }) {
  return (
    <div style={{
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 20,
      background: 'rgba(15,18,35,0.92)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 14,
      padding: '12px 14px',
      minWidth: 200,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontFamily: '"DM Sans", system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: '#f0f2ff' }}>By Region</span>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8896b3', padding: 2 }}
        >
          <CloseIcon style={{ width: 13, height: 13 }} />
        </button>
      </div>
      {stats.map(({ region, total, visited, pct }) => (
        <div key={region} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: '#c4cfee', fontWeight: 600 }}>{region}</span>
            <span style={{ fontSize: 10, color: pct === 100 ? '#F5A623' : '#A78BFA', fontWeight: 700 }}>
              {visited}/{total}
            </span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: pct === 100 ? '#F5A623' : '#7C42ED',
              borderRadius: 99,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search overlay (top-left corner)
// ---------------------------------------------------------------------------
function SearchOverlay({
  locations,
  onSelect,
  onClose,
}: {
  locations: Location[];
  onSelect: (loc: Location) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return locations
      .filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        (l.region?.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [query, locations]);

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: 12,
      zIndex: 20,
      width: 280,
      fontFamily: '"DM Sans", system-ui, sans-serif',
    }}>
      <div style={{
        background: 'rgba(15,18,35,0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', gap: 8 }}>
          <Search style={{ width: 14, height: 14, color: '#8896b3', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search outlets..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#f0f2ff',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8896b3', padding: 2 }}
          >
            <CloseIcon style={{ width: 13, height: 13 }} />
          </button>
        </div>

        {results.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {results.map(loc => (
              <button
                key={loc.id}
                type="button"
                onClick={() => { onSelect(loc); onClose(); }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,66,237,0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, color: '#f0f2ff', marginBottom: 1 }}>{loc.name}</p>
                <p style={{ fontSize: 10, color: '#8896b3' }}>{loc.region || loc.address}</p>
              </button>
            ))}
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div style={{ padding: '10px 12px', fontSize: 12, color: '#8896b3', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            No outlets found
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// First-time onboarding tooltip
// ---------------------------------------------------------------------------
function OnboardingTooltip({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 30,
      background: 'rgba(15,18,35,0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(124,66,237,0.4)',
      borderRadius: 14,
      padding: '14px 18px',
      textAlign: 'center',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      fontFamily: '"DM Sans", system-ui, sans-serif',
      pointerEvents: 'none',
      animation: 'fadeIn 0.4s ease',
    }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>📍</div>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#f0f2ff', marginBottom: 4 }}>
        Tap any marker
      </p>
      <p style={{ fontSize: 11, color: '#8896b3' }}>to log your visit</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main inner map component (must be inside APIProvider + Map)
// ---------------------------------------------------------------------------
interface MapInnerProps {
  locations: Location[];
  visits: Visit[];
  isVisited: (id: string) => boolean;
  onToggleVisit: (id: string) => void;
  mode: MapMode;
  onModeChange: (m: MapMode) => void;
}

function MapInner({ locations, visits, isVisited, onToggleVisit, mode, onModeChange }: MapInnerProps) {
  const map = useMap();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapFilter, setMapFilter] = useState<MapFilter>('all');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestId, setNearestId] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(
    () => typeof window !== 'undefined' && !!localStorage.getItem('af-onboarded')
  );

  const selectedLoc = locations.find(l => l.id === selectedId);
  const selectedVisit = visits.find(v => v.location_id === selectedId);

  // Dismiss onboarding
  const dismissOnboarding = useCallback(() => {
    setOnboardingDone(true);
    localStorage.setItem('af-onboarded', '1');
  }, []);

  // Recenter to all SG outlets
  const handleRecenter = useCallback(() => {
    if (!map || !locations.length) return;
    const bounds = new google.maps.LatLngBounds();
    locations.forEach(l => bounds.extend({ lat: l.lat, lng: l.lng }));
    map.fitBounds(bounds, 60);
  }, [map, locations]);

  // GPS near me
  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(p);
        setGpsLoading(false);
        map?.panTo(p);
        map?.setZoom(14);

        const unvisited = locations.filter(l => !isVisited(l.id));
        if (!unvisited.length) return;
        const nearest = unvisited.reduce((best, loc) =>
          haversine(p, loc) < haversine(p, best) ? loc : best
        );
        setNearestId(nearest.id);
        setTimeout(() => {
          map?.panTo({ lat: nearest.lat, lng: nearest.lng });
          setSelectedId(nearest.id);
        }, 800);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [map, locations, isVisited]);

  // Fly to outlet from search
  const handleSearchSelect = useCallback((loc: Location) => {
    map?.panTo({ lat: loc.lat, lng: loc.lng });
    map?.setZoom(16);
    setSelectedId(loc.id);
  }, [map]);

  // Dismiss nearest highlight after 8s
  useEffect(() => {
    if (!nearestId) return;
    const t = setTimeout(() => setNearestId(null), 8000);
    return () => clearTimeout(t);
  }, [nearestId]);

  // Region stats for overlay
  const regionStats: RegionEntry[] = useMemo(() => {
    const m: Record<string, { total: number; visited: number }> = {};
    for (const loc of locations) {
      const r = loc.region || 'Other';
      if (!m[r]) m[r] = { total: 0, visited: 0 };
      m[r].total++;
      if (isVisited(loc.id)) m[r].visited++;
    }
    return Object.entries(m)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([region, { total, visited }]) => ({
        region, total, visited,
        pct: total > 0 ? Math.round((visited / total) * 100) : 0,
      }));
  }, [locations, isVisited]);

  // Filter visible markers
  const visibleLocations = useMemo(() => {
    if (mapFilter === 'visited') return locations.filter(l => isVisited(l.id));
    if (mapFilter === 'unvisited') return locations.filter(l => !isVisited(l.id));
    return locations;
  }, [locations, mapFilter, isVisited]);

  return (
    <>
      {/* Outlet markers */}
      {visibleLocations.map(loc => (
        <AdvancedMarker
          key={loc.id}
          position={{ lat: loc.lat, lng: loc.lng }}
          onClick={() => {
            setSelectedId(loc.id === selectedId ? null : loc.id);
            dismissOnboarding();
          }}
          zIndex={loc.id === nearestId ? 10 : isVisited(loc.id) ? 2 : 1}
        >
          <MarkerPin visited={isVisited(loc.id)} nearest={loc.id === nearestId} />
        </AdvancedMarker>
      ))}

      {/* User GPS location */}
      {userPos && (
        <AdvancedMarker position={userPos} zIndex={20}>
          <UserDot />
        </AdvancedMarker>
      )}

      {/* Info popup */}
      {selectedLoc && (
        <InfoWindow
          position={{ lat: selectedLoc.lat, lng: selectedLoc.lng }}
          onCloseClick={() => setSelectedId(null)}
          pixelOffset={[0, -44]}
          headerDisabled
        >
          <div style={{
            minWidth: 210, maxWidth: 252,
            background: '#12172a', borderRadius: 12,
            padding: '12px 12px 10px',
            fontFamily: '"DM Sans", system-ui, sans-serif',
          }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#f0f2ff', marginBottom: 3, lineHeight: 1.35 }}>
              {selectedLoc.name}
            </p>
            <p style={{ fontSize: 11, color: '#8896b3', marginBottom: 6, lineHeight: 1.5 }}>
              {selectedLoc.address}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {selectedLoc.region && (
                <span style={{
                  fontSize: 10, background: 'rgba(124,66,237,0.18)', color: '#c4a8ff',
                  border: '1px solid rgba(124,66,237,0.3)', padding: '2px 8px',
                  borderRadius: 99, fontWeight: 600,
                }}>{selectedLoc.region}</span>
              )}
              {selectedVisit && (
                <span style={{
                  fontSize: 10, color: '#8896b3',
                }}>
                  ✓ {new Date(selectedVisit.visited_at).toLocaleDateString('en-SG', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => { onToggleVisit(selectedLoc.id); setSelectedId(null); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: isVisited(selectedLoc.id) ? 'rgba(255,255,255,0.08)' : '#7C42ED',
                color: isVisited(selectedLoc.id) ? '#8896b3' : '#fff',
              }}
            >
              {isVisited(selectedLoc.id)
                ? <><X style={{ width: 13, height: 13 }} /> Unmark Visit</>
                : <><Check style={{ width: 13, height: 13 }} /> Mark as Visited</>
              }
            </button>
          </div>
        </InfoWindow>
      )}

      {/* Overlays */}
      {searchOpen && (
        <SearchOverlay
          locations={locations}
          onSelect={handleSearchSelect}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {statsOpen && (
        <StatsOverlay stats={regionStats} onClose={() => setStatsOpen(false)} />
      )}

      {!onboardingDone && !searchOpen && !statsOpen && (
        <OnboardingTooltip onDismiss={dismissOnboarding} />
      )}

      <MapControls
        mode={mode}
        onModeChange={onModeChange}
        mapFilter={mapFilter}
        onFilterChange={setMapFilter}
        onRecenter={handleRecenter}
        onNearMe={handleNearMe}
        gpsLoading={gpsLoading}
        onToggleStats={() => setStatsOpen(s => !s)}
        statsOpen={statsOpen}
        onToggleSearch={() => setSearchOpen(s => !s)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// No API key fallback
// ---------------------------------------------------------------------------
function NoApiKeyMessage() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
        <MapIcon className="w-7 h-7 text-violet-400" />
      </div>
      <div>
        <p className="font-semibold text-foreground text-sm mb-1">Google Maps API key required</p>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
          Add <code className="bg-muted px-1.5 py-0.5 rounded text-violet-400">VITE_GOOGLE_MAPS_API_KEY</code> to your{' '}
          <code className="bg-muted px-1.5 py-0.5 rounded text-violet-400">.env</code> file.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
interface GoogleMapViewProps {
  locations: Location[];
  visits: Visit[];
  isVisited: (id: string) => boolean;
  onToggleVisit: (id: string) => void;
}

export function GoogleMapView({ locations, visits, isVisited, onToggleVisit }: GoogleMapViewProps) {
  const [mode, setMode] = useState<MapMode>('roadmap');

  if (!API_KEY) {
    return (
      <div className="w-full h-full rounded-2xl overflow-hidden border border-border bg-card">
        <NoApiKeyMessage />
      </div>
    );
  }

  const mapProps = MAP_ID
    ? { mapId: MAP_ID }
    : { styles: mode === 'roadmap' ? DARK_STYLES : [] };

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-border relative shadow-2xl shadow-black/30">
      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -48%); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
      <APIProvider apiKey={API_KEY}>
        <Map
          {...mapProps}
          defaultBounds={SG_BOUNDS}
          mapTypeId={mode === 'roadmap' ? 'roadmap' : 'satellite'}
          tilt={mode === '3d' ? 60 : 0}
          disableDefaultUI
          gestureHandling="greedy"
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        >
          <MapInner
            locations={locations}
            visits={visits}
            isVisited={isVisited}
            onToggleVisit={onToggleVisit}
            mode={mode}
            onModeChange={setMode}
          />
        </Map>
      </APIProvider>
    </div>
  );
}
