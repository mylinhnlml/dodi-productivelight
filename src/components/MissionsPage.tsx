import { useEffect, useMemo, useState } from "react";
import { Lock, Sparkles, Flame, X } from "lucide-react";
import { MISSIONS, COLOR_STYLES, levelForXp, type MissionDef } from "@/lib/missions";
import { claimMission, loadMissionState, missionStatus } from "@/lib/missionEngine";
import type { Sticker } from "@/lib/stickers";

type Tab = "daily" | "journey" | "special";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

type Props = {
  userId: string | null;
  onUseStickers?: (emojis: string[]) => void;
};

export default function MissionsPage({ userId, onUseStickers }: Props) {
  const [tab, setTab] = useState<Tab>("daily");
  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState<{ total_xp: number; streak_count: number; last_active_date: string | null } | null>(null);
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [reveal, setReveal] = useState<{ mission: MissionDef; stickers: Sticker[] } | null>(null);

  const refresh = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const state = await loadMissionState(userId);
    setXp(state.xp);
    setProgress(state.progress);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const totalXp = xp?.total_xp ?? 0;
  const streak = xp?.streak_count ?? 0;
  const lvl = useMemo(() => levelForXp(totalXp), [totalXp]);

  const missions = useMemo(() => MISSIONS.filter((m) => m.category === tab), [tab]);

  const weekDays = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const isFuture = d.setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0);
      const last = xp?.last_active_date;
      let filled = false;
      if (last && !isFuture) {
        const lastD = new Date(last + "T00:00:00").setHours(0, 0, 0, 0);
        const thisD = new Date(iso + "T00:00:00").setHours(0, 0, 0, 0);
        const diff = Math.round((lastD - thisD) / 86_400_000);
        if (diff >= 0 && diff < streak) filled = true;
      }
      return { iso, label: DAY_LABELS[i], filled, isFuture };
    });
  }, [xp, streak]);

  const handleClaim = async (m: MissionDef) => {
    if (!userId) return;
    const result = await claimMission(userId, m.id);
    await refresh();
    if (result.stickers.length > 0) {
      // Brief delay so the XP toast plays first
      window.setTimeout(() => setReveal({ mission: m, stickers: result.stickers }), 600);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  }

  if (!userId) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm px-8 text-center">Sign in to track missions and earn XP ✨</div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ paddingTop: "8px" }}>
      <div className="flex-1 overflow-y-auto px-4 pt-2 relative" style={{ paddingBottom: "var(--content-bottom-padding)" }}>
        {/* XP pill */}
        <div className="flex items-center justify-end mb-3">
          <div
            className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"
            style={{ background: COLOR_STYLES.amber.bg, color: COLOR_STYLES.amber.text }}
          >
            <Sparkles className="w-3.5 h-3.5" /> {totalXp} XP
          </div>
        </div>

      {/* Level progress */}
      <div className="rounded-2xl neu-surface-sm p-4 mb-3">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Level {lvl.current.level}</p>
            <p className="text-base font-extrabold text-foreground leading-tight">{lvl.current.name}</p>
          </div>
          {lvl.next && (
            <p className="text-[11px] text-muted-foreground font-semibold">
              {lvl.xpToNext} XP to {lvl.next.name}
            </p>
          )}
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: COLOR_STYLES.amber.bg }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${lvl.progressPct}%`, background: COLOR_STYLES.amber.bar }}
          />
        </div>
      </div>

      {/* Streak */}
      <div className="rounded-2xl neu-surface-sm p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-foreground flex items-center gap-1">
            <Flame className="w-4 h-4" style={{ color: COLOR_STYLES.pink.bar }} /> {streak} day streak
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">This week</p>
        </div>
        <div className="flex items-center justify-between gap-1">
          {weekDays.map((d) => (
            <div key={d.iso} className="flex flex-col items-center gap-1 flex-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{
                  background: d.filled ? COLOR_STYLES.amber.bg : "hsl(var(--muted))",
                  opacity: d.isFuture ? 0.4 : 1,
                }}
              >
                {d.filled ? "☀️" : <span className="w-1.5 h-1.5 rounded-full bg-foreground/20" />}
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl neu-pressed mb-4">
        {(["daily", "journey", "special"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl capitalize transition-all ${
              tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Mission cards */}
      <div className="space-y-2.5">
        {missions.map((m) => {
          const s = missionStatus(m, progress);
          const color = COLOR_STYLES[m.color];
          const faded = s.claimed || s.locked;
          const rewardShown = (m.rewardStickers ?? []).slice(0, 4);
          const extraCount = (m.rewardStickers?.length ?? 0) - rewardShown.length;
          return (
            <div
              key={m.id}
              className={`rounded-2xl neu-surface-sm p-3.5 transition-all ${faded ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: color.bg }}
                >
                  {s.locked ? <Lock className="w-4 h-4" style={{ color: color.text }} /> : m.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{m.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{m.description}</p>
                    </div>
                    <span
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: color.bg, color: color.text }}
                    >
                      +{m.xp} XP
                    </span>
                  </div>

                  {/* Sticker rewards */}
                  {rewardShown.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-muted-foreground">Unlocks:</span>
                      {rewardShown.map((e, i) => (
                        <span key={i} className="text-sm leading-none">{e}</span>
                      ))}
                      {extraCount > 0 && (
                        <span className="text-[10px] font-bold text-muted-foreground">+{extraCount} more</span>
                      )}
                    </div>
                  )}

                  {m.target > 1 && !s.claimed && !s.locked && (
                    <div className="mt-2.5">
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: color.bg }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${s.pct}%`, background: color.bar }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                        {Math.min(s.progress, m.target)} / {m.target}
                      </p>
                    </div>
                  )}
                  {s.completed && !s.claimed && !s.locked && (
                    <button
                      onClick={() => handleClaim(m)}
                      className="mt-2.5 w-full py-2 rounded-xl text-xs font-extrabold transition-transform active:scale-95"
                      style={{ background: color.bar, color: "white" }}
                    >
                      Claim +{m.xp} XP ✨
                    </button>
                  )}
                  {s.claimed && (
                    <p className="text-[10px] font-bold mt-2" style={{ color: color.bar }}>✓ Claimed</p>
                  )}
                  {s.locked && (
                    <p className="text-[10px] text-muted-foreground font-semibold mt-2">Locked — claim previous mission first</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reveal modal */}
      {reveal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm animate-fade-in"
             onClick={() => setReveal(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-3 mb-3 sm:mb-0 rounded-3xl bg-background neu-surface-sm p-6 relative animate-fade-in"
            style={{ animation: "fade-in 0.35s ease-out" }}
          >
            <button
              onClick={() => setReveal(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full neu-surface-sm flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground text-center">
              {reveal.mission.title}
            </p>
            <h3 className="text-xl font-extrabold text-foreground text-center mt-1">
              New stickers unlocked! 🎉
            </h3>
            <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
              {reveal.stickers.map((s, i) => (
                <div
                  key={s.id}
                  className="w-16 h-16 rounded-2xl neu-inset flex items-center justify-center text-3xl"
                  style={{
                    animation: `scale-in 0.45s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.08}s both`,
                  }}
                >
                  {s.emoji}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const emojis = reveal.stickers.map((s) => s.emoji);
                setReveal(null);
                onUseStickers?.(emojis);
              }}
              className="mt-6 w-full py-3 rounded-2xl text-sm font-extrabold text-primary-foreground transition-transform active:scale-95"
              style={{ background: "hsl(var(--primary))" }}
            >
              Use now ✨
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}