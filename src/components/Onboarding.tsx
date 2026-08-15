import { useRef, useState } from "react";
import { toast } from "sonner";

type SlideKey =
  | "lazy"
  | "monster"
  | "brain"
  | "personal"
  | "survey_age"
  | "survey_goal_rate"
  | "survey_life_goal"
  | "cta";
const INTRO_SLIDES: SlideKey[] = ["lazy", "monster", "brain", "personal"];
const SLIDES: SlideKey[] = [
  ...INTRO_SLIDES,
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
  const isIntro = (INTRO_SLIDES as string[]).includes(current);
  const darkBg = current === "monster";

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
          onNext={next}
        />
      </div>

      {/* Bottom nav */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-6 px-6">
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {(isIntro ? INTRO_SLIDES : SLIDES).map((s, i) => (
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
        {!isLast && !isSurvey && current !== "personal" && (
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
  onNext,
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
  onNext: () => void;
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
      {slide === "lazy" && <LazySlide />}
      {slide === "monster" && <MonsterSlide />}
      {slide === "brain" && <BrainSlide />}
      {slide === "personal" && <PersonalSlide onStart={onNext} />}
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

function LazySlide() {
  return (
    <div
      className="w-full h-full flex flex-col px-6 pt-16 pb-40"
      style={{ background: "linear-gradient(180deg, #FFF8EE 0%, #FFF0D6 100%)" }}
    >
      <style>{`
        @keyframes strike-draw { from { width: 0%; } to { width: 100%; } }
      `}</style>

      {/* Illustration half */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className="relative w-full max-w-[290px] rounded-3xl px-5 pt-7 pb-6 flex flex-col items-center"
          style={{ background: "#FFFFFF", boxShadow: "0 12px 30px rgba(26,18,8,0.08)" }}
        >
          <span
            className="absolute top-3 right-3 rounded-full px-2 py-1 font-extrabold"
            style={{ background: "#E8A325", color: "#1A1208", fontSize: 11 }}
          >
            Stanford Research
          </span>

          {/* Scientist avatar */}
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
            {/* lab coat */}
            <path d="M28 118c0-22 14-34 32-34s32 12 32 34z" fill="#FDFCF8" stroke="#E5DAC6" strokeWidth="2" />
            <path d="M60 84v34" stroke="#E5DAC6" strokeWidth="2" />
            <path d="M52 86l8 10 8-10" fill="#E8A325" opacity="0.9" />
            {/* neck */}
            <rect x="53" y="70" width="14" height="16" rx="6" fill="#E0A874" />
            {/* head */}
            <circle cx="60" cy="48" r="26" fill="#F0BE8C" />
            {/* hair */}
            <path d="M34 44c2-18 14-26 26-26s24 8 26 26c-6-8-14-12-26-12s-20 4-26 12z" fill="#4A3521" />
            {/* glasses */}
            <circle cx="50" cy="49" r="9" fill="#FFFFFF" opacity="0.85" stroke="#1A1208" strokeWidth="2.5" />
            <circle cx="71" cy="49" r="9" fill="#FFFFFF" opacity="0.85" stroke="#1A1208" strokeWidth="2.5" />
            <path d="M59 49h3" stroke="#1A1208" strokeWidth="2.5" />
            {/* eyes */}
            <circle cx="50" cy="49" r="2.6" fill="#1A1208" />
            <circle cx="71" cy="49" r="2.6" fill="#1A1208" />
            {/* smile */}
            <path d="M52 61c3 3.5 13 3.5 16 0" stroke="#1A1208" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>

          {/* Struck-through tags */}
          <div className="mt-4 w-full flex flex-col items-center gap-2.5">
            <StruckTag label="LAZINESS" delay={200} />
            <StruckTag label="UNPRODUCTIVE" delay={700} />
          </div>
        </div>
      </div>

      {/* Text half */}
      <div className="flex flex-col items-center justify-start pt-6">
        <h1
          className="font-extrabold text-center"
          style={{ fontSize: 26, color: "#1A1208", maxWidth: 300, lineHeight: 1.2 }}
        >
          There's no such thing as laziness.
        </h1>
        <p className="text-center mt-3" style={{ fontSize: 13, color: "#B8895A" }}>
          Your brain just never learned the right system.
        </p>
        <p className="text-center mt-4 italic" style={{ fontSize: 11, color: "rgba(184,137,90,0.7)" }}>
          — BJ Fogg, Stanford Behavior Design Lab
        </p>
      </div>
    </div>
  );
}

function StruckTag({ label, delay }: { label: string; delay: number }) {
  return (
    <div
      className="relative rounded-full px-4 py-2"
      style={{ background: "#F4F1EA" }}
    >
      <span className="font-extrabold tracking-wide" style={{ fontSize: 13, color: "#8C8577" }}>
        {label}
      </span>
      <span
        className="absolute left-3 right-3 top-1/2 rounded-full"
        style={{
          height: 3,
          background: "#E85D24",
          transform: "translateY(-50%)",
          animation: `strike-draw 400ms ease-out ${delay}ms both`,
        }}
      />
    </div>
  );
}

function MonsterSlide() {
  return (
    <div
      className="w-full h-full flex flex-col px-6 pt-16 pb-40"
      style={{ background: "linear-gradient(180deg, #1A1208 0%, #2A1D0E 100%)" }}
    >
      <style>{`
        @keyframes egg-beat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes egg-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes egg-blink { 0%, 92%, 100% { opacity: 1; } 95% { opacity: 0; } }
      `}</style>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative" style={{ width: 220, height: 220 }}>
          {/* glow */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, #E8A325 0%, rgba(232,163,37,0) 70%)",
              opacity: 0.3,
              filter: "blur(20px)",
            }}
          />
          {/* orbiting sparkles */}
          <div
            className="absolute inset-0"
            style={{ animation: "egg-orbit 6s linear infinite" }}
          >
            {[0, 90, 180, 270].map((deg) => (
              <span
                key={deg}
                className="absolute rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: "#FFD24D",
                  top: "50%",
                  left: "50%",
                  transform: `rotate(${deg}deg) translateX(100px)`,
                }}
              />
            ))}
          </div>
          {/* egg */}
          <div
            className="absolute left-1/2 top-1/2 flex items-center justify-center"
            style={{
              width: 124,
              height: 160,
              marginLeft: -62,
              marginTop: -80,
              background: "#FFF3DC",
              border: "3px solid #E8A325",
              borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
              animation: "egg-beat 1.8s ease-in-out infinite",
            }}
          >
            <div className="flex gap-5" style={{ marginTop: 14 }}>
              <span
                className="rounded-full"
                style={{ width: 10, height: 10, background: "#1A1208", animation: "egg-blink 3s ease-in-out infinite" }}
              />
              <span
                className="rounded-full"
                style={{ width: 10, height: 10, background: "#1A1208", animation: "egg-blink 3s ease-in-out infinite" }}
              />
            </div>
          </div>
        </div>

        <div
          className="font-extrabold text-center mt-2"
          style={{ fontSize: 14, color: "#E8A325", letterSpacing: "0.25em" }}
        >
          ???
        </div>
      </div>

      <div className="flex flex-col items-center pt-6">
        <h1
          className="font-extrabold text-center"
          style={{ fontSize: 24, color: "#FFF8EE", maxWidth: 280, lineHeight: 1.25 }}
        >
          What if your goals had a face?
        </h1>
        <p className="text-center mt-3" style={{ fontSize: 13, color: "#B8895A" }}>
          Complete tasks → they grow 🌱
        </p>
        <p className="text-center mt-1" style={{ fontSize: 13, color: "#B8895A" }}>
          Miss a day → they get sad 🌧️
        </p>
      </div>
    </div>
  );
}

function BrainSlide() {
  return (
    <div
      className="w-full h-full flex flex-col px-6 pt-14 pb-40"
      style={{ background: "linear-gradient(180deg, #F0F8FF 0%, #FFF8EE 100%)" }}
    >
      <style>{`
        @keyframes zone-in { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* Brain graphic */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <svg width="180" height="140" viewBox="0 0 180 140" aria-hidden="true">
          <path
            d="M52 22c-16 0-28 11-28 24 0 6 2 10 5 14-5 4-7 10-7 16 0 16 15 28 34 28h68c19 0 34-12 34-28 0-6-2-12-7-16 3-4 5-8 5-14 0-13-12-24-28-24-6-8-16-12-28-12s-22 4-28 12z"
            fill="#FFE9C6"
            stroke="#E8A325"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M90 18v86" stroke="#E8A325" strokeWidth="2" opacity="0.35" fill="none" />
          <ellipse cx="56" cy="52" rx="18" ry="13" fill="#E8A325" opacity="0.55" style={{ animation: "zone-in 500ms ease-out 200ms both" }} />
          <ellipse cx="112" cy="46" rx="18" ry="13" fill="#1D9E75" opacity="0.5" style={{ animation: "zone-in 500ms ease-out 400ms both" }} />
          <ellipse cx="88" cy="84" rx="20" ry="13" fill="#E85D24" opacity="0.45" style={{ animation: "zone-in 500ms ease-out 600ms both" }} />
        </svg>

        <div className="flex items-center justify-center gap-4 mt-3">
          <span className="font-bold" style={{ fontSize: 11, color: "#E8A325" }}>Habit stacking</span>
          <span className="font-bold" style={{ fontSize: 11, color: "#1D9E75" }}>Rewards</span>
          <span className="font-bold" style={{ fontSize: 11, color: "#E85D24" }}>Streaks</span>
        </div>

        {/* Stat cards */}
        <div className="flex items-stretch justify-center gap-3 mt-6 w-full max-w-[300px]">
          <StatCard glyph="⛓️" label="Stack" color="#E8A325" />
          <StatCard glyph="⭐" label="Reward" color="#1D9E75" />
          <StatCard glyph="🔥" label="Streak" color="#E85D24" />
        </div>
      </div>

      <div className="flex flex-col items-center pt-6">
        <h1 className="font-extrabold text-center" style={{ fontSize: 24, color: "#1A1208" }}>
          Science, not guilt.
        </h1>
        <p className="text-center mt-3 italic" style={{ fontSize: 13, color: "#B8895A", maxWidth: 280 }}>
          Designed to feel like a game. Built to change your life.
        </p>
      </div>
    </div>
  );
}

function StatCard({ glyph, label, color }: { glyph: string; label: string; color: string }) {
  return (
    <div
      className="flex-1 rounded-2xl flex flex-col items-center justify-center"
      style={{ background: "#FFFFFF", padding: 12, boxShadow: "0 4px 12px rgba(26,18,8,0.06)" }}
    >
      <span style={{ fontSize: 24, lineHeight: 1 }}>{glyph}</span>
      <span className="font-bold mt-2" style={{ fontSize: 11, color }}>{label}</span>
    </div>
  );
}

function PersonalSlide({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="w-full h-full flex flex-col px-6 pt-16 pb-32"
      style={{ background: "linear-gradient(180deg, #FFF8EE 0%, #FFF0D6 100%)" }}
    >
      <style>{`
        @keyframes card-rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cta-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
      `}</style>

      <div className="flex justify-center">
        <span
          className="rounded-full px-3 py-1.5 font-extrabold"
          style={{ background: "#E8A325", color: "#1A1208", fontSize: 11 }}
        >
          Made for you ✨
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-end justify-center gap-3 w-full max-w-[320px]">
          <MonsterCard color="#E8A325" size={60} eyes="dots" name="The Achiever" sub="Driven" delay={0} />
          <MonsterCard color="#1D9E75" size={70} eyes="wide" name="The Explorer" sub="Curious" delay={100} />
          <MonsterCard color="#7F77DD" size={60} eyes="happy" name="The Dreamer" sub="Creative" delay={200} />
        </div>
      </div>

      <div className="flex flex-col items-center pt-2">
        <h1 className="font-extrabold text-center" style={{ fontSize: 22, color: "#1A1208" }}>
          No two Dodis are the same.
        </h1>
        <p className="text-center mt-3" style={{ fontSize: 13, color: "#B8895A", maxWidth: 280 }}>
          Your monster matches your goals and personality.
        </p>

        <button
          onClick={onStart}
          className="w-full max-w-[320px] rounded-2xl py-4 font-extrabold mt-6"
          style={{
            background: "#E8A325",
            color: "#1A1208",
            fontSize: 16,
            animation: "cta-pulse 2s ease-in-out infinite",
          }}
        >
          Start my journey →
        </button>
      </div>
    </div>
  );
}

function MonsterCard({
  color,
  size,
  eyes,
  name,
  sub,
  delay,
}: {
  color: string;
  size: number;
  eyes: "dots" | "wide" | "happy";
  name: string;
  sub: string;
  delay: number;
}) {
  const eyeGap = eyes === "wide" ? 22 : 12;
  return (
    <div
      className="flex-1 rounded-3xl flex flex-col items-center"
      style={{
        background: "#FFFFFF",
        padding: 16,
        border: `2px solid ${color}33`,
        boxShadow: "0 8px 20px rgba(26,18,8,0.06)",
        animation: `card-rise 450ms ease-out ${delay}ms both`,
      }}
    >
      <div
        className="rounded-full relative flex items-start justify-center"
        style={{ width: size, height: size, background: color }}
      >
        <div className="flex" style={{ gap: eyeGap, marginTop: size * 0.28 }}>
          {[0, 1].map((i) =>
            eyes === "happy" ? (
              <span
                key={i}
                style={{
                  width: 12,
                  height: 6,
                  background: "#FFFFFF",
                  borderRadius: "12px 12px 0 0",
                  display: "block",
                }}
              />
            ) : (
              <span
                key={i}
                className="rounded-full flex items-center justify-center"
                style={{ width: 12, height: 12, background: "#FFFFFF" }}
              >
                <span className="rounded-full" style={{ width: 5, height: 5, background: "#1A1208" }} />
              </span>
            )
          )}
        </div>
        <svg
          className="absolute"
          width={size * 0.5}
          height={size * 0.25}
          viewBox="0 0 20 10"
          style={{ bottom: size * 0.18, left: size * 0.25 }}
        >
          <path d="M2 2c3 5 13 5 16 0" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </div>
      <span className="font-bold mt-3 text-center" style={{ fontSize: 11, color }}>{name}</span>
      <span className="text-center" style={{ fontSize: 11, color: "#B8895A" }}>{sub}</span>
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
