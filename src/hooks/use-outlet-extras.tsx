import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type QualityLevel = "Poor" | "Okay" | "Good" | "Great";
export type CrowdLevel = "Low" | "Medium" | "High";

export interface OutletExtra {
  user_id: string;
  location_id: string;
  is_favourite: boolean;
  note: string | null;
  rating: number | null;
  crowd_level: CrowdLevel | null;
  equipment_quality: QualityLevel | null;
  cleanliness: QualityLevel | null;
}

export interface VisitDetailsPatch {
  note?: string | null;
  rating?: number | null;
  crowd_level?: CrowdLevel | null;
  equipment_quality?: QualityLevel | null;
  cleanliness?: QualityLevel | null;
}

export function useOutletExtras() {
  const { user } = useAuth();
  const [extras, setExtras] = useState<OutletExtra[]>([]);

  const fetchExtras = useCallback(async () => {
    if (!user) {
      setExtras([]);
      return;
    }
    const { data } = await supabase.from("outlet_extras").select("*").eq("user_id", user.id);
    if (data) setExtras(data as OutletExtra[]);
  }, [user]);

  useEffect(() => {
    fetchExtras();
  }, [fetchExtras]);

  const upsert = async (
    locationId: string,
    patch: Partial<Omit<OutletExtra, "user_id" | "location_id">>,
  ) => {
    if (!user) return;
    const current = extras.find((e) => e.location_id === locationId);
    const next: OutletExtra = {
      user_id: user.id,
      location_id: locationId,
      is_favourite: current?.is_favourite ?? false,
      note: current?.note ?? null,
      rating: current?.rating ?? null,
      crowd_level: current?.crowd_level ?? null,
      equipment_quality: current?.equipment_quality ?? null,
      cleanliness: current?.cleanliness ?? null,
      ...patch,
    };
    setExtras((prev) => [...prev.filter((e) => e.location_id !== locationId), next]);
    await supabase
      .from("outlet_extras")
      .upsert(
        { ...next, updated_at: new Date().toISOString() },
        { onConflict: "user_id,location_id" },
      );
  };

  const getExtra = (locationId: string) => extras.find((e) => e.location_id === locationId);

  const isFavourite = (locationId: string) =>
    extras.some((e) => e.location_id === locationId && e.is_favourite);

  const getNote = (locationId: string) =>
    extras.find((e) => e.location_id === locationId)?.note ?? "";

  const getVisitDetails = (locationId: string) => {
    const e = getExtra(locationId);
    return {
      note: e?.note ?? "",
      rating: e?.rating ?? null,
      crowdLevel: e?.crowd_level ?? null,
      equipmentQuality: e?.equipment_quality ?? null,
      cleanliness: e?.cleanliness ?? null,
    };
  };

  const toggleFavourite = (locationId: string) => {
    const current = extras.find((e) => e.location_id === locationId);
    upsert(locationId, { is_favourite: !(current?.is_favourite ?? false) });
  };

  const saveNote = (locationId: string, note: string) => {
    upsert(locationId, { note: note.trim() || null });
  };

  const saveVisitDetails = (locationId: string, patch: VisitDetailsPatch) => {
    upsert(locationId, patch);
  };

  const starredCount = extras.filter((e) => e.is_favourite).length;

  return {
    isFavourite,
    getNote,
    getExtra,
    getVisitDetails,
    toggleFavourite,
    saveNote,
    saveVisitDetails,
    starredCount,
    isAuthed: !!user,
  };
}
