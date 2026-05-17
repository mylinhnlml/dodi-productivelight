import { useEffect, useRef, useState } from "react";
import { Camera, Pencil, Check, Plus, Gift, Sparkles, Trash2, X, Trophy, Palette, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MISSIONS_BY_ID } from "@/lib/missions";

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  points: number;
};

type Reward = {
  id: string;
  title: string;
  emoji: string;
  cost: number;
};

type Redemption = {
  id: string;
  reward_title: string;
  reward_emoji: string;
  cost: number;
  redeemed_at: string;
};

const REWARD_EMOJIS = ["🎁", "🍰", "☕", "🛁", "🎬", "🛍️", "🍦", "💆", "📚", "🌷", "🍷", "✨"];

export default function ProfilePage({ userId }: { userId: string | null }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎁");
  const [newCost, setNewCost] = useState(20);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [rank, setRank] = useState<{ my_count: number; my_rank: number; total_users: number } | null>(null);
  const [stickers, setStickers] = useState<Array<{ id: string; emoji: string; name: string; mission_id: string | null }>>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [showGallery, setShowGallery] = useState(false);

  const loadRank = async () => {
    const { data, error } = await supabase.rpc("get_redemption_rank");
    if (!error && data && data[0]) {
      setRank({
        my_count: Number(data[0].my_count) || 0,
        my_rank: Number(data[0].my_rank) || 0,
        total_users: Number(data[0].total_users) || 0,
      });
    }
  };

  useEffect(() => {
    if (!userId) return;
    (async () => {
      let { data: p } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, bio, points")
        .eq("user_id", userId)
        .maybeSingle();
      if (!p) {
        // Self-heal: create the row if the signup trigger never ran for this user
        const { data: created } = await supabase
          .from("profiles")
          .insert({ user_id: userId })
          .select("display_name, avatar_url, bio, points")
          .single();
        p = created ?? { display_name: null, avatar_url: null, bio: null, points: 0 };
      }
      setProfile(p as Profile);
      setDraftName(p.display_name ?? "");
      setDraftBio(p.bio ?? "");
      const { data: r } = await supabase
        .from("rewards")
        .select("id, title, emoji, cost")
        .order("created_at", { ascending: true });
      setRewards((r ?? []) as Reward[]);
      const { data: h } = await supabase
        .from("redemptions")
        .select("id, reward_title, reward_emoji, cost, redeemed_at")
        .order("redeemed_at", { ascending: false })
        .limit(10);
      setRedemptions((h ?? []) as Redemption[]);
      loadRank();
      const { data: cat } = await supabase
        .from("stickers")
        .select("id, emoji, name, mission_id")
        .order("sort_order", { ascending: true });
      setStickers((cat ?? []) as any);
      const { data: un } = await supabase
        .from("user_unlocked_stickers")
        .select("sticker_id")
        .eq("user_id", userId);
      setUnlockedIds(new Set((un ?? []).map((r: any) => r.sticker_id)));
    })();
  }, [userId]);

  const saveProfile = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: draftName.trim() || null, bio: draftBio.trim() || null })
      .eq("user_id", userId);
    if (error) return toast.error("Couldn't save");
    setProfile((p) => (p ? { ...p, display_name: draftName, bio: draftBio } : p));
    setEditing(false);
    toast.success("Saved");
  };

  const onPickAvatar = () => fileRef.current?.click();

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("Image too large (max 3MB)");
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      return toast.error("Upload failed");
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", userId);
    setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    setUploading(false);
    toast.success("Avatar updated");
  };

  const addReward = async () => {
    if (!userId || !newTitle.trim()) return;
    const { data, error } = await supabase
      .from("rewards")
      .insert({ user_id: userId, title: newTitle.trim(), emoji: newEmoji, cost: newCost })
      .select("id, title, emoji, cost")
      .single();
    if (error || !data) return toast.error("Couldn't add");
    setRewards((r) => [...r, data as Reward]);
    setNewTitle("");
    setNewCost(20);
    setNewEmoji("🎁");
    setShowAdd(false);
  };

  const deleteReward = async (id: string) => {
    await supabase.from("rewards").delete().eq("id", id);
    setRewards((r) => r.filter((x) => x.id !== id));
  };

  const redeem = async (reward: Reward) => {
    if (!userId || !profile) return;
    if (profile.points < reward.cost) return toast.error("Not enough points yet ✨");
    const newPoints = profile.points - reward.cost;
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ points: newPoints })
      .eq("user_id", userId);
    if (pErr) return toast.error("Redeem failed");
    const { data: red } = await supabase
      .from("redemptions")
      .insert({
        user_id: userId,
        reward_id: reward.id,
        reward_title: reward.title,
        reward_emoji: reward.emoji,
        cost: reward.cost,
      })
      .select("id, reward_title, reward_emoji, cost, redeemed_at")
      .single();
    setProfile({ ...profile, points: newPoints });
    if (red) setRedemptions((h) => [red as Redemption, ...h].slice(0, 10));
    loadRank();
    toast.success(`Redeemed ${reward.emoji} ${reward.title}`);
  };

  if (!userId) {
    return (
      <div className="flex-1 px-6 pb-6 flex items-center justify-center">
        <div className="neu-inset rounded-2xl p-6 text-center text-xs font-bold text-muted-foreground">
          Sign in to save your profile and rewards 🌷
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="flex-1 px-6 pb-6 text-xs font-bold text-muted-foreground">Loading…</div>;
  }

  return (
    <section className="flex-1 px-5 overflow-y-auto pb-4 space-y-4">
      {/* Profile card */}
      <div className="rounded-3xl neu-surface-sm p-4 flex items-start gap-3">
        <button
          onClick={onPickAvatar}
          disabled={uploading}
          className="relative w-16 h-16 rounded-2xl neu-inset overflow-hidden flex items-center justify-center text-2xl shrink-0"
          aria-label="Change avatar"
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span>🌷</span>
          )}
          <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Camera className="w-3 h-3" strokeWidth={2.6} />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onAvatarFile} className="hidden" />

        {editing ? (
          <div className="flex-1 min-w-0 space-y-1.5">
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Name"
              className="w-full text-sm font-bold bg-transparent neu-inset rounded-lg px-2.5 py-1.5 outline-none"
            />
            <input
              value={draftBio}
              onChange={(e) => setDraftBio(e.target.value)}
              placeholder="A soft bio…"
              className="w-full text-xs font-semibold bg-transparent neu-inset rounded-lg px-2.5 py-1.5 outline-none"
            />
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-base font-extrabold text-foreground truncate">
              {profile.display_name || "Friend"}
            </p>
            <p className="text-xs text-muted-foreground font-semibold truncate mt-0.5">
              {profile.bio || "Soft days, gentle wins ✨"}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(45,90%,82%)] text-[hsl(45,50%,25%)] text-[11px] font-extrabold">
              <Sparkles className="w-3 h-3" strokeWidth={2.6} />
              {profile.points} pts
            </div>
          </div>
        )}

        <button
          onClick={() => (editing ? saveProfile() : setEditing(true))}
          aria-label={editing ? "Save profile" : "Edit profile"}
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            editing ? "neu-pressed" : "neu-surface-sm"
          }`}
        >
          {editing ? (
            <Check className="w-4 h-4 text-primary" strokeWidth={2.6} />
          ) : (
            <Pencil className="w-4 h-4 text-primary" strokeWidth={2.4} />
          )}
        </button>
      </div>

      {/* Redemption rank */}
      {rank && (
        <div className="rounded-3xl neu-surface-sm p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl neu-inset flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-primary" strokeWidth={2.6} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-foreground leading-tight">
              {rank.my_count} {rank.my_count === 1 ? "reward" : "rewards"} redeemed
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 truncate">
              {rank.total_users === 0 || rank.my_count === 0
                ? "Redeem your first treat to join the leaderboard"
                : `Rank #${rank.my_rank} of ${rank.total_users}`}
            </p>
          </div>
          {rank.my_count > 0 && rank.total_users > 0 && (
            <div className="text-right shrink-0">
              <p className="text-lg font-extrabold text-primary leading-none">#{rank.my_rank}</p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">of {rank.total_users}</p>
            </div>
          )}
        </div>
      )}

      {/* Rewards header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-primary" strokeWidth={2.6} />
            Rewards
          </h2>
          <p className="text-[10px] font-semibold text-muted-foreground">
            Earn 5 pts per completed task
          </p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className={`text-[10px] font-extrabold px-2.5 py-1.5 rounded-full transition-all flex items-center gap-1 ${
            showAdd ? "neu-pressed text-primary" : "neu-surface-sm text-primary"
          }`}
        >
          <Plus className="w-3 h-3" strokeWidth={3} />
          New
        </button>
      </div>

      {/* New reward form */}
      {showAdd && (
        <div className="neu-inset rounded-2xl p-3 space-y-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Boba treat"
            className="w-full text-sm font-bold bg-transparent neu-surface-sm rounded-xl px-3 py-2 outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {REWARD_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setNewEmoji(e)}
                className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                  newEmoji === e ? "neu-pressed scale-95" : "neu-surface-sm"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase">Cost</span>
            <input
              type="number"
              min={1}
              value={newCost}
              onChange={(e) => setNewCost(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 text-sm font-bold bg-transparent neu-surface-sm rounded-xl px-2.5 py-1.5 outline-none text-center"
            />
            <span className="text-[10px] font-bold text-muted-foreground">pts</span>
            <button
              onClick={addReward}
              disabled={!newTitle.trim()}
              className="ml-auto rounded-xl px-3 py-1.5 text-[11px] font-extrabold text-primary-foreground disabled:opacity-50"
              style={{ background: "hsl(var(--primary))" }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Reward list */}
      {rewards.length === 0 ? (
        <div className="neu-inset rounded-2xl p-6 text-center text-xs font-bold text-muted-foreground">
          No rewards yet — create one to redeem 🎁
        </div>
      ) : (
        <div className="space-y-2">
          {rewards.map((r) => {
            const canAfford = profile.points >= r.cost;
            return (
              <article
                key={r.id}
                className="neu-surface-sm rounded-2xl p-3 flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-2xl neu-inset flex items-center justify-center text-xl shrink-0">
                  {r.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{r.title}</p>
                  <p className="text-[11px] font-extrabold text-muted-foreground mt-0.5">
                    {r.cost} pts
                  </p>
                </div>
                <button
                  onClick={() => deleteReward(r.id)}
                  aria-label="Delete reward"
                  className="w-8 h-8 rounded-full neu-surface-sm flex items-center justify-center text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2.4} />
                </button>
                <button
                  onClick={() => redeem(r)}
                  disabled={!canAfford}
                  className={`rounded-xl px-3 py-2 text-[11px] font-extrabold transition-all ${
                    canAfford ? "text-primary-foreground" : "text-muted-foreground neu-inset"
                  }`}
                  style={canAfford ? { background: "hsl(var(--primary))" } : undefined}
                >
                  Redeem
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* History */}
      {redemptions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wide px-1">
            Recent treats
          </h3>
          <div className="space-y-1.5">
            {redemptions.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl neu-surface-sm"
              >
                <span className="text-base">{h.reward_emoji}</span>
                <span className="text-xs font-bold text-foreground flex-1 truncate">
                  {h.reward_title}
                </span>
                <span className="text-[10px] font-extrabold text-muted-foreground">
                  −{h.cost} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
