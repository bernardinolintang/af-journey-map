import { useState, useCallback, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import type { Location } from '@/hooks/use-locations';
import { Check, X, Map as MapIcon, Satellite, Box, Locate } from 'lucide-react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;

const SG_CENTER = { lat: 1.3521, lng: 103.8198 };

// ---------------------------------------------------------------------------
// Marker pin SVG rendered as AdvancedMarker child
// ---------------------------------------------------------------------------
function MarkerPin({ visited }: { visited: boolean }) {
  return (
    <div
      style={{
        width: 30,
        height: 38,
        cursor: 'pointer',
        filter: visited
          ? 'drop-shadow(0 0 6px rgba(124,66,237,0.8))'
          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        transition: 'transform 0.15s ease, filter 0.2s ease',
      }}
      className="marker-pin"
    >
      <svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M15 0C6.72 0 0 6.72 0 15c0 11.25 15 23 15 23s15-11.75 15-23C30 6.72 23.28 0 15 0z"
          fill={visited ? '#7C42ED' : '#374151'}
          stroke={visited ? '#A78BFA' : '#6B7280'}
          strokeWidth="1.5"
        />
        <circle cx="15" cy="14" r="6" fill={visited ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'} />
        {visited && (
          <path
            d="M11.5 14l2.5 2.5 4.5-4.5"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Map type + tilt controls
// ---------------------------------------------------------------------------
type MapMode = 'roadmap' | 'satellite' | '3d';

function MapControls({
  mode,
  onModeChange,
  onRecenter,
}: {
  mode: MapMode;
  onModeChange: (m: MapMode) => void;
  onRecenter: () => void;
}) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
      {/* Mode pills */}
      <div className="flex items-center bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-1 gap-0.5 shadow-2xl">
        {(
          [
            { id: 'roadmap' as MapMode, icon: <MapIcon className="w-3.5 h-3.5" />, label: 'Map' },
            { id: 'satellite' as MapMode, icon: <Satellite className="w-3.5 h-3.5" />, label: 'Satellite' },
            { id: '3d' as MapMode, icon: <Box className="w-3.5 h-3.5" />, label: '3D' },
          ] as const
        ).map(({ id, icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onModeChange(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === id
                ? 'bg-violet-600 text-white shadow-md shadow-violet-900/50'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>
      {/* Recenter button */}
      <button
        type="button"
        onClick={onRecenter}
        className="w-9 h-9 flex items-center justify-center bg-black/70 backdrop-blur-md border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all shadow-2xl"
        title="Re-center map"
      >
        <Locate className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner map component (needs map context)
// ---------------------------------------------------------------------------
interface MapInnerProps {
  locations: Location[];
  isVisited: (id: string) => boolean;
  onToggleVisit: (id: string) => void;
  mode: MapMode;
  onModeChange: (m: MapMode) => void;
}

function MapInner({ locations, isVisited, onToggleVisit, mode, onModeChange }: MapInnerProps) {
  const map = useMap();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedLoc = locations.find((l) => l.id === selectedId);

  const handleRecenter = useCallback(() => {
    if (!map) return;
    const bounds = new google.maps.LatLngBounds();
    locations.forEach((l) => bounds.extend({ lat: l.lat, lng: l.lng }));
    map.fitBounds(bounds, 60);
  }, [map, locations]);

  // Apply tilt when mode changes
  const prevMode = useRef<MapMode>(mode);
  if (prevMode.current !== mode && map) {
    prevMode.current = mode;
    if (mode === '3d') {
      map.setMapTypeId('satellite');
      map.setTilt(60);
      map.setHeading(0);
    } else if (mode === 'satellite') {
      map.setMapTypeId('satellite');
      map.setTilt(0);
    } else {
      map.setMapTypeId('roadmap');
      map.setTilt(0);
    }
  }

  return (
    <>
      {locations.map((loc) => {
        const visited = isVisited(loc.id);
        return (
          <AdvancedMarker
            key={loc.id}
            position={{ lat: loc.lat, lng: loc.lng }}
            onClick={() => setSelectedId(loc.id === selectedId ? null : loc.id)}
            zIndex={visited ? 2 : 1}
          >
            <MarkerPin visited={visited} />
          </AdvancedMarker>
        );
      })}

      {selectedLoc && (
        <InfoWindow
          position={{ lat: selectedLoc.lat, lng: selectedLoc.lng }}
          onCloseClick={() => setSelectedId(null)}
          pixelOffset={[0, -44]}
        >
          <div className="min-w-[200px] max-w-[240px] p-0.5">
            <h3 className="font-bold text-sm mb-1 text-gray-900 leading-tight">{selectedLoc.name}</h3>
            <p className="text-xs text-gray-500 mb-2 leading-relaxed">{selectedLoc.address}</p>
            {selectedLoc.region && (
              <span className="inline-block text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full mb-2 font-medium">
                {selectedLoc.region}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                onToggleVisit(selectedLoc.id);
                setSelectedId(null);
              }}
              className={`w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all touch-manipulation ${
                isVisited(selectedLoc.id)
                  ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                  : 'bg-violet-600 text-white hover:bg-violet-700'
              }`}
            >
              {isVisited(selectedLoc.id) ? (
                <>
                  <X className="w-3.5 h-3.5" /> Unmark Visit
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" /> Mark as Visited
                </>
              )}
            </button>
          </div>
        </InfoWindow>
      )}

      <MapControls mode={mode} onModeChange={onModeChange} onRecenter={handleRecenter} />
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
          Add <code className="bg-muted px-1.5 py-0.5 rounded text-violet-400">VITE_GOOGLE_MAPS_API_KEY</code> to
          your <code className="bg-muted px-1.5 py-0.5 rounded text-violet-400">.env</code> file to enable the
          interactive map.
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
  isVisited: (id: string) => boolean;
  onToggleVisit: (id: string) => void;
}

export function GoogleMapView({ locations, isVisited, onToggleVisit }: GoogleMapViewProps) {
  const [mode, setMode] = useState<MapMode>('roadmap');
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const mapHeight = isMobile ? '50vh' : '65vh';

  if (!API_KEY) {
    return (
      <div
        className="rounded-2xl overflow-hidden border border-border bg-card"
        style={{ height: mapHeight, minHeight: isMobile ? 350 : 400 }}
      >
        <NoApiKeyMessage />
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden border border-border relative shadow-2xl shadow-black/30"
      style={{ height: mapHeight, minHeight: isMobile ? 350 : 400 }}
    >
      <APIProvider apiKey={API_KEY}>
        <Map
          mapId={MAP_ID || undefined}
          defaultCenter={SG_CENTER}
          defaultZoom={12}
          mapTypeId={mode === 'roadmap' ? 'roadmap' : 'satellite'}
          tilt={mode === '3d' ? 60 : 0}
          disableDefaultUI
          gestureHandling="greedy"
          className="w-full h-full"
          styles={
            mode === 'roadmap'
              ? [
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
                  { featureType: 'administrative.land_parcel', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                ]
              : []
          }
        >
          <MapInner
            locations={locations}
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
