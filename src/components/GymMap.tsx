import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from '@tanstack/react-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location } from '@/hooks/use-locations';
import { Check, X, LogIn } from 'lucide-react';

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

function createMarkerIcon(visited: boolean): L.DivIcon {
  const bg = visited ? '#522398' : 'transparent';
  const border = visited ? '#7B4DB3' : '#9ca3af';
  const inner = visited
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
    : '';

  return L.divIcon({
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42],
    html: `
      <div style="position:relative;width:32px;height:40px;">
        <svg width="32" height="40" viewBox="0 0 32 40">
          <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z"
                fill="${bg}" stroke="${border}" stroke-width="2"/>
        </svg>
        <div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);width:20px;height:20px;
                    border-radius:50%;background:${visited ? 'rgba(255,255,255,0.2)' : 'transparent'};
                    display:flex;align-items:center;justify-content:center;">
          ${inner}
        </div>
      </div>
    `,
  });
}

function FitBounds({ locations }: { locations: Location[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (locations.length > 0 && !fitted.current) {
      const bounds = L.latLngBounds(locations.map(l => [l.lat, l.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
      fitted.current = true;
    }
  }, [locations, map]);

  return null;
}

interface GymMapProps {
  locations: Location[];
  isVisited: (id: string) => boolean;
  onToggleVisit: (id: string) => void;
  isLoggedIn: boolean;
}

export function GymMap({ locations, isVisited, onToggleVisit, isLoggedIn }: GymMapProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <MapContainer
        center={[1.3521, 103.8198]}
        zoom={12}
        className="w-full"
        style={{ height: '65vh', minHeight: '400px' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds locations={locations} />
        {locations.map((loc) => {
          const visited = isVisited(loc.id);
          return (
            <Marker
              key={loc.id}
              position={[loc.lat, loc.lng]}
              icon={createMarkerIcon(visited)}
            >
              <Popup>
                <div className="min-w-[200px] p-1">
                  <h3 className="font-bold text-sm mb-1">{loc.name}</h3>
                  <p className="text-xs opacity-70 mb-3 leading-relaxed">{loc.address}</p>
                  {loc.region && (
                    <span className="inline-block text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full mb-3">
                      {loc.region}
                    </span>
                  )}
                  {isLoggedIn ? (
                    <button
                      onClick={() => onToggleVisit(loc.id)}
                      className={`w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                        visited
                          ? 'bg-muted text-muted-foreground hover:bg-destructive/20 hover:text-destructive'
                          : 'bg-primary text-primary-foreground hover:bg-primary/80'
                      }`}
                    >
                      {visited ? (
                        <>
                          <X className="w-3 h-3" />
                          Unmark Visit
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3" />
                          Mark as Visited
                        </>
                      )}
                    </button>
                  ) : (
                    <Link to="/login">
                      <button className="w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/80 transition-all">
                        <LogIn className="w-3 h-3" />
                        Log in to save visits
                      </button>
                    </Link>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
