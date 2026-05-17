// Sticker catalog + user unlock helpers.
import { supabase } from "@/integrations/supabase/client";

export type Sticker = {
  id: string;
  emoji: string;
  name: string;
  mission_id: string | null;
  sort_order: number;
};

let _catalog: Sticker[] | null = null;

export async function loadCatalog(): Promise<Sticker[]> {
  if (_catalog) return _catalog;
  const { data } = await supabase
    .from("stickers")
    .select("id, emoji, name, mission_id, sort_order")
    .order("sort_order", { ascending: true });
  _catalog = (data ?? []) as Sticker[];
  return _catalog;
}

export async function loadUnlockedIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("user_unlocked_stickers")
    .select("sticker_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((r: any) => r.sticker_id as string));
}

export async function unlockStickersForMission(
  userId: string,
  missionId: string
): Promise<Sticker[]> {
  const catalog = await loadCatalog();
  const toUnlock = catalog.filter((s) => s.mission_id === missionId);
  if (toUnlock.length === 0) return [];
  const rows = toUnlock.map((s) => ({ user_id: userId, sticker_id: s.id }));
  // Ignore duplicates via unique constraint
  await supabase.from("user_unlocked_stickers").upsert(rows, {
    onConflict: "user_id,sticker_id",
    ignoreDuplicates: true,
  });
  return toUnlock;
}
