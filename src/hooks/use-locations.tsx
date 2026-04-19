import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';

export interface Location {
  id: string;
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
  location_id: string;
  visited_at: string;
  notes: string | null;
}

export function useLocations() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: locs } = await supabase
      .from('locations')
      .select('*')
      .eq('country', 'SG')
      .order('name');

    if (locs) setLocations(locs as Location[]);

    if (user) {
      const { data: vis } = await supabase
        .from('visits')
        .select('*')
        .eq('user_id', user.id);
      if (vis) setVisits(vis as Visit[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleVisit = async (locationId: string): Promise<{ requiresAuth: boolean }> => {
    if (!user) return { requiresAuth: true };

    const existing = visits.find(v => v.location_id === locationId);
    if (existing) {
      // Optimistic remove
      setVisits(prev => prev.filter(v => v.location_id !== locationId));
      await supabase.from('visits').delete().eq('id', existing.id);
    } else {
      // Optimistic add
      const tempVisit: Visit = {
        id: crypto.randomUUID(),
        user_id: user.id,
        location_id: locationId,
        visited_at: new Date().toISOString(),
        notes: null,
      };
      setVisits(prev => [...prev, tempVisit]);
      const { data } = await supabase
        .from('visits')
        .insert({ user_id: user.id, location_id: locationId })
        .select()
        .single();
      if (data) {
        setVisits(prev => prev.map(v => v.id === tempVisit.id ? data as Visit : v));
      }
    }
    return { requiresAuth: false };
  };

  const isVisited = (locationId: string) => visits.some(v => v.location_id === locationId);
  const getVisit = (locationId: string) => visits.find(v => v.location_id === locationId);
  const visitedCount = visits.length;
  const totalCount = locations.length;
  const percentage = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;

  return {
    locations,
    visits,
    loading,
    toggleVisit,
    isVisited,
    getVisit,
    visitedCount,
    totalCount,
    percentage,
    isAuthed: !!user,
    refetch: fetchData,
  };
}
