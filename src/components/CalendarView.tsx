import { useMemo } from "react";

// Deterministic pseudo-random for stable percentages per day
const seeded = (n: number) => {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

const getColor = (pct: number | null) => {
  if (pct === null) return "transparent";
  if (pct >= 70) return "hsl(var(--comp-high))";
  if (pct >= 40) return "hsl(var(--comp-mid))";
  return "hsl(var(--comp-low))";
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEK = ["S", "M", "T", "W", "T", "F", "S"];

const today = new Date();
const YEAR = today.getFullYear();

type DayCell = { day: number; pct: number | null; isToday: boolean } | null;

const buildMonth = (year: number, month: number): DayCell[] => {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: DayCell[] = Array(first).fill(null);
  for (let d = 1; d <= days; d++) {
    const dateObj = new Date(year, month, d);
    const isPast = dateObj <= today;
    const isToday =
      d === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();
    const pct = isPast
      ? Math.round(seeded(year * 1000 + month * 40 + d) * 100)
      : null;
    cells.push({ day: d, pct, isToday });
  }
  return cells;
};

const MonthBlock = ({ monthIdx }: { monthIdx: number }) => {
  const cells = useMemo(() => buildMonth(YEAR, monthIdx), [monthIdx]);
  const isCurrent = monthIdx === today.getMonth();

  return (
    <div className="rounded-3xl neu-surface-sm p-4">
      <h3
        className={`text-base font-extrabold mb-3 ${
          isCurrent ? "text-primary" : "text-foreground"
        }`}
      >
        {MONTHS[monthIdx]}
      </h3>
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {WEEK.map((d, i) => (
          <div
            key={i}
            className="text-[9px] font-bold text-muted-foreground text-center"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={i} className="aspect-square" />;
          const color = getColor(c.pct);
          const hasPct = c.pct !== null;
          return (
            <div
              key={i}
              className="aspect-square flex items-center justify-center relative"
            >
              {hasPct && (
                <span
                  className="absolute inset-0.5 rounded-full"
                  style={{
                    background: color,
                    opacity: 0.85,
                    boxShadow: c.isToday
                      ? `0 0 0 1.5px hsl(var(--primary))`
                      : "none",
                  }}
                />
              )}
              {!hasPct && c.isToday && (
                <span className="absolute inset-0.5 rounded-full neu-inset" />
              )}
              <span
                className={`relative text-[10px] font-bold ${
                  hasPct ? "text-foreground/85" : "text-muted-foreground"
                }`}
              >
                {c.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Legend = () => (
  <div className="rounded-2xl neu-inset px-3 py-2 flex items-center justify-around text-[9px] font-bold text-muted-foreground">
    {[
      { c: "hsl(var(--comp-high))", l: "70%+" },
      { c: "hsl(var(--comp-mid))", l: "40-70%" },
      { c: "hsl(var(--comp-low))", l: "<40%" },
    ].map((x) => (
      <div key={x.l} className="flex items-center gap-1.5">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: x.c }}
        />
        <span>{x.l}</span>
      </div>
    ))}
  </div>
);

const CalendarView = () => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="px-6 pt-4 pb-3">
        <p className="text-xs text-muted-foreground font-semibold tracking-wide">
          Your year at a glance
        </p>
        <h1 className="text-2xl font-extrabold text-foreground mt-0.5 leading-tight">
          {YEAR} 🗓️
        </h1>
      </header>

      <div className="px-6 pb-3">
        <Legend />
      </div>

      <section className="flex-1 px-6 overflow-y-auto pb-4 space-y-4">
        {MONTHS.map((_, i) => (
          <MonthBlock key={i} monthIdx={i} />
        ))}
      </section>
    </div>
  );
};

export default CalendarView;
