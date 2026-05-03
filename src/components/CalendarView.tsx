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

          return (
            <button
              key={i}
              onClick={() => onSelectDate(iso)}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-start p-1 transition-all hover:scale-[1.04] active:scale-95 ${
                isToday ? "neu-surface-sm" : "neu-inset"
              }`}
            >
              {/* Top row: bold date + completion count */}
              <div className="flex items-center justify-center gap-0.5 leading-none w-full">
                <span className="text-[10px] font-extrabold text-foreground">{d}</span>
                {info && info.done > 0 && (
                  <span className="text-[8px] font-extrabold text-primary">·{info.done}</span>
                )}
              </div>

              {/* Stickers row(s) */}
              {info && info.doneEmojis.length > 0 && (
                <div className="mt-0.5 flex flex-wrap justify-center gap-[1px] leading-none overflow-hidden">
                  {info.doneEmojis.slice(0, 4).map((e, k) => (
                    <span key={k} className="text-[8px]">
                      {e}
                    </span>
                  ))}
                </div>
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
