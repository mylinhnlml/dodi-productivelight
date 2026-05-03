import { useMemo } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

// Deterministic pseudo-random based on date
const seedPct = (y: number, m: number, d: number) => {
  const s = Math.sin(y * 10000 + (m + 1) * 100 + d) * 43758.5453;
  return Math.floor((s - Math.floor(s)) * 100);
};

// Aesthetic peach-aligned tones (HSL) — soft, muted
const tintFor = (pct: number) => {
  if (pct >= 70) return { bg: "140 35% 78%", text: "140 30% 28%" }; // soft sage
  if (pct >= 40) return { bg: "30 80% 75%", text: "24 45% 30%" };  // warm peach
  return { bg: "8 65% 78%", text: "8 40% 32%" };                    // dusty coral
};

const Month = ({ year, month, today }: { year: number; month: number; today: Date }) => {
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
          const pct = seedPct(year, month, d);
          const { bg, text } = tintFor(pct);
          const isToday =
            today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
          return (
            <div
              key={i}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center ${
                isToday ? "neu-surface-sm" : ""
              }`}
              style={{
                background: `hsl(${bg} / 0.65)`,
                boxShadow: isToday
                  ? undefined
                  : `inset 1.5px 1.5px 3px hsl(var(--neu-dark) / 0.25), inset -1.5px -1.5px 3px hsl(var(--neu-light) / 0.7)`,
              }}
            >
              <span
                className="text-[10px] font-extrabold leading-none"
                style={{ color: `hsl(${text})` }}
              >
                {d}
              </span>
              <span
                className="text-[8px] font-bold leading-none mt-0.5 opacity-80"
                style={{ color: `hsl(${text})` }}
              >
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CalendarView = () => {
  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();

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
        <Month key={m} year={year} month={m} today={today} />
      ))}
    </section>
  );
};

export default CalendarView;
