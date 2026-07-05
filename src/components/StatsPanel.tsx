import { useState } from "react";
import { X, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import type { Location, Visit } from "@/hooks/use-locations";
import type { Achievement } from "@/lib/journey-stats";
import { formatDistance, haversine } from "@/lib/geo";
import type { LatLng } from "@/lib/geo";

type StatsTab = "overview" | "achievements" | "recent";

interface StatsPanelProps {
  visitedCount: number;
  totalCount: number;
  percentage: number;
  achievements: Achievement[];
  recentVisits: { location: Location; visit: Visit }[];
  starredCount: number;
  nearestUnvisited: Location | null;
  userPos: LatLng | null;
  onClose: () => void;
}

export function StatsPanel({
  visitedCount,
  totalCount,
  percentage,
  achievements,
  recentVisits,
  starredCount,
  nearestUnvisited,
  userPos,
  onClose,
}: StatsPanelProps) {
  const [tab, setTab] = useState<StatsTab>("overview");
  const [showLocked, setShowLocked] = useState(false);

  const remaining = totalCount - visitedCount;
  const achieved = achievements.filter((a) => a.achieved);
  const locked = achievements.filter((a) => !a.achieved);

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 20,
        background: "rgba(15,18,35,0.96)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        width: "min(236px, calc(100vw - 24px))",
        maxHeight: "min(340px, calc(100% - 140px))",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        fontFamily: '"DM Sans", system-ui, sans-serif',
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 12, color: "#f0f2ff" }}>Stats</span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#8896b3",
            padding: 2,
          }}
          aria-label="Close stats"
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 2,
          padding: "6px 8px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        {(
          [
            { id: "overview" as StatsTab, label: "Overview" },
            { id: "achievements" as StatsTab, label: "Badges" },
            { id: "recent" as StatsTab, label: "Recent" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              flex: 1,
              padding: "5px 4px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 600,
              background: tab === id ? "rgba(124,66,237,0.35)" : "transparent",
              color: tab === id ? "#f0f2ff" : "#8896b3",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Scrollable body */}
      <div style={{ overflowY: "auto", padding: "10px 12px", flex: 1 }}>
        {tab === "overview" && (
          <>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}
            >
              <MiniStat label="Visited" value={String(visitedCount)} accent="#A78BFA" />
              <MiniStat label="Left" value={String(remaining)} accent="#8896b3" />
              <MiniStat label="Done" value={`${percentage}%`} accent="#F5A623" />
            </div>

            {nearestUnvisited && (
              <div
                style={{
                  fontSize: 10,
                  color: "#c4cfee",
                  marginBottom: 8,
                  padding: "6px 8px",
                  background: "rgba(245,166,35,0.08)",
                  borderRadius: 8,
                  border: "1px solid rgba(245,166,35,0.2)",
                  lineHeight: 1.4,
                }}
              >
                <span style={{ color: "#F5A623", fontWeight: 600, display: "block", marginBottom: 2 }}>
                  Nearest unvisited
                </span>
                {nearestUnvisited.name}
                {userPos && (
                  <span style={{ color: "#8896b3" }}>
                    {" "}
                    · {formatDistance(haversine(userPos, nearestUnvisited))}
                  </span>
                )}
              </div>
            )}

            <p style={{ fontSize: 9, color: "#8896b3", marginBottom: 6 }}>
              ★ Starred · {starredCount}
            </p>

            {recentVisits.length > 0 && (
              <>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: "#8896b3",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 4,
                  }}
                >
                  Recent visits
                </p>
                {recentVisits.slice(0, 3).map(({ location, visit }) => (
                  <div
                    key={visit.id}
                    style={{ fontSize: 10, color: "#c4cfee", marginBottom: 3, lineHeight: 1.35 }}
                  >
                    {location.name}
                    <span style={{ color: "#8896b3", marginLeft: 4 }}>
                      {new Date(visit.visited_at).toLocaleDateString("en-SG", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                ))}
              </>
            )}

            {achieved.length > 0 && (
              <>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: "#8896b3",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    margin: "8px 0 4px",
                  }}
                >
                  Earned badges
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {achieved.map((a) => (
                    <BadgeChip key={a.id} label={a.label} achieved />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === "achievements" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {achieved.map((a) => (
                <AchievementRow key={a.id} achievement={a} />
              ))}
            </div>
            {locked.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowLocked((s) => !s)}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    padding: "5px 8px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    color: "#8896b3",
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {showLocked ? (
                    <ChevronUp style={{ width: 12, height: 12 }} />
                  ) : (
                    <ChevronDown style={{ width: 12, height: 12 }} />
                  )}
                  {showLocked ? "Hide locked" : `View all achievements (${locked.length} locked)`}
                </button>
                {showLocked &&
                  locked.map((a) => <AchievementRow key={a.id} achievement={a} />)}
              </>
            )}
          </>
        )}

        {tab === "recent" && (
          <>
            {recentVisits.length === 0 ? (
              <p style={{ fontSize: 11, color: "#8896b3", textAlign: "center", padding: "12px 0" }}>
                No visits logged yet
              </p>
            ) : (
              recentVisits.map(({ location, visit }) => (
                <div
                  key={visit.id}
                  style={{
                    padding: "6px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    fontSize: 11,
                    color: "#c4cfee",
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600 }}>{location.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 10, color: "#8896b3" }}>
                    {location.region} ·{" "}
                    {new Date(visit.visited_at).toLocaleDateString("en-SG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "5px 3px",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 700, color: accent, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 8, color: "#8896b3", margin: "1px 0 0" }}>{label}</p>
    </div>
  );
}

function BadgeChip({ label, achieved }: { label: string; achieved?: boolean }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 600,
        padding: "3px 6px",
        borderRadius: 99,
        background: achieved ? "rgba(124,66,237,0.25)" : "rgba(255,255,255,0.04)",
        color: achieved ? "#c4a8ff" : "#8896b3",
        border: `1px solid ${achieved ? "rgba(124,66,237,0.35)" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      {label}
    </span>
  );
}

function AchievementRow({ achievement: a }: { achievement: Achievement }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 6px",
        borderRadius: 8,
        background: a.achieved ? "rgba(124,66,237,0.12)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${a.achieved ? "rgba(124,66,237,0.25)" : "rgba(255,255,255,0.05)"}`,
        opacity: a.achieved ? 1 : 0.5,
      }}
    >
      <Trophy
        style={{
          width: 11,
          height: 11,
          color: a.achieved ? "#F5A623" : "#4a5568",
          flexShrink: 0,
        }}
      />
      <div>
        <p style={{ fontSize: 10, fontWeight: 600, color: a.achieved ? "#f0f2ff" : "#8896b3", margin: 0 }}>
          {a.label}
        </p>
        <p style={{ fontSize: 8, color: "#8896b3", margin: 0 }}>{a.description}</p>
      </div>
    </div>
  );
}
