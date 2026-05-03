import { Bell, Plus, Search, Calendar, Settings, Check } from "lucide-react";
import { useState } from "react";

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

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [active, setActive] = useState("home");

  const toggle = (id: number) =>
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));

  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <main className="min-h-screen flex items-center justify-center p-4 md:p-8">
      {/* Phone frame */}
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

          {/* Summary card */}
          <div className="px-6 pb-4">
            <div className="rounded-3xl neu-surface-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Today's progress</p>
                <p className="text-3xl font-extrabold text-foreground mt-1">
                  {remaining}<span className="text-base text-muted-foreground font-bold"> left ✨</span>
                </p>
              </div>
              <div className="relative w-14 h-14 rounded-full neu-inset flex items-center justify-center">
                <div
                  className="absolute inset-1 rounded-full"
                  style={{
                    background: `conic-gradient(hsl(var(--primary)) ${
                      ((tasks.length - remaining) / tasks.length) * 360
                    }deg, transparent 0)`,
                    opacity: 0.85,
                  }}
                />
                <div className="relative w-9 h-9 rounded-full neu-surface-sm flex items-center justify-center">
                  <span className="text-xs font-extrabold text-foreground">
                    {Math.round(((tasks.length - remaining) / tasks.length) * 100)}%
                  </span>
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

          {/* Bottom nav */}
          <nav className="mx-5 mb-5 mt-2 rounded-3xl neu-surface-sm px-3 py-2.5 flex items-center justify-between">
            {[
              { id: "home", icon: Bell, label: "Today" },
              { id: "calendar", icon: Calendar, label: "Calendar" },
              { id: "add", icon: Plus, label: "Add", primary: true },
              { id: "settings", icon: Settings, label: "Settings" },
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
      </div>
    </main>
  );
};

export default Index;
