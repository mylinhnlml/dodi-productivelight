import { Bell, Plus, Search, Calendar, Check, Pencil, Smile, MessageSquare, Star, Trash2 } from "lucide-react";
import { useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import CalendarView from "@/components/CalendarView";

type Priority = 0 | 1 | 2 | 3;

type Task = {
  id: number;
  title: string;
  time: string; // display
  emoji: string;
  done: boolean;
  dueDate: string; // YYYY-MM-DD
  priority: Priority;
  createdAt: number;
  repeat?: string;
};

type Settled = { id: number; emoji: string; x: number; y: number; rot: number };
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

const initialTasks: Task[] = [
  { id: 1, title: "Morning yoga", time: "7:30 AM", emoji: "🌸", done: false, dueDate: todayStr(), priority: 2, createdAt: 1 },
  { id: 2, title: "Call grandma", time: "11:00 AM", emoji: "☎️", done: false, dueDate: todayStr(), priority: 1, createdAt: 2 },
  { id: 3, title: "Water the plants", time: "2:15 PM", emoji: "🪴", done: true, dueDate: todayStr(), priority: 0, createdAt: 3 },
  { id: 4, title: "Read a few pages", time: "9:00 PM", emoji: "📖", done: false, dueDate: todayStr(), priority: 0, createdAt: 4 },
  { id: 5, title: "Bake cinnamon rolls", time: "10:00 AM", emoji: "🧁", done: false, dueDate: tomorrowStr(), priority: 3, createdAt: 5 },
];

const EMOJI_BASIC = ["🌸","☎️","🪴","📖","🧁","☕","💌","🍵","🌿","🧘‍♀️","🛁","🎀","✨","🍰","🌙","📚"];
const EMOJI_STICKERS = [
  "🌷","🌼","🌻","🌺","🌹","💐","🍓","🍑","🍒","🍋","🍯","🥐",
  "🐰","🦊","🐻","🐱","🐶","🐼","🐨","🦋","🐝","🐞",
  "☁️","⭐","🌈","💫","🔮","🕯️","🎐","🧸","🪞","💝","💖","🪷",
  "📝","✏️","🖋️","📎","📌","🗓️","⏰","🎧","🎵","🎬","🛍️","🎁",
];

const PRIORITY_LABELS = ["None", "!", "!!", "!!!"];

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [active, setActive] = useState("home");
  const [settled, setSettled] = useState<Settled[]>(() =>
    initialTasks
      .filter((t) => t.done)
      .map((t) => ({ id: t.id, emoji: t.emoji, x: rand(8, 78), y: rand(45, 70), rot: rand(-18, 18) }))
  );
  const [drops, setDrops] = useState<Drop[]>([]);
  const dropKey = useRef(0);
  const nextId = useRef(initialTasks.length + 1);
  const createdSeq = useRef(initialTasks.length + 1);
  const progressRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const startDrag = (e: React.PointerEvent, id: number) => {
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
  const [swipedKey, setSwipedKey] = useState<string | null>(null);
  const [deletedOccs, setDeletedOccs] = useState<Set<string>>(new Set());
  const swipeStart = useRef<{ x: number; y: number; key: string } | null>(null);
  const [swipeDx, setSwipeDx] = useState(0);

  const deleteOccurrence = (task: { id: number; occKey: string; isOccurrence: boolean }) => {
    if (task.isOccurrence) {
      setDeletedOccs((s) => {
        const n = new Set(s);
        n.add(task.occKey);
        return n;
      });
    } else {
      setTasks((t) => t.filter((x) => x.id !== task.id));
      setSettled((s) => s.filter((x) => x.id !== task.id));
    }
    setSwipedKey(null);
    setSwipeDx(0);
  };

  // Profile state
  const [profile, setProfile] = useState({
    name: "Mira",
    slogan: "Soft days, gentle wins ✨",
    avatar: "🌷",
  });
  const [editingProfile, setEditingProfile] = useState(false);

  const toggle = (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const becomingDone = !task.done;
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));

    if (becomingDone) {
      const newDrops: Drop[] = Array.from({ length: 7 }).map(() => ({
        key: `d${dropKey.current++}`,
        emoji: task.emoji,
        x: rand(4, 86),
        delay: rand(0, 0.45),
        rot: rand(-40, 40),
      }));
      setDrops((d) => [...d, ...newDrops]);

      const settledId = id;
      const newSettled: Settled = {
        id: settledId,
        emoji: task.emoji,
        x: rand(6, 82),
        y: rand(38, 72),
        rot: rand(-20, 20),
      };
      window.setTimeout(() => {
        setSettled((s) => [...s.filter((x) => x.id !== settledId), newSettled]);
      }, 1000);
      window.setTimeout(() => {
        setDrops((d) => d.filter((dd) => !newDrops.some((n) => n.key === dd.key)));
      }, 1700);
    } else {
      setSettled((s) => s.filter((x) => x.id !== id));
    }
  };

  const submitNew = () => {
    if (!newTitle.trim()) return;
    const id = nextId.current++;
    const time = newTime
      ? new Date(`2000-01-01T${newTime}`).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
    const dueDate =
      dateMode === "today" ? todayStr() : dateMode === "tomorrow" ? tomorrowStr() : customDate;
    setTasks((t) => [
      ...t,
      {
        id,
        title: newTitle.trim(),
        time,
        emoji: newEmoji,
        done: false,
        dueDate,
        priority: newPriority,
        createdAt: createdSeq.current++,
        repeat: repeat !== "Never" ? repeat : undefined,
      },
    ]);
    setNewTitle("");
    setNewTime("");
    setNewEmoji("🌸");
    setNewPriority(0);
    setDateMode("today");
    setCustomDate(todayStr());
    setRepeat("Never");
    setShowRepeat(false);
    setShowStickers(false);
    setActive("home");
  };

  const remaining = tasks.filter((t) => !t.done).length;
  const pct = Math.round(((tasks.length - remaining) / tasks.length) * 100);

  // Sort: by date asc, then priority desc, then createdAt asc
  // Also limit to today + 6 upcoming days, and expand recurring tasks
  const sortedTasks = useMemo(() => {
    const today = new Date(todayStr());
    const startMs = today.getTime();
    const maxMs = startMs + 6 * 86400000;
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    type DisplayTask = Task & { occKey: string; isOccurrence: boolean };
    const out: DisplayTask[] = [];

    for (const t of tasks) {
      const base = new Date(t.dueDate);
      // generate occurrences within window
      const occurrences: string[] = [];
      const pushIfInWindow = (d: Date) => {
        const ms = d.getTime();
        if (ms >= startMs && ms <= maxMs) occurrences.push(fmt(d));
      };
      pushIfInWindow(base);

      if (t.repeat) {
        // step forward from base until past window
        const cap = 400; // safety
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
        if (deletedOccs.has(occKey)) continue;
        out.push({
          ...t,
          dueDate: iso,
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
  }, [tasks, deletedOccs]);

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

  return (
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
            <button
              aria-label="Notifications"
              className="w-12 h-12 rounded-2xl neu-surface-sm flex items-center justify-center active:neu-pressed transition-all duration-300 hover:scale-105"
            >
              <Bell className="w-5 h-5 text-primary" strokeWidth={2.2} />
            </button>
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
                        onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
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
              <CalendarView />
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
              <Search className="w-4 h-4 text-muted-foreground" strokeWidth={2.2} />
              <span className="text-sm text-muted-foreground font-medium">
                Search reminders...
              </span>
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
            {sortedTasks.map((task, i) => (
              <article
                key={task.occKey}
                style={{ animationDelay: `${i * 60}ms` }}
                className="rounded-2xl neu-surface-sm p-3.5 flex items-center gap-3 animate-[fade-in_0.5s_ease-out_both] hover:scale-[1.02] transition-transform duration-300"
              >
                <button
                  onClick={() => toggle(task.id)}
                  aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                  className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-lg transition-all duration-300 ${
                    task.done ? "neu-pressed" : "neu-surface-sm active:neu-pressed"
                  }`}
                >
                  {task.done ? (
                    <Check className="w-5 h-5 text-primary" strokeWidth={3} />
                  ) : (
                    <span>{task.emoji}</span>
                  )}
                </button>
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
              </article>
            ))}
          </section>
          </>
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
  );
};

export default Index;
