import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BRAWL_API_KEY = Deno.env.get("BRAWL_STARS_API_KEY") || "";

// Use RoyaleAPI proxy for Brawl Stars API (IP whitelist workaround)
const BRAWL_API_BASE = "https://proxy.royaleapi.dev/v1";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (req.method === "POST") {
      const body = await req.json();

      // Add new member manually (force add)
      if (body.forceAdd && body.members && Array.isArray(body.members)) {
        const results = await addNewMembers(supabase, body.members);
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Manual sync from Brawlify (update only existing members)
      if (body.members && Array.isArray(body.members)) {
        const results = await syncMembersManually(supabase, body.members);
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Reset week (set start trophies = current trophies)
      if (body.resetWeek === true) {
        const result = await resetWeek(supabase);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Auto sync from Brawl Stars API (requires API key + club tag)
      if (body.autoSync === true && body.clubTag && BRAWL_API_KEY) {
        const result = await autoSyncFromAPI(supabase, body.clubTag);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (body.autoSync === true && !BRAWL_API_KEY) {
        return new Response(JSON.stringify({
          error: "API key not configured. Add BRAWL_STARS_API_KEY secret to Supabase."
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (body.autoSync === true && !body.clubTag) {
        return new Response(JSON.stringify({
          error: "Club tag required for auto-sync. Provide clubTag in request body."
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (req.method === "GET") {
      // Get history
      if (new URL(req.url).searchParams.get("history") === "true") {
        const { data: history, error } = await supabase
          .from("weekly_snapshots")
          .select("*")
          .order("week_start", { ascending: false })
          .order("progress", { ascending: false });

        if (error) throw error;

        // Group by week
        const grouped: Record<string, typeof history> = {};
        for (const snap of (history || [])) {
          const week = snap.week_start;
          if (!grouped[week]) grouped[week] = [];
          grouped[week].push(snap);
        }

        return new Response(JSON.stringify({ history: grouped }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Get current members
      const { data: members, error } = await supabase
        .from("club_members")
        .select("*")
        .order("trophies", { ascending: false });

      if (error) throw error;

      const { data: lastSync } = await supabase
        .from("sync_log")
        .select("*")
        .order("sync_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(JSON.stringify({
        members,
        lastSync,
        hasApiKey: !!BRAWL_API_KEY,
        apiConfigured: !!BRAWL_API_KEY
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

async function syncMembersManually(supabase: any, members: Array<{tag: string, name: string, trophies: number}>) {
  let updated = 0;
  let skipped = 0;
  const notFound: string[] = [];

  console.log("Sync request - members to sync:", members.length);

  for (const member of members) {
    const normalizedTag = member.tag.startsWith("#") ? member.tag : `#${member.tag}`;
    console.log(`Processing: ${member.name} | Tag: ${normalizedTag} | Trophies: ${member.trophies}`);

    const { data: existing } = await supabase
      .from("club_members")
      .select("*")
      .eq("tag", normalizedTag)
      .maybeSingle();

    console.log(`Lookup result for ${normalizedTag}:`, existing ? 'FOUND' : 'NOT FOUND');

    if (existing) {
      const { error } = await supabase
        .from("club_members")
        .update({
          name: member.name,
          trophies: member.trophies,
          updated_at: new Date().toISOString()
        })
        .eq("tag", normalizedTag);

      if (error) {
        console.error(`Update error for ${normalizedTag}:`, error);
      } else {
        console.log(`Updated: ${member.name} (${normalizedTag}): ${existing.trophies} → ${member.trophies}`);
        updated++;
      }
    } else {
  const { error } = await supabase
    .from("club_members")
    .insert({
      tag: normalizedTag,
      name: member.name,
      trophies: member.trophies,
      start_trophies: member.trophies
    });

  if (error) {
    console.error(`Insert error for ${normalizedTag}:`, error);
  } else {
    console.log(`Inserted: ${member.name} (${normalizedTag})`);
    updated++;
  }
}
  }

  await supabase.from("sync_log").insert({
    sync_type: "manual",
    members_count: members.length
  });

  return {
    success: true,
    updated,
    skipped,
    notFound,
    message: `Zaktualizowano ${updated} graczy, pominieto ${skipped} (nie w bazie)`
  };
}

async function addNewMembers(supabase: any, members: Array<{tag: string, name: string, trophies: number}>) {
  let inserted = 0;
  let updated = 0;

  for (const member of members) {
    const normalizedTag = member.tag.startsWith("#") ? member.tag : `#${member.tag}`;

    const { data: existing } = await supabase
      .from("club_members")
      .select("*")
      .eq("tag", normalizedTag)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("club_members")
        .update({
          name: member.name,
          trophies: member.trophies,
          updated_at: new Date().toISOString()
        })
        .eq("tag", normalizedTag);
      updated++;
    } else {
      const { error } = await supabase
  .from("club_members")
  .insert({
    tag: normalizedTag,
    name: member.name,
    trophies: member.trophies,
    start_trophies: member.trophies
  });

if (error) {
  console.error(error);
} else {
  inserted++;
}
    }
  }

  return { success: true, inserted, updated, message: `Dodano ${inserted} nowych, zaktualizowano ${updated}` };
}

async function resetWeek(supabase: any) {
  const { data: members } = await supabase
    .from("club_members")
    .select("tag, name, trophies, start_trophies");

  if (!members || members.length === 0) return { success: false, error: "No members found" };

  // Get current week's Monday
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // Save snapshots for current week BEFORE resetting
  let snapshotsSaved = 0;
  for (const member of members) {
    const progress = member.trophies - member.start_trophies;

    // Upsert snapshot
    const { error: snapError } = await supabase
      .from("weekly_snapshots")
      .upsert({
        member_tag: member.tag,
        member_name: member.name,
        week_start: weekStartStr,
        start_trophies: member.start_trophies,
        end_trophies: member.trophies,
        progress: progress
      }, { onConflict: 'member_tag,week_start' });

    if (!snapError) snapshotsSaved++;
  }

  // Reset start trophies for new week
  for (const member of members) {
    await supabase
      .from("club_members")
      .update({ start_trophies: member.trophies })
      .eq("tag", member.tag);
  }

  return {
    success: true,
    resetCount: members.length,
    snapshotsSaved,
    weekStart: weekStartStr,
    message: `Zapisano ${snapshotsSaved} wynikow tygodnia i zresetowano pucharki startowe`
  };
}

async function autoSyncFromAPI(supabase: any, clubTag: string) {
  const headers = {
    "Authorization": `Bearer ${BRAWL_API_KEY}`,
    "Accept": "application/json"
  };

  // Normalize club tag (remove # and encode)
  const encodedTag = encodeURIComponent(clubTag.replace("#", ""));

  try {
    // Get club info including members
    const response = await fetch(`${BRAWL_API_BASE}/clubs/%23${encodedTag}`, {
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `API error: ${response.status} - ${errorText}`,
        hint: "Make sure IP whitelist on API key includes: 45.79.218.79"
      };
    }

    const clubData = await response.json();

    if (!clubData.members || !Array.isArray(clubData.members)) {
      return {
        success: false,
        error: "No members found in club data",
        clubData
      };
    }

    // Sync each member
    let inserted = 0;
    let updated = 0;

    for (const member of clubData.members) {
      const normalizedTag = member.tag.startsWith("#") ? member.tag : `#${member.tag}`;

      const { data: existing } = await supabase
        .from("club_members")
        .select("*")
        .eq("tag", normalizedTag)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("club_members")
          .update({
            name: member.name,
            trophies: member.trophies,
            updated_at: new Date().toISOString()
          })
          .eq("tag", normalizedTag);
        updated++;
      } else {
        await supabase
          .from("club_members")
          .insert({
            tag: normalizedTag,
            name: member.name,
            trophies: member.trophies,
            start_trophies: member.trophies
          });
        inserted++;
      }
    }

    await supabase.from("sync_log").insert({
      sync_type: "automatic",
      members_count: clubData.members.length
    });

    return {
      success: true,
      inserted,
      updated,
      total: clubData.members.length,
      clubName: clubData.name,
      clubTag: clubData.tag
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      hint: "API request failed. Check if API key is valid and IP is whitelisted."
    };
  }
}
