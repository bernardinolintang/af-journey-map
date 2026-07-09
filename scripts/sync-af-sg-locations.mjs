import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const RAW_DIR = path.join(__dirname, "raw");
const MAP_LOCATIONS_URL = "https://www.anytimefitness.sg/wp-json/anytime/v1/map-locations";

const REGION_SOURCES = [
  {
    file: "central.html",
    region: "Central",
    url: "https://www.anytimefitness.sg/locations/sg/central-singapore/",
  },
  {
    file: "north-east.html",
    region: "North East",
    url: "https://www.anytimefitness.sg/locations/sg/north-east/",
  },
  {
    file: "north-west.html",
    region: "North West",
    url: "https://www.anytimefitness.sg/locations/sg/north-west/",
  },
  {
    file: "south-east.html",
    region: "South East",
    url: "https://www.anytimefitness.sg/locations/sg/south-east/",
  },
  {
    file: "south-west.html",
    region: "South West",
    url: "https://www.anytimefitness.sg/locations/sg/south-west/",
  },
];

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const source = args.has("--source=raw") ? "raw" : "web";
const retireMissing = args.has("--retire-missing");
const parseOnly = args.has("--parse-only");

const rowRe =
  /<tr>\s*<td scope="row"><a href="([^"]*\/gyms\/(sg-\d+)\/[^"]*)">([\s\S]*?)<\/a><\/td>\s*<td class="locations-list-address">([\s\S]*?)<\/td>\s*<td class="locations-list-phone">[\s\S]*?<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi;

async function loadDotEnv() {
  const envPath = path.join(ROOT_DIR, ".env");
  try {
    const text = await fs.readFile(envPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, " ");
}

function cleanText(value) {
  return decodeHtml(stripTags(value)).replace(/\s+/g, " ").trim();
}

function cleanName(rawName) {
  return cleanText(rawName)
    .replace(/,\s*(?:Central Singapore|North East|North West|South East|South West)\s*$/i, "")
    .trim();
}

function normalize(value) {
  return cleanText(String(value ?? ""))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameAddressKey(location) {
  return `${normalize(location.name)}|${normalize(location.address)}`;
}

function createSingleValueMap(rows, keyFn) {
  const map = new Map();
  const duplicateKeys = new Set();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    if (map.has(key)) duplicateKeys.add(key);
    map.set(key, row);
  }
  for (const key of duplicateKeys) map.delete(key);
  return map;
}

async function readHtml(regionSource) {
  return fs.readFile(path.join(RAW_DIR, regionSource.file), "utf8");
}

function normalizeRegion(region) {
  return region === "Central Singapore" ? "Central" : region;
}

function statusLabel(statusCode) {
  if (statusCode === 3) return "Open";
  if (statusCode === 1) return "Coming Soon";
  if (statusCode === 0) return "Closed";
  return `Status ${statusCode}`;
}

function combinedAddress(content) {
  return [content.address, content.address2].map(cleanText).filter(Boolean).join(" ");
}

function parseCoordinate(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isSingaporeCoordinate(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 1.2 &&
    lat <= 1.5 &&
    lng >= 103.5 &&
    lng <= 104.1
  );
}

async function fetchMapOutlets() {
  const response = await fetch(MAP_LOCATIONS_URL, {
    headers: {
      "user-agent": "AF Tracker SG location sync (+https://www.anytimefitness.sg/locations/)",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${MAP_LOCATIONS_URL}: ${response.status} ${response.statusText}`,
    );
  }
  const rows = await response.json();
  const outlets = [];

  for (const row of rows) {
    const content = row.content ?? {};
    if (content.country !== "SG" || !content.number || !content.title) continue;

    outlets.push({
      af_source_id: String(content.number).toLowerCase(),
      af_url: content.url,
      name: cleanText(content.title),
      address: combinedAddress(content),
      lat: parseCoordinate(row.latitude),
      lng: parseCoordinate(row.longitude),
      region: normalizeRegion(content.state),
      status: statusLabel(Number(content.status)),
      is_active: Number(content.status) !== 0,
    });
  }

  console.log(`Map endpoint ${outlets.length} Singapore outlets`);
  return outlets;
}

async function fetchRawOutlets() {
  const outlets = [];
  const seen = new Set();

  for (const regionSource of REGION_SOURCES) {
    const html = await readHtml(regionSource);
    let regionCount = 0;

    for (const match of html.matchAll(rowRe)) {
      const [, url, sourceId, rawName, rawAddress, rawStatus] = match;
      if (seen.has(sourceId)) continue;
      seen.add(sourceId);
      outlets.push({
        af_source_id: sourceId,
        af_url: decodeHtml(url),
        name: cleanName(rawName),
        address: cleanText(rawAddress),
        region: regionSource.region,
        status: cleanText(rawStatus) || "Open",
        is_active: true,
      });
      regionCount += 1;
    }

    console.log(`${regionSource.region.padEnd(10)} ${regionCount} outlets`);
  }

  return outlets;
}

async function fetchOfficialOutlets() {
  if (source === "raw") return fetchRawOutlets();
  return fetchMapOutlets();
}

async function geocode(address) {
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_MAPS_API_KEY is required to geocode new or moved outlets.");
  }

  const params = new URLSearchParams({
    address: `${address}, Singapore`,
    region: "sg",
    components: "country:SG",
    key,
  });
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  const data = await response.json();
  if (data.status !== "OK" || !data.results?.length) {
    throw new Error(
      `Geocode failed for "${address}": ${data.status}${data.error_message ? ` ${data.error_message}` : ""}`,
    );
  }
  return data.results[0].geometry.location;
}

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function fetchCurrentLocations(supabase) {
  const { data, error } = await supabase
    .from("locations")
    .select(
      "id,af_source_id,af_url,name,address,lat,lng,country,region,status,is_active,is_24h,last_seen_at,source_updated_at",
    )
    .eq("country", "SG");

  if (error) throw error;
  return data ?? [];
}

function findExisting(sourceOutlet, maps) {
  return (
    maps.bySourceId.get(sourceOutlet.af_source_id) ??
    maps.byNameAddress.get(nameAddressKey(sourceOutlet)) ??
    maps.byAddress.get(normalize(sourceOutlet.address)) ??
    maps.byName.get(normalize(sourceOutlet.name)) ??
    null
  );
}

function hasChanged(existing, patch) {
  return Object.entries(patch).some(([key, value]) => existing[key] !== value);
}

async function buildPatch(sourceOutlet, existing, seenAt) {
  const hasSourceCoordinates = isSingaporeCoordinate(sourceOutlet.lat, sourceOutlet.lng);
  const addressChanged =
    !existing || normalize(existing.address) !== normalize(sourceOutlet.address);
  const needsCoordinates =
    !hasSourceCoordinates &&
    (!existing || !isSingaporeCoordinate(existing.lat, existing.lng) || addressChanged);

  const coords = hasSourceCoordinates
    ? { lat: sourceOutlet.lat, lng: sourceOutlet.lng }
    : needsCoordinates
      ? await geocode(sourceOutlet.address)
      : { lat: existing.lat, lng: existing.lng };

  return {
    af_source_id: sourceOutlet.af_source_id,
    af_url: sourceOutlet.af_url,
    name: sourceOutlet.name,
    address: sourceOutlet.address,
    lat: coords.lat,
    lng: coords.lng,
    country: "SG",
    region: sourceOutlet.region,
    status: sourceOutlet.status,
    is_active: sourceOutlet.is_active,
    is_24h: true,
    last_seen_at: seenAt,
    source_updated_at: seenAt,
  };
}

async function main() {
  await loadDotEnv();

  console.log(`AF SG location sync (${apply ? "apply" : "dry run"}, source: ${source})`);
  const officialOutlets = await fetchOfficialOutlets();
  console.log(`Official outlets found: ${officialOutlets.length}`);
  if (parseOnly) return;

  const supabase = createSupabaseClient();
  const currentLocations = await fetchCurrentLocations(supabase);
  console.log(`Current SG rows: ${currentLocations.length}`);

  const maps = {
    bySourceId: createSingleValueMap(currentLocations, (row) => row.af_source_id),
    byNameAddress: createSingleValueMap(currentLocations, nameAddressKey),
    byAddress: createSingleValueMap(currentLocations, (row) => normalize(row.address)),
    byName: createSingleValueMap(currentLocations, (row) => normalize(row.name)),
  };

  const seenAt = new Date().toISOString();
  const matchedIds = new Set();
  const changes = {
    insert: [],
    update: [],
    unchanged: [],
    retire: [],
  };

  for (const sourceOutlet of officialOutlets) {
    const existing = findExisting(sourceOutlet, maps);
    const patch = await buildPatch(sourceOutlet, existing, seenAt);

    if (!existing) {
      changes.insert.push({ sourceOutlet, patch });
      continue;
    }

    matchedIds.add(existing.id);
    const comparablePatch = { ...patch };
    delete comparablePatch.last_seen_at;
    delete comparablePatch.source_updated_at;
    if (hasChanged(existing, comparablePatch)) {
      changes.update.push({ existing, sourceOutlet, patch });
    } else {
      changes.unchanged.push(sourceOutlet);
    }
  }

  if (retireMissing) {
    for (const existing of currentLocations) {
      if (!existing.af_source_id || matchedIds.has(existing.id) || existing.is_active === false)
        continue;
      changes.retire.push(existing);
    }
  }

  console.log(`Insert:    ${changes.insert.length}`);
  console.log(`Update:    ${changes.update.length}`);
  console.log(`Unchanged: ${changes.unchanged.length}`);
  console.log(
    `Retire:    ${changes.retire.length}${retireMissing ? "" : " (--retire-missing disabled)"}`,
  );

  for (const item of changes.insert)
    console.log(`  + ${item.sourceOutlet.af_source_id} ${item.sourceOutlet.name}`);
  for (const item of changes.update)
    console.log(`  ~ ${item.sourceOutlet.af_source_id} ${item.sourceOutlet.name}`);
  for (const item of changes.retire) console.log(`  - ${item.af_source_id} ${item.name}`);

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to write changes.");
    return;
  }

  for (const item of changes.insert) {
    const { error } = await supabase.from("locations").insert(item.patch);
    if (error) throw error;
  }

  for (const item of changes.update) {
    const { error } = await supabase
      .from("locations")
      .update(item.patch)
      .eq("id", item.existing.id);
    if (error) throw error;
  }

  for (const item of changes.retire) {
    const { error } = await supabase
      .from("locations")
      .update({ is_active: false, status: "Not listed", source_updated_at: seenAt })
      .eq("id", item.id);
    if (error) throw error;
  }

  console.log("Sync applied without deleting any location rows.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
