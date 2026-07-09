import type { Location } from "@/hooks/use-locations";

export function formatOutletSearchName(name: string): string {
  return /^anytime fitness/i.test(name) ? name : `Anytime Fitness ${name}`;
}

export function buildGoogleMapsSearchUrl(location: Pick<Location, "name" | "address">): string {
  const query = `${formatOutletSearchName(location.name)}, ${location.address}, Singapore`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsDirectionsUrl(
  origin: { lat: number; lng: number } | null,
  destination: Pick<Location, "lat" | "lng">,
): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${destination.lat},${destination.lng}`,
    travelmode: "driving",
  });

  if (origin) {
    params.set("origin", `${origin.lat},${origin.lng}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
