import { useState } from "react";

const SESSION = 28 * 60;

type Props = {
  remaining: number;
  running: boolean;
  setRemaining: (n: number | ((s: number) => number)) => void;
  setRunning: (b: boolean) => void;
  showCompleteSheet: boolean;
  setShowCompleteSheet: (b: boolean) => void;
  onExit: () => void;
};

export default function DeepWorkMode({
  remaining,
  running,
  setRemaining,
  setRunning,
  showCompleteSheet,
  setShowCompleteSheet,
  onExit,
}: Props) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleExitTap = () => {
    if (remaining > 0 && remaining < SESSION) setShowExitConfirm(true);
    else onExit();
  };

  const ringDeg = (remaining / SESSION) * 360;
  const isCelebrating = showCompleteSheet;

  return (
    <div
      className="flex-1 mx-3 mb-3 flex flex-col items-center justify-center px-6 py-8 rounded-[2rem] relative overflow-hidden"
      style={{ background: "linear-gradient(165deg, #1A1208 0%, #2A1D0E 60%, #1F1509 100%)" }}
    >
      <style>{`
        @keyframes dw-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
        @keyframes dw-celebrate { 0%{transform:scale(1)} 50%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes dw-particle { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--dx),var(--dy)) scale(0.4);opacity:0} }
        @keyframes slide-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>

      <button
        onClick={handleExitTap}
        className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center z-10"
        style={{ background: "rgba(255,255,255,0.06)", color: "#B8895A" }}
        aria-label="Exit focus mode"
      >
        <span className="text-lg leading-none">×</span>
      </button>

      {/* Sun mascot + ring */}
      <div
        className="relative"
        style={{
          width: 160,
          height: 160,
          animation: isCelebrating
            ? "dw-celebrate 600ms ease-out"
            : running
            ? "dw-breathe 4s ease-in-out infinite"
            : "none",
          opacity: running || isCelebrating ? 1 : 0.7,
        }}
      >
        {/* Rays */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2"
              style={{
                width: 0,
                height: 0,
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderBottom: "8px solid hsl(40,80%,45%)",
                transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-86px)`,
              }}
            />
          ))}
        </div>

        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(hsl(40,90%,55%) ${ringDeg}deg, rgba(255,255,255,0.06) 0)`,
            padding: 6,
          }}
        >
          <div className="w-full h-full rounded-full" style={{ background: "#1A1208" }} />
        </div>

        {/* Inner sun face */}
        <div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            inset: 16,
            background: "radial-gradient(circle at 35% 35%, #FFD580, #E8A325)",
            boxShadow: "0 0 40px rgba(232,163,37,0.35)",
          }}
        >
          <div className="flex items-center gap-2 mt-1">
            <div
              style={{
                width: 14,
                height: 3,
                borderRadius: 99,
                background: "#5C3A0E",
                transform: "rotate(-8deg)",
              }}
            />
            <div
              style={{
                width: 14,
                height: 3,
                borderRadius: 99,
                background: "#5C3A0E",
                transform: "rotate(8deg)",
              }}
            />
          </div>
          <div
            className="absolute"
            style={{
              bottom: "32%",
              width: 18,
              height: 2,
              borderRadius: 99,
              background: "#5C3A0E",
            }}
          />
        </div>

        {/* Particles on celebrate */}
        {isCelebrating &&
          Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const dx = Math.cos(angle) * 80;
            const dy = Math.sin(angle) * 80;
            return (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 text-lg pointer-events-none"
                style={{
                  ["--dx" as any]: `${dx}px`,
                  ["--dy" as any]: `${dy}px`,
                  animation: "dw-particle 1.5s ease-out forwards",
                }}
              >
                ✨
              </span>
            );
          })}
      </div>

      {/* Timer text */}
      <div className="mt-6 text-center">
        <p
          className="text-5xl font-extrabold tabular-nums tracking-wider"
          style={{ color: "#FFE9C2" }}
        >
          {String(Math.floor(remaining / 60)).padStart(2, "0")}:
          {String(remaining % 60).padStart(2, "0")}
        </p>
        <p
          className="text-xs font-bold uppercase tracking-widest mt-1"
          style={{ color: "#B8895A" }}
        >
          {running ? "Locked in ✨" : remaining === SESSION ? "Ready to focus" : "Paused"}
        </p>
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center gap-3">
        {remaining === SESSION ? (
          <button
            onClick={() => setRunning(true)}
            className="rounded-2xl px-6 py-3 font-extrabold text-sm"
            style={{ background: "hsl(40,90%,55%)", color: "#1A1208" }}
          >
            Start focus session
          </button>
        ) : (
          <>
            <button
              onClick={() => setRunning(!running)}
              className="rounded-2xl px-6 py-3 font-extrabold text-sm border"
              style={{ borderColor: "rgba(255,233,194,0.3)", color: "#FFE9C2" }}
            >
              {running ? "Pause" : "Resume"}
            </button>
            <button
              onClick={() => {
                setRunning(false);
                setRemaining(SESSION);
              }}
              className="text-xs font-bold"
              style={{ color: "#B8895A" }}
            >
              Reset
            </button>
          </>
        )}
      </div>

      {/* Exit confirm sheet */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowExitConfirm(false)}
          />
          <div
            className="relative w-full max-w-[400px] rounded-t-3xl p-6 pb-8"
            style={{
              background: "#241808",
              animation: "slide-up 0.28s cubic-bezier(0.32,0.72,0,1) both",
            }}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-4"
              style={{ background: "rgba(255,255,255,0.15)" }}
            />
            <div className="text-center text-3xl mb-2">🌙</div>
            <h3
              className="text-center font-extrabold text-base mb-1"
              style={{ color: "#FFE9C2" }}
            >
              Leaving already?
            </h3>
            <p
              className="text-center text-xs leading-relaxed mb-6"
              style={{ color: "#B8895A" }}
            >
              You've got {Math.ceil(remaining / 60)} minutes left. Your focus is
              building momentum — but it's okay if you need to go. Dodi will save
              your progress either way ☀️
            </p>
            <button
              onClick={() => {
                setRunning(false);
                setShowExitConfirm(false);
                onExit();
              }}
              className="w-full rounded-2xl py-3 font-extrabold text-sm mb-2"
              style={{ background: "rgba(255,233,194,0.12)", color: "#FFE9C2" }}
            >
              Yes, exit focus mode
            </button>
            <button
              onClick={() => setShowExitConfirm(false)}
              className="w-full rounded-2xl py-3 font-extrabold text-sm"
              style={{ background: "hsl(40,90%,55%)", color: "#1A1208" }}
            >
              Stay focused 🔥
            </button>
          </div>
        </div>
      )}

      {/* Completion celebration sheet */}
      {showCompleteSheet && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full max-w-[400px] rounded-t-3xl p-6 pb-8"
            style={{
              background: "#241808",
              animation: "slide-up 0.28s cubic-bezier(0.32,0.72,0,1) both",
            }}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-4"
              style={{ background: "rgba(255,255,255,0.15)" }}
            />
            <div
              className="text-center text-4xl mb-2"
              style={{ animation: "bounce-in 0.5s ease-out both" }}
            >
              🎉
            </div>
            <h3
              className="text-center font-extrabold text-lg mb-1"
              style={{ color: "#FFE9C2" }}
            >
              You did it!
            </h3>
            <p
              className="text-center text-xs leading-relaxed mb-6"
              style={{ color: "#B8895A" }}
            >
              28 minutes of deep focus, done ☀️ +15 XP earned. However you choose
              to spend the next minute — you've already won.
            </p>
            <button
              onClick={() => {
                setRemaining(SESSION);
                setRunning(true);
                setShowCompleteSheet(false);
              }}
              className="w-full rounded-2xl py-3 font-extrabold text-sm mb-2"
              style={{ background: "hsl(40,90%,55%)", color: "#1A1208" }}
            >
              Continue deep work
            </button>
            <button
              onClick={() => {
                setRemaining(SESSION);
                setShowCompleteSheet(false);
                onExit();
              }}
              className="w-full rounded-2xl py-3 font-extrabold text-sm"
              style={{ background: "rgba(255,233,194,0.12)", color: "#FFE9C2" }}
            >
              Back to homepage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
