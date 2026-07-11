import { useEffect, useRef, useState } from "react";

export interface Rainfall {
  id: string;
  emoji: string;
  startX: number;
  createdAt: number;
}

interface Particle {
  id: number;
  x: number;
  size: number;
  drift: number;
  spin: number;
  duration: number;
}

interface EmojiRainProps {
  rainfall: Rainfall;
}

export const EmojiRain = ({ rainfall }: EmojiRainProps) => {
  const [particles] = useState<Particle[]>(() => {
    const count = 8 + Math.floor(Math.random() * 5); // 8-12
    const w = typeof window !== "undefined" ? window.innerWidth : 375;
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: Math.random() * w,
      size: 16 + Math.random() * 8,
      drift: -20 + Math.random() * 40,
      spin: -180 + Math.random() * 360,
      duration: 600 + Math.random() * 300,
    }));
  });

  const heroStartX = rainfall.startX;
  const [heroPos, setHeroPos] = useState<{ x: number; y: number } | null>(null);
  const heroRef = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  // On hero animation end, freeze position for dragging
  const onHeroEnd = () => {
    const y = (typeof window !== "undefined" ? window.innerHeight : 800) - 120;
    setHeroPos({ x: heroStartX - 16, y });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!heroPos) return;
    dragging.current = true;
    offset.current = { x: e.clientX - heroPos.x, y: e.clientY - heroPos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !heroPos) return;
    setHeroPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 150, overflow: "hidden" }}
      aria-hidden
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute select-none"
          style={{
            left: p.x,
            top: -20,
            fontSize: p.size,
            animation: `emoji-fall ${p.duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
            ["--drift" as any]: `${p.drift}px`,
            ["--spin" as any]: `${p.spin}deg`,
            willChange: "transform, opacity",
          }}
        >
          {rainfall.emoji}
        </span>
      ))}

      {/* Hero emoji */}
      {heroPos === null ? (
        <span
          ref={heroRef}
          onAnimationEnd={onHeroEnd}
          className="absolute select-none"
          style={{
            left: heroStartX - 16,
            top: -20,
            fontSize: 32,
            animation: `hero-fall 850ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
            willChange: "transform",
          }}
        >
          {rainfall.emoji}
        </span>
      ) : (
        <span
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: "fixed",
            left: heroPos.x,
            top: heroPos.y,
            fontSize: 32,
            cursor: "grab",
            zIndex: 160,
            userSelect: "none",
            touchAction: "none",
            pointerEvents: "auto",
            filter: "drop-shadow(2px 2px 3px rgba(0,0,0,0.3))",
          }}
        >
          {rainfall.emoji}
        </span>
      )}
    </div>
  );
};
