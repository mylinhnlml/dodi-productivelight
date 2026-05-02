import { Bell, Plus, Search, Calendar, Settings, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Task = {
  id: number;
  title: string;
  time: string;
  emoji: string;
  done: boolean;
  tag: string;
};

const initialTasks: Task[] = [
  { id: 1, title: "Morning yoga", time: "7:30 AM", emoji: "🌸", done: false, tag: "Today" },
  { id: 2, title: "Call grandma", time: "11:00 AM", emoji: "☎️", done: false, tag: "Today" },
  { id: 3, title: "Water the plants", time: "2:15 PM", emoji: "🪴", done: true, tag: "Today" },
  { id: 4, title: "Read a few pages", time: "9:00 PM", emoji: "📖", done: false, tag: "Tonight" },
  { id: 5, title: "Bake cinnamon rolls", time: "Tomorrow • 10 AM", emoji: "🧁", done: false, tag: "Tomorrow" },
];

type Flyer = {
  key: number;
  emoji: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  midX: number;
  midY: number;
  phase: 0 | 1;
};

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [active, setActive] = useState("home");
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [collected, setCollected] = useState<string[]>(
    initialTasks.filter((t) => t.done).map((t) => t.emoji),
  );
  const [pulseRing, setPulseRing] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const remaining = tasks.filter((t) => !t.done).length;
  const percent = Math.round(((tasks.length - remaining) / tasks.length) * 100);

  const handleToggle = (task: Task) => {
    if (task.done) {
      // Un-complete: remove one instance of this emoji from collected
      setCollected((c) => {
        const idx = c.lastIndexOf(task.emoji);
        if (idx === -1) return c;
        return [...c.slice(0, idx), ...c.slice(idx + 1)];
      });
      setTasks((ts) => ts.map((x) => (x.id === task.id ? { ...x, done: false } : x)));
      return;
    }

    const stage = stageRef.current?.getBoundingClientRect();
    const btn = buttonRefs.current[task.id]?.getBoundingClientRect();
    const target = progressRef.current?.getBoundingClientRect();
    if (!stage || !btn || !target) {
      setTasks((ts) => ts.map((x) => (x.id === task.id ? { ...x, done: true } : x)));
      setCollected((c) => [...c, task.emoji]);
      return;
    }

    const startX = btn.left - stage.left + btn.width / 2;
    const startY = btn.top - stage.top + btn.height / 2;
    const endX = target.left - stage.left + target.width / 2;
    const endY = target.top - stage.top + target.height / 2;
    // Arc midpoint (rises up then floats over)
    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 60;

    const key = Date.now() + Math.random();
    const flyer: Flyer = { key, emoji: task.emoji, startX, startY, endX, endY, midX, midY, phase: 0 };
    setFlyers((f) => [...f, flyer]);

    // Mark done immediately so the source button shows the check
    setTasks((ts) => ts.map((x) => (x.id === task.id ? { ...x, done: true } : x)));

    // Trigger the arc on next frame
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setFlyers((f) => f.map((fl) => (fl.key === key ? { ...fl, phase: 1 } : fl))),
      ),
    );

    // After animation, drop into collected and remove flyer
    window.setTimeout(() => {
      setCollected((c) => [...c, task.emoji]);
      setPulseRing(true);
      setFlyers((f) => f.filter((fl) => fl.key !== key));
      window.setTimeout(() => setPulseRing(false), 450);
    }, 850);
  };

  // Cleanup safety
  useEffect(() => () => setFlyers([]), []);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div ref={stageRef} className="relative w-full max-w-[400px] aspect-[9/19] rounded-[3rem] neu-surface p-3">
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
                Good morning, Mira
              </p>
              <h1 className="text-2xl font-extrabold text-foreground mt-0.5 leading-tight">
                Upcoming Tasks
              </h1>
            </div>
            <button
              aria-label="Notifications"
              className="w-12 h-12 rounded-2xl neu-surface-sm flex items-center justify-center active:neu-pressed transition-all duration-300 hover:scale-105"
            >
              <Bell className="w-5 h-5 text-primary" strokeWidth={2.2} />
            </button>
          </header>

          {/* Search */}
          <div className="px-6 pb-3">
            <div className="neu-inset rounded-2xl flex items-center gap-3 px-4 py-3">
              <Search className="w-4 h-4 text-muted-foreground" strokeWidth={2.2} />
              <span className="text-sm text-muted-foreground font-medium">
                Search reminders...
              </span>
            </div>
          </div>

          {/* Summary card with collected emojis */}
          <div className="px-6 pb-4">
            <div className="rounded-3xl neu-surface-sm p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">Today's progress</p>
                <p className="text-3xl font-extrabold text-foreground mt-1">
                  {remaining}
                  <span className="text-base text-muted-foreground font-bold"> left ✨</span>
                </p>
                {/* Collected emoji tray */}
                <div className="flex items-center gap-1 mt-2 min-h-[22px] flex-wrap">
                  {collected.length === 0 && (
                    <span className="text-[11px] text-muted-foreground font-semibold">
                      finished tasks land here 🌷
                    </span>
                  )}
                  {collected.map((e, i) => (
                    <span
                      key={`${e}-${i}`}
                      className="text-base inline-block animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>

              <div
                ref={progressRef}
                className={`relative w-16 h-16 shrink-0 rounded-full neu-inset flex items-center justify-center transition-transform duration-500 ${
                  pulseRing ? "scale-110" : "scale-100"
                }`}
              >
                <div
                  className="absolute inset-1 rounded-full transition-all duration-700"
                  style={{
                    background: `conic-gradient(hsl(var(--primary)) ${
                      percent * 3.6
                    }deg, transparent 0)`,
                    opacity: 0.85,
                  }}
                />
                <div className="relative w-10 h-10 rounded-full neu-surface-sm flex items-center justify-center">
                  <span className="text-xs font-extrabold text-foreground">{percent}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Task list */}
          <section className="flex-1 px-6 overflow-y-auto pb-4 space-y-3">
            {tasks.map((task, i) => (
              <article
                key={task.id}
                style={{ animationDelay: `${i * 60}ms` }}
                className="rounded-2xl neu-surface-sm p-3.5 flex items-center gap-3 animate-[fade-in_0.5s_ease-out_both] transition-transform duration-300"
              >
                <button
                  ref={(el) => (buttonRefs.current[task.id] = el)}
                  onClick={() => handleToggle(task)}
                  aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                  className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-lg transition-all duration-300 ${
                    task.done ? "neu-pressed" : "neu-surface-sm active:neu-pressed hover:scale-105"
                  }`}
                >
                  {task.done ? (
                    <Check className="w-5 h-5 text-primary animate-[bounce-in_0.4s_cubic-bezier(0.34,1.56,0.64,1)]" strokeWidth={3} />
                  ) : (
                    <span>{task.emoji}</span>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-bold truncate transition-colors duration-300 ${
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

          {/* Bottom nav */}
          <nav className="mx-5 mb-5 mt-2 rounded-3xl neu-surface-sm px-3 py-2.5 flex items-center justify-between">
            {[
              { id: "home", icon: Bell },
              { id: "calendar", icon: Calendar },
              { id: "add", icon: Plus, primary: true },
              { id: "settings", icon: Settings },
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

        {/* Flying emoji layer */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[3rem]">
          {flyers.map((f) => {
            const x = f.phase === 0 ? f.startX : f.endX;
            const y = f.phase === 0 ? f.startY : f.endY;
            const scale = f.phase === 0 ? 1 : 0.35;
            const rotate = f.phase === 0 ? 0 : 360;
            const opacity = f.phase === 0 ? 1 : 0.9;
            return (
              <span
                key={f.key}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`,
                  transition:
                    "transform 0.85s cubic-bezier(0.5, -0.2, 0.2, 1.4), opacity 0.85s ease-out",
                  opacity,
                  fontSize: "26px",
                  filter: "drop-shadow(0 6px 8px hsl(var(--neu-dark) / 0.5))",
                }}
              >
                {f.emoji}
              </span>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default Index;
