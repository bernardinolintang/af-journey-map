import { Link } from '@tanstack/react-router';
import { MapPin, Trophy, LogIn } from 'lucide-react';

interface ProgressBarProps {
  visited: number;
  total: number;
  percentage: number;
  loggedOut?: boolean;
}

export function ProgressBar({ visited, total, percentage, loggedOut }: ProgressBarProps) {
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
        <div className="flex items-center gap-1.5">
          {percentage === 100 && <Trophy className="w-4 h-4 text-af-orange" />}
          <span className="text-sm font-bold text-primary">{percentage}%</span>
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
