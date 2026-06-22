import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Plus, Pencil, Trash2 } from "lucide-react";
import { visionPath, visionSignedUrls } from "@/lib/visionImages";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

interface Props {
  userId: string;
  open: boolean;
  onClose: () => void;
  images: string[];
  quote: string;
  onImagesChange: (next: string[]) => void;
  onQuoteChange: (next: string) => void;
}

const MAX_IMAGES = 6;

async function compress(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const max = 1400;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.85));
  } finally { URL.revokeObjectURL(url); }
}

export default function VisionBoardViewer({
  userId, open, onClose, images, quote, onImagesChange, onQuoteChange,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [editingQuote, setEditingQuote] = useState(false);
  const [draftQuote, setDraftQuote] = useState(quote || "");
  const [paused, setPaused] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const resumeTimer = useRef<number | null>(null);
  const autoTimer = useRef<number | null>(null);
  const [closing, setClosing] = useState(false);
  const [signedUrls, setSignedUrls] = useState<string[]>([]);

  useEffect(() => { if (open) { setIndex(0); setClosing(false); setDraftQuote(quote || ""); } }, [open]);

  useEffect(() => {
    let cancelled = false;
    if (!images.length) { setSignedUrls([]); return; }
    visionSignedUrls(images).then((urls) => { if (!cancelled) setSignedUrls(urls); });
    return () => { cancelled = true; };
  }, [images]);

  // Auto-advance
  useEffect(() => {
    if (!open || paused || images.length < 2) return;
    autoTimer.current = window.setInterval(() => {
      const s = scrollerRef.current; if (!s) return;
      const next = (index + 1) % images.length;
      s.scrollTo({ left: next * s.clientWidth, behavior: "smooth" });
    }, 5000);
    return () => { if (autoTimer.current) clearInterval(autoTimer.current); };
  }, [open, paused, index, images.length]);

  const handleScroll = () => {
    const s = scrollerRef.current; if (!s) return;
    const i = Math.round(s.scrollLeft / s.clientWidth);
    if (i !== index) setIndex(i);
  };

  const pauseAuto = () => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), 3000);
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 180);
  };

  const handleEdgeTap = (e: React.MouseEvent) => {
    const s = scrollerRef.current; if (!s) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    pauseAuto();
    if (x < w * 0.3 && index > 0) {
      s.scrollTo({ left: (index - 1) * s.clientWidth, behavior: "smooth" });
    } else if (x > w * 0.7 && index < images.length - 1) {
      s.scrollTo({ left: (index + 1) * s.clientWidth, behavior: "smooth" });
    }
  };

  const startLongPress = (i: number) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      navigator.vibrate?.(30);
      setPendingDelete(i);
    }, 600);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const onPickFile = async () => {
    if (images.length >= MAX_IMAGES) return toast.error("Max 6 photos");
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await Camera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
        });
        if (image.dataUrl) {
          await uploadFromDataUrl(image.dataUrl);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/cancel/i.test(msg)) return;
        toast.error("Couldn't open photo library. Please try again.");
      }
      return;
    }
    fileRef.current?.click();
  };

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [meta, b64] = dataUrl.split(",");
    const mime = /data:([^;]+)/.exec(meta)?.[1] || "image/jpeg";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const persistUpload = async (blob: Blob) => {
    const path = `${userId}/${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("vision-board")
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (upErr) throw upErr;
    const next = [...images, path];
    onImagesChange(next);
    await supabase.from("profiles").update({ vision_images: next }).eq("user_id", userId);
    setTimeout(() => {
      const s = scrollerRef.current;
      if (s) s.scrollTo({ left: (next.length - 1) * s.clientWidth, behavior: "smooth" });
    }, 50);
  };

  const uploadFromDataUrl = async (dataUrl: string) => {
    setUploading(true);
    try {
      const blob = dataUrlToBlob(dataUrl);
      await persistUpload(blob);
    } catch {
      toast.error("Upload failed, please try again ☀️");
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (images.length >= MAX_IMAGES) return toast.error("Max 6 photos");
    setUploading(true);
    try {
      const blob = await compress(file);
      await persistUpload(blob);
    } catch {
      toast.error("Upload failed, please try again ☀️");
    } finally { setUploading(false); }
  };

  const removeAt = async (i: number) => {
    setPendingDelete(null);
    const stored = images[i];
    const next = images.filter((_, idx) => idx !== i);
    onImagesChange(next);
    await supabase.from("profiles").update({ vision_images: next }).eq("user_id", userId);
    try {
      const p = visionPath(stored);
      if (p) await supabase.storage.from("vision-board").remove([p]);
    } catch {}
  };

  const saveQuote = async () => {
    const q = draftQuote.slice(0, 100);
    onQuoteChange(q);
    setEditingQuote(false);
    await supabase.from("profiles").update({ vision_quote: q || null }).eq("user_id", userId);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black"
      style={{
        animation: closing ? "vbFadeOut 180ms ease-in forwards" : "vbFadeIn 300ms ease-out",
      }}
    >
      <style>{`
        @keyframes vbFadeIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes vbFadeOut { from{opacity:1;transform:scale(1)} to{opacity:0;transform:scale(0.95)} }
        @keyframes vbQuoteIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes vbSheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        .vb-scroller { scroll-snap-type: x mandatory; scrollbar-width: none; }
        .vb-scroller::-webkit-scrollbar { display: none; }
        .vb-slide { scroll-snap-align: start; scroll-snap-stop: always; }
      `}</style>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} className="hidden" />

      {/* Empty state */}
      {images.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-[64px] leading-none mb-4">🌅</div>
          <h2 className="text-white font-extrabold text-xl">Your vision starts here</h2>
          <p className="text-white/60 text-sm mt-2 max-w-64 mx-auto">
            Add photos of everything you're working toward
          </p>
          <button
            onClick={onPickFile}
            disabled={uploading}
            className="mt-6 bg-white text-black rounded-2xl px-6 py-3 font-bold text-sm"
          >
            {uploading ? "Uploading…" : "Add vision photo"}
          </button>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          onTouchStart={pauseAuto}
          onClick={handleEdgeTap}
          className="vb-scroller flex w-screen h-screen overflow-x-auto overflow-y-hidden"
        >
          {images.map((url, i) => {
            const lazyLoad = Math.abs(i - index) > 1;
            const displaySrc = signedUrls[i] || "";
            return (
              <div
                key={url + i}
                className="vb-slide relative shrink-0 w-screen h-screen"
                onPointerDown={() => startLongPress(i)}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerCancel={cancelLongPress}
              >
                {!lazyLoad && displaySrc && (
                  <img
                    src={displaySrc}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ animation: "vbFadeIn 400ms ease-out" }}
                  />
                )}
                {/* Bottom gradient + content */}
                <div
                  className="absolute inset-x-0 bottom-0 pointer-events-none"
                  style={{
                    height: "60%",
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)",
                  }}
                />
                <div
                  key={`q-${index}`}
                  className="absolute left-0 right-0 bottom-0 px-6 pb-8 pointer-events-none"
                  style={{ animation: i === index ? "vbQuoteIn 300ms ease-out 100ms both" : undefined }}
                >
                  {quote && (
                    <p
                      className="text-white font-extrabold"
                      style={{
                        fontSize: 20,
                        lineHeight: 1.4,
                        textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {quote}
                    </p>
                  )}
                  <p className="text-white/50 text-xs font-bold mt-2">☀️ Dodi Vision</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-4" style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}>
        <button
          onClick={handleClose}
          aria-label="Close"
          className="w-11 h-11 flex items-center justify-center text-white"
          style={{ fontSize: 28, fontWeight: 300 }}
        >
          <X className="w-7 h-7" strokeWidth={1.6} />
        </button>
        {images.length < MAX_IMAGES && (
          <button
            onClick={onPickFile}
            disabled={uploading}
            className="text-white text-sm font-bold flex items-center gap-1 px-3 py-2"
          >
            <Plus className="w-4 h-4" strokeWidth={2.6} />
            {uploading ? "Uploading…" : "Add"}
          </button>
        )}
      </div>

      {/* Dots + edit quote */}
      {images.length > 0 && (
        <div className="absolute left-0 right-0 flex flex-col items-center gap-3" style={{ bottom: 140 }}>
          <button
            onClick={() => setEditingQuote(true)}
            className="bg-white/90 text-black rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5"
          >
            <Pencil className="w-3 h-3" strokeWidth={2.6} />
            Edit quote
          </button>
          <div className="flex items-center gap-1.5">
            {images.slice(0, MAX_IMAGES).map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === index ? 20 : 6,
                  height: i === index ? 8 : 6,
                  background: i === index ? "white" : "rgba(255,255,255,0.4)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Remove sheet */}
      {pendingDelete !== null && (
        <div className="absolute inset-0 z-10 bg-black/60" onClick={() => setPendingDelete(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 right-0 bottom-0 bg-background rounded-t-3xl p-5"
            style={{ animation: "vbSheetUp 280ms cubic-bezier(0.32,0.72,0,1)" }}
          >
            <button
              onClick={() => removeAt(pendingDelete)}
              className="w-full text-left py-3 text-destructive font-bold flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Remove this photo
            </button>
            <button
              onClick={() => setPendingDelete(null)}
              className="w-full text-left py-3 text-muted-foreground font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quote edit sheet */}
      {editingQuote && (
        <div className="absolute inset-0 z-10 bg-black/60" onClick={() => setEditingQuote(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 right-0 bottom-0 bg-background rounded-t-3xl p-5 space-y-3"
            style={{ animation: "vbSheetUp 280ms cubic-bezier(0.32,0.72,0,1)" }}
          >
            <h3 className="font-extrabold text-foreground">Your mantra</h3>
            <textarea
              autoFocus
              value={draftQuote}
              maxLength={100}
              onChange={(e) => setDraftQuote(e.target.value)}
              placeholder="What are you working toward? ✨"
              className="w-full neu-inset rounded-2xl min-h-20 p-3 text-sm font-semibold bg-transparent outline-none resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{draftQuote.length}/100</p>
            <button
              onClick={saveQuote}
              className="w-full rounded-2xl py-3 font-extrabold text-primary-foreground"
              style={{ background: "hsl(var(--primary))" }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
