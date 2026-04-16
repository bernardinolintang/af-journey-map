import { MapPin, Trophy } from 'lucide-react';

interface ProgressBarProps {
  visited: number;
  total: number;
  percentage: number;
}

export function ProgressBar({ visited, total, percentage }: ProgressBarProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
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
