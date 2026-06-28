import { useRef, useState } from "react";
import { toast } from "sonner";

type SlideKey =
  | "hook"
  | "reminders"
  | "vision"
  | "missions"
  | "calendar"
  | "deepwork"
  | "survey_age"
  | "survey_goal_rate"
  | "survey_life_goal"
  | "cta";
const SLIDES: SlideKey[] = [
  "hook",
  "reminders",
  "vision",
  "missions",
  "calendar",
  "deepwork",
  "survey_age",
  "survey_goal_rate",
  "survey_life_goal",
  "cta",
];

type OnboardingProps = { onComplete?: () => void };

type SurveyAnswers = {
  ageRange: string | null;
  goalCompletionRate: string | null;
  lifeGoal: string | null;
  lifeGoalOther: string | null;
};

export default function Onboarding({ onComplete }: OnboardingProps = {}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [completing, setCompleting] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const [surveyAnswers, setSurveyAnswers] = useState<SurveyAnswers>({
    ageRange: null,
    goalCompletionRate: null,
    lifeGoal: null,
    lifeGoalOther: null,
  });
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [lifeGoalOtherText, setLifeGoalOtherText] = useState("");

  const goTo = (next: number, dir: 1 | -1 = 1) => {
    if (next < 0 || next >= SLIDES.length) return;
    setDirection(dir);
    setIndex(next);
  };
  const next = () => goTo(index + 1, 1);
  const prev = () => goTo(index - 1, -1);

  const persist = (updated: SurveyAnswers) => {
    setSurveyAnswers(updated);
    try { localStorage.setItem("dodi.onboardingSurvey", JSON.stringify(updated)); } catch {}
  };

  const handleSelect = (key: keyof SurveyAnswers, value: string) => {
    const updated: SurveyAnswers = {
      ...surveyAnswers,
      [key]: value,
      ...(key === "lifeGoal" ? { lifeGoalOther: null } : {}),
    };
    persist(updated);
    setTimeout(() => next(), 250);
  };

  const handleSelectOther = (text: string) => {
    const updated: SurveyAnswers = {
      ...surveyAnswers,
      lifeGoal: "other",
      lifeGoalOther: text.trim(),
    };
    persist(updated);
    setTimeout(() => next(), 150);
  };

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
    try { localStorage.setItem("dodi.introSeen.v3", "1"); } catch {}
    toast("Welcome to Dodi ☀️ Your gentle journey starts now", {
      position: "top-center",
      duration: 3000,
    });
    onComplete?.();
  };

  const current = SLIDES[index];
  const isLast = current === "cta";
  const isSurvey = current.startsWith("survey_");
  const darkBg = current === "vision" || current === "deepwork";

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{
        background: 'linear-gradient(160deg, #FFF8EE 0%, #FFF3DC 100%)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
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
        <span className="h-11 w-11" />
      </div>

      {/* Slide stage */}
      <div className="relative w-full h-full">
        <SlideContent
          slide={current}
          keyId={`${current}-${index}`}
          direction={direction}
          surveyAnswers={surveyAnswers}
          onSelect={handleSelect}
          showOtherInput={showOtherInput}
          setShowOtherInput={setShowOtherInput}
          lifeGoalOtherText={lifeGoalOtherText}
          setLifeGoalOtherText={setLifeGoalOtherText}
          onSelectOther={handleSelectOther}
        />
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
                  ? (darkBg ? "#FFD24D" : "hsl(45 95% 58%)")
                  : (darkBg ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.18)"),
              }}
            />
          ))}
        </div>
        {!isLast && !isSurvey && (
          <div className="flex justify-end">
            <button
              onClick={next}
              className="h-11 px-4 text-sm font-extrabold"
              style={{ color: darkBg ? "#FFD24D" : "#B45309" }}
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

function SlideContent({
  slide,
  keyId,
  direction,
  surveyAnswers,
  onSelect,
  showOtherInput,
  setShowOtherInput,
  lifeGoalOtherText,
  setLifeGoalOtherText,
  onSelectOther,
}: {
  slide: SlideKey;
  keyId: string;
  direction: 1 | -1;
  surveyAnswers: SurveyAnswers;
  onSelect: (key: keyof SurveyAnswers, value: string) => void;
  showOtherInput: boolean;
  setShowOtherInput: (v: boolean) => void;
  lifeGoalOtherText: string;
  setLifeGoalOtherText: (v: string) => void;
  onSelectOther: (text: string) => void;
}) {
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
      {slide === "deepwork" && <DeepWorkSlide />}
      {slide === "survey_age" && (
        <SurveySlide
          question="How old are you?"
          questionKey="ageRange"
          selected={surveyAnswers.ageRange}
          options={[
            { emoji: "🌱", label: "Under 18", value: "under_18" },
            { emoji: "🌿", label: "18–24", value: "18_24" },
            { emoji: "🌳", label: "25–34", value: "25_34" },
            { emoji: "🌻", label: "35–44", value: "35_44" },
            { emoji: "🌟", label: "45+", value: "45_plus" },
          ]}
          onSelect={onSelect}
        />
      )}
      {slide === "survey_goal_rate" && (
        <SurveySlide
          question="How often do you finish what you set out to do?"
          questionKey="goalCompletionRate"
          selected={surveyAnswers.goalCompletionRate}
          options={[
            { emoji: "😅", label: "Almost none", value: "almost_none" },
            { emoji: "🙂", label: "About half of what I planned", value: "about_half" },
            { emoji: "🔥", label: "Almost everything", value: "almost_everything" },
          ]}
          onSelect={onSelect}
        />
      )}
      {slide === "survey_life_goal" && (
        <SurveySlide
          question="What are you working toward right now?"
          questionKey="lifeGoal"
          selected={surveyAnswers.lifeGoal}
          options={[
            { emoji: "💰", label: "Make more money", value: "make_money" },
            { emoji: "✨", label: "Upgrade my life", value: "upgrade_life" },
            { emoji: "🎯", label: "Train my discipline", value: "discipline" },
            { emoji: "📚", label: "Learn new knowledge", value: "learn" },
            { emoji: "📅", label: "I have an important test/event coming up", value: "important_event" },
          ]}
          onSelect={onSelect}
          otherEnabled
          showOtherInput={showOtherInput}
          setShowOtherInput={setShowOtherInput}
          lifeGoalOtherText={lifeGoalOtherText}
          setLifeGoalOtherText={setLifeGoalOtherText}
          onSelectOther={onSelectOther}
        />
      )}
      {slide === "cta" && <CTASlide />}
    </div>
  );
}

/* ============ Survey ============ */

function SurveySlide({
  question,
  questionKey,
  selected,
  options,
  onSelect,
  otherEnabled,
  showOtherInput,
  setShowOtherInput,
  lifeGoalOtherText,
  setLifeGoalOtherText,
  onSelectOther,
}: {
  question: string;
  questionKey: keyof SurveyAnswers;
  selected: string | null;
  options: { emoji: string; label: string; value: string }[];
  onSelect: (key: keyof SurveyAnswers, value: string) => void;
  otherEnabled?: boolean;
  showOtherInput?: boolean;
  setShowOtherInput?: (v: boolean) => void;
  lifeGoalOtherText?: string;
  setLifeGoalOtherText?: (v: string) => void;
  onSelectOther?: (text: string) => void;
}) {
  return (
    <div
      className="w-full h-full flex flex-col pt-20 pb-40 overflow-y-auto"
      style={{ background: "linear-gradient(160deg, #FFF8EE 0%, #FFF3DC 100%)" }}
    >
      <div className="flex flex-col items-center justify-center flex-1 px-6">
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-2">
          Getting to know you 🌱
        </span>
        <h2 className="text-xl font-extrabold text-foreground text-center mb-6 max-w-[260px]">
          {question}
        </h2>
        <div className="w-full max-w-[300px] flex flex-col gap-2.5">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSelect(questionKey, opt.value)}
              className={`w-full rounded-2xl px-4 py-3.5 text-left transition-all flex items-center gap-3 ${
                selected === opt.value ? "neu-pressed border-2 border-primary" : "neu-surface-sm"
              }`}
            >
              <span className="text-lg">{opt.emoji}</span>
              <span className="text-sm font-bold text-foreground">{opt.label}</span>
            </button>
          ))}
          {otherEnabled && (
            <button
              onClick={() => setShowOtherInput?.(true)}
              className={`w-full rounded-2xl px-4 py-3.5 text-left transition-all flex items-center gap-3 ${
                selected === "other" ? "neu-pressed border-2 border-primary" : "neu-surface-sm"
              }`}
            >
              <span className="text-lg opacity-50">✏️</span>
              <span className="text-sm font-bold text-muted-foreground italic">
                Others — tell us in your own words
              </span>
            </button>
          )}
        </div>
        {otherEnabled && showOtherInput && (
          <div className="w-full max-w-[300px] mt-3 animate-[fade-in_0.25s_ease-out_both]">
            <div className="neu-inset rounded-2xl px-4 py-3">
              <input
                value={lifeGoalOtherText ?? ""}
                onChange={(e) => setLifeGoalOtherText?.(e.target.value.slice(0, 60))}
                placeholder="e.g. Becoming more present with my family"
                autoFocus
                className="w-full text-sm font-bold bg-transparent outline-none placeholder:text-muted-foreground/60 placeholder:font-medium placeholder:italic"
              />
            </div>
            <div className="flex justify-between items-center mt-1 px-1">
              <span className="text-[10px] text-muted-foreground">{(lifeGoalOtherText ?? "").length}/60</span>
            </div>
            <button
              onClick={() => onSelectOther?.(lifeGoalOtherText ?? "")}
              disabled={!(lifeGoalOtherText ?? "").trim()}
              className="w-full mt-3 rounded-2xl py-3 font-extrabold text-sm text-primary-foreground disabled:opacity-40"
              style={{ background: "hsl(var(--primary))" }}
            >
              Continue
            </button>
          </div>
        )}
      </div>
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

function DeepWorkSlide() {
  return (
    <div
      className="w-full h-full flex flex-col px-6 pt-20"
      style={{ background: "linear-gradient(165deg, #1A1208 0%, #2A1D0E 60%, #1F1509 100%)" }}
    >
      <div
        className="flex flex-col items-center justify-center"
        style={{ height: "45%", animation: "onb-dw-in 500ms ease-out both" }}
      >
        <style>{`
          @keyframes onb-dw-in { from{transform:scale(0.92);opacity:0} to{transform:scale(1);opacity:1} }
        `}</style>
        <div className="relative" style={{ width: 130, height: 130 }}>
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "3px solid transparent",
                  borderRight: "3px solid transparent",
                  borderBottom: "6px solid hsl(40,80%,45%)",
                  transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-70px)`,
                }}
              />
            ))}
          </div>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(hsl(40,90%,55%) 180deg, rgba(255,255,255,0.06) 0)`,
              padding: 5,
            }}
          >
            <div className="w-full h-full rounded-full" style={{ background: "#1A1208" }} />
          </div>
          <div
            className="absolute rounded-full flex items-center justify-center"
            style={{
              inset: 14,
              background: "radial-gradient(circle at 35% 35%, #FFD580, #E8A325)",
              boxShadow: "0 0 30px rgba(232,163,37,0.4)",
            }}
          >
            <div className="flex items-center gap-1.5 mt-1">
              <div style={{ width: 12, height: 2.5, borderRadius: 99, background: "#5C3A0E", transform: "rotate(-8deg)" }} />
              <div style={{ width: 12, height: 2.5, borderRadius: 99, background: "#5C3A0E", transform: "rotate(8deg)" }} />
            </div>
            <div className="absolute" style={{ bottom: "32%", width: 16, height: 2, borderRadius: 99, background: "#5C3A0E" }} />
          </div>
        </div>
        <p
          className="mt-4 text-3xl font-extrabold tabular-nums tracking-wider"
          style={{ color: "#FFE9C2" }}
        >
          13:42
        </p>
        <div
          className="mt-3 flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{ background: "hsl(40,90%,55%)" }}
        >
          <span className="text-xs">🧠</span>
          <span className="text-[10px] font-extrabold uppercase tracking-wide" style={{ color: "#1A1208" }}>
            Focus
          </span>
        </div>
      </div>

      <div className="mt-6 px-2">
        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FAEEDA" }}>Step 5</div>
        <h2 className="font-extrabold mt-1 text-white" style={{ fontSize: 22 }}>Lock in when it counts</h2>
        <p className="mt-3 text-white/70" style={{ fontSize: 13, lineHeight: 1.7 }}>
          Flip on Focus mode for a 28-minute deep work session. No distractions — just you, a quiet timer, and a sun that's working as hard as you are ☀️
        </p>
        <p className="mt-3 italic" style={{ fontSize: 11, color: "#FFD24D" }}>
          💡 Find the Focus toggle right on your Reminders screen
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

function CTAFooter({ onStart, loading }: { onStart: () => void; loading: boolean }) {
  return (
    <div className="w-full max-w-xs mx-auto space-y-2.5">
      <button
        onClick={onStart}
        disabled={loading}
        className="w-full rounded-2xl py-4 font-extrabold text-base text-primary-foreground shadow-md transition-transform hover:scale-[1.02] disabled:opacity-60"
        style={{ background: "hsl(var(--primary))" }}
      >
        Start my gentle journey ☀️
      </button>
      <p className="text-center text-[11px] text-stone-500 pt-1">Free to start · No credit card needed</p>
      <p className="text-[11px] font-medium text-muted-foreground text-center px-6 mt-3 pb-6">
        By continuing, you agree to our{" "}
        <a
          href="https://tungsten-robe-8ed.notion.site/Dodi-Privacy-Policy-36f63200016a80ba89cded6d69bf5778?source=copy_link"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-semibold underline"
        >
          Terms & Privacy
        </a>
      </p>
    </div>
  );
}
