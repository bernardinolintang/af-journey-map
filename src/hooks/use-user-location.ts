import { useState, useCallback, useRef } from "react";
import type { LatLng } from "@/lib/geo";

export type GeoStatus = "idle" | "loading" | "success" | "denied" | "unavailable" | "timeout";

const SESSION_KEY = "af-user-location";
const SESSION_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

interface CachedLocation extends LatLng {
  timestamp: number;
}

function readSessionCache(): LatLng | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedLocation;
    if (Date.now() - cached.timestamp > SESSION_MAX_AGE_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return { lat: cached.lat, lng: cached.lng };
  } catch {
    return null;
  }
}

function writeSessionCache(pos: LatLng) {
  if (typeof window === "undefined") return;
  const cached: CachedLocation = { ...pos, timestamp: Date.now() };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(cached));
}

export function useUserLocation() {
  const [position, setPosition] = useState<LatLng | null>(() => readSessionCache());
  const [status, setStatus] = useState<GeoStatus>(() => (readSessionCache() ? "success" : "idle"));
  const pendingRef = useRef<Promise<LatLng | null> | null>(null);

  const requestLocation = useCallback((force = false): Promise<LatLng | null> => {
    if (!force) {
      const cached = readSessionCache();
      if (cached) {
        setPosition(cached);
        setStatus("success");
        return Promise.resolve(cached);
      }
    }

    if (pendingRef.current) return pendingRef.current;

    if (!navigator.geolocation) {
      setStatus("unavailable");
      return Promise.resolve(null);
    }

    setStatus("loading");

    const promise = new Promise<LatLng | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          writeSessionCache(p);
          setPosition(p);
          setStatus("success");
          pendingRef.current = null;
          resolve(p);
        },
        (err) => {
          pendingRef.current = null;
          if (err.code === 1) setStatus("denied");
          else if (err.code === 3) setStatus("timeout");
          else setStatus("unavailable");
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: SESSION_MAX_AGE_MS },
      );
    });

    pendingRef.current = promise;
    return promise;
  }, []);

  return { position, status, requestLocation, isLoading: status === "loading" };
}
