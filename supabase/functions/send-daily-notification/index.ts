// Daily 9AM Vietnam (02:00 UTC) mantra push notification
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@dodi.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supa = createClient(SUPABASE_URL, SERVICE_KEY);

function getMantraNotification(mantra: string) {
  const intros = [
    'Hey sunshine ☀️',
    'Rise and glow ✨',
    'Good morning, superstar 🌟',
    'Okay bestie, listen up 👀',
    'Your future self called ☎️',
  ];
  const nudges = [
    "Today's tasks won't plant themselves 🌱",
    "Your reminders are waiting. Don't ghost them. 👻",
    'Small steps. Big glow-up. Let\'s go 🚀',
    "You didn't come this far to only come this far 💪",
    'The version of you who achieves this? She starts today 🦋',
  ];
  const intro = intros[Math.floor(Math.random() * intros.length)];
  const nudge = nudges[Math.floor(Math.random() * nudges.length)];
  return {
    title: intro,
    body: `"${mantra}" ✨\n\n${nudge}`,
    icon: '/placeholder.svg',
    badge: '/placeholder.svg',
    url: '/',
  };
}

function getNoMantraNotification() {
  const messages = [
    { title: 'Hey, you forgot something 👀', body: "You don't have a goal yet. No judgment — but also... what are we doing here? Set your mantra now ☀️" },
    { title: 'A gentle but firm nudge 🌿', body: 'Dreams without direction are just nice thoughts. Open Dodi and write down what you\'re working toward. Takes 10 seconds.' },
    { title: 'Your vision board is lonely 🥺', body: "It's waiting for your words. What do you want? Write it down. The universe is listening — and so is Dodi ✨" },
    { title: 'No mantra? No problem. Yet. 😅', body: "Kidding — it's a tiny problem. Open Dodi, add your goal, and let's get this glow-up started 🚀" },
    { title: 'Real talk ☀️', body: 'You built this app habit. Now build the goal behind it. Open Dodi → Profile → Vision Board → write your mantra. Go.' },
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];
  return { ...msg, icon: '/placeholder.svg', badge: '/placeholder.svg', url: '/?vision=1' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // --- Auth: require the shared cron secret. --------------------------------
  try {
    const provided = req.headers.get('x-cron-secret') ?? '';
    const { data: secretRow, error: secretErr } = await supa
      .schema('vault' as any)
      .from('decrypted_secrets')
      .select('decrypted_secret')
      .eq('name', 'cron_secret')
      .maybeSingle();
    const expected = ((secretRow as any)?.decrypted_secret as string | undefined) ?? '';
    if (secretErr || !expected || provided !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }



  try {
    const { data: users, error } = await supa
      .from('profiles')
      .select('user_id, vision_quote')
      .eq('notification_enabled', true);

    if (error) {
      console.error('profiles query failed', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    let sent = 0, skipped = 0, removed = 0;

    for (const u of users ?? []) {
      // Dedup: already sent today?
      const { count } = await supa
        .from('notification_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', u.user_id)
        .eq('type', 'daily_mantra')
        .gte('sent_at', today);
      if ((count ?? 0) > 0) { skipped++; continue; }

      const { data: subs } = await supa
        .from('push_subscriptions')
        .select('id, subscription')
        .eq('user_id', u.user_id);
      if (!subs || !subs.length) continue;

      const hasMantra = u.vision_quote && String(u.vision_quote).trim().length > 0;
      const notification = hasMantra
        ? getMantraNotification(String(u.vision_quote))
        : getNoMantraNotification();
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        url: notification.url,
      });

      let anySent = false;
      for (const s of subs) {
        try {
          await webpush.sendNotification(s.subscription as any, payload);
          anySent = true;
          sent++;
        } catch (e: any) {
          const code = e?.statusCode;
          if (code === 404 || code === 410) {
            await supa.from('push_subscriptions').delete().eq('id', s.id);
            removed++;
          } else {
            console.error('push fail', code, e?.body);
          }
        }
      }

      if (anySent) {
        await supa.from('notification_logs').insert({ user_id: u.user_id, type: 'daily_mantra' });
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, skipped, removed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-daily-notification error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
