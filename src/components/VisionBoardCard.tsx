import { useEffect, useState } from "react";
import { visionSignedUrl } from "@/lib/visionImages";

interface Props {
  images: string[];
  quote: string;
  onOpen: () => void;
}

export default function VisionBoardCard({ images, quote, onOpen }: Props) {
  const first = images[0];
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!first) { setSrc(null); return; }
    visionSignedUrl(first).then((u) => { if (!cancelled) setSrc(u); });
    return () => { cancelled = true; };
  }, [first]);

  if (!first) {
    return (
      <button
        onClick={onOpen}
        className="w-full h-[200px] rounded-3xl neu-inset border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2"
      >
        <span className="text-4xl">🌅</span>
        <span className="text-xs font-bold text-muted-foreground">Add your first vision</span>
      </button>
    );
  }
  return (
    <button
      onClick={onOpen}
      className="relative w-full h-[200px] rounded-3xl overflow-hidden block text-left"
    >
      {src && <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)" }}
      />
      <div className="absolute left-4 right-4 bottom-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-bold text-xs opacity-80">✨ Vision Board</p>
          <p
            className="text-white font-extrabold text-sm mt-1"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            {quote || "Tap to add your mantra ✨"}
          </p>
        </div>
        <span className="text-white text-xs font-bold opacity-70 shrink-0">View all →</span>
      </div>
    </button>
  );
}
