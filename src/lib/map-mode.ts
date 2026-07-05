export type MapMode = "roadmap" | "satellite" | "3d";

export const MAP_3D_MIN_ZOOM = 17;
export const MAP_3D_TILT = 45;
export const MAP_3D_HEADING = 35;
export const HEADING_STEP = 20;

/** String map type IDs — safe during SSR (no `google` global required). */
export function mapTypeIdForMode(mode: MapMode): "roadmap" | "hybrid" {
  switch (mode) {
    case "roadmap":
      return "roadmap";
    case "satellite":
    case "3d":
      return "hybrid";
  }
}

export function waitForMapIdle(map: google.maps.Map): Promise<void> {
  return new Promise((resolve) => {
    const listener = map.addListener("idle", () => {
      google.maps.event.removeListener(listener);
      resolve();
    });
  });
}

function delayFrames(frames = 2): Promise<void> {
  return new Promise((resolve) => {
    let n = 0;
    const tick = () => {
      n++;
      if (n >= frames) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Apply vector rendering + interaction flags when the API supports them. */
export function applyMapInteractionOptions(map: google.maps.Map, mode: MapMode) {
  map.setOptions({
    tiltInteractionEnabled: mode === "3d",
    headingInteractionEnabled: mode === "3d",
    rotateControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  });

  const vectorType =
    typeof google !== "undefined" ? google.maps.RenderingType?.VECTOR : undefined;
  if (vectorType) {
    try {
      map.setOptions({ renderingType: vectorType });
    } catch {
      // Older API builds may not support renderingType
    }
  }
}

export async function applyMapMode(
  map: google.maps.Map,
  mode: MapMode,
): Promise<{ tiltApplied: boolean; renderingType?: string }> {
  applyMapInteractionOptions(map, mode);

  if (mode === "roadmap") {
    map.setTilt(0);
    map.setHeading(0);
    map.setMapTypeId("roadmap");
    await waitForMapIdle(map);
    return { tiltApplied: true, renderingType: map.getRenderingType?.() };
  }

  if (mode === "satellite") {
    map.setTilt(0);
    map.setHeading(0);
    map.setMapTypeId("hybrid");
    await waitForMapIdle(map);
    return { tiltApplied: true, renderingType: map.getRenderingType?.() };
  }

  // 3D — hybrid + zoom, then tilt + heading together via moveCamera
  map.setMapTypeId("hybrid");
  const zoom = map.getZoom() ?? 12;
  const targetZoom = zoom < MAP_3D_MIN_ZOOM ? MAP_3D_MIN_ZOOM : zoom;
  if (targetZoom !== zoom) {
    map.setZoom(targetZoom);
    await waitForMapIdle(map);
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    map.moveCamera?.({
      tilt: MAP_3D_TILT,
      heading: MAP_3D_HEADING,
      zoom: targetZoom,
    });
    await delayFrames(4);
    await waitForMapIdle(map);

    const actualTilt = map.getTilt?.() ?? 0;
    if (actualTilt > 0) {
      return { tiltApplied: true, renderingType: map.getRenderingType?.() };
    }
  }

  return { tiltApplied: false, renderingType: map.getRenderingType?.() };
}

export function rotateHeading(map: google.maps.Map, delta: number) {
  const current = map.getHeading?.() ?? 0;
  map.setHeading?.(current + delta);
}

export function resetHeading(map: google.maps.Map) {
  map.setHeading?.(0);
}
