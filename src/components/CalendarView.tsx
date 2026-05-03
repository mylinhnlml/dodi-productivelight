import { useMemo } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export type CalTask = {
  id: number;
  emoji: string;
  done: boolean;
  date: Date;
};

// Aesthetic peach-aligned tones (HSL) — soft, muted
const tintFor = (pct: number | null) => {
  if (pct === null) return { bg: "30 25% 92%", text: "30 15% 55%" }; // neutral
  if (pct >= 70) return { bg: "140 35% 78%", text: "140 30% 28%" };
  if (pct >= 40) return { bg: "30 80% 75%", text: "24 45% 30%" };
  return { bg: "8 65% 78%", text: "8 40% 32%" };
};

const Month = ({
  year,
  month,
  today,
  tasksByDay,
}: {
  year: number;
  month: number;
  today: Date;
  tasksByDay: Map<string, CalTask[]>;
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
          const key = `${year}-${month}-${d}`;
          const dayTasks = tasksByDay.get(key) ?? [];
          const doneTasks = dayTasks.filter((t) => t.done);
          const pct = dayTasks.length
            ? Math.round((doneTasks.length / dayTasks.length) * 100)
            : null;
          const { bg, text } = tintFor(pct);
          const isToday =
            today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

          // Up to 3 sticker emojis from completed tasks
          const stickers = doneTasks.slice(0, 3).map((t) => t.emoji);

          return (
            <div
              key={i}
              className="aspect-square rounded-2xl flex flex-col items-center justify-center relative overflow-hidden"
              style={{
                background: `hsl(${bg} / 0.7)`,
                boxShadow: isToday
                  ? `2px 2px 5px hsl(var(--neu-dark) / 0.35), -2px -2px 5px hsl(var(--neu-light) / 0.85)`
                  : `inset 1.5px 1.5px 3px hsl(var(--neu-dark) / 0.22), inset -1.5px -1.5px 3px hsl(var(--neu-light) / 0.7)`,
              }}
            >
              <span
                className="text-[10px] font-extrabold leading-none"
                style={{ color: `hsl(${text})` }}
              >
                {d}
              </span>
              {pct !== null ? (
                <span
                  className="text-[8px] font-bold leading-none mt-0.5 opacity-85"
                  style={{ color: `hsl(${text})` }}
                >
                  {pct}%
                </span>
              ) : (
                <span
                  className="text-[8px] font-bold leading-none mt-0.5 opacity-50"
                  style={{ color: `hsl(${text})` }}
                >
                  ·
                </span>
              )}
              {stickers.length > 0 && (
                <div className="flex -space-x-1 mt-0.5">
                  {stickers.map((s, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] leading-none"
                      style={{ transform: `rotate(${(idx - 1) * 8}deg)` }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CalendarView = ({ tasks }: { tasks: CalTask[] }) => {
  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CalTask[]>();
    tasks.forEach((t) => {
      const d = t.date;
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(k) ?? [];
      arr.push(t);
      map.set(k, arr);
    });
    return map;
  }, [tasks]);

  return (
    <section className="flex-1 px-5 overflow-y-auto pb-4">
      <div className="flex items-baseline justify-between px-1 pb-3">
        <h2 className="text-2xl font-extrabold text-foreground">{year}</h2>
        <span className="text-xs font-semibold text-muted-foreground">Daily progress 🌿</span>
      </div>

      {/* Legend */}
      <div className="neu-inset rounded-2xl px-3 py-2 mb-4 flex items-center justify-around text-[10px] font-bold">
        {[
          { label: "<40%", bg: "8 65% 78%", text: "8 40% 32%" },
          { label: "40–70%", bg: "30 80% 75%", text: "24 45% 30%" },
          { label: "70%+", bg: "140 35% 78%", text: "140 30% 28%" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-md"
              style={{ background: `hsl(${l.bg} / 0.85)` }}
            />
            <span style={{ color: `hsl(${l.text})` }}>{l.label}</span>
          </div>
        ))}
      </div>

      {Array.from({ length: 12 }, (_, m) => (
        <Month key={m} year={year} month={m} today={today} tasksByDay={tasksByDay} />
      ))}
    </section>
  );
};

export default CalendarView;
