import { Bell, Plus, Search, Calendar as CalendarIcon, Check, Pencil, Smile, Calendar as CalIcon } from "lucide-react";
import { useRef, useState } from "react";
import CalendarView from "@/components/CalendarView";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isToday, isTomorrow, isSameDay, addDays } from "date-fns";

type Task = {
  id: number;
  title: string;
  time: string;
  emoji: string;
  done: boolean;
  tag: string;
  priority: 0 | 1 | 2 | 3;
  createdAt: number;
  date: Date;
};

type Settled = { id: number; emoji: string; x: number; y: number; rot: number };
type Drop = { key: string; emoji: string; x: number; delay: number; rot: number };

const today = new Date();

const initialTasks: Task[] = [
  { id: 1, title: "Morning yoga", time: "7:30 AM", emoji: "🌸", done: false, tag: "Today", priority: 2, createdAt: 1, date: today },
  { id: 2, title: "Call grandma", time: "11:00 AM", emoji: "☎️", done: false, tag: "Today", priority: 1, createdAt: 2, date: today },
  { id: 3, title: "Water the plants", time: "2:15 PM", emoji: "🪴", done: true, tag: "Today", priority: 0, createdAt: 3, date: today },
  { id: 4, title: "Read a few pages", time: "9:00 PM", emoji: "📖", done: false, tag: "Tonight", priority: 3, createdAt: 4, date: today },
  { id: 5, title: "Bake cinnamon rolls", time: "Tomorrow • 10 AM", emoji: "🧁", done: false, tag: "Tomorrow", priority: 0, createdAt: 5, date: addDays(today, 1) },
];

const EMOJI_CHOICES = ["🌸","☎️","🪴","📖","🧁","☕","💌","🍵","🌿","🧘‍♀️","🛁","🎀","✨","🍰","🌙","📚"];
// iOS keyboard "Stickers" box only allows standard emoji stickers (no custom images)
const IOS_EMOJI_STICKERS = [
  "😀","😁","😂","🥰","😍","😘","🤩","🥳","😎","🤗","🤔","😴","🥱","😇","🙂","😉",
  "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔",
  "🌸","🌷","🌹","🌺","🌻","🌼","💐","🌿","🍀","🌱","🪴","🌵","🌳","🍂","🍁","🌾",
  "☕","🍵","🧋","🍰","🧁","🍪","🍩","🍮","🍨","🍦","🍓","🍑","🍒","🥐","🥞","🍯",
];

// Curated packs from "creators" — themed sticker sets
const CREATOR_PACKS: { name: string; author: string; stickers: string[] }[] = [
  {
    name: "Cozy Mornings",
    author: "@peachstudio",
    stickers: ["☕","🥐","📖","🕯️","🧸","🪴","🌤️","🍯","🥛","🧁","🌙","✨"],
  },
  {
    name: "Soft Bloom",
    author: "@lilypetal",
    stickers: ["🌸","🌷","🌹","🌺","🌻","🌼","💐","🍃","🦋","🐝","🌿","🪷"],
  },
  {
    name: "Self Care",
    author: "@calmco",
    stickers: ["🛁","🧴","🪥","🧘‍♀️","💆‍♀️","🎧","🕯️","💖","🍵","📚","🌙","💎"],
  },
];


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
  const [newPriority, setNewPriority] = useState<0 | 1 | 2 | 3>(0);
  const [dateMode, setDateMode] = useState<"today" | "tomorrow" | "other">("today");
  const [otherDate, setOtherDate] = useState<Date | undefined>();
  const [stickerOpen, setStickerOpen] = useState(false);

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
    const dateValue =
      dateMode === "today" ? today
      : dateMode === "tomorrow" ? addDays(today, 1)
      : (otherDate ?? today);
    const tag = isToday(dateValue) ? "Today" : isTomorrow(dateValue) ? "Tomorrow" : format(dateValue, "MMM d");
    const time = newTime
      ? new Date(`2000-01-01T${newTime}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : "Anytime";
    setTasks((t) => [
      ...t,
      {
        id,
        title: newTitle.trim(),
        time,
        emoji: newEmoji,
        done: false,
        tag,
        priority: newPriority,
        createdAt: createdSeq.current++,
        date: dateValue,
      },
    ]);
    setNewTitle("");
    setNewTime("");
    setNewEmoji("🌸");
    setNewPriority(0);
    setDateMode("today");
    setOtherDate(undefined);
    setActive("home");
  };

  const remaining = tasks.filter((t) => !t.done).length;
  const pct = Math.round(((tasks.length - remaining) / tasks.length) * 100);

  // Sort: higher priority first; within same priority: earlier createdAt first
  const sortedTasks = [...tasks].sort((a, b) =>
    b.priority - a.priority || a.createdAt - b.createdAt
  );

  const priorityBadge = (p: 0 | 1 | 2 | 3) =>
    p === 0 ? null : "!".repeat(p);

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
            {active !== "add" && (
              <button
                aria-label="Notifications"
                className="w-12 h-12 rounded-2xl neu-surface-sm flex items-center justify-center active:neu-pressed transition-all duration-300 hover:scale-105"
              >
                <Bell className="w-5 h-5 text-primary" strokeWidth={2.2} />
              </button>
            )}
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
              {/* Reminder name with icon box */}
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
                    className="w-full text-sm font-bold bg-transparent outline-none placeholder:text-muted-foreground/70"
                  />
                </div>
              </div>

              {/* Icon picker with sticker button */}
              <div>
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-bold text-muted-foreground">Pick an icon</label>
                  <Popover open={stickerOpen} onOpenChange={setStickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        aria-label="More stickers"
                        className="flex items-center gap-1 text-[11px] font-bold text-primary neu-surface-sm rounded-full px-2.5 py-1 active:neu-pressed"
                      >
                        <Smile className="w-3 h-3" strokeWidth={2.6} />
                        Stickers
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="w-72 p-2 rounded-2xl border-0 neu-surface bg-background"
                    >
                      <div className="max-h-56 overflow-y-auto grid grid-cols-8 gap-1">
                        {STICKER_PACK.map((e) => (
                          <button
                            key={e}
                            onClick={() => {
                              setNewEmoji(e);
                              setStickerOpen(false);
                            }}
                            className={`aspect-square rounded-lg text-lg flex items-center justify-center transition-all ${
                              newEmoji === e ? "neu-pressed scale-95" : "hover:neu-surface-sm hover:scale-110"
                            }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="neu-surface-sm rounded-2xl mt-1.5 p-3 grid grid-cols-8 gap-1.5">
                  {EMOJI_CHOICES.map((e) => (
                    <button
                      key={e}
                      onClick={() => setNewEmoji(e)}
                      className={`aspect-square rounded-xl text-lg flex items-center justify-center transition-all ${
                        newEmoji === e ? "neu-pressed scale-95" : "neu-surface-sm hover:scale-105"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date quick options */}
              <div>
                <label className="text-xs font-bold text-muted-foreground px-1">Date</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {(["today","tomorrow","other"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setDateMode(m)}
                      className={`rounded-2xl py-2.5 text-xs font-extrabold capitalize transition-all ${
                        dateMode === m ? "neu-pressed text-primary" : "neu-surface-sm text-foreground/70"
                      }`}
                    >
                      {m === "other" ? "Other day" : m}
                    </button>
                  ))}
                </div>
                {dateMode === "other" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full mt-2 neu-inset rounded-2xl px-4 py-3 flex items-center gap-2 text-sm font-bold text-foreground">
                        <CalIcon className="w-4 h-4 text-primary" strokeWidth={2.4} />
                        {otherDate ? format(otherDate, "PPP") : (
                          <span className="text-muted-foreground font-semibold">Pick a date</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border-0 neu-surface bg-background" align="start">
                      <Calendar
                        mode="single"
                        selected={otherDate}
                        onSelect={setOtherDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-bold text-muted-foreground px-1">Priority</label>
                <div className="grid grid-cols-4 gap-2 mt-1.5">
                  {([
                    { v: 0 as const, label: "None" },
                    { v: 1 as const, label: "!" },
                    { v: 2 as const, label: "!!" },
                    { v: 3 as const, label: "!!!" },
                  ]).map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setNewPriority(v)}
                      className={`rounded-2xl py-2.5 text-sm font-extrabold transition-all ${
                        newPriority === v ? "neu-pressed text-primary" : "neu-surface-sm text-foreground/70"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time (optional) */}
              <div>
                <label className="text-xs font-bold text-muted-foreground px-1">Time <span className="font-semibold text-muted-foreground/70">(optional)</span></label>
                <div className="neu-inset rounded-2xl mt-1.5 px-4 py-3">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full text-sm font-bold bg-transparent outline-none"
                  />
                </div>
              </div>

              {/* Big add circle */}
              <div className="flex justify-center pt-2 pb-1">
                <button
                  onClick={submitNew}
                  disabled={!newTitle.trim()}
                  aria-label="Add reminder"
                  className="w-20 h-20 rounded-full flex items-center justify-center neu-surface active:neu-pressed transition-all duration-300 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  <Plus className="w-9 h-9 text-primary-foreground" strokeWidth={2.8} />
                </button>
              </div>
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

          {/* Task list — sorted by priority then time added */}
          <section className="flex-1 px-6 overflow-y-auto pb-4 space-y-3">
            {sortedTasks.map((task, i) => {
              const badge = priorityBadge(task.priority);
              return (
                <article
                  key={task.id}
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
                    <div className="flex items-center gap-1.5">
                      {badge && (
                        <span className="text-[11px] font-extrabold text-primary leading-none">
                          {badge}
                        </span>
                      )}
                      <p
                        className={`text-sm font-bold truncate ${
                          task.done ? "text-muted-foreground line-through" : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                      {task.time}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-primary px-2.5 py-1 rounded-full neu-inset">
                    {task.tag}
                  </span>
                </article>
              );
            })}
          </section>
          </>
          )}

          {/* Bottom nav — 3 tabs */}
          <nav className="mx-5 mb-5 mt-2 rounded-3xl neu-surface-sm px-6 py-2.5 flex items-center justify-between">
            {[
              { id: "home", icon: Bell, label: "Reminder" },
              { id: "add", icon: Plus, label: "Add", primary: true },
              { id: "calendar", icon: CalendarIcon, label: "Calendar" },
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
