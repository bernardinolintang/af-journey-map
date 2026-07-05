import type { Location } from "@/hooks/use-locations";

export function formatOutletSearchName(name: string): string {
  return /^anytime fitness/i.test(name) ? name : `Anytime Fitness ${name}`;
}

export function buildGoogleMapsSearchUrl(location: Pick<Location, "name" | "address">): string {
  const query = `${formatOutletSearchName(location.name)}, ${location.address}, Singapore`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsDirectionsUrl(
  origin: { lat: number; lng: number },
  destination: Pick<Location, "lat" | "lng">,
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
}
