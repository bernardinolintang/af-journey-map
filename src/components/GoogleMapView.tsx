import { useState, useCallback } from 'react';
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
const MAP_ID = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string) || undefined;

const SG_CENTER = { lat: 1.3521, lng: 103.8198 };
// Bounding box that frames the whole Singapore island
const SG_BOUNDS = {
  north: 1.478,
  south: 1.205,
  east:  104.094,
  west:  103.595,
};

// Dark road-map styles — only used when NO Map ID is configured
// (mapId and styles are mutually exclusive in the Google Maps API)
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
  { featureType: 'administrative.land_parcel', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

// ---------------------------------------------------------------------------
// Marker pin
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
// Map type toggle bar
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
      <button
        type="button"
        onClick={onRecenter}
        className="w-9 h-9 flex items-center justify-center bg-black/70 backdrop-blur-md border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all shadow-2xl"
        title="Re-center"
      >
        <Locate className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner map (needs map context from APIProvider)
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
    if (!map || !locations.length) return;
    const bounds = new google.maps.LatLngBounds();
    locations.forEach((l) => bounds.extend({ lat: l.lat, lng: l.lng }));
    map.fitBounds(bounds, 60);
  }, [map, locations]);

  return (
    <>
      {locations.map((loc) => (
        <AdvancedMarker
          key={loc.id}
          position={{ lat: loc.lat, lng: loc.lng }}
          onClick={() => setSelectedId(loc.id === selectedId ? null : loc.id)}
          zIndex={isVisited(loc.id) ? 2 : 1}
        >
          <MarkerPin visited={isVisited(loc.id)} />
        </AdvancedMarker>
      ))}

      {selectedLoc && (
        <InfoWindow
          position={{ lat: selectedLoc.lat, lng: selectedLoc.lng }}
          onCloseClick={() => setSelectedId(null)}
          pixelOffset={[0, -44]}
          headerDisabled
        >
          {/* Inline styles are required — InfoWindow renders inside Google's shadow DOM
              where global CSS classes cannot reach the content reliably */}
          <div style={{
            minWidth: 210,
            maxWidth: 250,
            background: '#12172a',
            borderRadius: 12,
            padding: '12px 12px 10px',
            fontFamily: '"DM Sans", system-ui, sans-serif',
          }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#f0f2ff', marginBottom: 4, lineHeight: 1.35 }}>
              {selectedLoc.name}
            </p>
            <p style={{ fontSize: 11, color: '#8896b3', marginBottom: 8, lineHeight: 1.5 }}>
              {selectedLoc.address}
            </p>
            {selectedLoc.region && (
              <span style={{
                display: 'inline-block',
                fontSize: 10,
                background: 'rgba(124,66,237,0.18)',
                color: '#c4a8ff',
                border: '1px solid rgba(124,66,237,0.3)',
                padding: '2px 8px',
                borderRadius: 99,
                marginBottom: 10,
                fontWeight: 600,
              }}>
                {selectedLoc.region}
              </span>
            )}
            <button
              type="button"
              onClick={() => { onToggleVisit(selectedLoc.id); setSelectedId(null); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: isVisited(selectedLoc.id) ? 'rgba(255,255,255,0.08)' : '#7C42ED',
                color: isVisited(selectedLoc.id) ? '#8896b3' : '#fff',
              }}
            >
              {isVisited(selectedLoc.id) ? (
                <><X style={{ width: 13, height: 13 }} /> Unmark Visit</>
              ) : (
                <><Check style={{ width: 13, height: 13 }} /> Mark as Visited</>
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
          Add{' '}
          <code className="bg-muted px-1.5 py-0.5 rounded text-violet-400">VITE_GOOGLE_MAPS_API_KEY</code> to your{' '}
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
  isVisited: (id: string) => boolean;
  onToggleVisit: (id: string) => void;
}

export function GoogleMapView({ locations, isVisited, onToggleVisit }: GoogleMapViewProps) {
  const [mode, setMode] = useState<MapMode>('roadmap');

  if (!API_KEY) {
    return (
      <div className="w-full h-full rounded-2xl overflow-hidden border border-border bg-card">
        <NoApiKeyMessage />
      </div>
    );
  }

  // mapId and styles are mutually exclusive — only pass styles when there is no Map ID
  const mapProps = MAP_ID
    ? { mapId: MAP_ID }
    : { styles: mode === 'roadmap' ? DARK_STYLES : [] };

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-border relative shadow-2xl shadow-black/30">
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
