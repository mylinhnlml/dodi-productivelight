// Mission definitions, level system, and brand colors for the Dodi missions/achievements system.

export type MissionCategory = "daily" | "journey";
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
  { id: "daily_first_complete", category: "daily", title: "First check-off", description: "Complete your first reminder today", xp: 5, emoji: "🌸", color: "pink", target: 1 },
  { id: "daily_deepwork",       category: "daily", title: "Deep work",       description: "Finish 1 deep work session today",   xp: 15, emoji: "🧠", color: "purple", target: 1 },

  // ---------- JOURNEY ----------
  { id: "journey_first_reminder", category: "journey", title: "First step",      description: "Create your very first reminder",            xp: 15, emoji: "🐣", color: "amber", target: 1 },

  { id: "journey_deepwork_10",  category: "journey", title: "Focus rookie",  description: "Complete 10 deep work sessions total", xp: 20, emoji: "🧠", color: "purple", target: 10 },
  { id: "journey_deepwork_30",  category: "journey", title: "Focus builder", description: "Complete 30 deep work sessions total", xp: 20, emoji: "💜", color: "purple", target: 30, unlocksAfter: "journey_deepwork_10" },
  { id: "journey_deepwork_70",  category: "journey", title: "Focus master",  description: "Complete 70 deep work sessions total", xp: 20, emoji: "🔮", color: "purple", target: 70, unlocksAfter: "journey_deepwork_30" },
  { id: "journey_deepwork_100", category: "journey", title: "Focus legend",  description: "Complete 100 deep work sessions total", xp: 20, emoji: "🏆", color: "amber", target: 100, unlocksAfter: "journey_deepwork_70" },

  { id: "journey_streak_3",   category: "journey", title: "3-day streak",   description: "Complete at least 1 task for 3 days in a row",   xp: 5, emoji: "🔥", color: "pink", target: 3 },
  { id: "journey_streak_7",   category: "journey", title: "7-day streak",   description: "Complete at least 1 task for 7 days in a row",   xp: 5, emoji: "🔥", color: "pink", target: 7, unlocksAfter: "journey_streak_3" },
  { id: "journey_streak_15",  category: "journey", title: "15-day streak",  description: "Complete at least 1 task for 15 days in a row",  xp: 5, emoji: "⚡", color: "amber", target: 15, unlocksAfter: "journey_streak_7" },
  { id: "journey_streak_30",  category: "journey", title: "30-day streak",  description: "Complete at least 1 task for 30 days in a row",  xp: 5, emoji: "💫", color: "amber", target: 30, unlocksAfter: "journey_streak_15" },
  { id: "journey_streak_45",  category: "journey", title: "45-day streak",  description: "Complete at least 1 task for 45 days in a row",  xp: 5, emoji: "🌙", color: "teal", target: 45, unlocksAfter: "journey_streak_30" },
  { id: "journey_streak_60",  category: "journey", title: "60-day streak",  description: "Complete at least 1 task for 60 days in a row",  xp: 5, emoji: "✨", color: "teal", target: 60, unlocksAfter: "journey_streak_45" },
  { id: "journey_streak_75",  category: "journey", title: "75-day streak",  description: "Complete at least 1 task for 75 days in a row",  xp: 5, emoji: "🌟", color: "teal", target: 75, unlocksAfter: "journey_streak_60" },
  { id: "journey_streak_90",  category: "journey", title: "90-day streak",  description: "Complete at least 1 task for 90 days in a row",  xp: 5, emoji: "👑", color: "purple", target: 90, unlocksAfter: "journey_streak_75" },
  { id: "journey_streak_100", category: "journey", title: "100-day legend", description: "Complete at least 1 task for 100 days in a row", xp: 5, emoji: "🏆", color: "amber", target: 100, unlocksAfter: "journey_streak_90" },

  { id: "journey_rate_app", category: "journey", title: "Spread the love", description: "Rate Dodi on the App Store", xp: 50, emoji: "💌", color: "pink", target: 1 },
];

export const MISSIONS_BY_ID: Record<string, MissionDef> = Object.fromEntries(MISSIONS.map(m => [m.id, m]));

export type Level = { level: number; name: string; minXp: number };
export const LEVELS: Level[] = [
  { level: 1,  name: "Egg",         minXp: 0 },
  { level: 2,  name: "Hatchling",   minXp: 50 },
  { level: 3,  name: "Baby",        minXp: 150 },
  { level: 4,  name: "Toddler",     minXp: 300 },
  { level: 5,  name: "Kid",         minXp: 500 },
  { level: 6,  name: "Teen",        minXp: 750 },
  { level: 7,  name: "Young Adult", minXp: 1050 },
  { level: 8,  name: "Adult",       minXp: 1400 },
  { level: 9,  name: "Elder",       minXp: 1800 },
  { level: 10, name: "Legend",      minXp: 2500 },
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
