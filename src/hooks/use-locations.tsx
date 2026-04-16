import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import { STATIC_LOCATIONS } from '@/data/locations';

export interface Location {
  id: string;  // Always the static slug-based ID
  name: string;
  address: string;
  lat: number;
  lng: number;
  country: string;
  region: string | null;
  is_24h: boolean;
}

export interface Visit {
  id: string;
  user_id: string;
  location_id: string; // static slug ID
  visited_at: string;
  notes: string | null;
}

export function useLocations() {
  const { user } = useAuth();

  // Locations are always the static dataset — no DB round-trip for the map
  const locations: Location[] = STATIC_LOCATIONS;

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  // DB name→uuid index, built once after login
  const [nameToDbId, setNameToDbId] = useState<Map<string, string>>(new Map());
  const [dbIdToName, setDbIdToName] = useState<Map<string, string>>(new Map());

  const fetchVisits = useCallback(async () => {
    setLoading(true);

    if (!user) {
      setVisits([]);
      setLoading(false);
      return;
    }

    // Fetch DB location index (name → uuid) and user visits in parallel
    const [{ data: dbLocs }, { data: rawVisits }] = await Promise.all([
      supabase.from('locations').select('id, name').eq('country', 'SG'),
      supabase.from('visits').select('*').eq('user_id', user.id),
    ]);

    const n2id = new Map<string, string>();
    const id2n = new Map<string, string>();
    for (const loc of (dbLocs ?? [])) {
      n2id.set(loc.name, loc.id);
      id2n.set(loc.id, loc.name);
    }
    setNameToDbId(n2id);
    setDbIdToName(id2n);

    // Translate DB visits (by uuid) → our static slug IDs (by name match)
    const translated: Visit[] = (rawVisits ?? []).map(v => {
      const locName = id2n.get(v.location_id);
      const staticId = locName
        ? locName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : v.location_id; // fallback: keep DB id if no match
      return {
        id: v.id,
        user_id: v.user_id,
        location_id: staticId,
        visited_at: v.visited_at,
        notes: v.notes ?? null,
      };
    });

    setVisits(translated);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const toggleVisit = async (locationId: string) => {
    if (!user) return;

    const existing = visits.find(v => v.location_id === locationId);

    if (existing) {
      // Optimistic remove
      setVisits(prev => prev.filter(v => v.id !== existing.id));
      await supabase.from('visits').delete().eq('id', existing.id);
    } else {
      // Look up the DB uuid for this location by name
      const staticLoc = STATIC_LOCATIONS.find(l => l.id === locationId);
      const dbId = staticLoc ? nameToDbId.get(staticLoc.name) : undefined;

      if (!dbId) {
        // DB not seeded yet — show a brief console warning
        console.warn(`Location "${staticLoc?.name}" not found in database. Run scripts/setup.sql to seed locations.`);
        return;
      }

      const tempVisit: Visit = {
        id: crypto.randomUUID(),
        user_id: user.id,
        location_id: locationId, // static id for optimistic UI
        visited_at: new Date().toISOString(),
        notes: null,
      };
      setVisits(prev => [...prev, tempVisit]);

      const { data } = await supabase
        .from('visits')
        .insert({ user_id: user.id, location_id: dbId })
        .select()
        .single();

      if (data) {
        // Replace temp visit, keeping static slug ID
        setVisits(prev =>
          prev.map(v => v.id === tempVisit.id ? { ...tempVisit, id: data.id } : v)
        );
      } else {
        // Revert on failure
        setVisits(prev => prev.filter(v => v.id !== tempVisit.id));
      }
    }
  };

  const isVisited = (locationId: string) => visits.some(v => v.location_id === locationId);
  const visitedCount = visits.length;
  const totalCount = locations.length;
  const percentage = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;

  return {
    locations,
    visits,
    loading,
    toggleVisit,
    isVisited,
    visitedCount,
    totalCount,
    percentage,
    refetch: fetchVisits,
  };
}
