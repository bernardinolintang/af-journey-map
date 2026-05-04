import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import type { Location, Visit } from '@/hooks/use-locations';
import { useOutletExtras } from '@/hooks/use-outlet-extras';
import {
  Check, X, Map as MapIcon, Satellite, Box, Locate, Navigation,
  Search, BarChart2, X as CloseIcon, Plus, Minus,
} from 'lucide-react';
import { toast } from 'sonner';

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
type MapFilter = 'all' | 'visited' | 'unvisited' | 'favourites';

// ---------------------------------------------------------------------------
// Map controls bar (bottom-center)
// ---------------------------------------------------------------------------
function MapControls({
  mode, onModeChange,
  mapFilter, onFilterChange,
  onRecenter, onNearMe, gpsLoading,
  onToggleStats, statsOpen,
  onToggleSearch,
  onZoomIn, onZoomOut,
}: {
  mode: MapMode; onModeChange: (m: MapMode) => void;
  mapFilter: MapFilter; onFilterChange: (f: MapFilter) => void;
  onRecenter: () => void; onNearMe: () => void; gpsLoading: boolean;
  onToggleStats: () => void; statsOpen: boolean;
  onToggleSearch: () => void;
  onZoomIn: () => void; onZoomOut: () => void;
}) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 pointer-events-none"
      style={{ maxWidth: 'calc(100vw - 16px)' }}>
      {/* Filter row */}
      <div className="flex items-center bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-1 gap-0.5 shadow-2xl pointer-events-auto">
        {([
          { key: 'all' as MapFilter, label: 'All' },
          { key: 'visited' as MapFilter, label: 'Visited' },
          { key: 'unvisited' as MapFilter, label: 'Unvisited' },
          { key: 'favourites' as MapFilter, label: '★' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onFilterChange(key)}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              mapFilter === key
                ? key === 'favourites' ? 'bg-amber-500 text-white' : 'bg-violet-600 text-white'
                : key === 'favourites' ? 'text-amber-400/70 hover:text-amber-300 hover:bg-white/10' : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >{label}</button>
        ))}
      </div>

      {/* Main controls row */}
      <div className="flex items-center gap-0.5 sm:gap-1 pointer-events-auto overflow-x-auto scrollbar-none max-w-full">
        {/* Map type */}
        <div className="flex items-center bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-0.5 sm:p-1 gap-0.5 shadow-2xl">
          {([
            { id: 'roadmap' as MapMode, icon: <MapIcon className="w-3.5 h-3.5" />, label: 'Map' },
            { id: 'satellite' as MapMode, icon: <Satellite className="w-3.5 h-3.5" />, label: 'Sat' },
            { id: '3d' as MapMode, icon: <Box className="w-3.5 h-3.5" />, label: '3D' },
          ] as const).map(({ id, icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onModeChange(id)}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === id ? 'bg-violet-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {icon}<span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Zoom in/out */}
        <div className="flex flex-col bg-black/70 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <button
            type="button"
            onClick={onZoomIn}
            className="w-8 sm:w-9 h-[1.125rem] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all border-b border-white/10"
            title="Zoom in"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onZoomOut}
            className="w-8 sm:w-9 h-[1.125rem] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title="Zoom out"
          >
            <Minus className="w-3 h-3" />
          </button>
        </div>

        {/* Near Me */}
        <button
          type="button"
          onClick={onNearMe}
          disabled={gpsLoading}
          className="h-8 sm:h-9 px-2 sm:px-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all shadow-2xl text-xs font-semibold disabled:opacity-50"
          title="Find nearest unvisited outlet"
        >
          <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-pulse' : ''}`} />
          <span className="hidden sm:inline">Near Me</span>
        </button>

        {/* Search toggle */}
        <button
          type="button"
          onClick={onToggleSearch}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-black/70 backdrop-blur-md border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all shadow-2xl"
          title="Search outlets"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Stats toggle */}
        <button
          type="button"
          onClick={onToggleStats}
          className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center backdrop-blur-md border border-white/10 rounded-xl transition-all shadow-2xl ${
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
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-black/70 backdrop-blur-md border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all shadow-2xl"
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
      width: 'min(220px, calc(100vw - 24px))',
      maxHeight: 'calc(100% - 120px)',
      overflowY: 'auto',
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
      right: 12,
      zIndex: 20,
      maxWidth: 280,
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
// Map legend (bottom-left)
// ---------------------------------------------------------------------------
function MapLegend() {
  return (
    <div style={{
      position: 'absolute',
      bottom: 'clamp(80px, 104px, 20vh)',
      left: 12,
      zIndex: 10,
      background: 'rgba(0,0,0,0.70)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 10,
      padding: '7px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      fontFamily: '"DM Sans", system-ui, sans-serif',
      pointerEvents: 'none',
    }}>
      {([
        { color: '#374151', stroke: '#6B7280', label: 'Unvisited' },
        { color: '#7C42ED', stroke: '#A78BFA', label: 'Visited' },
        { color: '#F5A623', stroke: '#FCD34D', label: 'Nearest' },
      ] as const).map(({ color, stroke, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width={10} height={10} viewBox="0 0 10 10">
            <circle cx={5} cy={5} r={4} fill={color} stroke={stroke} strokeWidth={1.5} />
          </svg>
          <span style={{ fontSize: 10, color: '#c4cfee', fontWeight: 500 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// First-time onboarding tooltip
// ---------------------------------------------------------------------------
function OnboardingTooltip({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 7000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      style={{
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
        pointerEvents: 'auto',
        cursor: 'pointer',
        animation: 'fadeIn 0.4s ease',
        minWidth: 160,
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        style={{
          position: 'absolute', top: 6, right: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#8896b3', fontSize: 14, lineHeight: 1, padding: 0,
        }}
        aria-label="Dismiss"
      >×</button>
      <div style={{ fontSize: 22, marginBottom: 6 }}>📍</div>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#f0f2ff', marginBottom: 4 }}>
        Tap any marker
      </p>
      <p style={{ fontSize: 11, color: '#8896b3', marginBottom: 8 }}>to log your visit</p>
      <p style={{ fontSize: 10, color: '#8896b3' }}>
        Use <span style={{ color: '#c4a8ff', fontWeight: 600 }}>Near Me</span> to find the closest unvisited outlet
      </p>
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
  regionFilter: string | null;
}

function MapInner({ locations, visits, isVisited, onToggleVisit, mode, onModeChange, regionFilter }: MapInnerProps) {
  const map = useMap();
  const { isFavourite, toggleFavourite, getNote, saveNote, isAuthed: extrasAuthed } = useOutletExtras();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapFilter, setMapFilter] = useState<MapFilter>('all');
  const [noteText, setNoteText] = useState('');
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

  // Reset note field when a different outlet is opened
  useEffect(() => {
    if (selectedId) setNoteText(getNote(selectedId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const [placePhotoUrl, setPlacePhotoUrl] = useState<string | null>(null);

  // Fetch Google Maps business photo when an outlet is selected
  useEffect(() => {
    if (!map || !selectedLoc) {
      setPlacePhotoUrl(null);
      return;
    }
    const query = /^anytime fitness/i.test(selectedLoc.name)
      ? selectedLoc.name
      : `Anytime Fitness ${selectedLoc.name}`;
    const service = new google.maps.places.PlacesService(map as google.maps.Map);
    service.findPlaceFromQuery(
      { query: `${query} Singapore`, fields: ['photos'] },
      (results, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          results?.[0]?.photos?.[0]
        ) {
          setPlacePhotoUrl(results[0].photos[0].getUrl({ maxWidth: 280, maxHeight: 130 }));
        } else {
          setPlacePhotoUrl(null);
        }
      },
    );
  }, [map, selectedLoc]);

  // Close popup when clicking the map background
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', () => setSelectedId(null));
    return () => google.maps.event.removeListener(listener);
  }, [map]);

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

  const handleZoomIn = useCallback(() => {
    if (!map) return;
    map.setZoom((map.getZoom() ?? 12) + 1);
  }, [map]);

  const handleZoomOut = useCallback(() => {
    if (!map) return;
    map.setZoom((map.getZoom() ?? 12) - 1);
  }, [map]);

  // GPS near me
  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('GPS not supported', { description: 'Your browser does not support location access.' });
      return;
    }
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
          setSelectedId(nearest.id);
        }, 800);
      },
      err => {
        setGpsLoading(false);
        if (err.code === 1) {
          toast.error('Location access denied', {
            description: 'Allow location access in your browser settings, then try again.',
          });
        } else if (err.code === 3) {
          toast.error('Location timed out', {
            description: 'Could not get your location in time. Try again in a moment.',
          });
        } else {
          toast.error('Could not get your location', {
            description: 'Make sure location is enabled on your device.',
          });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [map, locations, isVisited]);

  // Fly to outlet from search
  const handleSearchSelect = useCallback((loc: Location) => {
    map?.setZoom(16);
    setSelectedId(loc.id);
    setStatsOpen(false);
  }, [map]);

  // Dismiss nearest highlight after 8s
  useEffect(() => {
    if (!nearestId) return;
    const t = setTimeout(() => setNearestId(null), 8000);
    return () => clearTimeout(t);
  }, [nearestId]);

  // Pan map so the selected marker sits in the lower portion of the viewport,
  // ensuring the InfoWindow that appears above it is always fully visible.
  useEffect(() => {
    if (!map || !selectedId) return;
    const loc = locations.find(l => l.id === selectedId);
    if (!loc) return;
    map.panTo({ lat: loc.lat, lng: loc.lng });
    // After the pan settles, offset the center upward so the marker
    // lands ~60 % down from the top, leaving room for the ~300 px popup above.
    const t = setTimeout(() => map.panBy(0, -160), 120);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

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

  // Filter visible markers (map toggle + external region filter)
  const visibleLocations = useMemo(() => {
    let result = locations;
    if (regionFilter) result = result.filter(l => (l.region || 'Other') === regionFilter);
    if (mapFilter === 'visited') result = result.filter(l => isVisited(l.id));
    if (mapFilter === 'unvisited') result = result.filter(l => !isVisited(l.id));
    if (mapFilter === 'favourites') result = result.filter(l => isFavourite(l.id));
    return result;
  }, [locations, mapFilter, isVisited, regionFilter, isFavourite]);

  // When a region filter activates from outside, fit map to those markers
  useEffect(() => {
    if (!map || !regionFilter) return;
    const filtered = locations.filter(l => (l.region || 'Other') === regionFilter);
    if (!filtered.length) return;
    const bounds = new google.maps.LatLngBounds();
    filtered.forEach(l => bounds.extend({ lat: l.lat, lng: l.lng }));
    map.fitBounds(bounds, 80);
  }, [map, regionFilter, locations]);

  return (
    <>
      {/* Outlet markers */}
      {visibleLocations.map(loc => (
        <AdvancedMarker
          key={loc.id}
          position={{ lat: loc.lat, lng: loc.lng }}
          onClick={() => {
            setSelectedId(prev => prev === loc.id ? null : loc.id);
            setStatsOpen(false);
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
            width: 'min(280px, calc(100vw - 40px))',
            maxHeight: 'min(420px, 60vh)',
            background: '#12172a', borderRadius: 12,
            overflow: 'hidden',
            overflowY: 'auto',
            fontFamily: '"DM Sans", system-ui, sans-serif',
          }}>
            {/* Business photo from Google Maps */}
            {placePhotoUrl && (
              <div style={{ position: 'relative', width: '100%', height: 130 }}>
                <img
                  src={placePhotoUrl}
                  alt={selectedLoc.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, transparent 50%, rgba(18,23,42,0.85) 100%)',
                }} />
              </div>
            )}

            {/* Details */}
            <div style={{ padding: '10px 12px 12px' }}>
              {/* Name row with favourite star */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                {extrasAuthed && (
                  <button
                    type="button"
                    onClick={() => toggleFavourite(selectedLoc.id)}
                    title={isFavourite(selectedLoc.id) ? 'Remove from favourites' : 'Add to favourites'}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      fontSize: 16, lineHeight: 1, flexShrink: 0,
                      color: isFavourite(selectedLoc.id) ? '#F5A623' : '#4a5568',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {isFavourite(selectedLoc.id) ? '★' : '☆'}
                  </button>
                )}
                <p style={{ fontWeight: 700, fontSize: 13, color: '#f0f2ff', lineHeight: 1.35, margin: 0 }}>
                  {selectedLoc.name}
                </p>
              </div>

              <p style={{ fontSize: 11, color: '#8896b3', marginBottom: 7, lineHeight: 1.5 }}>
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
                  <span style={{ fontSize: 10, color: '#8896b3' }}>
                    ✓ {new Date(selectedVisit.visited_at).toLocaleDateString('en-SG', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                )}
              </div>

              {/* Open in Google Maps */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((/^anytime fitness/i.test(selectedLoc.name) ? selectedLoc.name : `Anytime Fitness ${selectedLoc.name}`) + ' Singapore')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600,
                  background: 'rgba(255,255,255,0.07)', color: '#a8b4d0',
                  textDecoration: 'none', marginBottom: 6, boxSizing: 'border-box',
                }}
              >
                <MapIcon style={{ width: 13, height: 13 }} /> Open in Google Maps
              </a>

              {/* Visit toggle */}
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

              {/* Notes */}
              {extrasAuthed && (
                <div style={{ marginTop: 8 }}>
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    rows={2}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8,
                      padding: '7px 10px', fontSize: 11, color: '#c4cfee',
                      resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                      outline: 'none', lineHeight: 1.5, display: 'block',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,66,237,0.5)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
                  />
                  {noteText !== getNote(selectedLoc.id) && (
                    <button
                      type="button"
                      onClick={() => saveNote(selectedLoc.id, noteText)}
                      style={{
                        marginTop: 5, width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 5, borderRadius: 8, padding: '7px 12px',
                        fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                        background: 'rgba(124,66,237,0.25)', color: '#c4a8ff',
                      }}
                    >
                      Save note
                    </button>
                  )}
                </div>
              )}
            </div>
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

      <MapLegend />

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
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
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
  regionFilter?: string | null;
}

export function GoogleMapView({ locations, visits, isVisited, onToggleVisit, regionFilter }: GoogleMapViewProps) {
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
      <APIProvider apiKey={API_KEY} libraries={['places']}>
        <Map
          {...mapProps}
          defaultBounds={SG_BOUNDS}
          mapTypeId={mode === 'roadmap' ? 'roadmap' : 'satellite'}
          tilt={mode === '3d' ? 60 : 0}
          disableDefaultUI
          clickableIcons={false}
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
            regionFilter={regionFilter ?? null}
          />
        </Map>
      </APIProvider>
    </div>
  );
}
