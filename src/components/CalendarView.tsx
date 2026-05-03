import { useEffect, useMemo, useRef } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export type CalendarTaskInfo = {
  due: number;
  done: number;
  doneEmojis: string[];
  hasIncomplete: boolean;
};

type Props = {
  byDate: Map<string, CalendarTaskInfo>;
  onSelectDate: (iso: string) => void;
};

const fmt = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const Month = ({
  year,
  month,
  today,
  byDate,
  onSelectDate,
  registerRef,
}: Props & {
  year: number;
  month: number;
  today: Date;
  registerRef: (el: HTMLDivElement | null, isCurrent: boolean) => void;
}) => {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

  return (
    <div
      ref={(el) => registerRef(el, isCurrentMonth)}
      className="mb-6"
    >
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
          const iso = fmt(year, month, d);
          const info = byDate.get(iso);
          const isToday =
            today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

          const pct = info && info.due > 0 ? Math.round((info.done / info.due) * 100) : null;
          // Aesthetic tones aligned with warm-yellow palette
          let tint: { bg: string; fg: string } | null = null;
          if (pct !== null) {
            if (pct >= 70) tint = { bg: "120 40% 82%", fg: "140 35% 25%" }; // soft sage
            else if (pct >= 40) tint = { bg: "30 90% 80%", fg: "25 55% 28%" }; // warm peach
            else tint = { bg: "8 75% 84%", fg: "8 50% 32%" }; // dusty coral
          }

          return (
            <button
              key={i}
              onClick={() => onSelectDate(iso)}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-start p-1 transition-all hover:scale-[1.04] active:scale-95 ${
                isToday ? "neu-surface-sm" : tint ? "" : "neu-inset"
              }`}
              style={
                tint
                  ? {
                      background: `hsl(${tint.bg} / 0.75)`,
                      boxShadow: isToday
                        ? undefined
                        : `inset 1.5px 1.5px 3px hsl(var(--neu-dark) / 0.25), inset -1.5px -1.5px 3px hsl(var(--neu-light) / 0.7)`,
                    }
                  : undefined
              }
            >
              {/* Stickers — random scattered arrangement, behind text */}
              {info && info.doneEmojis.length > 0 && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                  {info.doneEmojis.map((e, k) => {
                    // Deterministic pseudo-random based on date + index
                    const seed = (d * 31 + k * 17 + month * 7) % 100;
                    const seed2 = (d * 13 + k * 23 + month * 11) % 100;
                    const seed3 = (d * 7 + k * 19) % 100;
                    const top = 8 + (seed % 70);
                    const left = 6 + (seed2 % 76);
                    const rot = (seed3 % 50) - 25;
                    return (
                      <span
                        key={k}
                        className="absolute text-[9px] leading-none opacity-70"
                        style={{
                          top: `${top}%`,
                          left: `${left}%`,
                          transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                        }}
                      >
                        {e}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Top: bold date number */}
              <div
                className="relative flex items-center justify-center leading-none w-full"
                style={tint ? { color: `hsl(${tint.fg})` } : undefined}
              >
                <span className="text-[11px] font-extrabold drop-shadow-[0_1px_0_hsl(var(--neu-light))]">
                  {d}
                </span>
              </div>

              {/* Percentage */}
              {pct !== null && (
                <span
                  className="relative text-[8px] font-extrabold leading-none mt-auto mb-0.5 px-1 rounded-full"
                  style={{
                    color: `hsl(${tint!.fg})`,
                    background: `hsl(var(--neu-light) / 0.6)`,
                  }}
                >
                  {pct}%
                </span>
              )}

              {/* Red dot — incomplete due task reminder */}
              {info && info.hasIncomplete && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-destructive" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const CalendarView = ({ byDate, onSelectDate }: Props) => {
  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentMonthRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentMonthRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const target = currentMonthRef.current;
      container.scrollTo({ top: target.offsetTop - container.offsetTop - 8, behavior: "auto" });
    }
  }, []);

  return (
    <section ref={scrollRef} className="flex-1 px-5 overflow-y-auto pb-4">
      <div className="flex items-baseline justify-between px-1 pb-3">
        <h2 className="text-2xl font-extrabold text-foreground">{year}</h2>
        <span className="text-xs font-semibold text-muted-foreground">Tap a date to view 🌿</span>
      </div>

      {Array.from({ length: 12 }, (_, m) => (
        <Month
          key={m}
          year={year}
          month={m}
          today={today}
          byDate={byDate}
          onSelectDate={onSelectDate}
          registerRef={(el, isCurrent) => {
            if (isCurrent) currentMonthRef.current = el;
          }}
        />
      ))}
    </section>
  );
};

export default CalendarView;
