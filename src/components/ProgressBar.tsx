import { MapPin, Trophy, Lock } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface ProgressBarProps {
  visited: number;
  total: number;
  percentage: number;
  isLoggedIn: boolean;
}

export function ProgressBar({ visited, total, percentage, isLoggedIn }: ProgressBarProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          {isLoggedIn ? (
            <span className="text-sm font-medium">
              <span className="text-af-orange font-bold text-lg">{visited}</span>
              <span className="text-muted-foreground"> / {total} outlets visited</span>
            </span>
          ) : (
            <span className="text-sm font-medium">
              <span className="text-af-orange font-bold text-lg">{total}</span>
              <span className="text-muted-foreground"> outlets in Singapore</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isLoggedIn ? (
            <>
              {percentage === 100 && <Trophy className="w-4 h-4 text-af-orange" />}
              <span className="text-sm font-bold text-primary">{percentage}%</span>
            </>
          ) : (
            <Link to="/login">
              <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                <Lock className="w-3.5 h-3.5" />
                Track progress
              </button>
            </Link>
          )}
        </div>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        {isLoggedIn ? (
          <div
            className="h-full bg-gradient-to-r from-primary to-af-purple-light rounded-full transition-all duration-700 ease-out"
            style={{ width: `${percentage}%` }}
          />
        ) : (
          <div className="h-full bg-muted-foreground/20 rounded-full w-full flex items-center justify-center">
            <span className="text-[9px] text-muted-foreground/60 font-medium tracking-wider uppercase">Log in to track</span>
          </div>
        )}
      </div>
    </div>
  );
}
