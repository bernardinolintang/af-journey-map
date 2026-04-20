import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Loader2, Save, KeyRound, User } from 'lucide-react';

export const Route = createFileRoute('/profile')({
  head: () => ({
    meta: [{ title: 'Profile — AF Tracker' }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { profile, loading, updateDisplayName, uploadAvatar, updatePassword } = useProfile();

  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: '/login' });
  }, [authLoading, user, navigate]);

  // Seed name field once profile loads
  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name);
  }, [profile]);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    const { error } = await updateDisplayName(name);
    setSavingName(false);
    if (error) toast.error('Could not save name');
    else toast.success('Name updated!');
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return; }
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    const { error } = await uploadAvatar(file);
    setUploadingAvatar(false);
    if (error) { toast.error('Upload failed'); setAvatarPreview(null); }
    else toast.success('Profile picture updated!');
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setSavingPassword(true);
    const { error } = await updatePassword(newPassword);
    setSavingPassword(false);
    if (error) toast.error('Could not update password');
    else { toast.success('Password updated!'); setNewPassword(''); setConfirmPassword(''); }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const avatarSrc = avatarPreview ?? profile?.avatar_url ?? null;
  const initials = (profile?.display_name ?? user?.email ?? '?')
    .split(/[\s@]/)[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="max-w-md mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-bold text-foreground">Your Profile</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative group"
          disabled={uploadingAvatar}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-border flex items-center justify-center text-2xl font-bold text-primary">
              {initials}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploadingAvatar
              ? <Loader2 className="w-6 h-6 text-white animate-spin" />
              : <Camera className="w-6 h-6 text-white" />
            }
          </div>
        </button>
        <p className="text-xs text-muted-foreground">Tap to change photo · max 2 MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {/* Display name */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <User className="w-4 h-4 text-primary" />
          Display Name
        </div>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={user?.email ?? 'Your name'}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
        />
        <button
          type="button"
          onClick={handleSaveName}
          disabled={savingName || !name.trim()}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Name
        </button>
      </div>

      {/* Email (read-only) */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
        <p className="text-sm text-foreground">{user?.email}</p>
      </div>

      {/* Change password */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <KeyRound className="w-4 h-4 text-primary" />
          Change Password
        </div>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="New password"
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="button"
          onClick={handleSavePassword}
          disabled={savingPassword || !newPassword}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          Update Password
        </button>
      </div>
    </main>
  );
}
