import { Link } from '@tanstack/react-router';
import { MapPin, Trophy, LogIn, Share2, Loader2, Download, Copy, X, Swords, Check } from 'lucide-react';
import { toast } from 'sonner';
import { generateShareCard } from '@/lib/generate-share-card';
import { useState, useEffect } from 'react';
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
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Revoke object URL on cleanup
  useEffect(() => () => { if (cardUrl) URL.revokeObjectURL(cardUrl); }, [cardUrl]);

  const buildRegionStats = () => {
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
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await generateShareCard(visited, total, percentage, buildRegionStats());
      const file = new File([blob], 'af-journey.png', { type: 'image/png' });

      // Mobile: native share sheet with image
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: `I've visited ${visited}/${total} Anytime Fitness outlets in Singapore (${percentage}%)! 🏋️`,
        });
        return;
      }

      // Desktop: show preview modal
      const url = URL.createObjectURL(blob);
      setCardBlob(blob);
      setCardUrl(url);
    } catch {
      // user cancelled — ignore
    } finally {
      setSharing(false);
    }
  };

  const handleCopyImage = async () => {
    if (!cardBlob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': cardBlob })]);
      toast('Image copied!', { description: 'Paste it directly into WhatsApp, Telegram, or anywhere.' });
    } catch {
      toast.error('Copy failed', { description: 'Try the download button instead.' });
    }
  };

  const handleDownload = () => {
    if (!cardUrl) return;
    const a = document.createElement('a');
    a.href = cardUrl;
    a.download = 'af-journey.png';
    a.click();
  };

  const closeModal = () => {
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    setCardUrl(null);
    setCardBlob(null);
  };

  const buildChallengeText = () => {
    const regionStats = buildRegionStats();
    const regionLines = regionStats
      .filter(r => r.visited > 0)
      .map(r => `  ${r.region}: ${r.visited}/${r.total}${r.pct === 100 ? ' ✅' : ''}`)
      .join('\n');

    const milestoneEmoji = percentage === 100 ? '🏆' : percentage >= 75 ? '⚡' : percentage >= 50 ? '🔥' : percentage >= 25 ? '🎉' : '🏋️';

    return [
      `${milestoneEmoji} AF Journey Tracker`,
      ``,
      `I've visited ${visited}/${total} Anytime Fitness outlets in Singapore (${percentage}%).`,
      regionLines ? `\nBy region:\n${regionLines}` : '',
      ``,
      `Can you beat me? Track yours 👉 https://af-tracker.sg`,
    ].filter(l => l !== '').join('\n').trim();
  };

  const handleCopyChallenge = async () => {
    try {
      await navigator.clipboard.writeText(buildChallengeText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — try manually selecting the text.');
    }
  };

  if (loggedOut) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">
            <span className="font-bold text-af-orange">{total}</span>
            <span className="text-muted-foreground"> outlets across SG — </span>
            <span className="text-muted-foreground">sign in to track yours</span>
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
    <>
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
            <button
              type="button"
              onClick={() => setChallengeOpen(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              title="Challenge a friend"
            >
              <Swords className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
              title="Share your progress card"
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

      {/* Challenge modal */}
      {challengeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setChallengeOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-af-orange" />
                <p className="text-sm font-semibold text-foreground">Challenge a friend</p>
              </div>
              <button type="button" onClick={() => setChallengeOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score card preview */}
            <div className="p-4">
              <div className="rounded-xl bg-muted/60 border border-border p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap select-all">
                {buildChallengeText()}
              </div>
            </div>

            {/* Stats summary */}
            <div className="px-4 pb-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {buildRegionStats().filter(r => r.pct === 100).length} region{buildRegionStats().filter(r => r.pct === 100).length !== 1 ? 's' : ''} fully conquered
              </span>
              <span className="font-semibold text-primary">{percentage}% overall</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={handleCopyChallenge}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Challenge'}
              </button>
              <button
                type="button"
                onClick={() => { setChallengeOpen(false); handleShare(); }}
                disabled={sharing}
                className="flex items-center justify-center gap-2 bg-muted text-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-muted/80 transition-all disabled:opacity-50"
                title="Share image card instead"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground pb-4">
              Paste into WhatsApp, Telegram, or any group chat
            </p>
          </div>
        </div>
      )}

      {/* Share card preview modal */}
      {cardUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Share your progress</p>
              <button type="button" onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image preview */}
            <div className="p-4">
              <img src={cardUrl} alt="Share card preview" className="w-full rounded-xl border border-border" />
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-4 pb-2">
              <button
                type="button"
                onClick={handleCopyImage}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all"
              >
                <Copy className="w-4 h-4" />
                Copy Image
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 bg-muted text-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-muted/80 transition-all"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={async () => {
                  await handleCopyImage();
                  const text = encodeURIComponent(`I've visited ${visited}/${total} Anytime Fitness outlets in Singapore (${percentage}%)! 🏋️ Track yours → https://af-tracker.sg`);
                  window.open(`https://t.me/share/url?url=https://af-tracker.sg&text=${text}`, '_blank');
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all text-white hover:opacity-90"
                style={{ background: '#229ED9' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.981l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.963.578z"/>
                </svg>
                Share to Telegram
              </button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground pb-4">
              Image copied — just paste it into the Telegram chat
            </p>
          </div>
        </div>
      )}
    </>
  );
}
