import { useState, useEffect } from 'react';
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

  // Read directly from user metadata — no extra table needed
  useEffect(() => {
    if (!user) { setProfile(null); setLoading(false); return; }
    setProfile({
      id: user.id,
      display_name: (user.user_metadata?.display_name as string) ?? null,
      avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
    });
    setLoading(false);
  }, [user]);

  const updateDisplayName = async (name: string) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: name.trim() },
    });
    if (!error && data.user) {
      setProfile(p => p ? { ...p, display_name: name.trim() } : p);
    }
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
    await supabase.auth.updateUser({ data: { avatar_url: url } });
    setProfile(p => p ? { ...p, avatar_url: url } : p);
    return { error: null, url };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  return { profile, loading, updateDisplayName, uploadAvatar, updatePassword };
}
