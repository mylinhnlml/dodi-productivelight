// Mission engine: trigger functions that update Supabase mission_progress + user_xp.
// All functions are safe to call without a userId (they no-op for guests).

import { supabase } from "@/integrations/supabase/client";
import { MISSIONS, MISSIONS_BY_ID, type MissionDef } from "@/lib/missions";
import { unlockStickersForMission, type Sticker } from "@/lib/stickers";
import { toast } from "sonner";

type ProgressRow = {
  mission_id: string;
  progress: number;
  completed_at: string | null;
  claimed_at: string | null;
};

type XpRow = {
  user_id: string;
  total_xp: number;
  streak_count: number;
  last_active_date: string | null;
  install_date: string;
  perfect_days: string[];
  stickers_used: string[];
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const daysBetween = (a: string, b: string) => {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
};

async function ensureXp(userId: string): Promise<XpRow> {
  const { data } = await supabase.from("user_xp").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data as XpRow;
  const { data: created } = await supabase
    .from("user_xp")
    .insert({ user_id: userId, install_date: todayISO() })
    .select("*")
    .single();
  return created as XpRow;
}

async function getProgress(userId: string, missionId: string): Promise<ProgressRow | null> {
  const { data } = await supabase
    .from("mission_progress")
    .select("mission_id, progress, completed_at, claimed_at")
    .eq("user_id", userId)
    .eq("mission_id", missionId)
    .maybeSingle();
  return (data as ProgressRow | null) ?? null;
}

async function getAllProgress(userId: string): Promise<Record<string, ProgressRow>> {
  const { data } = await supabase
    .from("mission_progress")
    .select("mission_id, progress, completed_at, claimed_at")
    .eq("user_id", userId);
  const map: Record<string, ProgressRow> = {};
  for (const r of (data ?? []) as ProgressRow[]) map[r.mission_id] = r;
  return map;
}

/**
 * Bump progress on a mission. Caps at target and stamps completed_at on completion.
 * For "set" semantics, pass mode: "set".
 */
async function bumpMission(
  userId: string,
  missionId: string,
  amount: number,
  mode: "inc" | "set" = "inc"
) {
  const def = MISSIONS_BY_ID[missionId];
  if (!def) return;

  // Daily reset: skip writes if already claimed today
  const existing = await getProgress(userId, missionId);
  if (def.category === "daily" && existing?.claimed_at && existing.claimed_at.slice(0, 10) === todayISO()) {
    return;
  }
  // For daily missions, treat stale rows from earlier days as zeroed.
  let baseProgress = existing?.progress ?? 0;
  let baseCompletedAt: string | null = existing?.completed_at ?? null;
  let baseClaimedAt: string | null = existing?.claimed_at ?? null;
  if (def.category === "daily" && existing) {
    const stamp = existing.completed_at ?? existing.claimed_at;
    if (!stamp || stamp.slice(0, 10) !== todayISO()) {
      baseProgress = 0;
      baseCompletedAt = null;
      baseClaimedAt = null;
    }
  }

  const newProgress = Math.min(
    def.target,
    mode === "set" ? Math.max(baseProgress, amount) : baseProgress + amount
  );
  const completed = newProgress >= def.target;
  const completedAt = completed ? (baseCompletedAt ?? new Date().toISOString()) : null;

  await supabase.from("mission_progress").upsert(
    {
      user_id: userId,
      mission_id: missionId,
      progress: newProgress,
      completed_at: completedAt,
      claimed_at: baseClaimedAt,
    },
    { onConflict: "user_id,mission_id" }
  );
}

async function addXp(userId: string, amount: number) {
  const xp = await ensureXp(userId);
  await supabase.from("user_xp").update({ total_xp: xp.total_xp + amount }).eq("user_id", userId);
}

/** Claim an already-completed mission and award XP. Returns awarded XP or 0. */
export async function claimMission(
  userId: string,
  missionId: string
): Promise<{ xp: number; stickers: Sticker[] }> {
  const def = MISSIONS_BY_ID[missionId];
  if (!def) return { xp: 0, stickers: [] };
  const p = await getProgress(userId, missionId);
  if (!p?.completed_at || p.claimed_at) return { xp: 0, stickers: [] };

  // Lock check: prerequisite must be claimed
  if (def.unlocksAfter) {
    const pre = await getProgress(userId, def.unlocksAfter);
    if (!pre?.claimed_at) return { xp: 0, stickers: [] };
  }

  await supabase
    .from("mission_progress")
    .update({ claimed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("mission_id", missionId);

  await addXp(userId, def.xp);

  toast.success(`+${def.xp} XP earned! ✨`, {
    position: "top-center",
    className: "dodi-xp-toast",
    duration: 2500,
  });

  const stickers = await unlockStickersForMission(userId, missionId);
  return { xp: def.xp, stickers };
}

// ============ TRIGGERS ============

/** Called on every app launch. */
export async function onAppOpen(userId: string | null) {
  if (!userId) return;
  const xp = await ensureXp(userId);
  const today = todayISO();

  // Streak update
  let newStreak = xp.streak_count;
  if (xp.last_active_date !== today) {
    if (xp.last_active_date && daysBetween(xp.last_active_date, today) === 1) {
      newStreak = xp.streak_count + 1;
    } else {
      newStreak = 1;
    }
    await supabase
      .from("user_xp")
      .update({ last_active_date: today, streak_count: newStreak })
      .eq("user_id", userId);
  }

  // Streak journey missions
  await bumpMission(userId, "journey_streak_3", newStreak, "set");
  await bumpMission(userId, "journey_streak_7", newStreak, "set");
  await bumpMission(userId, "journey_streak_30", newStreak, "set");

  // Early morning open
  if (new Date().getHours() < 10) {
    await bumpMission(userId, "daily_open", 1, "set");
  }

  // Founding star — within first 7 days from install
  const sinceInstall = daysBetween(xp.install_date, today);
  if (sinceInstall <= 6) {
    // count distinct active days from install via streak (if streak unbroken since install, streak_count == sinceInstall+1)
    const activeDays = Math.min(7, sinceInstall + 1);
    if (newStreak >= activeDays) {
      await bumpMission(userId, "special_founding_star", activeDays, "set");
    }
  }
}

export async function onReminderCreated(
  userId: string | null,
  opts: { isRecurring?: boolean; hour?: number; total?: number } = {}
) {
  if (!userId) return;
  await bumpMission(userId, "daily_new_reminder", 1, "inc");
  await bumpMission(userId, "journey_first_reminder", 1, "inc");
  await bumpMission(userId, "journey_5_reminders", 1, "inc");
  await bumpMission(userId, "journey_20_reminders", 1, "inc");
  if (opts.isRecurring) await bumpMission(userId, "journey_recurring_5", 1, "inc");
  const hour = opts.hour ?? new Date().getHours();
  if (hour >= 22 || hour < 4) await bumpMission(userId, "special_night_owl", 1, "set");
}

export async function onReminderCompleted(
  userId: string | null,
  opts: { completedAt?: Date; isOnTime?: boolean } = {}
) {
  if (!userId) return;
  const when = opts.completedAt ?? new Date();
  await bumpMission(userId, "daily_first_complete", 1, "set");
  if (when.getHours() < 8) await bumpMission(userId, "special_early_bird", 1, "set");
  if (opts.isOnTime) await bumpMission(userId, "journey_on_time_10", 1, "inc");
}

export async function onProgressUpdate(
  userId: string | null,
  opts: { totalTasks: number; completedTasks: number }
) {
  if (!userId || opts.totalTasks <= 0) return;
  const pct = Math.round((opts.completedTasks / opts.totalTasks) * 100);
  await bumpMission(userId, "daily_half_day", Math.min(50, pct), "set");
  await bumpMission(userId, "daily_perfect", pct, "set");

  if (pct >= 100) {
    const xp = await ensureXp(userId);
    const today = todayISO();
    if (!xp.perfect_days.includes(today)) {
      const updated = [...xp.perfect_days, today];
      await supabase.from("user_xp").update({ perfect_days: updated }).eq("user_id", userId);
      await bumpMission(userId, "journey_perfect_3days", updated.length, "set");
    }
  }
}

export async function onStickerUsed(userId: string | null, stickerId: string) {
  if (!userId) return;
  const xp = await ensureXp(userId);
  if (xp.stickers_used.includes(stickerId)) return;
  const updated = [...xp.stickers_used, stickerId];
  await supabase.from("user_xp").update({ stickers_used: updated }).eq("user_id", userId);
  await bumpMission(userId, "special_sticker_10", updated.length, "set");
}

export async function onRated(userId: string | null) {
  if (!userId) return;
  await bumpMission(userId, "special_rate", 1, "set");
}

// ============ READ HELPERS ============

export async function loadMissionState(userId: string) {
  const [xp, progress] = await Promise.all([ensureXp(userId), getAllProgress(userId)]);
  return { xp, progress };
}

export function missionStatus(
  def: MissionDef,
  progress: Record<string, ProgressRow>
): {
  progress: number;
  completed: boolean;
  claimed: boolean;
  locked: boolean;
  expired: boolean;
  pct: number;
} {
  const row = progress[def.id];
  const today = todayISO();
  let p = row?.progress ?? 0;
  let completed = !!row?.completed_at;
  let claimed = !!row?.claimed_at;

  // Daily reset for display
  if (def.category === "daily" && row) {
    const stamp = row.completed_at ?? row.claimed_at;
    if (!stamp || stamp.slice(0, 10) !== today) {
      p = 0;
      completed = false;
      claimed = false;
    }
  }

  const locked = !!def.unlocksAfter && !progress[def.unlocksAfter]?.claimed_at;
  return {
    progress: p,
    completed,
    claimed,
    locked,
    expired: false,
    pct: Math.min(100, Math.round((p / def.target) * 100)),
  };
}
