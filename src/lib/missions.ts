// Mission definitions, level system, and brand colors for the Dodi missions/achievements system.

export type MissionCategory = "daily" | "journey" | "special";
export type MissionColor = "amber" | "teal" | "purple" | "pink" | "green";

export type MissionDef = {
  id: string;
  category: MissionCategory;
  title: string;
  description: string;
  xp: number;
  emoji: string;
  color: MissionColor;
  target: number; // progress target for completion
  unlocksAfter?: string; // mission id that must be claimed first
  expiresAfterDays?: number; // for limited specials (e.g. founding star)
  rewardStickers?: string[]; // emoji stickers unlocked when claimed
};

export const COLOR_STYLES: Record<MissionColor, { bg: string; text: string; bar: string }> = {
  amber:  { bg: "#FAEEDA", text: "#633806", bar: "#BA7517" },
  teal:   { bg: "#E1F5EE", text: "#085041", bar: "#1D9E75" },
  purple: { bg: "#EEEDFE", text: "#3C3489", bar: "#7F77DD" },
  pink:   { bg: "#FBEAF0", text: "#72243E", bar: "#D4537E" },
  green:  { bg: "#EAF3DE", text: "#27500A", bar: "#639922" },
};

export const MISSIONS: MissionDef[] = [
  // ---------- DAILY ----------
  { id: "daily_open",            category: "daily", title: "Early riser",      description: "Open Dodi before 10:00 AM",         xp: 10, emoji: "🌅", color: "amber",  target: 1 },
  { id: "daily_first_complete",  category: "daily", title: "First check-off",  description: "Complete 1 reminder today",         xp: 15, emoji: "🌸", color: "pink",   target: 1, rewardStickers: ["🎵","🎶","🎸","🎹"] },
  { id: "daily_half_day",        category: "daily", title: "Halfway bloom",    description: "Complete 50% of today's tasks",     xp: 20, emoji: "🌿", color: "green",  target: 50 },
  { id: "daily_perfect",         category: "daily", title: "100% club",        description: "Complete 100% of today's tasks",    xp: 40, emoji: "🌞", color: "amber",  target: 100, rewardStickers: ["🌈","🎉","🎊","🦋"] },
  { id: "daily_new_reminder",    category: "daily", title: "Plant a seed",     description: "Create at least 1 new reminder",    xp: 10, emoji: "🌱", color: "teal",   target: 1 },

  // ---------- JOURNEY ----------
  { id: "journey_first_reminder", category: "journey", title: "First step",          description: "Create your first reminder",                    xp: 20,  emoji: "🐣", color: "amber",  target: 1, rewardStickers: ["🌻","🌼","🍀"] },
  { id: "journey_5_reminders",    category: "journey", title: "Getting started",     description: "Create 5 reminders",                            xp: 30,  emoji: "🌼", color: "green",  target: 5, rewardStickers: ["🥗","🥕","🌽","🍓"] },
  { id: "journey_20_reminders",   category: "journey", title: "Habit builder",       description: "Create 20 reminders",                           xp: 60,  emoji: "🌳", color: "green",  target: 20, unlocksAfter: "journey_5_reminders", rewardStickers: ["🧬","🏃","🚴","🧗"] },
  { id: "journey_streak_3",       category: "journey", title: "3-day streak",        description: "Stay active 3 days in a row",                   xp: 50,  emoji: "🔥", color: "pink",   target: 3, rewardStickers: ["🔥","⚡","💫","🌙"] },
  { id: "journey_streak_7",       category: "journey", title: "7-day warrior",       description: "Stay active 7 days in a row",                   xp: 100, emoji: "🔥", color: "pink",   target: 7,  unlocksAfter: "journey_streak_3", rewardStickers: ["🏆","🥇","👑","💎"] },
  { id: "journey_streak_30",      category: "journey", title: "30-day legend",       description: "Stay active 30 days in a row",                  xp: 300, emoji: "🏆", color: "amber",  target: 30, unlocksAfter: "journey_streak_7", rewardStickers: ["🌞","🦁","🦋","🤩","🔮"] },
  { id: "journey_on_time_10",     category: "journey", title: "On-time hero",        description: "Complete 10 reminders within 15 min of due time", xp: 80,  emoji: "⏰", color: "teal",   target: 10 },
  { id: "journey_perfect_3days",  category: "journey", title: "Triple sunshine",     description: "Reach 100% completion on 3 different days",     xp: 120, emoji: "☀️", color: "amber",  target: 3 },
  { id: "journey_recurring_5",    category: "journey", title: "Rhythm keeper",       description: "Set 5 recurring reminders",                     xp: 70,  emoji: "🔁", color: "purple", target: 5 },

  // ---------- SPECIAL ----------
  { id: "special_early_bird",     category: "special", title: "Early bird",      description: "Complete a task before 8:00 AM",                xp: 25,  emoji: "🐦", color: "teal",   target: 1, rewardStickers: ["🌅","☕","🥐","🐦"] },
  { id: "special_night_owl",      category: "special", title: "Night owl",       description: "Set a reminder after 10:00 PM",                 xp: 25,  emoji: "🦉", color: "purple", target: 1, rewardStickers: ["🦉","🌃","🌟","🍵"] },
  { id: "special_sticker_10",     category: "special", title: "Sticker artist",  description: "Use 10 different stickers",                     xp: 40,  emoji: "🎨", color: "pink",   target: 10 },
  { id: "special_founding_star",  category: "special", title: "Founding star",   description: "Use Dodi every day for your first 7 days",      xp: 150, emoji: "⭐", color: "amber",  target: 7, expiresAfterDays: 7, rewardStickers: ["👑","🌠","🎖️","🕊️"] },
  { id: "special_rate",           category: "special", title: "Spread the love", description: "Rate the app",                                  xp: 80,  emoji: "💌", color: "pink",   target: 1 },
];

export const MISSIONS_BY_ID: Record<string, MissionDef> = Object.fromEntries(MISSIONS.map(m => [m.id, m]));

export type Level = { level: number; name: string; minXp: number };
export const LEVELS: Level[] = [
  { level: 1, name: "Sunshine Seed",    minXp: 0 },
  { level: 2, name: "Sunshine Seeker",  minXp: 100 },
  { level: 3, name: "Golden Planner",   minXp: 300 },
  { level: 4, name: "Habit Guardian",   minXp: 600 },
  { level: 5, name: "Dodi Champion",    minXp: 1000 },
];

export function levelForXp(xp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.minXp) current = l;
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1];
  return {
    current,
    next,
    progressPct: next ? Math.min(100, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100)) : 100,
    xpIntoLevel: xp - current.minXp,
    xpToNext: next ? next.minXp - xp : 0,
  };
}
