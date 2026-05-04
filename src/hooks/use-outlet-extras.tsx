import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';

export interface OutletExtra {
  user_id: string;
  location_id: string;
  is_favourite: boolean;
  note: string | null;
}

export function useOutletExtras() {
  const { user } = useAuth();
  const [extras, setExtras] = useState<OutletExtra[]>([]);

  const fetchExtras = useCallback(async () => {
    if (!user) { setExtras([]); return; }
    const { data } = await supabase
      .from('outlet_extras')
      .select('*')
      .eq('user_id', user.id);
    if (data) setExtras(data as OutletExtra[]);
  }, [user]);

  useEffect(() => { fetchExtras(); }, [fetchExtras]);

  const upsert = async (
    locationId: string,
    patch: Partial<Pick<OutletExtra, 'is_favourite' | 'note'>>,
  ) => {
    if (!user) return;
    const current = extras.find(e => e.location_id === locationId);
    const next: OutletExtra = {
      user_id: user.id,
      location_id: locationId,
      is_favourite: current?.is_favourite ?? false,
      note: current?.note ?? null,
      ...patch,
    };
    setExtras(prev => [...prev.filter(e => e.location_id !== locationId), next]);
    await supabase
      .from('outlet_extras')
      .upsert({ ...next, updated_at: new Date().toISOString() }, { onConflict: 'user_id,location_id' });
  };

  const isFavourite = (locationId: string) =>
    extras.some(e => e.location_id === locationId && e.is_favourite);

  const getNote = (locationId: string) =>
    extras.find(e => e.location_id === locationId)?.note ?? '';

  const toggleFavourite = (locationId: string) => {
    const current = extras.find(e => e.location_id === locationId);
    upsert(locationId, { is_favourite: !(current?.is_favourite ?? false) });
  };

  const saveNote = (locationId: string, note: string) => {
    upsert(locationId, { note: note.trim() || null });
  };

  return {
    isFavourite,
    getNote,
    toggleFavourite,
    saveNote,
    isAuthed: !!user,
  };
}
