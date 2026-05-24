// Daily Vision Board push notification sender
// Triggered hourly by pg_cron; matches users whose vision_notification_time
// falls in the current UTC hour and sends them a Web Push.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@dodi.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supa = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // --- Auth: require the shared cron secret. --------------------------------
  try {
    const provided = req.headers.get('x-cron-secret') ?? '';
    const { data: secretRow, error: secretErr } = await supa
      .schema('vault')
      .from('decrypted_secrets')
      .select('decrypted_secret')
      .eq('name', 'cron_secret')
      .maybeSingle();
    const expected = (secretRow?.decrypted_secret as string | undefined) ?? '';
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
    const nowHour = new Date().getUTCHours();

    const { data: profiles, error } = await supa
      .from('profiles')
      .select('user_id, vision_quote, vision_notification_time, vision_images')
      .not('vision_notification_time', 'is', null);

    if (error) {
      console.error('profiles query failed', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targets = (profiles ?? []).filter((p: any) => {
      const t: string = p.vision_notification_time;
      if (!t) return false;
      const h = parseInt(t.split(':')[0], 10);
      return h === nowHour;
    });

    let sent = 0, removed = 0;
    for (const p of targets) {
      const { data: subs } = await supa
        .from('push_subscriptions')
        .select('id, subscription')
        .eq('user_id', p.user_id);
      if (!subs || !subs.length) continue;

      const body = (p.vision_quote && String(p.vision_quote).trim())
        || "Open Dodi to see what you're working toward";
      const payload = JSON.stringify({
        title: 'Your vision is waiting ☀️',
        body,
        url: '/?vision=1',
      });

      for (const s of subs) {
        try {
          await webpush.sendNotification(s.subscription as any, payload);
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
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-vision-notification error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
