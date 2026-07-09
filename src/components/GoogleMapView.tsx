import { useState, useCallback, useEffect, useRef, useMemo, memo } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  InfoWindow,
  RenderingType,
} from "@vis.gl/react-google-maps";
import type { Location, Visit } from "@/hooks/use-locations";
import { useOutletExtras } from "@/hooks/use-outlet-extras";
import { useUserLocation } from "@/hooks/use-user-location";
import { haversine, formatDistance } from "@/lib/geo";
import { buildGoogleMapsDirectionsUrl } from "@/lib/google-maps-url";
import type { GeoStatus } from "@/hooks/use-user-location";
import { buildGoogleMapsSearchUrl } from "@/lib/google-maps-url";
import { searchOutlets } from "@/lib/search-outlets";
import { computeRegionStats, computeAchievements, findNearestUnvisited } from "@/lib/journey-stats";
import { EditVisitModal } from "@/components/EditVisitModal";
import { StatsPanel } from "@/components/StatsPanel";
import {
  Check,
  X,
  Map as MapIcon,
  Satellite,
  Box,
  Locate,
  Navigation,
  Search,
  BarChart2,
  X as CloseIcon,
  Plus,
  Minus,
  Loader2,
  Pencil,
  Star,
  Compass,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  type MapMode,
  mapTypeIdForMode,
  applyMapMode,
  applyMapInteractionOptions,
  rotateHeading,
  resetHeading,
  HEADING_STEP,
  MAP_3D_TILT,
  MAP_3D_HEADING,
  MAP_3D_MIN_ZOOM,
} from "@/lib/map-mode";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const MAP_ID = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string) || undefined;

const SG_BOUNDS = { north: 1.478, south: 1.205, east: 104.094, west: 103.595 };

const DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "labels.text.fill", stylers: [{ color: "#8896b3" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1f2e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a3045" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#2d3555" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#374370" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1a1f2e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a6fa5" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1e2535" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1a2e1a" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1a2035" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#3a4060" }],
  },
];

// ---------------------------------------------------------------------------
// Outlet marker pin
// ---------------------------------------------------------------------------
function MarkerPin({
  visited,
  nearest,
  selected,
}: {
  visited: boolean;
  nearest?: boolean;
  selected?: boolean;
}) {
  const size = nearest ? 36 : selected ? 34 : visited ? 24 : 30;
  const height = nearest ? 46 : selected ? 44 : visited ? 30 : 38;

  return (
    <div
      style={{
        width: size,
        height: height,
        cursor: "pointer",
        opacity: visited && !nearest && !selected ? 0.55 : 1,
        filter: nearest
          ? "drop-shadow(0 0 10px rgba(250,180,50,0.9))"
          : selected
            ? "drop-shadow(0 0 10px rgba(167,139,250,0.95))"
            : visited
              ? "drop-shadow(0 0 4px rgba(124,66,237,0.5))"
              : "drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
        transition: "all 0.2s ease",
        transform: selected ? "scale(1.12)" : nearest ? "scale(1.05)" : "scale(1)",
      }}
    >
      <svg
        width={size}
        height={height}
        viewBox="0 0 30 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15 0C6.72 0 0 6.72 0 15c0 11.25 15 23 15 23s15-11.75 15-23C30 6.72 23.28 0 15 0z"
          fill={nearest ? "#F5A623" : selected ? "#9333EA" : visited ? "#7C42ED" : "#4B5563"}
          stroke={nearest ? "#FCD34D" : selected ? "#E9D5FF" : visited ? "#A78BFA" : "#9CA3AF"}
          strokeWidth={selected ? 2 : 1.5}
        />
        <circle cx="15" cy="14" r="6" fill="rgba(255,255,255,0.22)" />
        {nearest && (
          <path
            d="M12 14l2 2 5-5"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {!nearest && visited && (
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

const OutletMarker = memo(function OutletMarker({
  loc,
  visited,
  nearest,
  selected,
  onClick,
  zIndex,
}: {
  loc: Location;
  visited: boolean;
  nearest: boolean;
  selected: boolean;
  onClick: () => void;
  zIndex: number;
}) {
  return (
    <AdvancedMarker position={{ lat: loc.lat, lng: loc.lng }} onClick={onClick} zIndex={zIndex}>
      <MarkerPin visited={visited} nearest={nearest} selected={selected} />
    </AdvancedMarker>
  );
});

// Blue GPS dot for user location
function UserDot() {
  return (
    <div style={{ position: "relative", width: 20, height: 20 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "rgba(66,133,244,0.2)",
          animation: "ping 1.5s ease-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 3,
          borderRadius: "50%",
          background: "#4285F4",
          border: "2px solid white",
          boxShadow: "0 2px 6px rgba(66,133,244,0.6)",
        }}
      />
    </div>
  );
}

type MapFilter = "all" | "visited" | "unvisited" | "favourites";

// ---------------------------------------------------------------------------
// Map init + mode sync (vector rendering, tilt/heading per mode)
// ---------------------------------------------------------------------------
function MapInit() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    applyMapInteractionOptions(map, "roadmap");

    const vectorType =
      typeof google !== "undefined" ? google.maps.RenderingType?.VECTOR : undefined;
    if (vectorType && MAP_ID) {
      try {
        map.setOptions({ renderingType: vectorType });
      } catch {
        // API may reject if Map ID is raster-only
      }
    }
  }, [map]);

  return null;
}

function MapModeController({
  mode,
  on3DComplete,
}: {
  mode: MapMode;
  on3DComplete?: (result: { tiltApplied: boolean; renderingType?: string }) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    let cancelled = false;

    void (async () => {
      const result = await applyMapMode(map, mode);
      if (cancelled) return;
      if (mode === "3d") {
        on3DComplete?.(result);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [map, mode, on3DComplete]);

  return null;
}

// ---------------------------------------------------------------------------
// Map controls bar (bottom-center)
// ---------------------------------------------------------------------------
function MapControls({
  mode,
  onModeChange,
  is3DLoading,
  mapFilter,
  onFilterChange,
  onRecenter,
  onNearMe,
  gpsLoading,
  geoStatus,
  onToggleStats,
  statsOpen,
  onToggleSearch,
  onZoomIn,
  onZoomOut,
}: {
  mode: MapMode;
  onModeChange: (m: MapMode) => void;
  is3DLoading?: boolean;
  mapFilter: MapFilter;
  onFilterChange: (f: MapFilter) => void;
  onRecenter: () => void;
  onNearMe: () => void;
  gpsLoading: boolean;
  geoStatus: GeoStatus;
  onToggleStats: () => void;
  statsOpen: boolean;
  onToggleSearch: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  const nearMeLabel = gpsLoading
    ? "Locating…"
    : geoStatus === "denied"
      ? "Denied"
      : geoStatus === "timeout" || geoStatus === "unavailable"
        ? "Try again"
        : "Near Me";

  const controlGroup =
    "flex items-center bg-black/70 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl pointer-events-auto";

  return (
    <div
      className="absolute bottom-8 sm:bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 z-10 pointer-events-none px-2"
      style={{ maxWidth: "calc(100vw - 16px)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
        {/* Left: filters */}
        <div className={`${controlGroup} p-1 gap-0.5`}>
          {[
            { key: "all" as MapFilter, label: "All" },
            { key: "visited" as MapFilter, label: "Visited" },
            { key: "unvisited" as MapFilter, label: "Unvisited" },
            { key: "favourites" as MapFilter, label: "Starred" },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onFilterChange(key)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                mapFilter === key
                  ? key === "favourites"
                    ? "bg-amber-500 text-white"
                    : "bg-violet-600 text-white"
                  : key === "favourites"
                    ? "text-amber-400/70 hover:text-amber-300 hover:bg-white/10"
                    : "text-white/50 hover:text-white hover:bg-white/10"
              }`}
            >
              {key === "favourites" ? (
                <>
                  <span className="sm:hidden">★</span>
                  <span className="hidden sm:inline">{label}</span>
                </>
              ) : (
                label
              )}
            </button>
          ))}
        </div>

        {/* Middle: map type + zoom */}
        <div className="flex items-center gap-1.5">
          <div className={`${controlGroup} p-0.5 sm:p-1 gap-0.5`}>
            {(
              [
                {
                  id: "roadmap" as MapMode,
                  icon: <MapIcon className="w-3.5 h-3.5" />,
                  label: "Map",
                },
                {
                  id: "satellite" as MapMode,
                  icon: <Satellite className="w-3.5 h-3.5" />,
                  label: "Sat",
                },
                { id: "3d" as MapMode, icon: <Box className="w-3.5 h-3.5" />, label: "3D" },
              ] as const
            ).map(({ id, icon, label }) => {
              const is3D = id === "3d";
              const active = mode === id;
              const loading = is3D && is3DLoading;

              return (
                <button
                  key={id}
                  type="button"
                  disabled={loading}
                  title={
                    is3D
                      ? "3D requires vector maps and closer zoom"
                      : id === "satellite"
                        ? "Satellite with labels"
                        : "Road map"
                  }
                  onClick={() => {
                    if (active && !loading) return;
                    onModeChange(id);
                  }}
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-60 disabled:cursor-wait ${
                    active
                      ? "bg-violet-600 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>

          <div className={`${controlGroup} flex-col overflow-hidden p-0`}>
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
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={onNearMe}
            disabled={gpsLoading}
            className={`h-8 sm:h-9 px-2 sm:px-3 flex items-center gap-1.5 ${controlGroup} text-xs font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
              geoStatus === "denied" || geoStatus === "timeout" || geoStatus === "unavailable"
                ? "text-amber-300/90 border-amber-400/20"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            title="Find nearest unvisited outlet"
          >
            {gpsLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{nearMeLabel}</span>
          </button>

          <button
            type="button"
            onClick={onToggleSearch}
            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center ${controlGroup} text-white/60 hover:text-white hover:bg-white/10 transition-all`}
            title="Search outlets"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleStats}
            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center backdrop-blur-md border border-white/10 rounded-xl transition-all shadow-2xl ${
              statsOpen
                ? "bg-violet-600 text-white"
                : "bg-black/70 text-white/60 hover:text-white hover:bg-white/10"
            }`}
            title="Stats"
          >
            <BarChart2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onRecenter}
            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center ${controlGroup} text-white/60 hover:text-white hover:bg-white/10 transition-all`}
            title="Recenter map"
          >
            <Locate className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3D heading controls (bottom-right, visible only in 3D mode)
// ---------------------------------------------------------------------------
function HeadingControls() {
  const map = useMap();

  const controlGroup =
    "flex items-center bg-black/70 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl pointer-events-auto";

  if (!map) return null;

  return (
    <div className="absolute bottom-28 sm:bottom-32 right-3 sm:right-4 z-10 pointer-events-none flex flex-col gap-1">
      <div className={`${controlGroup} p-0.5 flex-col overflow-hidden`}>
        <button
          type="button"
          onClick={() => rotateHeading(map, -HEADING_STEP)}
          className="w-9 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all border-b border-white/10"
          title="Rotate left"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => rotateHeading(map, HEADING_STEP)}
          className="w-9 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all border-b border-white/10"
          title="Rotate right"
        >
          <RotateCcw className="w-3.5 h-3.5 scale-x-[-1]" />
        </button>
        <button
          type="button"
          onClick={() => resetHeading(map)}
          className="w-9 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
          title="Reset north"
        >
          <Compass className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search overlay (top-left corner)
// ---------------------------------------------------------------------------
function SearchOverlay({
  locations,
  isVisited,
  onSelect,
  onClose,
}: {
  locations: Location[];
  isVisited: (id: string) => boolean;
  onSelect: (loc: Location) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => searchOutlets(locations, query, 8), [query, locations]);

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        right: 12,
        zIndex: 20,
        maxWidth: 320,
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      <div
        style={{
          background: "rgba(15,18,35,0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", gap: 8 }}>
          <Search style={{ width: 14, height: 14, color: "#8896b3", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, address, region…"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "#f0f2ff",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#8896b3",
              padding: 2,
            }}
          >
            <CloseIcon style={{ width: 13, height: 13 }} />
          </button>
        </div>

        {results.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {results.map(({ location: loc }) => {
              const visited = isVisited(loc.id);
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    onSelect(loc);
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(124,66,237,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "none";
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#f0f2ff", marginBottom: 1 }}>
                      {loc.name}
                    </p>
                    <p
                      style={{
                        fontSize: 10,
                        color: "#8896b3",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {loc.region ? `${loc.region} · ` : ""}
                      {loc.address}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 99,
                      flexShrink: 0,
                      background: visited ? "rgba(124,66,237,0.2)" : "rgba(255,255,255,0.08)",
                      color: visited ? "#c4a8ff" : "#8896b3",
                    }}
                  >
                    {visited ? "Visited" : "Unvisited"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div
            style={{
              padding: "10px 12px",
              fontSize: 12,
              color: "#8896b3",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
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
    <div
      style={{
        position: "absolute",
        bottom: "clamp(96px, 120px, 22vh)",
        left: 12,
        zIndex: 10,
        background: "rgba(0,0,0,0.70)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 10,
        padding: "7px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 5,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        fontFamily: '"DM Sans", system-ui, sans-serif',
        pointerEvents: "none",
      }}
    >
      {(
        [
          { color: "#4B5563", stroke: "#9CA3AF", label: "Unvisited" },
          { color: "#7C42ED", stroke: "#A78BFA", label: "Visited" },
          { color: "#F5A623", stroke: "#FCD34D", label: "Nearest" },
        ] as const
      ).map(({ color, stroke, label }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <svg width={10} height={10} viewBox="0 0 10 10">
            <circle cx={5} cy={5} r={4} fill={color} stroke={stroke} strokeWidth={1.5} />
          </svg>
          <span style={{ fontSize: 10, color: "#c4cfee", fontWeight: 500 }}>{label}</span>
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
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 30,
        background: "rgba(15,18,35,0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(124,66,237,0.4)",
        borderRadius: 14,
        padding: "14px 18px",
        textAlign: "center",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        fontFamily: '"DM Sans", system-ui, sans-serif',
        pointerEvents: "auto",
        cursor: "pointer",
        animation: "fadeIn 0.4s ease",
        minWidth: 160,
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        style={{
          position: "absolute",
          top: 6,
          right: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#8896b3",
          fontSize: 14,
          lineHeight: 1,
          padding: 0,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
      <div style={{ fontSize: 22, marginBottom: 6 }}>📍</div>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#f0f2ff", marginBottom: 4 }}>
        Tap any marker
      </p>
      <p style={{ fontSize: 11, color: "#8896b3", marginBottom: 8 }}>to log your visit</p>
      <p style={{ fontSize: 10, color: "#8896b3" }}>
        Use <span style={{ color: "#c4a8ff", fontWeight: 600 }}>Near Me</span> to find the closest
        unvisited outlet
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  accent,
  multiline,
}: {
  label: string;
  value: string;
  accent?: string;
  multiline?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 11, lineHeight: 1.45 }}>
      <span style={{ color: "#8896b3", fontWeight: 600, minWidth: 52, flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          color: accent ?? "#c4cfee",
          flex: 1,
          ...(multiline
            ? {}
            : { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
interface MapInnerProps {
  locations: Location[];
  visits: Visit[];
  isVisited: (id: string) => boolean;
  onToggleVisit: (id: string) => void;
  onUpdateVisit?: (
    locationId: string,
    patch: { visited_at?: string; notes?: string | null },
  ) => void;
  mode: MapMode;
  onModeChange: (m: MapMode) => void;
  is3DLoading?: boolean;
  regionFilter: string | null;
  initialSelectedId?: string | null;
  onSelectedIdChange?: (id: string | null) => void;
}

function MapInner({
  locations,
  visits,
  isVisited,
  onToggleVisit,
  onUpdateVisit,
  mode,
  onModeChange,
  is3DLoading,
  regionFilter,
  initialSelectedId,
  onSelectedIdChange,
}: MapInnerProps) {
  const map = useMap();
  const {
    isFavourite,
    toggleFavourite,
    getVisitDetails,
    saveVisitDetails,
    starredCount,
    isAuthed: extrasAuthed,
  } = useOutletExtras();
  const {
    position: userPos,
    requestLocation,
    isLoading: gpsLoading,
    status: geoStatus,
  } = useUserLocation();

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [mapFilter, setMapFilter] = useState<MapFilter>("all");
  const [nearestId, setNearestId] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(
    () => typeof window !== "undefined" && !!localStorage.getItem("af-onboarded"),
  );

  const selectLocation = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      onSelectedIdChange?.(id);
    },
    [onSelectedIdChange],
  );

  useEffect(() => {
    if (initialSelectedId && locations.some((l) => l.id === initialSelectedId)) {
      setSelectedId(initialSelectedId);
    }
  }, [initialSelectedId, locations]);

  const selectedLoc = locations.find((l) => l.id === selectedId);
  const selectedVisit = visits.find((v) => v.location_id === selectedId);
  const visitDetails = selectedLoc ? getVisitDetails(selectedLoc.id) : null;

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
      { query: `${query} Singapore`, fields: ["photos"] },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]?.photos?.[0]) {
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
    const listener = map.addListener("click", () => selectLocation(null));
    return () => google.maps.event.removeListener(listener);
  }, [map, selectLocation]);

  // Dismiss onboarding
  const dismissOnboarding = useCallback(() => {
    setOnboardingDone(true);
    localStorage.setItem("af-onboarded", "1");
  }, []);

  // Recenter to all SG outlets
  const handleRecenter = useCallback(() => {
    if (!map || !locations.length) return;
    const bounds = new google.maps.LatLngBounds();
    locations.forEach((l) => bounds.extend({ lat: l.lat, lng: l.lng }));
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

  const handleNearMe = useCallback(async () => {
    const forceRetry =
      geoStatus === "denied" || geoStatus === "timeout" || geoStatus === "unavailable";
    const pos = await requestLocation(forceRetry);
    if (!pos) {
      toast.error("Location unavailable", {
        description: "Try enabling location permission or use search instead.",
      });
      return;
    }

    map?.panTo(pos);
    map?.setZoom(14);

    const unvisited = locations.filter((l) => !isVisited(l.id));
    if (!unvisited.length) {
      toast.info("All outlets visited!", {
        description: "You have visited every AF outlet in Singapore.",
      });
      return;
    }

    const nearest = unvisited.reduce((best, loc) =>
      haversine(pos, loc) < haversine(pos, best) ? loc : best,
    );
    const dist = formatDistance(haversine(pos, nearest));
    setNearestId(nearest.id);

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(pos);
    bounds.extend({ lat: nearest.lat, lng: nearest.lng });
    map?.fitBounds(bounds, 100);

    setTimeout(() => selectLocation(nearest.id), 400);

    toast.success(`Nearest unvisited: ${nearest.name}`, {
      description: `${dist} away · Tap the marker or use Open route`,
      duration: 8000,
      action: {
        label: "Open route",
        onClick: () => window.open(buildGoogleMapsDirectionsUrl(pos, nearest), "_blank"),
      },
    });
  }, [map, locations, isVisited, requestLocation, selectLocation, geoStatus]);

  const handleDirections = useCallback(
    async (loc: Location) => {
      const routeWindow = window.open("about:blank", "_blank");
      const forceRetry =
        geoStatus === "denied" || geoStatus === "timeout" || geoStatus === "unavailable";
      const pos = await requestLocation(forceRetry);
      const url = buildGoogleMapsDirectionsUrl(pos, loc);

      if (routeWindow) {
        routeWindow.location.href = url;
      } else {
        window.open(url, "_blank");
      }
    },
    [geoStatus, requestLocation],
  );

  // Fly to outlet from search
  const handleSearchSelect = useCallback(
    (loc: Location) => {
      map?.panTo({ lat: loc.lat, lng: loc.lng });
      map?.setZoom(16);
      selectLocation(loc.id);
      setStatsOpen(false);
    },
    [map, selectLocation],
  );

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
    const loc = locations.find((l) => l.id === selectedId);
    if (!loc) return;
    map.panTo({ lat: loc.lat, lng: loc.lng });
    // After the pan settles, offset the center upward so the marker
    // lands ~60 % down from the top, leaving room for the ~300 px popup above.
    const t = setTimeout(() => map.panBy(0, -160), 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Region stats for stats panel
  const regionStats = useMemo(
    () => computeRegionStats(locations, isVisited),
    [locations, isVisited],
  );

  const visitedCount = visits.length;
  const totalCount = locations.length;
  const percentage = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;

  const achievements = useMemo(
    () => computeAchievements(visitedCount, totalCount, percentage, regionStats),
    [visitedCount, totalCount, percentage, regionStats],
  );

  const recentVisits = useMemo(() => {
    return [...visits]
      .sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime())
      .slice(0, 5)
      .map((v) => {
        const location = locations.find((l) => l.id === v.location_id);
        return location ? { location, visit: v } : null;
      })
      .filter(Boolean) as { location: Location; visit: Visit }[];
  }, [visits, locations]);

  const nearestUnvisitedLoc = useMemo(
    () => findNearestUnvisited(locations, isVisited, userPos),
    [locations, isVisited, userPos],
  );

  // Filter visible markers (map toggle + external region filter)
  const visibleLocations = useMemo(() => {
    let result = locations;
    if (regionFilter) result = result.filter((l) => (l.region || "Other") === regionFilter);
    if (mapFilter === "visited") result = result.filter((l) => isVisited(l.id));
    if (mapFilter === "unvisited") result = result.filter((l) => !isVisited(l.id));
    if (mapFilter === "favourites") result = result.filter((l) => isFavourite(l.id));
    return result;
  }, [locations, mapFilter, isVisited, regionFilter, isFavourite]);

  // When a region filter activates from outside, fit map to those markers
  useEffect(() => {
    if (!map || !regionFilter) return;
    const filtered = locations.filter((l) => (l.region || "Other") === regionFilter);
    if (!filtered.length) return;
    const bounds = new google.maps.LatLngBounds();
    filtered.forEach((l) => bounds.extend({ lat: l.lat, lng: l.lng }));
    map.fitBounds(bounds, 80);
  }, [map, regionFilter, locations]);

  return (
    <>
      {/* Outlet markers */}
      {visibleLocations.map((loc) => (
        <OutletMarker
          key={loc.id}
          loc={loc}
          visited={isVisited(loc.id)}
          nearest={loc.id === nearestId}
          selected={loc.id === selectedId}
          onClick={() => {
            selectLocation(selectedId === loc.id ? null : loc.id);
            setStatsOpen(false);
            dismissOnboarding();
          }}
          zIndex={
            loc.id === selectedId ? 15 : loc.id === nearestId ? 12 : isVisited(loc.id) ? 2 : 4
          }
        />
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
          onCloseClick={() => selectLocation(null)}
          pixelOffset={[0, -44]}
          headerDisabled
        >
          <div
            style={{
              width: "min(300px, calc(100vw - 32px))",
              maxHeight: "min(460px, 65vh)",
              background: "#12172a",
              borderRadius: 12,
              overflow: "hidden",
              overflowY: "auto",
              fontFamily: '"DM Sans", system-ui, sans-serif',
            }}
          >
            {placePhotoUrl && (
              <div style={{ position: "relative", width: "100%", height: 120 }}>
                <img
                  src={placePhotoUrl}
                  alt={selectedLoc.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to bottom, transparent 50%, rgba(18,23,42,0.85) 100%)",
                  }}
                />
              </div>
            )}

            <div style={{ padding: "10px 12px 12px" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 8 }}>
                {extrasAuthed && (
                  <button
                    type="button"
                    onClick={() => toggleFavourite(selectedLoc.id)}
                    title={isFavourite(selectedLoc.id) ? "Remove starred" : "Star outlet"}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 2,
                      flexShrink: 0,
                      marginTop: 1,
                      color: isFavourite(selectedLoc.id) ? "#F5A623" : "#4a5568",
                    }}
                  >
                    <Star
                      style={{ width: 16, height: 16 }}
                      fill={isFavourite(selectedLoc.id) ? "#F5A623" : "none"}
                    />
                  </button>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#f0f2ff",
                      lineHeight: 1.35,
                      margin: 0,
                    }}
                  >
                    {selectedLoc.name}
                  </p>
                </div>
              </div>

              {/* Structured info rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                <InfoRow label="Address" value={selectedLoc.address} />
                {selectedLoc.region && <InfoRow label="Region" value={selectedLoc.region} />}
                <InfoRow
                  label="Status"
                  value={isVisited(selectedLoc.id) ? "Visited" : "Unvisited"}
                  accent={isVisited(selectedLoc.id) ? "#c4a8ff" : "#8896b3"}
                />
                {selectedVisit && (
                  <InfoRow
                    label="Visited"
                    value={new Date(selectedVisit.visited_at).toLocaleDateString("en-SG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  />
                )}
                {visitDetails?.note && (
                  <InfoRow label="Notes" value={visitDetails.note} multiline />
                )}
                {visitDetails?.rating && (
                  <InfoRow label="Rating" value={`${visitDetails.rating}/5`} />
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <a
                  href={buildGoogleMapsSearchUrl(selectedLoc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    background: "rgba(255,255,255,0.07)",
                    color: "#a8b4d0",
                    textDecoration: "none",
                    boxSizing: "border-box",
                  }}
                >
                  <MapIcon style={{ width: 13, height: 13 }} /> Open in Google Maps
                </a>

                <button
                  type="button"
                  onClick={() => handleDirections(selectedLoc)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    border: "1px solid rgba(124,66,237,0.32)",
                    cursor: "pointer",
                    background: "rgba(124,66,237,0.14)",
                    color: "#c4a8ff",
                    boxSizing: "border-box",
                  }}
                >
                  <Navigation style={{ width: 13, height: 13 }} /> Get directions
                </button>

                <button
                  type="button"
                  onClick={() => onToggleVisit(selectedLoc.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    borderRadius: 8,
                    padding: "9px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: isVisited(selectedLoc.id) ? "rgba(255,255,255,0.08)" : "#7C42ED",
                    color: isVisited(selectedLoc.id) ? "#8896b3" : "#fff",
                  }}
                >
                  {isVisited(selectedLoc.id) ? (
                    <>
                      <X style={{ width: 13, height: 13 }} /> Unmark Visit
                    </>
                  ) : (
                    <>
                      <Check style={{ width: 13, height: 13 }} /> Mark as Visited
                    </>
                  )}
                </button>

                {extrasAuthed && isVisited(selectedLoc.id) && (
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      border: "1px solid rgba(124,66,237,0.3)",
                      cursor: "pointer",
                      background: "rgba(124,66,237,0.12)",
                      color: "#c4a8ff",
                    }}
                  >
                    <Pencil style={{ width: 13, height: 13 }} /> Edit Visit Details
                  </button>
                )}
              </div>
            </div>
          </div>
        </InfoWindow>
      )}

      {selectedLoc && visitDetails && (
        <EditVisitModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          gymName={selectedLoc.name}
          visitDate={selectedVisit?.visited_at ?? new Date().toISOString()}
          note={visitDetails.note}
          rating={visitDetails.rating}
          crowdLevel={visitDetails.crowdLevel}
          equipmentQuality={visitDetails.equipmentQuality}
          cleanliness={visitDetails.cleanliness}
          onSave={(data) => {
            saveVisitDetails(selectedLoc.id, {
              note: data.note || null,
              rating: data.rating,
              crowd_level: data.crowdLevel,
              equipment_quality: data.equipmentQuality,
              cleanliness: data.cleanliness,
            });
            onUpdateVisit?.(selectedLoc.id, {
              visited_at: data.visitDate,
              notes: data.note || null,
            });
            toast.success("Visit details saved");
          }}
        />
      )}

      {/* Overlays */}
      {searchOpen && (
        <SearchOverlay
          locations={locations}
          isVisited={isVisited}
          onSelect={handleSearchSelect}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {statsOpen && (
        <StatsPanel
          visitedCount={visitedCount}
          totalCount={totalCount}
          percentage={percentage}
          achievements={achievements}
          recentVisits={recentVisits}
          starredCount={starredCount}
          nearestUnvisited={nearestUnvisitedLoc}
          userPos={userPos}
          onClose={() => setStatsOpen(false)}
        />
      )}

      {!onboardingDone && !searchOpen && !statsOpen && (
        <OnboardingTooltip onDismiss={dismissOnboarding} />
      )}

      <MapLegend />

      <MapControls
        mode={mode}
        onModeChange={onModeChange}
        is3DLoading={is3DLoading}
        mapFilter={mapFilter}
        onFilterChange={setMapFilter}
        onRecenter={handleRecenter}
        onNearMe={handleNearMe}
        gpsLoading={gpsLoading}
        geoStatus={geoStatus}
        onToggleStats={() => setStatsOpen((s) => !s)}
        statsOpen={statsOpen}
        onToggleSearch={() => setSearchOpen((s) => !s)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      {mode === "3d" && !is3DLoading && <HeadingControls />}
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
          Add{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-violet-400">
            VITE_GOOGLE_MAPS_API_KEY
          </code>{" "}
          to your <code className="bg-muted px-1.5 py-0.5 rounded text-violet-400">.env</code> file.
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
  onUpdateVisit?: (
    locationId: string,
    patch: { visited_at?: string; notes?: string | null },
  ) => void;
  regionFilter?: string | null;
  initialSelectedId?: string | null;
  onSelectedIdChange?: (id: string | null) => void;
}

export function GoogleMapView({
  locations,
  visits,
  isVisited,
  onToggleVisit,
  onUpdateVisit,
  regionFilter,
  initialSelectedId,
  onSelectedIdChange,
}: GoogleMapViewProps) {
  const [mode, setMode] = useState<MapMode>("roadmap");
  const [is3DLoading, setIs3DLoading] = useState(false);
  const prevModeRef = useRef<MapMode>("roadmap");

  const handleModeChange = useCallback(
    (next: MapMode) => {
      if (next === mode && next !== "3d") return;
      if (next === "3d" && mode === "3d" && !is3DLoading) return;

      if (next === "3d") {
        prevModeRef.current = mode;
        setIs3DLoading(true);
        if (!MAP_ID) {
          toast.info("Set VITE_GOOGLE_MAPS_MAP_ID with vector rendering enabled for full 3D tilt.");
        }
      }

      setMode(next);
    },
    [mode, is3DLoading],
  );

  const handle3DComplete = useCallback(
    ({ tiltApplied, renderingType }: { tiltApplied: boolean; renderingType?: string }) => {
      setIs3DLoading(false);
      if (tiltApplied) return;

      const isRaster =
        renderingType === "RASTER" || renderingType === "UNINITIALIZED" || !renderingType;

      toast.warning(
        isRaster
          ? "3D tilt needs vector rendering. Check your Map ID is Vector with Tilt enabled, then restart the app."
          : "3D tilt is not available at this zoom. Zoom in closer and try again.",
      );
      // Stay on hybrid view — don't snap back; user may still pan/zoom manually
    },
    [],
  );

  if (!API_KEY) {
    return (
      <div className="w-full h-full rounded-2xl overflow-hidden border border-border bg-card">
        <NoApiKeyMessage />
      </div>
    );
  }

  const mapProps = MAP_ID
    ? { mapId: MAP_ID, renderingType: RenderingType.VECTOR as google.maps.RenderingType }
    : { styles: mode === "roadmap" ? DARK_STYLES : [] };

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
      <APIProvider apiKey={API_KEY} libraries={["places"]}>
        <Map
          {...mapProps}
          defaultBounds={SG_BOUNDS}
          mapTypeId={mapTypeIdForMode(mode)}
          tilt={mode === "3d" ? MAP_3D_TILT : 0}
          heading={mode === "3d" ? MAP_3D_HEADING : 0}
          tiltInteractionEnabled={mode === "3d"}
          headingInteractionEnabled={mode === "3d"}
          disableDefaultUI
          clickableIcons={false}
          gestureHandling="greedy"
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
        >
          <MapInit />
          <MapModeController mode={mode} on3DComplete={handle3DComplete} />
          <MapInner
            locations={locations}
            visits={visits}
            isVisited={isVisited}
            onToggleVisit={onToggleVisit}
            onUpdateVisit={onUpdateVisit}
            mode={mode}
            onModeChange={handleModeChange}
            is3DLoading={is3DLoading}
            regionFilter={regionFilter ?? null}
            initialSelectedId={initialSelectedId ?? null}
            onSelectedIdChange={onSelectedIdChange}
          />
        </Map>
      </APIProvider>
    </div>
  );
}
