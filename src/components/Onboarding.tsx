import { useRef, useState } from "react";
import { toast } from "sonner";

type SlideKey = "hook" | "reminders" | "vision" | "missions" | "calendar" | "cta";
const SLIDES: SlideKey[] = ["hook", "reminders", "vision", "missions", "calendar", "cta"];

type OnboardingProps = { onComplete?: () => void };


export default function Onboarding({ onComplete }: OnboardingProps = {}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [completing, setCompleting] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const goTo = (next: number, dir: 1 | -1 = 1) => {
    if (next < 0 || next >= SLIDES.length) return;
    setDirection(dir);
    setIndex(next);
  };
  const next = () => goTo(index + 1, 1);
  const prev = () => goTo(index - 1, -1);
  const skip = () => goTo(SLIDES.length - 1, 1);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const onTouchEnd = () => {
    const dx = touchDeltaX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) next();
    else prev();
  };

  const finish = () => {
    if (completing) return;
    setCompleting(true);
    try { localStorage.setItem("dodi.introSeen.v2", "1"); } catch {}
    toast("Welcome to Dodi ☀️ Your gentle journey starts now", {
      position: "top-center",
      duration: 3000,
    });
    onComplete?.();
  };


  const current = SLIDES[index];
  const isLast = current === "cta";

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Top chrome */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-4">
        {index > 0 && !isLast ? (
          <button
            onClick={prev}
            className="h-11 w-11 flex items-center justify-center text-xl text-stone-500 font-bold"
            aria-label="Back"
          >
            ‹
          </button>
        ) : <span className="h-11 w-11" />}
        {!isLast ? (
          <button
            onClick={skip}
            className="h-11 px-3 flex items-center text-xs text-stone-500 font-semibold"
          >
            Skip
          </button>
        ) : <span className="h-11 w-11" />}
      </div>

      {/* Slide stage */}
      <div className="relative w-full h-full">
        <SlideContent slide={current} keyId={`${current}-${index}`} direction={direction} />
      </div>

      {/* Bottom nav */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-6 px-6">
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {SLIDES.map((s, i) => (
            <span
              key={s}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{
                width: i === index ? 20 : 6,
                background: i === index
                  ? (current === "vision" ? "#FFD24D" : "hsl(45 95% 58%)")
                  : (current === "vision" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.18)"),
              }}
            />
          ))}
        </div>
        {!isLast && (
          <div className="flex justify-end">
            <button
              onClick={next}
              className="h-11 px-4 text-sm font-extrabold"
              style={{ color: current === "vision" ? "#FFD24D" : "#B45309" }}
            >
              Next →
            </button>
          </div>
        )}
        {isLast && (
          <CTAFooter onStart={finish} loading={completing} />
        )}
      </div>
    </div>
  );
}

function SlideContent({ slide, keyId, direction }: { slide: SlideKey; keyId: string; direction: 1 | -1 }) {
  const enterAnim = direction === 1 ? "slide-from-right" : "slide-from-left";
  return (
    <div key={keyId} className={`absolute inset-0 ${enterAnim}`}>
      <style>{`
        @keyframes onb-from-right { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes onb-from-left { from { transform: translateX(-40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .slide-from-right { animation: onb-from-right 350ms ease-in-out both; }
        .slide-from-left { animation: onb-from-left 350ms ease-in-out both; }
      `}</style>
      {slide === "hook" && <HookSlide />}
      {slide === "reminders" && <RemindersSlide />}
      {slide === "vision" && <VisionSlide />}
      {slide === "missions" && <MissionsSlide />}
      {slide === "calendar" && <CalendarSlide />}
      {slide === "cta" && <CTASlide />}
    </div>
  );
}

/* ============ Slides ============ */

function HookSlide() {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(160deg, #FFF8EE 0%, #FFF3DC 100%)" }}
    >
      <div className="text-[80px] leading-none" style={{ animation: "float-gentle 3s ease-in-out infinite" }}>
        ☀️
      </div>
      <h1
        className="font-extrabold text-center mt-8"
        style={{ fontSize: 26, color: "#1A1A1A", maxWidth: 280, animation: "slide-up-fade 600ms ease-out 400ms both" }}
      >
        Your softest, most productive life starts here.
      </h1>
      <p
        className="text-center mt-4"
        style={{ fontSize: 14, color: "#888780", lineHeight: 1.7, maxWidth: 260, animation: "slide-up-fade 600ms ease-out 700ms both" }}
      >
        Dodi is your gentle companion — helping you remember what matters, celebrate what you finish, and dream about what's coming.
      </p>
      <div
        className="rounded-full px-3 py-1 mt-6 font-semibold"
        style={{ background: "#FAEEDA", color: "#633806", fontSize: 11, animation: "slide-up-fade 600ms ease-out 1000ms both" }}
      >
        Used by 10,000+ gentle planners 🌸
      </div>
    </div>
  );
}

function RemindersSlide() {
  return (
    <div
      className="w-full h-full flex flex-col px-6 pt-20"
      style={{ background: "linear-gradient(160deg, #FFF8EE 0%, #FFF3DC 100%)" }}
    >
      <div className="relative flex items-center justify-center" style={{ height: "45%" }}>
        <div
          className="absolute text-2xl"
          style={{ top: "10%", left: "12%", animation: "float-gentle 2.5s ease-in-out infinite" }}
        >🌸</div>
        <div
          className="absolute text-2xl"
          style={{ top: "8%", right: "14%", animation: "float-gentle 3s ease-in-out infinite" }}
        >⭐</div>
        <div
          className="absolute text-2xl"
          style={{ bottom: "10%", right: "12%", animation: "float-gentle 3.5s ease-in-out infinite" }}
        >✨</div>

        <div
          className="rounded-2xl bg-white shadow-lg p-4"
          style={{ width: 200, animation: "slide-up-fade 500ms ease-out both" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: "#FAEEDA" }}>🌿</div>
            <div className="flex-1">
              <div className="font-extrabold text-sm text-stone-800">Evening walk</div>
              <div className="text-[11px] text-stone-500">7:00 PM</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "#FAEEDA", color: "#633806" }}>Low</span>
            <span className="text-[10px] text-stone-500">🔁 Every Day</span>
          </div>
        </div>
      </div>

      <div className="mt-6 px-2">
        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#B45309" }}>Step 1</div>
        <h2 className="font-extrabold mt-1" style={{ fontSize: 22, color: "#1A1A1A" }}>Plant your daily intentions</h2>
        <p className="mt-3" style={{ fontSize: 13, color: "#888780", lineHeight: 1.7 }}>
          Add reminders for anything — morning routines, habits, self-care, goals. Pick a cute sticker, set the time, and let Dodi remind you gently.
        </p>
        <p className="mt-3 italic" style={{ fontSize: 11, color: "#B45309" }}>
          💡 Tip: Use repeat for habits you're building daily
        </p>
      </div>
    </div>
  );
}

function VisionSlide() {
  const tiles = [
    "linear-gradient(135deg, #FFB347, #FF6B6B)",
    "linear-gradient(135deg, #A8E6CF, #3D9970)",
    "linear-gradient(135deg, #DDA0DD, #9B59B6)",
    "linear-gradient(135deg, #87CEEB, #3498DB)",
  ];
  return (
    <div
      className="w-full h-full flex flex-col px-6 pt-20"
      style={{ background: "linear-gradient(160deg, #1A1208 0%, #2D1F0A 100%)" }}
    >
      <div className="relative flex items-center justify-center" style={{ height: "50%" }}>
        <div
          className="relative grid grid-cols-2 gap-3"
          style={{ animation: "bounce-in 600ms ease-out both" }}
        >
          {tiles.map((bg, i) => (
            <div
              key={i}
              className="rounded-2xl"
              style={{ width: 85, height: 85, background: bg, boxShadow: "inset 0 0 20px rgba(255,255,255,0.15)" }}
            />
          ))}
          <div
            className="absolute inset-0 flex items-center justify-center text-white font-extrabold"
            style={{ fontSize: 15, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
          >
            Soft days, real wins ✨
          </div>
        </div>
      </div>

      <div className="mt-6 px-2">
        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FFD24D" }}>Step 2</div>
        <h2 className="font-extrabold mt-1 text-white" style={{ fontSize: 22 }}>See your dreams every day</h2>
        <p className="mt-3 text-white/70" style={{ fontSize: 13, lineHeight: 1.7 }}>
          Add photos of your goals — travel, health, home, love. Your Vision Board reminds you why you're showing up each day.
        </p>
        <p className="mt-3 italic" style={{ fontSize: 11, color: "#FFD24D" }}>
          💡 Your vision + daily reminders = unstoppable
        </p>
      </div>
    </div>
  );
}

function MissionsSlide() {
  const stickers = ["🌻", "🌈", "👑", "🦋", "💫"];
  return (
    <div
      className="w-full h-full flex flex-col px-6 pt-20"
      style={{ background: "linear-gradient(160deg, #F5F3FF 0%, #EDE9FE 100%)" }}
    >
      <div className="flex flex-col items-center justify-center" style={{ height: "45%" }}>
        <div className="flex items-end gap-2">
          <MissionCard icon="🌱" label="First step" xp="+20 XP" />
          <MissionCard icon="🔥" label="3-day streak" xp="+50 XP" elevated />
          <MissionCard icon="💎" label="30-day legend" xp="+300 XP" locked />
        </div>
        <div className="flex gap-2 mt-6">
          {stickers.map((s, i) => (
            <span
              key={s}
              className="text-[28px] leading-none"
              style={{ animation: `bounce-in 500ms ease-out ${i * 100}ms both` }}
            >{s}</span>
          ))}
        </div>
      </div>

      <div className="mt-6 px-2">
        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#7F77DD" }}>Step 3</div>
        <h2 className="font-extrabold mt-1" style={{ fontSize: 22, color: "#1A1A1A" }}>Earn stickers by showing up</h2>
        <p className="mt-3" style={{ fontSize: 13, color: "#888780", lineHeight: 1.7 }}>
          Complete missions to unlock exclusive stickers for your reminders. The more consistent you are, the more beautiful your app becomes.
        </p>
        <p className="mt-3 italic" style={{ fontSize: 11, color: "#7F77DD" }}>
          💡 Your stickers are proof of your progress
        </p>
      </div>
    </div>
  );
}

function MissionCard({ icon, label, xp, elevated, locked }: { icon: string; label: string; xp: string; elevated?: boolean; locked?: boolean }) {
  return (
    <div
      className="relative rounded-2xl bg-white shadow-sm p-3 flex flex-col items-center"
      style={{ width: 100, transform: elevated ? "translateY(-8px)" : undefined, opacity: locked ? 0.55 : 1 }}
    >
      <div className="text-2xl">{icon}</div>
      <div className="text-[11px] font-extrabold text-center mt-1 text-stone-800">{label}</div>
      <div className="rounded-full px-2 py-0.5 text-[10px] font-bold mt-2" style={{ background: "#FAEEDA", color: "#633806" }}>{xp}</div>
      {locked && (
        <div className="absolute top-1 right-1 text-xs">🔒</div>
      )}
    </div>
  );
}

function CalendarSlide() {
  const cells: Array<{ pct?: string; dot?: boolean; today?: boolean }> = [
    {}, {}, { pct: "100%" }, {}, { dot: true }, {}, {},
    {}, { pct: "80%" }, {}, { dot: true }, {}, {}, { pct: "100%" },
    {}, {}, { pct: "60%" }, {}, { today: true }, {}, {},
  ];
  return (
    <div
      className="w-full h-full flex flex-col px-6 pt-20"
      style={{ background: "linear-gradient(160deg, #FFF8EE 0%, #FFF3DC 100%)" }}
    >
      <div className="flex items-center justify-center" style={{ height: "45%" }}>
        <div
          className="rounded-2xl bg-white shadow-md p-4"
          style={{ width: 220, animation: "onb-from-right 500ms ease-out both" }}
        >
          <div className="font-extrabold text-sm text-stone-800 mb-2">May 2026</div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => (
              <div
                key={i}
                className="aspect-square rounded-md flex items-center justify-center relative"
                style={{
                  background: c.pct ? "#FAEEDA" : "#F5F0E6",
                  outline: c.today ? "2px solid hsl(45 95% 58%)" : undefined,
                  boxShadow: c.today ? "0 0 10px hsl(45 95% 58% / 0.6)" : undefined,
                }}
              >
                {c.pct && <span className="text-[8px] font-bold" style={{ color: "#633806" }}>{c.pct}</span>}
                {c.dot && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 px-2">
        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#1D9E75" }}>Step 4</div>
        <h2 className="font-extrabold mt-1" style={{ fontSize: 22, color: "#1A1A1A" }}>Watch your consistency bloom</h2>
        <p className="mt-3" style={{ fontSize: 13, color: "#888780", lineHeight: 1.7 }}>
          Your calendar fills with color as you complete each day. See your streaks, your wins, and how far you've come — one gentle day at a time.
        </p>
        <p className="mt-3 italic" style={{ fontSize: 11, color: "#1D9E75" }}>
          💡 Even 60% is a win. Progress over perfection.
        </p>
      </div>
    </div>
  );
}

function CTASlide() {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center px-6 pb-64"
      style={{ background: "linear-gradient(160deg, #FFF3DC 0%, #FFE4A0 100%)" }}
    >
      <div className="text-[72px] leading-none" style={{ animation: "pulse-soft 2.5s ease-in-out infinite" }}>☀️</div>
      <h1 className="font-extrabold text-center mt-6" style={{ fontSize: 24, color: "#1A1A1A", maxWidth: 260 }}>
        Ready to start your softest era?
      </h1>
      <p className="text-center mt-3" style={{ fontSize: 13, color: "#888780", maxWidth: 250, lineHeight: 1.7 }}>
        Thousands of people are already using Dodi to build gentle habits, dream bigger, and celebrate every small win.
      </p>
      <div className="flex gap-2 mt-5 flex-wrap justify-center">
        {["🌸 Gentle habits", "✨ Daily wins", "🌈 Dream bigger"].map((c) => (
          <span key={c} className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "#FAEEDA", color: "#633806" }}>{c}</span>
        ))}
      </div>
    </div>
  );
}

function CTAFooter({ signIn, loading }: { signIn: (p: "google" | "apple") => void; loading: "google" | "apple" | null }) {
  return (
    <div className="w-full max-w-xs mx-auto space-y-2.5">
      <button
        onClick={() => signIn("google")}
        disabled={loading !== null}
        className="w-full rounded-2xl py-4 font-extrabold text-base text-primary-foreground shadow-md transition-transform hover:scale-[1.02] disabled:opacity-60"
        style={{ background: "hsl(var(--primary))" }}
      >
        Start my gentle journey ☀️
      </button>
      <button
        onClick={() => signIn("google")}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 bg-white border border-stone-200 hover:bg-stone-50 disabled:opacity-60 text-stone-800 font-medium py-3 rounded-2xl shadow-sm transition text-sm"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
        </svg>
        {loading === "google" ? "Signing in…" : "Continue with Google"}
      </button>
      <button
        onClick={() => signIn("apple")}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 bg-black hover:bg-stone-900 disabled:opacity-60 text-white font-medium py-3 rounded-2xl shadow-sm transition text-sm"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
        {loading === "apple" ? "Signing in…" : "Continue with Apple"}
      </button>
      <p className="text-center text-[11px] text-stone-500 pt-1">Free to start · No credit card needed</p>
    </div>
  );
}
