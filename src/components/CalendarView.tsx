import { useMemo, useState } from "react";
import { Check, Trash2, X } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export type CalTask = {
  id: number;
  title: string;
  time: string;
  emoji: string;
  done: boolean;
  dueDate: string; // YYYY-MM-DD
  priority: 0 | 1 | 2 | 3;
  createdAt: number;
  repeat?: string;
};

type Props = {
  tasks: CalTask[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
};

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Expand a task into all dates it occurs within [startMs, endMs]
const expandTask = (t: CalTask, startMs: number, endMs: number): string[] => {
  const out: string[] = [];
  const base = new Date(t.dueDate);
  const baseMs = base.getTime();
  if (baseMs >= startMs && baseMs <= endMs) out.push(fmt(base));
  if (!t.repeat || t.repeat === "Never") return out;
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
    const ms = next.getTime();
    if (ms > endMs) break;
    if (ms >= startMs) out.push(fmt(new Date(next)));
  }
  return out;
};

const tintFor = (pct: number) => {
  if (pct >= 70) return { bg: "140 35% 78%", text: "140 30% 28%" };
  if (pct >= 40) return { bg: "30 80% 75%", text: "24 45% 30%" };
  return { bg: "8 65% 78%", text: "8 40% 32%" };
};

const Month = ({
  year,
  month,
  today,
  byDate,
  onPick,
}: {
  year: number;
  month: number;
  today: Date;
  byDate: Map<string, { task: CalTask; done: boolean }[]>;
  onPick: (iso: string) => void;
}) => {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  return (
    <div className="mb-6">
      <h3 className="text-base font-extrabold text-foreground px-1 mb-2">
        {MONTHS[month]} <span className="text-muted-foreground font-bold">{year}</span>
      </h3>
      <div className="grid grid-cols-7 gap-1.5 px-0.5 mb-1.5">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-[9px] font-bold text-muted-foreground text-center">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 px-0.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const iso = fmt(new Date(year, month, d));
          const items = byDate.get(iso) ?? [];
          const total = items.length;
          const doneCount = items.filter((x) => x.done).length;
          const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);
          const hasDue = total > 0 && doneCount < total;
          const { bg, text } = tintFor(total === 0 ? -1 : pct);
          const isToday =
            today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
          const stickers = items.filter((x) => x.done).slice(0, 3);
          return (
            <button
              key={i}
              onClick={() => onPick(iso)}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-center overflow-hidden ${
                isToday ? "neu-surface-sm ring-1 ring-primary/40" : ""
              }`}
              style={{
                background: total === 0 ? "transparent" : `hsl(${bg} / 0.65)`,
                boxShadow: isToday
                  ? undefined
                  : `inset 1.5px 1.5px 3px hsl(var(--neu-dark) / 0.25), inset -1.5px -1.5px 3px hsl(var(--neu-light) / 0.7)`,
              }}
            >
              {hasDue && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-destructive" />
              )}
              <span
                className="text-[10px] font-extrabold leading-none"
                style={{ color: total === 0 ? "hsl(var(--muted-foreground))" : `hsl(${text})` }}
              >
                {d}
              </span>
              {total > 0 ? (
                <span
                  className="text-[7px] font-bold leading-none mt-0.5 opacity-80"
                  style={{ color: `hsl(${text})` }}
                >
                  {pct}%
                </span>
              ) : null}
              {stickers.length > 0 && (
                <div className="flex items-center justify-center gap-px mt-0.5">
                  {stickers.map((s, k) => (
                    <span key={k} className="text-[8px] leading-none">
                      {s.task.emoji}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const formatDateLabel = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
};

const PRIORITY_LABELS = ["", "!", "!!", "!!!"];

const DayList = ({
  iso,
  items,
  onClose,
  onToggle,
  onDelete,
}: {
  iso: string;
  items: { task: CalTask; done: boolean }[];
  onClose: () => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}) => {
  const [offsets, setOffsets] = useState<Record<number, number>>({});
  const startSwipe = (e: React.PointerEvent, id: number) => {
    const startX = e.clientX;
    const startOffset = offsets[id] ?? 0;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 5) moved = true;
      const next = Math.max(-96, Math.min(0, startOffset + dx));
      setOffsets((s) => ({ ...s, [id]: next }));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setOffsets((s) => {
        const cur = s[id] ?? 0;
        return { ...s, [id]: cur < -48 ? -88 : 0 };
      });
      if (moved) {
        const swallow = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
          window.removeEventListener("click", swallow, true);
        };
        window.addEventListener("click", swallow, true);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const total = items.length;
  const doneCount = items.filter((x) => x.done).length;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col bg-background rounded-[2.5rem] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <p className="text-xs text-muted-foreground font-semibold tracking-wide">
            {doneCount}/{total} complete · {pct}%
          </p>
          <h2 className="text-xl font-extrabold text-foreground leading-tight">
            {formatDateLabel(iso)}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-10 h-10 rounded-2xl neu-surface-sm flex items-center justify-center active:neu-pressed"
        >
          <X className="w-4 h-4 text-primary" strokeWidth={2.6} />
        </button>
      </div>
      <section className="flex-1 px-5 overflow-y-auto pb-6 space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8 font-semibold">
            No reminders for this day ✨
          </p>
        )}
        {items.map(({ task, done }) => {
          const offset = offsets[task.id] ?? 0;
          return (
            <div key={task.id} className="relative">
              <button
                onClick={() => onDelete(task.id)}
                aria-label="Delete task"
                className="absolute right-0 top-0 bottom-0 w-20 rounded-2xl bg-destructive flex items-center justify-center"
              >
                <Trash2 className="w-5 h-5 text-destructive-foreground" strokeWidth={2.4} />
              </button>
              <article
                onPointerDown={(e) => startSwipe(e, task.id)}
                onClick={() => onToggle(task.id)}
                style={{
                  transform: `translateX(${offset}px)`,
                  transition: "transform 0.2s",
                }}
                className="relative rounded-2xl neu-surface-sm p-3.5 flex items-center gap-3 cursor-pointer touch-pan-y select-none"
              >
                <div
                  className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-lg ${
                    done ? "neu-pressed" : "neu-surface-sm"
                  }`}
                >
                  {done ? (
                    <Check className="w-5 h-5 text-primary" strokeWidth={3} />
                  ) : (
                    <span>{task.emoji}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-bold truncate ${
                      done ? "text-muted-foreground line-through" : "text-foreground"
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
              </article>
            </div>
          );
        })}
      </section>
    </div>
  );
};

const CalendarView = ({ tasks, onToggle, onDelete }: Props) => {
  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const [selected, setSelected] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const start = new Date(year, 0, 1).getTime();
    const end = new Date(year, 11, 31, 23, 59, 59).getTime();
    const map = new Map<string, { task: CalTask; done: boolean }[]>();
    for (const t of tasks) {
      const dates = expandTask(t, start, end);
      for (const iso of dates) {
        const arr = map.get(iso) ?? [];
        arr.push({ task: t, done: t.done });
        map.set(iso, arr);
      }
    }
    return map;
  }, [tasks, year]);

  const selectedItems = selected ? byDate.get(selected) ?? [] : [];

  return (
    <section className="relative flex-1 px-5 overflow-y-auto pb-4">
      <div className="flex items-baseline justify-between px-1 pb-3">
        <h2 className="text-2xl font-extrabold text-foreground">{year}</h2>
        <span className="text-xs font-semibold text-muted-foreground">Daily progress 🌿</span>
      </div>

      {/* Legend */}
      <div className="neu-inset rounded-2xl px-3 py-2 mb-4 flex items-center justify-around text-[10px] font-bold flex-wrap gap-y-1">
        {[
          { label: "<40%", bg: "8 65% 78%", text: "8 40% 32%" },
          { label: "40–70%", bg: "30 80% 75%", text: "24 45% 30%" },
          { label: "70%+", bg: "140 35% 78%", text: "140 30% 28%" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md" style={{ background: `hsl(${l.bg} / 0.85)` }} />
            <span style={{ color: `hsl(${l.text})` }}>{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
          <span className="text-muted-foreground">due</span>
        </div>
      </div>

      {Array.from({ length: 12 }, (_, m) => (
        <Month key={m} year={year} month={m} today={today} byDate={byDate} onPick={setSelected} />
      ))}

      {selected && (
        <DayList
          iso={selected}
          items={selectedItems}
          onClose={() => setSelected(null)}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      )}
    </section>
  );
};

export default CalendarView;
