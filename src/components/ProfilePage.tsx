import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Pencil,
  LogOut,
  Trophy,
  Smile,
  Lock,
  X,
  Camera,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VisionBoardViewer from "@/components/VisionBoardViewer";

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  points: number;
  vision_quote: string | null;
  vision_images: string[];
  vision_notification_time: string | null;
};

type TaskLite = {
  id: string;
  title: string;
  emoji: string;
};

type Props = {
  userId: string | null;
  tasks?: TaskLite[];
  completed?: Set<string>;
};

const AMBER_LABEL = "text-[10px] font-bold uppercase tracking-widest text-amber-400";

export default function ProfilePage({ userId, tasks = [], completed = new Set() }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>("");
  const [stickers, setStickers] = useState<Array<{ id: string; emoji: string; name: string }>>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [redeemedCount, setRedeemedCount] = useState<number>(0);

  // UI state
  const [view, setView] = useState<"profile" | "account">("profile");
  const [expanded, setExpanded] = useState<"tasks" | "stickers" | null>(null);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editSloganOpen, setEditSloganOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [editQuoteOpen, setEditQuoteOpen] = useState(false);
  const [showVision, setShowVision] = useState(false);

  // Drafts
  const [draftName, setDraftName] = useState("");
  const [draftSlogan, setDraftSlogan] = useState("");
  const [draftQuote, setDraftQuote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      let { data: p } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, bio, points, vision_quote, vision_images, vision_notification_time")
        .eq("user_id", userId)
        .maybeSingle();
      if (!p) {
        const { data: created } = await supabase
          .from("profiles")
          .insert({ user_id: userId })
          .select("display_name, avatar_url, bio, points, vision_quote, vision_images, vision_notification_time")
          .single();
        p = created ?? {
          display_name: null,
          avatar_url: null,
          bio: null,
          points: 0,
          vision_quote: null,
          vision_images: [],
          vision_notification_time: null,
        };
      }
      setProfile(p as Profile);
      setDraftName(p.display_name ?? "");
      setDraftSlogan(p.bio ?? "");
      setDraftQuote(p.vision_quote ?? "");

      const { data: u } = await supabase.auth.getUser();
      setEmail(u.user?.email ?? "");

      const { count } = await supabase
        .from("point_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      setRedeemedCount(count ?? 0);

      const { data: cat } = await supabase
        .from("stickers")
        .select("id, emoji, name")
        .order("sort_order", { ascending: true });
      setStickers((cat ?? []) as any);

      const { data: un } = await supabase
        .from("user_unlocked_stickers")
        .select("sticker_id")
        .eq("user_id", userId);
      setUnlockedIds(new Set((un ?? []).map((r: any) => r.sticker_id)));
    })();
  }, [userId]);

  // Auto-open vision viewer via push notification
  useEffect(() => {
    if (!profile) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("vision") === "1") {
      setShowVision(true);
      params.delete("vision");
      const qs = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : ""));
    }
  }, [profile]);

  // Top 3 completed task titles
  const titleStats = (() => {
    const counts: Record<string, { count: number; emoji: string }> = {};
    completed.forEach((key) => {
      const taskId = key.split("|")[0];
      const t = tasks.find((x) => x.id === taskId);
      if (!t) return;
      if (!counts[t.title]) counts[t.title] = { count: 0, emoji: t.emoji };
      counts[t.title].count += 1;
    });
    const sorted = Object.entries(counts)
      .map(([title, v]) => ({ title, count: v.count, emoji: v.emoji }))
      .sort((a, b) => b.count - a.count);
    const top3 = sorted.slice(0, 3);
    const others = sorted.slice(3).reduce((s, x) => s + x.count, 0);
    const max = top3[0]?.count || 1;
    return { top3, others, max };
  })();

  const saveName = async () => {
    if (!userId) return;
    const next = draftName.trim() || null;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: next })
      .eq("user_id", userId);
    if (error) return toast.error("Couldn't save");
    setProfile((p) => (p ? { ...p, display_name: next } : p));
    setEditNameOpen(false);
    toast.success("Name updated ✨");
  };

  const saveQuote = async () => {
    if (!userId) return;
    const next = draftQuote.trim().slice(0, 100) || null;
    const { error } = await supabase
      .from("profiles")
      .update({ vision_quote: next })
      .eq("user_id", userId);
    if (error) return toast.error("Couldn't save");
    setProfile((p) => (p ? { ...p, vision_quote: next } : p));
    setEditQuoteOpen(false);
    toast.success("Mantra saved ✨");
  };

  const doLogout = async () => {
    await supabase.auth.signOut();
    try {
      localStorage.removeItem("dodi.introSeen.v3");
    } catch {}
    window.location.reload();
  };

  const onPickAvatar = () => fileRef.current?.click();
  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("Image too large (max 3MB)");
    const allowed: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    if (!allowed[file.type]) return toast.error("Only JPG, PNG, WEBP or GIF allowed");
    setUploading(true);
    const ext = allowed[file.type];
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      return toast.error("Upload failed");
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", userId);
    setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    setUploading(false);
    toast.success("Avatar updated ✨");
  };

  if (!userId) {
    return (
      <div className="flex-1 px-6 pb-6 flex items-center justify-center" style={{ background: "hsl(45, 60%, 97%)" }}>
        <div className="rounded-3xl neu-surface-sm p-6 text-center text-xs font-bold text-muted-foreground">
          Sign in to save your profile 🌷
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 px-6 pb-6 text-xs font-bold text-muted-foreground" style={{ background: "hsl(45, 60%, 97%)" }}>
        Loading…
      </div>
    );
  }

  const displayName = profile.display_name || "Friend";
  const avatarNode = profile.avatar_url ? (
    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
  ) : (
    <span className="text-xl">🌷</span>
  );

  /* ───────── ACCOUNT CENTER VIEW ───────── */
  if (view === "account") {
    return (
      <section
        className="flex-1 overflow-y-auto pb-6"
        style={{ background: "hsl(45, 60%, 97%)" }}
      >
        <div className="px-5 pt-2 flex items-center">
          <button
            onClick={() => setView("profile")}
            className="w-9 h-9 rounded-2xl neu-surface-sm flex items-center justify-center transition-transform active:scale-[0.95]"
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" strokeWidth={2.6} />
          </button>
          <h2 className="ml-3 text-sm font-extrabold text-foreground">Account Center</h2>
        </div>

        <div className="px-5 mt-5 flex flex-col items-center gap-2 animate-[fade-in_0.4s_ease-out_both]">
          <button
            onClick={onPickAvatar}
            disabled={uploading}
            className="relative w-20 h-20 rounded-3xl neu-inset overflow-hidden flex items-center justify-center transition-transform active:scale-[0.98]"
            aria-label="Change avatar"
          >
            {avatarNode}
            <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-amber-400 text-white flex items-center justify-center">
              <Camera className="w-3 h-3" strokeWidth={2.6} />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onAvatarFile} className="hidden" />
          <p className="text-base font-extrabold text-foreground mt-1">{displayName}</p>
          {email && <p className="text-xs text-muted-foreground">{email}</p>}
        </div>

        <div className="px-5 mt-6 space-y-3">
          <button
            onClick={() => {
              setDraftName(profile.display_name ?? "");
              setEditNameOpen(true);
            }}
            className="w-full rounded-3xl neu-surface-sm p-4 flex items-center gap-3 transition-transform active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-2xl neu-inset flex items-center justify-center">
              <Pencil className="w-4 h-4 text-amber-400" strokeWidth={2.6} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-bold text-foreground">Display name</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{displayName}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={() => setLogoutOpen(true)}
            className="w-full rounded-3xl neu-surface-sm p-4 flex items-center gap-3 transition-transform active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-2xl neu-inset flex items-center justify-center">
              <LogOut className="w-4 h-4 text-destructive" strokeWidth={2.6} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-bold text-destructive">Log out</p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </button>
        </div>

        {editNameOpen && (
          <BottomSheet onClose={() => setEditNameOpen(false)} title="Display name">
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-full text-sm font-bold bg-transparent neu-inset rounded-2xl px-4 py-3 outline-none"
            />
            <button
              onClick={saveName}
              className="mt-4 w-full rounded-2xl py-3 text-sm font-extrabold text-white"
              style={{ background: "hsl(40, 100%, 55%)" }}
            >
              Save
            </button>
          </BottomSheet>
        )}

        {logoutOpen && (
          <BottomSheet onClose={() => setLogoutOpen(false)} title="Log out?">
            <p className="text-xs text-muted-foreground">
              You'll need to sign in again to access your reminders and rewards.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setLogoutOpen(false)}
                className="flex-1 rounded-2xl py-3 text-sm font-extrabold neu-surface-sm text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={doLogout}
                className="flex-1 rounded-2xl py-3 text-sm font-extrabold text-white bg-destructive"
              >
                Log out
              </button>
            </div>
          </BottomSheet>
        )}
      </section>
    );
  }

  /* ───────── MAIN PROFILE VIEW ───────── */
  const totalStickers = stickers.length;
  const unlockedCount = unlockedIds.size;
  const visionImages = profile.vision_images || [];

  return (
    <section
      className="flex-1 overflow-y-auto pb-6 px-5 space-y-4"
      style={{ background: "hsl(45, 60%, 97%)" }}
    >
      {/* SECTION 1 — Account Center shortcut */}
      <button
        onClick={() => setView("account")}
        className="w-full rounded-3xl neu-surface-sm p-4 flex items-center gap-3 transition-transform active:scale-[0.98] animate-[fade-in_0.4s_ease-out_both]"
      >
        <div className="w-12 h-12 rounded-2xl neu-inset overflow-hidden flex items-center justify-center shrink-0">
          {avatarNode}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-extrabold text-foreground truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {profile.bio || "Soft days, gentle wins ✨"}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-amber-400" />
      </button>

      {/* SECTION 2 — Achievements */}
      <div className="space-y-3 animate-[fade-in_0.4s_ease-out_both]" style={{ animationDelay: "100ms" }}>
        <p className={AMBER_LABEL}>Achievements ✨</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setExpanded(expanded === "tasks" ? null : "tasks")}
            className="rounded-3xl neu-surface-sm p-4 flex flex-col items-start gap-2 transition-transform active:scale-[0.98]"
          >
            <Trophy className="w-5 h-5 text-amber-400" strokeWidth={2.6} />
            <p className="text-2xl font-extrabold text-foreground leading-none">{redeemedCount}</p>
            <p className="text-xs text-muted-foreground">Tasks redeemed</p>
          </button>
          <button
            onClick={() => setExpanded(expanded === "stickers" ? null : "stickers")}
            className="rounded-3xl neu-surface-sm p-4 flex flex-col items-start gap-2 transition-transform active:scale-[0.98]"
          >
            <Smile className="w-5 h-5 text-amber-400" strokeWidth={2.6} />
            <p className="leading-none">
              <span className="text-2xl font-extrabold text-foreground">{unlockedCount}</span>
              <span className="text-sm font-bold text-muted-foreground">/{totalStickers}</span>
            </p>
            <p className="text-xs text-muted-foreground">Stickers collected</p>
          </button>
        </div>

        {/* Expand: Tasks */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expanded === "tasks" ? "max-h-96" : "max-h-0"
          }`}
        >
          <div className="rounded-3xl neu-surface-sm p-4 space-y-3">
            <p className="text-xs font-bold text-foreground">Top completed</p>
            {titleStats.top3.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No completed tasks yet</p>
            ) : (
              <div className="space-y-2">
                {titleStats.top3.map((t) => (
                  <div key={t.title} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{t.emoji}</span>
                      <span className="text-xs font-bold text-foreground flex-1 truncate">
                        {t.title}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
                        {t.count}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-amber-50 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(t.count / titleStats.max) * 100}%`,
                          background: "hsl(40, 100%, 55%)",
                        }}
                      />
                    </div>
                  </div>
                ))}
                {titleStats.others > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">Others</span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {titleStats.others}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expand: Stickers */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expanded === "stickers" ? "max-h-96" : "max-h-0"
          }`}
        >
          <div className="rounded-3xl neu-surface-sm p-4">
            <div
              className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
            >
              {stickers.map((s) => {
                const isUnlocked = unlockedIds.has(s.id);
                return (
                  <div
                    key={s.id}
                    title={s.name}
                    className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                      isUnlocked ? "neu-surface-sm" : "neu-inset opacity-30"
                    }`}
                  >
                    {isUnlocked ? s.emoji : <Lock className="w-3 h-3 text-muted-foreground" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3 — Vision Board */}
      <div className="space-y-3 animate-[fade-in_0.4s_ease-out_both]" style={{ animationDelay: "200ms" }}>
        <p className={AMBER_LABEL}>Vision Board 🌅</p>
        <div className="grid grid-cols-2 gap-3">
          {/* Widget 1: Quote */}
          <button
            onClick={() => {
              setDraftQuote(profile.vision_quote ?? "");
              setEditQuoteOpen(true);
            }}
            className="rounded-3xl neu-surface-sm p-4 flex flex-col justify-between h-40 text-left transition-transform active:scale-[0.98]"
          >
            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-400">
              My mantra
            </span>
            <p
              className={`text-sm font-extrabold leading-snug line-clamp-3 ${
                profile.vision_quote ? "text-foreground" : "text-muted-foreground italic"
              }`}
            >
              {profile.vision_quote || "Tap to add your mantra ✨"}
            </p>
            <div className="flex justify-end">
              <Pencil className="w-3.5 h-3.5 text-amber-400" strokeWidth={2.6} />
            </div>
          </button>

          {/* Widget 2: Image Catalogue */}
          <button
            onClick={() => setShowVision(true)}
            className="rounded-3xl overflow-hidden h-40 relative transition-transform active:scale-[0.98]"
          >
            {visionImages.length > 0 ? (
              <>
                <img
                  src={visionImages[0]}
                  alt="Vision board"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)",
                  }}
                />
                <div className="absolute bottom-3 left-3 text-[10px] font-bold text-white">
                  {visionImages.length} {visionImages.length === 1 ? "photo" : "photos"}
                </div>
                <div className="absolute bottom-3 right-3 text-[10px] font-bold text-white/80">
                  View all →
                </div>
              </>
            ) : (
              <div className="neu-inset h-full w-full flex flex-col items-center justify-center gap-1">
                <span className="text-3xl">🌅</span>
                <span className="text-xs text-muted-foreground">Add photos</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Quote edit bottom sheet */}
      {editQuoteOpen && (
        <BottomSheet onClose={() => setEditQuoteOpen(false)} title="My mantra">
          <textarea
            value={draftQuote}
            onChange={(e) => setDraftQuote(e.target.value.slice(0, 100))}
            placeholder="What keeps you going? ✨"
            autoFocus
            className="w-full text-sm font-bold bg-transparent neu-inset rounded-2xl px-4 py-3 min-h-20 outline-none resize-none"
          />
          <div className="mt-1 text-right text-[10px] font-bold text-muted-foreground">
            {draftQuote.length}/100
          </div>
          <button
            onClick={saveQuote}
            className="mt-3 w-full rounded-2xl py-3 text-sm font-extrabold text-white"
            style={{ background: "hsl(40, 100%, 55%)" }}
          >
            Save
          </button>
        </BottomSheet>
      )}

      <VisionBoardViewer
        userId={userId}
        open={showVision}
        onClose={() => setShowVision(false)}
        images={visionImages}
        quote={profile.vision_quote || ""}
        onImagesChange={(imgs) => setProfile((p) => (p ? { ...p, vision_images: imgs } : p))}
        onQuoteChange={(q) => setProfile((p) => (p ? { ...p, vision_quote: q } : p))}
      />
    </section>
  );
}

/* ───────── Bottom sheet helper ───────── */
function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-3 mb-3 rounded-3xl p-5"
        style={{
          background: "hsl(45, 60%, 97%)",
          animation: "slide-in-bottom 280ms cubic-bezier(0.32, 0.72, 0, 1) both",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full neu-surface-sm flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        {children}
      </div>
      <style>{`
        @keyframes slide-in-bottom {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
