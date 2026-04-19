import { Link } from '@tanstack/react-router';
import { MapPin, Trophy, LogIn, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateShareCard } from '@/lib/generate-share-card';
import { useState } from 'react';
import type { Location } from '@/hooks/use-locations';

interface ProgressBarProps {
  visited: number;
  total: number;
  percentage: number;
  loggedOut?: boolean;
  locations?: Location[];
  isVisited?: (id: string) => boolean;
}

export function ProgressBar({ visited, total, percentage, loggedOut, locations, isVisited }: ProgressBarProps) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      // Build region stats for the card
      const regionStats = (() => {
        if (!locations || !isVisited) return [];
        const map: Record<string, { total: number; visited: number }> = {};
        for (const loc of locations) {
          const r = loc.region || 'Other';
          if (!map[r]) map[r] = { total: 0, visited: 0 };
          map[r].total++;
          if (isVisited(loc.id)) map[r].visited++;
        }
        return Object.entries(map)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([region, { total, visited }]) => ({
            region, total, visited,
            pct: total > 0 ? Math.round((visited / total) * 100) : 0,
          }));
      })();

      const blob = await generateShareCard(visited, total, percentage, regionStats);
      const file = new File([blob], 'af-journey.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: `I've visited ${visited}/${total} Anytime Fitness outlets in Singapore (${percentage}%)! 🏋️`,
        });
      } else if (navigator.share) {
        await navigator.share({
          text: `I've visited ${visited}/${total} Anytime Fitness outlets in Singapore (${percentage}%)! 🏋️\n\nTrack yours → af-tracker.sg`,
        });
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'af-journey.png';
        a.click();
        URL.revokeObjectURL(url);
        toast('Image downloaded!', { description: 'Share it anywhere.' });
      }
    } catch {
      // user cancelled — ignore
    } finally {
      setSharing(false);
    }
  };

  if (loggedOut) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">
            <span className="font-bold text-af-orange">{total}</span>
            <span className="text-muted-foreground"> outlets</span>
            <span className="hidden sm:inline text-muted-foreground"> across Singapore. Sign in to track your visits.</span>
          </span>
        </div>
        <Link
          to="/login"
          className="inline-flex shrink-0 items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <LogIn className="w-3.5 h-3.5" />
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">
            <span className="text-af-orange font-bold text-lg">{visited}</span>
            <span className="text-muted-foreground"> / {total} outlets visited</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {percentage === 100 && <Trophy className="w-4 h-4 text-af-orange" />}
          <span className="text-sm font-bold text-primary">{percentage}%</span>
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
            title="Share your progress"
          >
            {sharing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Share2 className="w-3.5 h-3.5" />
            }
          </button>
        </div>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-af-purple-light rounded-full transition-all duration-700 ease-out animate-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
