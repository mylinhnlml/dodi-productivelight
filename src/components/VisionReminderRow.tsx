import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  userId: string;
  time: string | null; // "HH:MM" or null
  onTimeChange: (t: string | null) => void;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

async function getVapidKey(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("vapid-public-key");
    if (error) return null;
    return (data as any)?.key || null;
  } catch { return null; }
}

async function enablePush(userId: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    toast.error("Notifications aren't supported on this device");
    return false;
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    toast.error("Please enable notifications in your browser settings to use this feature");
    return false;
  }
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const vapid = await getVapidKey();
  if (!vapid) { toast.error("Push setup unavailable"); return false; }

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });
  }
  const json: any = sub.toJSON();
  await supabase.from("push_subscriptions").upsert(
    { user_id: userId, subscription: json, endpoint: json.endpoint },
    { onConflict: "endpoint" }
  );
  return true;
}

export default function VisionReminderRow({ userId, time, onTimeChange }: Props) {
  const enabled = !!time;
  const [draft, setDraft] = useState(time || "08:00");
  useEffect(() => { if (time) setDraft(time); }, [time]);

  const save = async (t: string | null) => {
    onTimeChange(t);
    await supabase
      .from("profiles")
      .update({ vision_notification_time: t })
      .eq("user_id", userId);
  };

  const toggle = async (on: boolean) => {
    if (on) {
      const ok = await enablePush(userId);
      if (!ok) return;
      await save(draft);
      toast.success("Daily reminder set ☀️");
    } else {
      await save(null);
    }
  };

  const onTimeInput = (v: string) => {
    setDraft(v);
    if (enabled) save(v);
  };

  return (
    <div className="rounded-2xl neu-surface-sm p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-foreground">Daily vision reminder</p>
          <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
            We'll send your vision to you each morning ☀️
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </div>
      {enabled && (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-muted-foreground">Time</span>
          <input
            type="time"
            value={draft}
            onChange={(e) => onTimeInput(e.target.value)}
            className="text-sm font-bold bg-transparent neu-inset rounded-lg px-2.5 py-1.5 outline-none"
          />
        </div>
      )}
    </div>
  );
}
