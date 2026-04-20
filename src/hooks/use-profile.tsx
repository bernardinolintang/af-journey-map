import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', user.id)
      .single();
    setProfile(data ?? { id: user.id, display_name: null, avatar_url: null });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateDisplayName = async (name: string) => {
    if (!user) return { error: new Error('Not logged in') };
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: name.trim(), updated_at: new Date().toISOString() });
    if (!error) setProfile(p => p ? { ...p, display_name: name.trim() } : p);
    return { error };
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return { error: new Error('Not logged in'), url: null };
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });
    if (uploadError) return { error: uploadError, url: null };

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles').upsert({ id: user.id, avatar_url: url, updated_at: new Date().toISOString() });
    setProfile(p => p ? { ...p, avatar_url: url } : p);
    return { error: null, url };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  return { profile, loading, updateDisplayName, uploadAvatar, updatePassword, refetch: fetchProfile };
}
