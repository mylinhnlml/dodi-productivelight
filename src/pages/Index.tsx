import { Bell, Plus, Search, Calendar, Check, Pencil, Smile, MessageSquare, Star, Trash2, ChevronLeft } from "lucide-react";
import { useRef, useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CalendarView, { type CalendarTaskInfo } from "@/components/CalendarView";
import IntroTour from "@/components/IntroTour";
import Onboarding from "@/components/Onboarding";

type Priority = 0 | 1 | 2 | 3;

type Task = {
  id: string;
  title: string;
  time: string; // display
  emoji: string;
  done: boolean;
  dueDate: string; // YYYY-MM-DD
  priority: Priority;
  createdAt: number;
  repeat?: string;
};

type Settled = { id: string; emoji: string; x: number; y: number; rot: number };
type Drop = { key: string; emoji: string; x: number; delay: number; rot: number };

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateLabel = (iso: string) => {
  if (iso === todayStr()) return "Today";
  if (iso === tomorrowStr()) return "Tomorrow";
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const initialTasks: Task[] = [];

// Default quick-pick stickers covering common activities
const EMOJI_BASIC = [
  "🎂","📚","🐾","🧘‍♀️","🏋️","📞","💋","🍹","🪴","🧺",
  "🛁","💆","🧠","✨","🌷","☀️","🌙","🍵","⏰","🎵",
  "🎬","🛍️","🎁","☕",
];
const EMOJI_STICKERS = [
  // Activities
  "🧁","🍰","🍳","🥐","🍓","🍑","🍒","🍋","🍯","🍷","🍺","🥂",
  "📝","✏️","🖋️","📎","📌","🗓️","💻","📖","🎨","🎮","🎤","🎧",
  "🏃","🚴","🏊","⛹️","🧗","💃","🕺","⚽","🏀","🎾","🥊","🧎",
  "💄","💅","💇","🪥","🧴","🧖","💊","🩺","🌡️","💤","🛌","🧹",
  // Nature & symbols
  "🌸","🌼","🌻","🌺","🌹","💐","🌿","🌵","🌳","🍀","🪷","🌊",
  "☁️","⭐","🌈","💫","🔥","❄️","🌟","⚡","🌙","☀️","🌤️","🌧️",
  // Animals
  "🐰","🦊","🐻","🐱","🐶","🐼","🐨","🦋","🐝","🐞","🐢","🐧",
  // Hearts & feelings
  "💌","💝","💖","💕","💗","❤️","🧡","💛","💚","💙","💜","🤍",
  // Objects & misc
  "🧸","🪞","🎀","🔮","🕯️","🎐","🪄","🗝️","📷","✈️","🚗","🏠",
];

const PRIORITY_LABELS = ["None", "!", "!!", "!!!"];

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [active, setActive] = useState("home");
  // Per-occurrence completion: keys like `${taskId}|${YYYY-MM-DD}`
  const [completed, setCompleted] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const t of initialTasks) if (t.done) s.add(`${t.id}|${t.dueDate}`);
    return s;
  });
  const [settled, setSettled] = useState<Settled[]>(() =>
    initialTasks
      .filter((t) => t.done)
      .map((t) => ({
        id: `${t.id}|${t.dueDate}`,
        emoji: t.emoji,
        x: rand(8, 78),
        y: rand(45, 70),
        rot: rand(-18, 18),
      }))
  );
  const [drops, setDrops] = useState<Drop[]>([]);
  const dropKey = useRef(0);
  const createdSeq = useRef(initialTasks.length + 1);
  const progressRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});
  const justSwipedRef = useRef<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    try { return !localStorage.getItem("dodi.introSeen.v2"); } catch { return true; }
  });

  const dismissIntro = () => {
    try { localStorage.setItem("dodi.introSeen.v2", "1"); } catch {}
    setShowIntro(false);
  };

  const [guestCompletes, setGuestCompletes] = useState<number>(() => {
    try { return Number(localStorage.getItem("dodi.guestCompletes") || 0); } catch { return 0; }
  });
  const [showLoginWall, setShowLoginWall] = useState<boolean>(false);
  const [hasCreatedFirst, setHasCreatedFirst] = useState<boolean>(() => {
    try { return localStorage.getItem("dodi.firstReminderCreated") === "1"; } catch { return false; }
  });
  const [ctaDismissed, setCtaDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem("dodi.firstCtaDismissed.v2") === "1"; } catch { return false; }
  });
  const dismissFirstCta = () => {
    setCtaDismissed(true);
    try { localStorage.setItem("dodi.firstCtaDismissed.v2", "1"); } catch {}
  };
  const [debugShowCta, setDebugShowCta] = useState<boolean>(false);

  const startDrag = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const el = progressRef.current;
    if (!el) return;
    setDraggingId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 100;
      const y = ((ev.clientY - rect.top) / rect.height) * 100;
      setSettled((s) =>
        s.map((it) =>
          it.id === id
            ? { ...it, x: Math.max(2, Math.min(92, x)), y: Math.max(10, Math.min(85, y)) }
            : it
        )
      );
    };
    const up = () => {
      setDraggingId(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Add-form state
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("🌸");
  const [newTime, setNewTime] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>(EMOJI_BASIC);
  const [customStickers, setCustomStickers] = useState<string[]>([]);
  const [dateMode, setDateMode] = useState<"today" | "tomorrow" | "other">("today");
  const [customDate, setCustomDate] = useState(todayStr());
  const [newPriority, setNewPriority] = useState<Priority>(0);
  const [repeat, setRepeat] = useState<string>("Never");
  const [showRepeat, setShowRepeat] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");

  // Profile state
  const [profile, setProfile] = useState({
    name: "Friend",
    slogan: "Soft days, gentle wins ✨",
    avatar: "🌷",
  });
  const [profileTouched, setProfileTouched] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u || profileTouched) return;
      const meta = (u.user_metadata || {}) as Record<string, unknown>;
      const accountName =
        (meta.full_name as string) ||
        (meta.name as string) ||
        (meta.given_name as string) ||
        (typeof u.email === "string" ? u.email.split("@")[0] : "");
      if (accountName) setProfile((p) => ({ ...p, name: accountName }));
    });
  }, [profileTouched]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load this user's tasks; ensure tasks are scoped per account
  useEffect(() => {
    let active = true;
    const loadTasks = async (uid: string | null) => {
      if (!uid) {
        setTasks(initialTasks);
        return;
      }
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: true });
      if (!active) return;
      if (error) {
        console.error("Failed to load tasks", error);
        setTasks([]);
        return;
      }
      const rows = (data ?? []).map((r, i) => ({
        id: r.id as string,
        title: r.title as string,
        time: (r.time as string) ?? "",
        emoji: (r.emoji as string) ?? "🌸",
        done: !!r.done,
        dueDate: r.due_date as string,
        priority: ((r.priority as number) ?? 0) as Priority,
        createdAt: i + 1,
        repeat: (r.repeat as string) ?? undefined,
      }));
      setTasks(rows);
    };
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      loadTasks(uid);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      loadTasks(uid);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const toggle = (taskId: string, dueIso: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const occKey = `${taskId}|${dueIso}`;
    const becomingDone = !completed.has(occKey);

    setCompleted((prev) => {
      const next = new Set(prev);
      if (becomingDone) next.add(occKey);
      else next.delete(occKey);
      return next;
    });

    if (becomingDone) {
      if (!userId) {
        const next = guestCompletes + 1;
        setGuestCompletes(next);
        try { localStorage.setItem("dodi.guestCompletes", String(next)); } catch {}
        if (next >= 3) {
          window.setTimeout(() => setShowLoginWall(true), 1200);
        }
      }
      const newDrops: Drop[] = Array.from({ length: 7 }).map(() => ({
        key: `d${dropKey.current++}`,
        emoji: task.emoji,
        x: rand(4, 86),
        delay: rand(0, 0.45),
        rot: rand(-40, 40),
      }));
      setDrops((d) => [...d, ...newDrops]);

      const newSettled: Settled = {
        id: occKey,
        emoji: task.emoji,
        x: rand(6, 82),
        y: rand(38, 72),
        rot: rand(-20, 20),
      };
      window.setTimeout(() => {
        setSettled((s) => [...s.filter((x) => x.id !== occKey), newSettled]);
      }, 1000);
      window.setTimeout(() => {
        setDrops((d) => d.filter((dd) => !newDrops.some((n) => n.key === dd.key)));
      }, 1700);
    } else {
      setSettled((s) => s.filter((x) => x.id !== occKey));
    }
  };

  const deleteTask = (id: string) => {
    const removed = tasks.find((x) => x.id === id);
    const removedCompleted = Array.from(completed).filter((k) => k.startsWith(`${id}|`));
    setTasks((t) => t.filter((x) => x.id !== id));
    setCompleted((prev) => {
      const next = new Set<string>();
      prev.forEach((k) => {
        if (!k.startsWith(`${id}|`)) next.add(k);
      });
      return next;
    });
    setSettled((s) => s.filter((x) => !x.id.startsWith(`${id}|`)));
    setSwipeOffsets((s) => {
      const next = { ...s };
      Object.keys(next).forEach((k) => { if (k.startsWith(`${id}|`)) delete next[k]; });
      return next;
    });

    let undone = false;
    const restore = () => {
      if (undone || !removed) return;
      undone = true;
      setTasks((t) => (t.some((x) => x.id === removed.id) ? t : [...t, removed]));
      setCompleted((prev) => {
        const next = new Set(prev);
        removedCompleted.forEach((k) => next.add(k));
        return next;
      });
      if (userId) {
        supabase.from("tasks").insert({
          id: removed.id,
          user_id: userId,
          title: removed.title,
          time: removed.time,
          emoji: removed.emoji,
          due_date: removed.dueDate,
          priority: removed.priority,
          repeat: removed.repeat ?? null,
          done: removed.done,
        }).then(({ error }) => {
          if (error) toast.error("Failed to restore task");
        });
      }
      toast("Task restored");
    };

    if (userId) {
      // Defer DB delete so undo can cancel it
      setTimeout(() => {
        if (undone) return;
        supabase.from("tasks").delete().eq("id", id).then(({ error }) => {
          if (error) toast.error("Failed to remove task");
        });
      }, 5000);
    }

    toast("Task removed", {
      duration: 5000,
      action: removed
        ? { label: "Undo", onClick: restore }
        : undefined,
    });
  };

  const startSwipe = (e: React.PointerEvent, key: string) => {
    // Only handle mouse / pen here. Touch is handled by native touch listeners
    // attached via the ref callback below (works reliably on iOS Safari).
    if (e.pointerType === "touch") return;
    if (e.button !== undefined && e.button !== 0) return;
    const startX = e.clientX;
    const startOffset = swipeOffsets[key] ?? 0;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      const next = Math.max(-96, Math.min(0, startOffset + dx));
      setSwipeOffsets((s) => ({ ...s, [key]: next }));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setSwipeOffsets((s) => {
        const cur = s[key] ?? 0;
        return { ...s, [key]: cur < -48 ? -88 : 0 };
      });
      if (moved) {
        justSwipedRef.current.add(key);
        window.setTimeout(() => justSwipedRef.current.delete(key), 350);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  // Attach native touch listeners (non-passive so we can preventDefault) for iOS Safari.
  const attachSwipeTouch = (key: string) => (el: HTMLElement | null) => {
    if (!el) return;
    if ((el as any).__swipeBound) return;
    (el as any).__swipeBound = true;

    let startX = 0;
    let startY = 0;
    let startOffset = 0;
    let axis: "x" | "y" | null = null;
    let moved = false;
    let active = false;

    const onStart = (ev: TouchEvent) => {
      if (ev.touches.length !== 1) return;
      active = true;
      axis = null;
      moved = false;
      startX = ev.touches[0].clientX;
      startY = ev.touches[0].clientY;
      startOffset = swipeOffsets[key] ?? 0;
    };
    const onMove = (ev: TouchEvent) => {
      if (!active) return;
      const dx = ev.touches[0].clientX - startX;
      const dy = ev.touches[0].clientY - startY;
      if (axis === null) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (axis === "y") { active = false; return; }
      }
      if (axis !== "x") return;
      ev.preventDefault();
      moved = true;
      const next = Math.max(-96, Math.min(0, startOffset + dx));
      setSwipeOffsets((s) => ({ ...s, [key]: next }));
    };
    const onEnd = () => {
      if (!active) return;
      active = false;
      setSwipeOffsets((s) => {
        const cur = s[key] ?? 0;
        return { ...s, [key]: cur < -48 ? -88 : 0 };
      });
      if (moved) {
        justSwipedRef.current.add(key);
        window.setTimeout(() => justSwipedRef.current.delete(key), 350);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
  };

  const submitNew = async () => {
    if (!newTitle.trim()) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const time = newTime
      ? new Date(`2000-01-01T${newTime}`).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
    const dueDate =
      dateMode === "today" ? todayStr() : dateMode === "tomorrow" ? tomorrowStr() : customDate;
    const newTask: Task = {
      id,
      title: newTitle.trim(),
      time,
      emoji: newEmoji,
      done: false,
      dueDate,
      priority: newPriority,
      createdAt: createdSeq.current++,
      repeat: repeat !== "Never" ? repeat : undefined,
    };
    setTasks((t) => [...t, newTask]);
    if (!hasCreatedFirst) {
      setHasCreatedFirst(true);
      try { localStorage.setItem("dodi.firstReminderCreated", "1"); } catch {}
    }
    if (userId) {
      const { error } = await supabase.from("tasks").insert({
        id,
        user_id: userId,
        title: newTask.title,
        time: newTask.time,
        emoji: newTask.emoji,
        due_date: newTask.dueDate,
        priority: newTask.priority,
        repeat: newTask.repeat ?? null,
        done: false,
      });
      if (error) {
        console.error(error);
        toast.error("Couldn't save reminder to your account");
      }
    }
    setNewTitle("");
    setNewTime("");
    setNewEmoji("🌸");
    setNewPriority(0);
    setDateMode("today");
    setCustomDate(todayStr());
    setRepeat("Never");
    setShowRepeat(false);
    setShowStickers(false);
    toast.success(
      <span className="flex items-center gap-1.5">
        Added successfully in <Bell className="w-4 h-4" />
      </span>,
      {
        position: "top-center",
        className: "dodi-center-toast",
      }
    );
  };

  const todayIso = todayStr();

  // Sort: by date asc, then priority desc, then createdAt asc
  // Also limit to today + 6 upcoming days, and expand recurring tasks
  const sortedTasks = useMemo(() => {
    const today = new Date(todayIso);
    const startMs = today.getTime();
    const maxMs = startMs + 6 * 86400000;
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    type DisplayTask = Task & { occKey: string; isOccurrence: boolean };
    const out: DisplayTask[] = [];

    for (const t of tasks) {
      const base = new Date(t.dueDate);
      const occurrences: string[] = [];
      const pushIfInWindow = (d: Date) => {
        const ms = d.getTime();
        if (ms >= startMs && ms <= maxMs) occurrences.push(fmt(d));
      };
      pushIfInWindow(base);

      if (t.repeat) {
        const cap = 400;
        let i = 0;
        const next = new Date(base);
        while (i++ < cap) {
          if (t.repeat === "Every Day") next.setDate(next.getDate() + 1);
          else if (t.repeat === "Every Week") next.setDate(next.getDate() + 7);
          else if (t.repeat === "Every 2 Weeks") next.setDate(next.getDate() + 14);
          else if (t.repeat === "Every Month") next.setMonth(next.getMonth() + 1);
          else if (t.repeat === "Every Year") next.setFullYear(next.getFullYear() + 1);
          else break;
          if (next.getTime() > maxMs) break;
          if (next.getTime() >= startMs) occurrences.push(fmt(new Date(next)));
        }
      }

      for (const iso of occurrences) {
        const occKey = `${t.id}|${iso}`;
        out.push({
          ...t,
          dueDate: iso,
          done: completed.has(occKey),
          occKey,
          isOccurrence: iso !== t.dueDate,
        });
      }
    }

    return out.sort((a, b) => {
      if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.createdAt - b.createdAt;
    });
  }, [tasks, completed, todayIso]);

  const todayTasks = sortedTasks.filter((t) => t.dueDate === todayIso);
  const remaining = todayTasks.filter((t) => !t.done).length;
  const pct = todayTasks.length === 0 ? 0 : Math.round(((todayTasks.length - remaining) / todayTasks.length) * 100);

  // Expand all tasks (incl. recurring) across the whole year for calendar
  const yearOccurrences = useMemo(() => {
    const year = new Date().getFullYear();
    const startMs = new Date(year, 0, 1).getTime();
    const endMs = new Date(year, 11, 31).getTime();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    type Occ = Task & { occKey: string };
    const out: Occ[] = [];
    for (const t of tasks) {
      const base = new Date(t.dueDate);
      const baseMs = base.getTime();
      const pushOcc = (iso: string) => {
        const occKey = `${t.id}|${iso}`;
        out.push({ ...t, dueDate: iso, done: completed.has(occKey), occKey });
      };
      if (baseMs >= startMs && baseMs <= endMs) {
        pushOcc(fmt(base));
      }
      if (t.repeat) {
        const cap = 800;
        let i = 0;
        const next = new Date(base);
        while (i++ < cap) {
          if (t.repeat === "Every Day") next.setDate(next.getDate() + 1);
          else if (t.repeat === "Every Week") next.setDate(next.getDate() + 7);
          else if (t.repeat === "Every 2 Weeks") next.setDate(next.getDate() + 14);
          else if (t.repeat === "Every Month") next.setMonth(next.getMonth() + 1);
          else if (t.repeat === "Every Year") next.setFullYear(next.getFullYear() + 1);
          else break;
          if (next.getTime() > endMs) break;
          if (next.getTime() < startMs) continue;
          pushOcc(fmt(new Date(next)));
        }
      }
    }
    return out;
  }, [tasks, completed]);

  const calendarByDate = useMemo(() => {
    const map = new Map<string, CalendarTaskInfo>();
    for (const o of yearOccurrences) {
      const cur = map.get(o.dueDate) ?? { due: 0, done: 0, doneEmojis: [], hasIncomplete: false };
      cur.due += 1;
      // Completion is always counted on the due date, even if completed early
      if (o.done) {
        cur.done += 1;
        cur.doneEmojis.push(o.emoji);
      } else {
        cur.hasIncomplete = true;
      }
      map.set(o.dueDate, cur);
    }
    return map;
  }, [yearOccurrences]);

  const tasksOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [] as (Task & { occKey: string })[];
    return yearOccurrences
      .filter((o) => o.dueDate === selectedDate)
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.createdAt - b.createdAt;
      });
  }, [yearOccurrences, selectedDate]);

  const timelineTag = (iso: string) => {
    if (iso === todayStr()) return { label: "Today", cls: "bg-[hsl(40,100%,55%)] text-[hsl(40,80%,12%)]" };
    if (iso === tomorrowStr()) return { label: "Tomorrow", cls: "bg-[hsl(45,90%,75%)] text-[hsl(45,50%,25%)]" };
    return { label: "Coming soon", cls: "bg-[hsl(45,80%,92%)] text-[hsl(45,40%,40%)]" };
  };

  const headerSubtitle =
    active === "calendar" ? "Your year at a glance"
    : active === "add" ? "Plant a new intention"
    : `Good morning, ${profile.name}`;
  const headerTitle =
    active === "calendar" ? "Calendar"
    : active === "add" ? "New Reminder"
    : "Upcoming Tasks";

  if (showLoginWall && !userId) {
    return <Onboarding />;
  }

  return (
    <>
    {showIntro && <IntroTour onDone={dismissIntro} />}
    <main className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="relative w-full max-w-[400px] aspect-[9/19] rounded-[3rem] neu-surface p-3">
        <div className="w-full h-full rounded-[2.5rem] neu-inset overflow-hidden flex flex-col">
          {/* Status bar */}
          <div className="flex items-center justify-between px-8 pt-5 pb-2 text-xs font-bold text-foreground/70">
            <span>9:41</span>
            <div className="flex gap-1.5 items-center">
              <span className="w-1 h-1 rounded-full bg-foreground/60" />
              <span className="w-1 h-1 rounded-full bg-foreground/60" />
              <span className="w-1 h-1 rounded-full bg-foreground/60" />
            </div>
          </div>

          {/* Header */}
          <header className="px-6 pt-4 pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold tracking-wide">
                {headerSubtitle}
              </p>
              <h1 className="text-2xl font-extrabold text-foreground mt-0.5 leading-tight">
                {headerTitle}
              </h1>
            </div>
          </header>

          {active === "calendar" ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Profile card */}
              <div className="px-5 pb-3">
                <div className="rounded-3xl neu-surface-sm p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl neu-inset flex items-center justify-center text-2xl shrink-0">
                    {profile.avatar}
                  </div>
                  {editingProfile ? (
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex gap-1 flex-wrap">
                        {["🌷","🌼","🐰","🦊","🐻","🌸","☕","🌙"].map((e) => (
                          <button
                            key={e}
                            onClick={() => setProfile((p) => ({ ...p, avatar: e }))}
                            className={`w-6 h-6 rounded-md text-sm flex items-center justify-center ${
                              profile.avatar === e ? "neu-pressed" : "neu-surface-sm"
                            }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                      <input
                        value={profile.name}
                        onChange={(e) => { setProfileTouched(true); setProfile((p) => ({ ...p, name: e.target.value })); }}
                        placeholder="Name"
                        className="w-full text-sm font-bold bg-transparent neu-inset rounded-lg px-2.5 py-1 outline-none"
                      />
                      <input
                        value={profile.slogan}
                        onChange={(e) => setProfile((p) => ({ ...p, slogan: e.target.value }))}
                        placeholder="Slogan"
                        className="w-full text-xs font-semibold bg-transparent neu-inset rounded-lg px-2.5 py-1 outline-none"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-foreground truncate">{profile.name}</p>
                      <p className="text-xs text-muted-foreground font-semibold truncate">
                        {profile.slogan}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => setEditingProfile((v) => !v)}
                    aria-label="Edit profile"
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      editingProfile ? "neu-pressed" : "neu-surface-sm"
                    }`}
                  >
                    {editingProfile ? (
                      <Check className="w-4 h-4 text-primary" strokeWidth={2.6} />
                    ) : (
                      <Pencil className="w-4 h-4 text-primary" strokeWidth={2.4} />
                    )}
                  </button>
                </div>
              </div>
              {selectedDate ? (
                <section className="flex-1 px-5 overflow-y-auto pb-4">
                  <div className="flex items-center justify-between px-1 pb-3">
                    <button
                      onClick={() => setSelectedDate(null)}
                      className="flex items-center gap-1 text-xs font-extrabold text-primary neu-surface-sm rounded-full px-3 py-1.5"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" strokeWidth={3} />
                      Calendar
                    </button>
                    <h2 className="text-base font-extrabold text-foreground">
                      {new Date(selectedDate).toLocaleDateString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </h2>
                  </div>

                  {tasksOnSelectedDate.length === 0 ? (
                    <div className="neu-inset rounded-2xl p-6 text-center text-xs font-bold text-muted-foreground">
                      No tasks on this day 🌿
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tasksOnSelectedDate.map((task, i) => {
                        const offset = swipeOffsets[task.occKey] ?? 0;
                        return (
                          <div key={task.occKey} className="relative">
                            <button
                              onClick={() => deleteTask(task.id)}
                              aria-label="Delete task"
                              className="absolute right-0 top-0 bottom-0 w-20 rounded-2xl bg-destructive flex items-center justify-center"
                            >
                              <Trash2 className="w-5 h-5 text-destructive-foreground" strokeWidth={2.4} />
                            </button>
                            <article
                              ref={attachSwipeTouch(task.occKey)}
                              onPointerDown={(e) => startSwipe(e, task.occKey)}
                              onClick={() => { if (justSwipedRef.current.has(task.occKey)) return; toggle(task.id, task.dueDate); }}
                              style={{
                                animationDelay: `${i * 60}ms`,
                                transform: `translateX(${offset}px)`,
                                transition: "transform 0.2s",
                              }}
                              className="relative rounded-2xl neu-surface-sm p-3.5 flex items-center gap-3 animate-[fade-in_0.5s_ease-out_both] cursor-pointer touch-pan-y select-none"
                            >
                              <div
                                className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-lg transition-all duration-300 ${
                                  task.done ? "neu-pressed" : "neu-surface-sm"
                                }`}
                              >
                                {task.done ? (
                                  <Check className="w-5 h-5 text-primary" strokeWidth={3} />
                                ) : (
                                  <span>{task.emoji}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm font-bold truncate ${
                                    task.done ? "text-muted-foreground line-through" : "text-foreground"
                                  }`}
                                >
                                  {task.title}
                                  {task.priority > 0 && (
                                    <span className="ml-1.5 text-primary font-extrabold">
                                      {PRIORITY_LABELS[task.priority]}
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground font-semibold mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  {task.repeat && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[hsl(45,90%,82%)] text-[hsl(45,50%,25%)]">
                                      🔁 {task.repeat}
                                    </span>
                                  )}
                                  {task.time && <span>{task.time}</span>}
                                </p>
                              </div>
                              <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTask(task.id);
                                }}
                                aria-label="Delete task"
                                className="shrink-0 w-10 h-10 rounded-full neu-surface-sm flex items-center justify-center text-destructive active:neu-pressed"
                              >
                                <Trash2 className="w-4 h-4" strokeWidth={2.4} />
                              </button>
                            </article>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ) : (
                <CalendarView byDate={calendarByDate} onSelectDate={setSelectedDate} />
              )}
            </div>
          ) : active === "add" ? (
            <section className="flex-1 px-6 overflow-y-auto pb-4 space-y-4">
              {/* Reminder name with chosen icon box */}
              <div>
                <label className="text-xs font-bold text-muted-foreground px-1">Reminder name</label>
                <div className="neu-inset rounded-2xl mt-1.5 px-3 py-2.5 flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl neu-surface-sm flex items-center justify-center text-xl shrink-0">
                    {newEmoji}
                  </div>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Sip warm tea"
                    className="flex-1 text-sm font-bold bg-transparent outline-none placeholder:text-muted-foreground/70"
                  />
                </div>
              </div>

              {/* Icon box with sticker toggle */}
              <div>
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-bold text-muted-foreground">Pick an icon</label>
                  <button
                    onClick={() => setShowStickers((v) => !v)}
                    className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
                      showStickers ? "neu-pressed text-primary" : "neu-surface-sm text-muted-foreground"
                    }`}
                  >
                    <Smile className="w-3 h-3" strokeWidth={2.4} />
                    More stickers
                  </button>
                </div>
                <div className="neu-surface-sm rounded-2xl mt-1.5 p-3 grid grid-cols-8 gap-1.5">
                  {recentEmojis.slice(0, 16).map((e, i) => (
                    <button
                      key={`${e}-${i}`}
                      onClick={() => {
                        setNewEmoji(e);
                        setRecentEmojis((r) => [e, ...r.filter((x) => x !== e)].slice(0, 16));
                      }}
                      className={`aspect-square rounded-xl text-lg flex items-center justify-center transition-all ${
                        newEmoji === e ? "neu-pressed scale-95" : "neu-surface-sm hover:scale-105"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>

                {showStickers && (
                  <div className="neu-inset rounded-2xl mt-2 p-3">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">More stickers</span>
                      <button
                        onClick={() => {
                          if (customStickers.length === 0) {
                            toast("Create stickers to add yours", {
                              description: "Make your own stickers in the iOS Stickers keyboard, then come back to add them here.",
                            });
                            return;
                          }
                          // Move focus to the user's own sticker collection
                          const first = customStickers[0];
                          setNewEmoji(first);
                          setRecentEmojis((r) => [first, ...r.filter((x) => x !== first)].slice(0, 16));
                        }}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full neu-surface-sm text-primary"
                      >
                        + add yours
                      </button>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5 max-h-44 overflow-y-auto">
                      {[...customStickers, ...EMOJI_STICKERS].map((e, i) => (
                        <button
                          key={`s-${e}-${i}`}
                          onClick={() => {
                            setNewEmoji(e);
                            setRecentEmojis((r) => [e, ...r.filter((x) => x !== e)].slice(0, 16));
                          }}
                          className={`aspect-square rounded-xl text-lg flex items-center justify-center transition-all ${
                            newEmoji === e ? "neu-pressed scale-95" : "neu-surface-sm hover:scale-105"
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Date — 3 quick options */}
              <div>
                <label className="text-xs font-bold text-muted-foreground px-1">Date</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {([
                    { id: "today", label: "Today" },
                    { id: "tomorrow", label: "Tomorrow" },
                    { id: "other", label: "Other day" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setDateMode(opt.id)}
                      className={`rounded-2xl py-2.5 text-xs font-extrabold transition-all ${
                        dateMode === opt.id ? "neu-pressed text-primary" : "neu-surface-sm text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {dateMode === "other" && (
                  <div className="neu-inset rounded-2xl mt-2 px-4 py-3">
                    <input
                      type="date"
                      value={customDate}
                      min={todayStr()}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full text-sm font-bold bg-transparent outline-none"
                    />
                  </div>
                )}

                {/* Repeat — iOS Reminders style */}
                <button
                  onClick={() => setShowRepeat((v) => !v)}
                  className={`w-full mt-2 rounded-2xl px-4 py-2.5 flex items-center justify-between transition-all ${
                    showRepeat ? "neu-pressed" : "neu-surface-sm"
                  }`}
                >
                  <span className="text-xs font-extrabold text-muted-foreground">Repeat</span>
                  <span className="text-xs font-bold text-primary">{repeat} ›</span>
                </button>
                {showRepeat && (
                  <div className="neu-inset rounded-2xl mt-2 p-2 space-y-1">
                    {["Never", "Every Day", "Every Week", "Every 2 Weeks", "Every Month", "Every Year"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setRepeat(opt);
                          setShowRepeat(false);
                        }}
                        className={`w-full text-left text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-between transition-all ${
                          repeat === opt ? "neu-pressed text-primary" : "hover:neu-surface-sm text-foreground"
                        }`}
                      >
                        <span>{opt}</span>
                        {repeat === opt && <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-bold text-muted-foreground px-1">Priority</label>
                <div className="grid grid-cols-4 gap-2 mt-1.5">
                  {PRIORITY_LABELS.map((label, i) => {
                    const yellowStyles = [
                      "bg-[hsl(45,90%,96%)] text-[hsl(45,20%,60%)]",
                      "bg-[hsl(45,90%,82%)] text-[hsl(45,50%,30%)]",
                      "bg-[hsl(43,95%,62%)] text-[hsl(40,60%,18%)]",
                      "bg-[hsl(40,100%,48%)] text-[hsl(40,80%,10%)]",
                    ];
                    const selected = newPriority === i;
                    return (
                      <button
                        key={i}
                        onClick={() => setNewPriority(i as Priority)}
                        className={`rounded-2xl py-2.5 text-xs font-extrabold transition-all ${yellowStyles[i]} ${
                          selected ? "neu-pressed scale-95" : "neu-surface-sm"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time (optional) */}
              <div>
                <label className="text-xs font-bold text-muted-foreground px-1">Time (optional)</label>
                <div className="neu-inset rounded-2xl mt-1.5 px-4 py-3">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full text-sm font-bold bg-transparent outline-none"
                  />
                </div>
              </div>

              {/* Compact Add Reminder button — right aligned, with Feedback on left */}
              <div className="flex justify-between items-center gap-2 pt-2 pb-1">
                <button
                  onClick={() => setShowFeedback(true)}
                  className="neu-surface-sm rounded-2xl px-3 py-2 flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wide active:neu-pressed transition-all"
                >
                  <MessageSquare className="w-3 h-3" strokeWidth={2.5} />
                  Give feedback
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wide">
                    Add reminder
                  </span>
                  <button
                    onClick={submitNew}
                    disabled={!newTitle.trim()}
                    aria-label="Add reminder"
                    className="w-12 h-12 rounded-full flex items-center justify-center neu-surface active:neu-pressed transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    style={{ background: "hsl(var(--primary))" }}
                  >
                    <Plus className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Feedback modal */}
              {showFeedback && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
                  onClick={() => setShowFeedback(false)}
                >
                  <div
                    className="neu-surface rounded-3xl p-6 w-full max-w-sm space-y-4 bg-background"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-lg font-extrabold text-center">Give feedback</h3>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setFeedbackRating(n)}
                          aria-label={`${n} star`}
                        >
                          <Star
                            className={`w-8 h-8 transition-all ${
                              n <= feedbackRating
                                ? "fill-primary text-primary"
                                : "text-muted-foreground"
                            }`}
                            strokeWidth={2}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Tell us more (optional)"
                      className="neu-inset rounded-2xl w-full px-4 py-3 text-sm bg-transparent outline-none resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowFeedback(false);
                          setFeedbackRating(0);
                          setFeedbackText("");
                        }}
                        className="neu-surface-sm rounded-2xl px-4 py-2 text-xs font-extrabold text-muted-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (feedbackRating === 0) {
                            toast("Please select a star rating");
                            return;
                          }
                          // Feedback submitted (recipient hidden)
                          toast("Thank you for your feedback");
                          setShowFeedback(false);
                          setFeedbackRating(0);
                          setFeedbackText("");
                        }}
                        className="rounded-2xl px-4 py-2 text-xs font-extrabold text-primary-foreground"
                        style={{ background: "hsl(var(--primary))" }}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : (
          <>
          {/* Search */}
          <div className="px-6 pb-3">
            <div className="neu-inset rounded-2xl flex items-center gap-3 px-4 py-3">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={2.2} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reminders..."
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground font-medium"
              />
            </div>
          </div>

          {/* Progress card with rain + settled emojis */}
          <div className="px-6 pb-4">
            <div
              ref={progressRef}
              className="relative rounded-3xl neu-surface-sm p-5 h-32 overflow-hidden touch-none"
            >
              <div className="flex items-start justify-between relative z-10 pointer-events-none">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Today's progress</p>
                  <p className="text-3xl font-extrabold text-foreground mt-1">
                    {remaining}
                    <span className="text-base text-muted-foreground font-bold"> left ✨</span>
                  </p>
                </div>
                <div className="relative w-14 h-14 rounded-full neu-inset flex items-center justify-center">
                  {/* triangular sun rays */}
                  <div className="absolute inset-0 pointer-events-none">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-1/2 top-1/2"
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: "3px solid transparent",
                          borderRight: "3px solid transparent",
                          borderBottom: "6px solid hsl(40, 100%, 55%)",
                          transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-32px)`,
                          filter: "drop-shadow(0 0 1px hsl(40, 100%, 60%))",
                        }}
                      />
                    ))}
                  </div>
                  <div
                    className="absolute inset-1 rounded-full"
                    style={{
                      background: `conic-gradient(hsl(var(--primary)) ${(pct / 100) * 360}deg, transparent 0)`,
                      opacity: 0.85,
                    }}
                  />
                  <div className="relative w-9 h-9 rounded-full neu-surface-sm flex items-center justify-center">
                    <span className="text-xs font-extrabold text-foreground">{pct}%</span>
                  </div>
                </div>
              </div>

              {settled.map((s) => (
                <span
                  key={`s-${s.id}`}
                  onPointerDown={(e) => startDrag(e, s.id)}
                  className={`absolute text-3xl select-none animate-settle-pop touch-none ${
                    draggingId === s.id ? "cursor-grabbing z-20 scale-110" : "cursor-grab"
                  }`}
                  style={{
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    ["--settle-rot" as any]: `${s.rot}deg`,
                    filter: "drop-shadow(2px 2px 3px hsl(var(--neu-dark) / 0.4))",
                    transition: draggingId === s.id ? "none" : "left 0.2s, top 0.2s",
                  }}
                >
                  {s.emoji}
                </span>
              ))}

              {drops.map((d) => (
                <span
                  key={d.key}
                  className="absolute -top-6 text-3xl select-none pointer-events-none animate-emoji-rain"
                  style={{
                    left: `${d.x}%`,
                    animationDelay: `${d.delay}s`,
                    ["--rain-rot" as any]: `${d.rot}deg`,
                  }}
                >
                  {d.emoji}
                </span>
              ))}
            </div>
          </div>

          {/* Task list */}
          <section className="flex-1 px-6 overflow-y-auto pb-4 space-y-3">
            

            {sortedTasks.filter((t) => t.title.toLowerCase().includes(searchQuery.trim().toLowerCase())).map((task, i) => {
              const offset = swipeOffsets[task.occKey] ?? 0;
              return (
              <div key={task.occKey} className="relative">
                <button
                  onClick={() => deleteTask(task.id)}
                  aria-label="Delete task"
                  className="absolute right-0 top-0 bottom-0 w-20 rounded-2xl bg-destructive flex items-center justify-center"
                >
                  <Trash2 className="w-5 h-5 text-destructive-foreground" strokeWidth={2.4} />
                </button>
                <article
                  ref={attachSwipeTouch(task.occKey)}
                  onPointerDown={(e) => startSwipe(e, task.occKey)}
                  onClick={() => { if (justSwipedRef.current.has(task.occKey)) return; toggle(task.id, task.dueDate); }}
                  style={{
                    animationDelay: `${i * 60}ms`,
                    transform: `translateX(${offset}px)`,
                    transition: "transform 0.2s",
                  }}
                  className="relative rounded-2xl neu-surface-sm p-3.5 flex items-center gap-3 animate-[fade-in_0.5s_ease-out_both] cursor-pointer touch-pan-y select-none"
                >
                  <div
                    aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                    className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-lg transition-all duration-300 ${
                      task.done ? "neu-pressed" : "neu-surface-sm"
                    }`}
                  >
                    {task.done ? (
                      <Check className="w-5 h-5 text-primary" strokeWidth={3} />
                    ) : (
                      <span>{task.emoji}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-bold truncate ${
                        task.done ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {task.title}
                      {task.priority > 0 && (
                        <span className="ml-1.5 text-primary font-extrabold">
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground font-semibold mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${timelineTag(task.dueDate).cls}`}>
                        {timelineTag(task.dueDate).label}
                      </span>
                      {task.repeat && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[hsl(45,90%,82%)] text-[hsl(45,50%,25%)]">
                          🔁 {task.repeat}
                        </span>
                      )}
                      <span>{formatDateLabel(task.dueDate)}{task.time ? ` • ${task.time}` : ""}</span>
                    </p>
                  </div>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask(task.id);
                    }}
                    aria-label="Delete task"
                    className="shrink-0 w-10 h-10 rounded-full neu-surface-sm flex items-center justify-center text-destructive active:neu-pressed"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={2.4} />
                  </button>
                </article>
              </div>
              );
            })}
          </section>
          </>
          )}

          {/* First-reminder CTA — positioned so arrow lands on the + button */}
          {active === "home" && (tasks.length === 0 || debugShowCta) && !showIntro && !ctaDismissed && (
            <div className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none" style={{ bottom: '9rem' }}>
              <div className="relative animate-[fade-in_0.5s_ease-out_both] pointer-events-auto">
                <div
                  className="flex items-center gap-3.5 rounded-3xl pl-4 pr-3 py-3.5"
                  style={{
                    background: "linear-gradient(180deg, hsl(50 100% 96%), hsl(45 100% 92%))",
                    border: "2.5px solid hsl(45 90% 85%)",
                    boxShadow: "0 20px 48px -14px hsl(40 90% 50% / 0.28), inset 0 1px 0 hsl(0 0% 100% / 0.7)",
                  }}
                >
                  {/* Sun avatar */}
                  <div
                    className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-[1.125rem] text-2xl"
                    style={{
                      background: "linear-gradient(135deg, hsl(48 100% 80%), hsl(38 100% 72%))",
                      boxShadow: "inset 0 -2px 0 hsl(35 90% 60% / 0.35)",
                    }}
                    aria-hidden
                  >
                    🌞
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="text-[13px] font-extrabold text-stone-800 leading-tight">
                      Hey sunshine! ✨
                    </div>
                    <div className="text-[12px] font-medium text-stone-600 leading-snug mt-0.5">
                      Shine your productive light — tap <span className="font-bold">＋</span> to create your first reminder.
                    </div>
                  </div>
                  {/* Dismiss */}
                  <button
                    onClick={dismissFirstCta}
                    aria-label="Dismiss tip"
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-700 hover:bg-white/60 transition-colors"
                  >
                    <span className="text-lg leading-none">×</span>
                  </button>
                </div>
                {/* Long arrow reaching down to the + button */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-1 pointer-events-none"
                  style={{ animation: "bounce 1.4s ease-in-out infinite" }}
                  aria-hidden
                >
                  <svg width="58" height="96" viewBox="0 0 58 96" fill="none">
                    <defs>
                      <linearGradient id="ctaArrowV3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(48 100% 80%)" />
                        <stop offset="100%" stopColor="hsl(35 95% 62%)" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M29 6 V78 M12 66 L29 94 L46 66"
                      stroke="url(#ctaArrowV3)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Bottom nav — 3 tabs */}
          <nav className="mx-5 mb-5 mt-2 rounded-3xl neu-surface-sm px-6 py-2.5 flex items-center justify-between">
            {[
              { id: "home", icon: Bell, label: "Reminder" },
              { id: "add", icon: Plus, label: "Add", primary: true },
              { id: "calendar", icon: Calendar, label: "Calendar" },
            ].map(({ id, icon: Icon, primary }) => {
              const isActive = active === id;
              if (primary) {
                return (
                  <button
                    key={id}
                    aria-label="Add reminder"
                    onClick={() => setActive(id)}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center neu-surface-sm active:neu-pressed transition-all duration-300 hover:scale-105"
                    style={{ background: "hsl(var(--primary))" }}
                  >
                    <Icon className="w-5 h-5 text-primary-foreground" strokeWidth={2.6} />
                  </button>
                );
              }
              return (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  aria-label={id}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isActive ? "neu-pressed" : ""
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                    strokeWidth={2.2}
                  />
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </main>
    </>
  );
};

export default Index;
