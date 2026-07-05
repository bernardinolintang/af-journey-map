import { Link, useNavigate } from "@tanstack/react-router";
import {
  MapPin,
  Trophy,
  LogIn,
  Share2,
  Loader2,
  Download,
  Copy,
  X,
  Swords,
  Check,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { generateShareCard } from "@/lib/generate-share-card";
import { useState, useEffect, useMemo } from "react";
import type { Location, Visit } from "@/hooks/use-locations";
import { useUserLocation } from "@/hooks/use-user-location";
import { formatDistance, haversine } from "@/lib/geo";
import {
  computeRegionStats,
  bestAndWeakestRegions,
  findNearestUnvisited,
  findLatestVisited,
} from "@/lib/journey-stats";

interface ProgressBarProps {
  visited: number;
  total: number;
  percentage: number;
  loggedOut?: boolean;
  locations?: Location[];
  visits?: Visit[];
  isVisited?: (id: string) => boolean;
  displayName?: string | null;
}

function StatPill({
  label,
  value,
  sub,
  accent = "text-foreground",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/30 px-2.5 py-2 min-w-0">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold truncate">
        {label}
      </p>
      <p className={`text-sm font-bold truncate mt-0.5 ${accent}`}>{value}</p>
      {sub && <p className="text-[9px] text-muted-foreground truncate mt-0.5">{sub}</p>}
    </div>
  );
}

export function ProgressBar({
  visited,
  total,
  percentage,
  loggedOut,
  locations,
  visits,
  isVisited,
  displayName,
}: ProgressBarProps) {
  const navigate = useNavigate();
  const { position: userPos } = useUserLocation();
  const [sharing, setSharing] = useState(false);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const remaining = total - visited;

  const regionStats = useMemo(() => {
    if (!locations || !isVisited) return [];
    return computeRegionStats(locations, isVisited);
  }, [locations, isVisited]);

  const { best, weakest } = useMemo(() => bestAndWeakestRegions(regionStats), [regionStats]);

  const nearestUnvisited = useMemo(() => {
    if (!locations || !isVisited) return null;
    return findNearestUnvisited(locations, isVisited, userPos);
  }, [locations, isVisited, userPos]);

  const nearestDistance = useMemo(() => {
    if (!nearestUnvisited || !userPos) return null;
    return formatDistance(haversine(userPos, nearestUnvisited));
  }, [nearestUnvisited, userPos]);

  const latestVisited = useMemo(() => {
    if (!locations || !visits?.length) return null;
    return findLatestVisited(locations, visits);
  }, [locations, visits]);

  useEffect(
    () => () => {
      if (cardUrl) URL.revokeObjectURL(cardUrl);
    },
    [cardUrl],
  );

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await generateShareCard(visited, total, percentage, regionStats, {
        displayName: displayName ?? undefined,
        topRegion: best?.region,
        nextTarget: weakest?.region,
      });
      const file = new File([blob], "af-journey.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: `I've visited ${visited}/${total} Anytime Fitness outlets in Singapore (${percentage}%)! 🏋️`,
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      setCardBlob(blob);
      setCardUrl(url);
    } catch {
      // user cancelled
    } finally {
      setSharing(false);
    }
  };

  const handleCopyImage = async () => {
    if (!cardBlob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": cardBlob })]);
      toast("Image copied!", {
        description: "Paste it directly into WhatsApp, Telegram, or anywhere.",
      });
    } catch {
      toast.error("Copy failed", { description: "Try the download button instead." });
    }
  };

  const handleDownload = () => {
    if (!cardUrl) return;
    const a = document.createElement("a");
    a.href = cardUrl;
    a.download = "af-journey.png";
    a.click();
  };

  const closeModal = () => {
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    setCardUrl(null);
    setCardBlob(null);
  };

  const buildChallengeText = () => {
    const regionLines = regionStats
      .filter((r) => r.visited > 0)
      .map((r) => `  ${r.region}: ${r.visited}/${r.total}${r.pct === 100 ? " ✅" : ""}`)
      .join("\n");

    const milestoneEmoji =
      percentage === 100
        ? "🏆"
        : percentage >= 75
          ? "⚡"
          : percentage >= 50
            ? "🔥"
            : percentage >= 25
              ? "🎉"
              : "🏋️";

    return [
      `${milestoneEmoji} AF Journey Tracker`,
      ``,
      `I've visited ${visited}/${total} Anytime Fitness outlets in Singapore (${percentage}%).`,
      regionLines ? `\nBy region:\n${regionLines}` : "",
      ``,
      `Can you beat me? Track yours 👉 https://af-tracker.sg`,
    ]
      .filter((l) => l !== "")
      .join("\n")
      .trim();
  };

  const handleCopyChallenge = async () => {
    try {
      await navigator.clipboard.writeText(buildChallengeText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — try manually selecting the text.");
    }
  };

  const openOnMap = (id: string) => {
    navigate({ to: "/", search: { loc: id } });
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
      <div className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-3">
        {/* Header row with actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Your Journey
            </span>
            {percentage === 100 && <Trophy className="w-3.5 h-3.5 text-af-orange shrink-0" />}
          </div>
          <div className="flex items-center gap-1 shrink-0">
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
              title="Share progress card"
            >
              {sharing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Stat pills grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <StatPill label="Visited" value={String(visited)} accent="text-af-orange" />
          <StatPill label="Remaining" value={String(remaining)} />
          <StatPill label="Complete" value={`${percentage}%`} accent="text-primary" />
          <StatPill
            label="Nearest Unvisited"
            value={nearestUnvisited?.name ?? "—"}
            sub={nearestDistance ?? undefined}
            accent="text-af-orange"
          />
          <StatPill
            label="Latest Visit"
            value={latestVisited?.location.name ?? "—"}
            sub={
              latestVisited
                ? new Date(latestVisited.visit.visited_at).toLocaleDateString("en-SG", {
                    day: "numeric",
                    month: "short",
                  })
                : undefined
            }
          />
          <StatPill
            label="Top Region"
            value={best ? `${best.region} (${best.pct}%)` : "—"}
            sub={
              weakest && best && weakest.region !== best.region
                ? `Weakest: ${weakest.region} (${weakest.pct}%)`
                : undefined
            }
            accent="text-primary"
          />
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-af-purple-light rounded-full transition-all duration-700 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Next recommended outlet */}
        {nearestUnvisited && (
          <button
            type="button"
            onClick={() => openOnMap(nearestUnvisited.id)}
            className="w-full text-left rounded-xl border border-af-orange/25 bg-gradient-to-r from-af-orange/10 to-primary/5 px-3 py-2.5 hover:border-af-orange/40 hover:from-af-orange/15 transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-af-orange flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Next outlet to visit
                </p>
                <p className="text-sm font-bold text-foreground truncate mt-0.5 group-hover:text-primary transition-colors">
                  {nearestUnvisited.name}
                  {nearestDistance && (
                    <span className="text-muted-foreground font-medium"> · {nearestDistance}</span>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Unvisited
                  {nearestUnvisited.region && ` · ${nearestUnvisited.region}`}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-1 rounded-lg group-hover:bg-primary/20 transition-colors">
                View →
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Challenge modal */}
      {challengeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setChallengeOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-af-orange" />
                <p className="text-sm font-semibold text-foreground">Challenge a friend</p>
              </div>
              <button
                type="button"
                onClick={() => setChallengeOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="rounded-xl bg-muted/60 border border-border p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap select-all">
                {buildChallengeText()}
              </div>
            </div>

            <div className="px-4 pb-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {regionStats.filter((r) => r.pct === 100).length} region
                {regionStats.filter((r) => r.pct === 100).length !== 1 ? "s" : ""} fully conquered
              </span>
              <span className="font-semibold text-primary">{percentage}% overall</span>
            </div>

            <div className="flex gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={handleCopyChallenge}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Challenge"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChallengeOpen(false);
                  handleShare();
                }}
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Share your progress</p>
              <button
                type="button"
                onClick={closeModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              <img
                src={cardUrl}
                alt="Share card preview"
                className="w-full rounded-xl border border-border"
              />
            </div>

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
                  const text = encodeURIComponent(
                    `I've visited ${visited}/${total} Anytime Fitness outlets in Singapore (${percentage}%)! 🏋️ Track yours → https://af-tracker.sg`,
                  );
                  window.open(
                    `https://t.me/share/url?url=https://af-tracker.sg&text=${text}`,
                    "_blank",
                  );
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all text-white hover:opacity-90"
                style={{ background: "#229ED9" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.981l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.963.578z" />
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
