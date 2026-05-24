import { supabase } from "@/integrations/supabase/client";

// Extract storage path from a stored value that may be either a full public URL
// (legacy) or a bare path like "<userId>/<filename>".
export function visionPath(stored: string): string {
  if (!stored) return "";
  const m = stored.match(/vision-board\/(.+?)(?:\?.*)?$/);
  return m ? m[1] : stored;
}

export async function visionSignedUrl(stored: string, expiresInSec = 3600): Promise<string | null> {
  const path = visionPath(stored);
  if (!path) return null;
  const { data } = await supabase.storage.from("vision-board").createSignedUrl(path, expiresInSec);
  return data?.signedUrl ?? null;
}

export async function visionSignedUrls(stored: string[], expiresInSec = 3600): Promise<string[]> {
  const paths = stored.map(visionPath).filter(Boolean);
  if (!paths.length) return [];
  const { data } = await supabase.storage.from("vision-board").createSignedUrls(paths, expiresInSec);
  return (data ?? []).map((r) => r.signedUrl ?? "");
}
