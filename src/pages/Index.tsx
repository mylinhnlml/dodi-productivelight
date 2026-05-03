import { Bell, Plus, Search, Calendar, Check, Pencil, AlignLeft, CalendarDays, Clock, Flag, Tag, Smile } from "lucide-react";
import { useRef, useState } from "react";
import CalendarView from "@/components/CalendarView";

type Task = {
  id: number;
  title: string;
  time: string;
  emoji: string;
  done: boolean;
  tag: string;
};

type Settled = { id: number; emoji: string; x: number; y: number; rot: number };
type Drop = { key: string; emoji: string; x: number; delay: number; rot: number };

const initialTasks: Task[] = [
  { id: 1, title: "Morning yoga", time: "7:30 AM", emoji: "🌸", done: false, tag: "Today" },
  { id: 2, title: "Call grandma", time: "11:00 AM", emoji: "☎️", done: false, tag: "Today" },
  { id: 3, title: "Water the plants", time: "2:15 PM", emoji: "🪴", done: true, tag: "Today" },
  { id: 4, title: "Read a few pages", time: "9:00 PM", emoji: "📖", done: false, tag: "Tonight" },
  { id: 5, title: "Bake cinnamon rolls", time: "Tomorrow • 10 AM", emoji: "🧁", done: false, tag: "Tomorrow" },
];

const EMOJI_CHOICES = ["🌸","☎️","🪴","📖","🧁","☕","💌","🍵","🌿","🧘‍♀️","🛁","🎀","✨","🍰","🌙","📚"];

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
  const [newNotes, setNewNotes] = useState("");
  const [newEmoji, setNewEmoji] = useState("🌸");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newFlag, setNewFlag] = useState(false);
  const [newPriority, setNewPriority] = useState<"none" | "low" | "med" | "high">("none");
  const [newList, setNewList] = useState("Today");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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
    const timeLabel = newTime
      ? new Date(`2000-01-01T${newTime}`).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : "Anytime";
    const dateLabel = newDate
      ? new Date(newDate).toLocaleDateString([], { month: "short", day: "numeric" })
      : "";
    const time = dateLabel ? `${dateLabel} • ${timeLabel}` : timeLabel;
    setTasks((t) => [
      ...t,
      { id, title: newTitle.trim(), time, emoji: newEmoji, done: false, tag: newList },
    ]);
    setNewTitle("");
    setNewNotes("");
    setNewDate("");
    setNewTime("");
    setNewEmoji("🌸");
    setNewFlag(false);
    setNewPriority("none");
    setNewList("Today");
    setActive("home");
  };

  const remaining = tasks.filter((t) => !t.done).length;
  const pct = Math.round(((tasks.length - remaining) / tasks.length) * 100);

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
            <section className="flex-1 px-5 overflow-y-auto pb-4 space-y-4">
              {/* iOS-like header row */}
              <div className="flex items-center justify-between -mt-1">
                <button
                  onClick={() => setActive("home")}
                  className="text-sm font-semibold text-muted-foreground px-1"
                >
                  Cancel
                </button>
                <p className="text-xs font-bold text-foreground/70">Details</p>
                <button
                  onClick={submitNew}
                  disabled={!newTitle.trim()}
                  className="text-sm font-extrabold text-primary px-1 disabled:opacity-40"
                >
                  Add
                </button>
              </div>

              {/* Title + Notes card */}
              <div className="rounded-3xl neu-surface-sm overflow-hidden">
                <div className="flex items-start gap-3 px-4 pt-3.5 pb-2.5">
                  <button
                    onClick={() => setShowEmojiPicker((v) => !v)}
                    className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all ${
                      showEmojiPicker ? "neu-pressed" : "neu-inset"
                    }`}
                    aria-label="Pick icon"
                  >
                    {newEmoji}
                  </button>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Title"
                    className="flex-1 text-base font-bold bg-transparent outline-none placeholder:text-muted-foreground/60 py-2"
                  />
                </div>
                <div className="h-px mx-4 bg-foreground/5" />
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Notes"
                  rows={2}
                  className="w-full text-sm font-medium bg-transparent outline-none placeholder:text-muted-foreground/60 px-4 py-3 resize-none"
                />
                {showEmojiPicker && (
                  <div className="px-3 pb-3 grid grid-cols-8 gap-1.5">
                    {EMOJI_CHOICES.map((e) => (
                      <button
                        key={e}
                        onClick={() => {
                          setNewEmoji(e);
                          setShowEmojiPicker(false);
                        }}
                        className={`aspect-square rounded-xl text-lg flex items-center justify-center transition-all ${
                          newEmoji === e ? "neu-pressed scale-95" : "neu-surface-sm hover:scale-105"
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Grouped settings rows */}
              <div className="rounded-3xl neu-surface-sm overflow-hidden divide-y divide-foreground/5">
                {/* Date */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "hsl(8 70% 75% / 0.7)" }}>
                    <CalendarDays className="w-4 h-4 text-foreground/80" strokeWidth={2.4} />
                  </div>
                  <span className="flex-1 text-sm font-bold text-foreground">Date</span>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="text-sm font-semibold bg-transparent outline-none text-muted-foreground"
                  />
                </div>
                {/* Time */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "hsl(220 60% 78% / 0.7)" }}>
                    <Clock className="w-4 h-4 text-foreground/80" strokeWidth={2.4} />
                  </div>
                  <span className="flex-1 text-sm font-bold text-foreground">Time</span>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="text-sm font-semibold bg-transparent outline-none text-muted-foreground"
                  />
                </div>
                {/* Flag */}
                <button
                  onClick={() => setNewFlag((v) => !v)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "hsl(30 85% 75% / 0.8)" }}>
                    <Flag className="w-4 h-4 text-foreground/80" strokeWidth={2.4} />
                  </div>
                  <span className="flex-1 text-sm font-bold text-foreground">Flag</span>
                  <span className={`relative w-10 h-6 rounded-full transition-all ${newFlag ? "" : "neu-inset"}`} style={newFlag ? { background: "hsl(var(--primary))" } : undefined}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-all ${newFlag ? "left-[18px]" : "left-0.5"}`} />
                  </span>
                </button>
                {/* Priority */}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "hsl(0 65% 78% / 0.75)" }}>
                      <span className="text-sm font-extrabold text-foreground/80">!</span>
                    </div>
                    <span className="flex-1 text-sm font-bold text-foreground">Priority</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 neu-inset rounded-2xl p-1">
                    {(["none", "low", "med", "high"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setNewPriority(p)}
                        className={`text-[11px] font-extrabold rounded-xl py-1.5 capitalize transition-all ${
                          newPriority === p ? "neu-surface-sm text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {p === "none" ? "None" : p === "med" ? "!!" : p === "low" ? "!" : "!!!"}
                      </button>
                    ))}
                  </div>
                </div>
                {/* List */}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "hsl(140 35% 75% / 0.8)" }}>
                      <Tag className="w-4 h-4 text-foreground/80" strokeWidth={2.4} />
                    </div>
                    <span className="flex-1 text-sm font-bold text-foreground">List</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["Today", "Tonight", "Tomorrow", "Someday"].map((l) => (
                      <button
                        key={l}
                        onClick={() => setNewList(l)}
                        className={`text-[11px] font-extrabold rounded-full px-3 py-1.5 transition-all ${
                          newList === l ? "neu-pressed text-primary" : "neu-surface-sm text-muted-foreground"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
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

          {/* Task list */}
          <section className="flex-1 px-6 overflow-y-auto pb-4 space-y-3">
            {tasks.map((task, i) => (
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
                  <p
                    className={`text-sm font-bold truncate ${
                      task.done ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {task.title}
                  </p>
                  <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                    {task.time}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-primary px-2.5 py-1 rounded-full neu-inset">
                  {task.tag}
                </span>
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
