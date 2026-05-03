import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

type Props = { todayPct: number };

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

// Deterministic pseudo-random percent per date so it stays stable
const pctFor = (y: number, m: number, d: number) => {
  const seed = (y * 1000 + (m + 1) * 50 + d) * 9301 + 49297;
  return Math.floor(((seed % 233280) / 233280) * 100);
};

const CalendarView = ({ todayPct }: Props) => {
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const { cells, monthLabel } = useMemo(() => {
    const y = view.getFullYear();
    const m = view.getMonth();
    const firstWeekday = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const cells: Array<{ day: number | null; pct: number; isToday: boolean }> = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, pct: 0, isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday =
        d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
      const isFuture =
        new Date(y, m, d).setHours(0, 0, 0, 0) > today.setHours(0, 0, 0, 0);
      const pct = isToday ? todayPct : isFuture ? 0 : pctFor(y, m, d);
      cells.push({ day: d, pct, isToday });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, pct: 0, isToday: false });

    return {
      cells,
      monthLabel: view.toLocaleString("en-US", { month: "long", year: "numeric" }),
    };
  }, [view, todayPct]);

  const shift = (delta: number) =>
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));

  return (
    <div className="px-6 pb-4 flex-1 overflow-y-auto">
      <div className="rounded-3xl neu-surface-sm p-5">
        {/* Month header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="w-9 h-9 rounded-2xl neu-surface-sm flex items-center justify-center active:neu-pressed transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-primary" strokeWidth={2.4} />
          </button>
          <h2 className="text-base font-extrabold text-foreground tracking-wide">
            {monthLabel}
          </h2>
          <button
            onClick={() => shift(1)}
            aria-label="Next month"
            className="w-9 h-9 rounded-2xl neu-surface-sm flex items-center justify-center active:neu-pressed transition-all"
          >
            <ChevronRight className="w-4 h-4 text-primary" strokeWidth={2.4} />
          </button>
        </div>

        {/* Weekday row */}
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {WEEKDAYS.map((w, i) => (
            <div
              key={i}
              className="text-[10px] font-bold text-muted-foreground text-center py-1"
            >
              {w}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((c, i) =>
            c.day === null ? (
              <div key={i} className="aspect-square" />
            ) : (
              <div
                key={i}
                className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${
                  c.isToday ? "neu-pressed" : "neu-surface-sm"
                }`}
              >
                {/* Progress ring */}
                <div
                  className="absolute inset-1 rounded-[1rem]"
                  style={{
                    background: `conic-gradient(hsl(var(--primary) / 0.55) ${
                      (c.pct / 100) * 360
                    }deg, transparent 0)`,
                    WebkitMask:
                      "radial-gradient(circle, transparent 58%, black 60%)",
                    mask: "radial-gradient(circle, transparent 58%, black 60%)",
                    opacity: c.pct > 0 ? 1 : 0,
                  }}
                />
                <span
                  className={`relative text-[11px] font-extrabold leading-none ${
                    c.isToday ? "text-primary" : "text-foreground"
                  }`}
                >
                  {c.day}
                </span>
                <span className="relative text-[8px] font-bold text-muted-foreground mt-0.5 leading-none">
                  {c.pct}%
                </span>
              </div>
            )
          )}
        </div>

        {/* Legend */}
        <div className="mt-5 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full neu-pressed" />
            <span className="text-[10px] font-bold text-muted-foreground">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: "hsl(var(--primary) / 0.55)" }}
            />
            <span className="text-[10px] font-bold text-muted-foreground">
              Daily progress
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
