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
          // Aesthetic text tones aligned with warm-yellow palette
          let fg: string | null = null;
          if (pct !== null) {
            if (pct >= 70) fg = "140 45% 30%"; // soft sage
            else if (pct >= 40) fg = "25 70% 38%"; // warm peach
            else fg = "8 65% 42%"; // dusty coral
          }

          // Border-hugging positions for stickers (top, right, bottom, left edges)
          const emojis = info?.doneEmojis ?? [];
          // Deterministic pseudo-random spots around perimeter based on iso
          const seed = iso.split("-").reduce((a, c) => a + parseInt(c, 10), 0);
          const positions = emojis.map((_, k) => {
            // distribute around perimeter (0..1 around the square)
            const t = ((k + 1) / (emojis.length + 1) + (seed % 7) * 0.07) % 1;
            const jitter = ((seed + k * 13) % 5) - 2; // -2..2 px
            let top = "auto", left = "auto", right = "auto", bottom = "auto";
            if (t < 0.25) {
              // top edge
              top = `${-2 + jitter}px`;
              left = `${t * 4 * 100}%`;
            } else if (t < 0.5) {
              // right edge
              right = `${-2 + jitter}px`;
              top = `${(t - 0.25) * 4 * 100}%`;
            } else if (t < 0.75) {
              // bottom edge
              bottom = `${-2 + jitter}px`;
              right = `${(t - 0.5) * 4 * 100}%`;
            } else {
              // left edge
              left = `${-2 + jitter}px`;
              bottom = `${(t - 0.75) * 4 * 100}%`;
            }
            return { top, left, right, bottom };
          });

          return (
            <button
              key={i}
              onClick={() => onSelectDate(iso)}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all hover:scale-[1.04] active:scale-95 ${
                isToday ? "neu-surface-sm" : ""
              }`}
            >
              {/* Stickers around the perimeter */}
              {emojis.map((e, k) => (
                <span
                  key={k}
                  className="absolute text-[9px] leading-none -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    top: positions[k].top,
                    left: positions[k].left,
                    right: positions[k].right,
                    bottom: positions[k].bottom,
                  }}
                >
                  {e}
                </span>
              ))}

              {/* Date number */}
              <span
                className="text-[12px] font-extrabold leading-none"
                style={fg ? { color: `hsl(${fg})` } : undefined}
              >
                {d}
              </span>

              {/* Percentage right under date */}
              {pct !== null && (
                <span
                  className="text-[8px] font-bold leading-none mt-0.5 opacity-85"
                  style={{ color: `hsl(${fg})` }}
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
