import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const refCode = typeof body?.ref_code === "string" ? body.ref_code.trim() : "";
    if (!refCode) {
      return new Response(JSON.stringify({ error: "Missing ref_code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    const referredUserId = userData.user?.id;
    if (!referredUserId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: referrer } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("referral_code", refCode)
      .maybeSingle();

    if (!referrer || referrer.user_id === referredUserId) {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_user_id", referredUserId)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("referrals").insert({
      referrer_user_id: referrer.user_id,
      referred_user_id: referredUserId,
      reward_granted: true,
    });

    const { data: pack } = await supabase
      .from("stickers")
      .select("id")
      .eq("mission_id", "special_invite");

    const rows = (pack ?? []).flatMap((s: { id: string }) => [
      { user_id: referrer.user_id, sticker_id: s.id },
      { user_id: referredUserId, sticker_id: s.id },
    ]);
    if (rows.length) {
      await supabase
        .from("user_unlocked_stickers")
        .upsert(rows, { onConflict: "user_id,sticker_id" });
    }

    await supabase.from("mission_progress").upsert(
      {
        user_id: referrer.user_id,
        mission_id: "special_invite",
        progress: 1,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,mission_id" },
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-referral error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
