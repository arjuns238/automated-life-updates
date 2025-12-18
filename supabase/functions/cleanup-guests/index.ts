import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY envs for cleanup-guests");
}

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

const isExpiredGuest = (user: any) => {
  const meta = user?.user_metadata ?? {};
  if (!meta.guest) return false;
  const expires = meta.expires_at ? Date.parse(meta.expires_at) : NaN;
  return Number.isFinite(expires) && expires < Date.now();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!supabase) {
    return new Response("Supabase admin client not configured", {
      status: 500,
      headers: corsHeaders,
    });
  }

  const deletedIds: string[] = [];
  const failedIds: Array<{ id: string; error: string }> = [];
  let page = 1;

  try {
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) {
        throw new Error(`List users failed: ${error.message}`);
      }

      const users = data?.users ?? [];
      if (!users.length) break;

      for (const user of users) {
        if (!isExpiredGuest(user)) continue;
        const userId = user.id;

        try {
          // Clean non-cascading tables first
          await supabase.from("life_updates").delete().eq("user_id", userId);
          // Integrations table may not exist everywhere; ignore if it fails
          await supabase.from("integrations").delete().eq("user_id", userId).catch(() => {});

          // Delete auth user (cascades handle group tables and messages)
          const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
          if (deleteError) {
            throw new Error(deleteError.message);
          }

          deletedIds.push(userId);
        } catch (innerErr) {
          failedIds.push({ id: userId, error: String(innerErr) });
        }
      }

      if (users.length < 1000) break;
      page += 1;
    }

    return new Response(
      JSON.stringify({
        deleted_count: deletedIds.length,
        deleted_ids: deletedIds,
        failed: failedIds,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("cleanup-guests failed:", err);
    return new Response(
      JSON.stringify({ error: String(err), deleted_ids: deletedIds, failed: failedIds }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
