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

          // Distribute finished-task emojis along the cell border (neat, jittered)
          const emojis = info?.doneEmojis ?? [];
          const seed = iso.split("-").reduce((a, s) => a + parseInt(s, 10), 0);
          const rand = (k: number) => {
            const x = Math.sin(seed * 9301 + k * 49297) * 233280;
            return x - Math.floor(x);
          };
          const perimPos = (t: number) => {
            const p = ((t % 1) + 1) % 1;
            if (p < 0.25) return { left: `${(p / 0.25) * 100}%`, top: `0%` };
            if (p < 0.5) return { left: `100%`, top: `${((p - 0.25) / 0.25) * 100}%` };
            if (p < 0.75) return { left: `${100 - ((p - 0.5) / 0.25) * 100}%`, top: `100%` };
            return { left: `0%`, top: `${100 - ((p - 0.75) / 0.25) * 100}%` };
          };
          const N = emojis.length;

          return (
            <button
              key={i}
              onClick={() => onSelectDate(iso)}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all hover:scale-[1.04] active:scale-95 ${
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
              {/* Border-arranged finished-task icons */}
              {emojis.map((e, k) => {
                const t = (k + 0.5) / N + (rand(k) - 0.5) * (0.7 / N);
                const { left, top } = perimPos(t);
                return (
                  <span
                    key={k}
                    className="absolute text-[9px] leading-none pointer-events-none select-none"
                    style={{
                      left,
                      top,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {e}
                  </span>
                );
              })}

              {/* Date number — centered, no wrapping box */}
              <span
                className="text-[12px] font-extrabold leading-none"
                style={tint ? { color: `hsl(${tint.fg})` } : undefined}
              >
                {d}
              </span>

              {/* Percentage — right under date */}
              {pct !== null && (
                <span
                  className="text-[8px] font-bold leading-none mt-0.5 opacity-85"
                  style={{ color: `hsl(${tint!.fg})` }}
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
