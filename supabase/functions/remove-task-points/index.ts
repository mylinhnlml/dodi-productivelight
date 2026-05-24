import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const POINTS_PER_TASK = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const taskId = body?.task_id;
    if (typeof taskId !== "string" || !taskId) {
      return new Response(JSON.stringify({ error: "task_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(url, service);

    const { data: task, error: taskErr } = await admin
      .from("tasks")
      .select("id,user_id")
      .eq("id", taskId)
      .maybeSingle();
    if (taskErr || !task) {
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (task.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await admin
      .from("point_events")
      .select("id")
      .eq("user_id", userId)
      .eq("task_id", taskId)
      .eq("awarded_date", today)
      .maybeSingle();

    const { data: profile } = await admin
      .from("profiles")
      .select("points")
      .eq("user_id", userId)
      .maybeSingle();
    const current = (profile?.points as number | undefined) ?? 0;

    if (!existing) {
      return new Response(JSON.stringify({ success: true, new_total: current }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("point_events")
      .delete()
      .eq("user_id", userId)
      .eq("task_id", taskId)
      .eq("awarded_date", today);

    const newTotal = Math.max(0, current - POINTS_PER_TASK);
    await admin.from("profiles").update({ points: newTotal }).eq("user_id", userId);

    return new Response(JSON.stringify({ success: true, new_total: newTotal }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("remove-task-points error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
