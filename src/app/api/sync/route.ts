import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { login, fetchEpisodes, fetchStats } from "@/lib/pocketcasts";
import { NextResponse } from "next/server";

function isCronRequest(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  return !!secret && authHeader === `Bearer ${secret}`;
}

// GET /api/sync?action=list-users — returns all user_ids with credentials (cron only)
export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("credentials")
    .select("user_id");

  if (error) {
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }

  return NextResponse.json({ user_ids: data.map((r) => r.user_id) });
}

// POST /api/sync — sync a single user
export async function POST(request: Request) {
  const service = createServiceClient();
  let userId: string;

  if (isCronRequest(request)) {
    // Scheduled sync — user_id in body
    const body = await request.json();
    userId = body.user_id;
    if (!userId) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }
  } else {
    // Manual "Sync Now" — derive user from session
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  }

  // Fetch and decrypt credentials
  const { data: creds, error: credsError } = await service
    .from("credentials")
    .select("pc_email_encrypted, pc_password_encrypted")
    .eq("user_id", userId)
    .single();

  if (credsError || !creds) {
    return NextResponse.json(
      { error: "No Pocket Casts credentials found. Please connect your account first." },
      { status: 422 }
    );
  }

  const email = decrypt(creds.pc_email_encrypted);
  const password = decrypt(creds.pc_password_encrypted);

  // Mark as syncing
  await service.from("sync_state").upsert(
    { user_id: userId, syncing: true },
    { onConflict: "user_id" }
  );

  try {
    const token = await login(email, password);

    // Fetch episodes and stats in parallel
    const [episodes, stats] = await Promise.all([
      fetchEpisodes(token),
      fetchStats(token),
    ]);

    const now = new Date().toISOString();

    // Fetch existing episodes for this user to determine what's new vs updated
    const { data: existing } = await service
      .from("episodes")
      .select("episode_uuid, played_up_to, duration")
      .eq("user_id", userId);

    const existingMap = new Map(
      (existing || []).map((e) => [e.episode_uuid, e])
    );

    const toInsert: object[] = [];
    const toUpdate: { episode_uuid: string; played_up_to: number; duration: number }[] = [];

    for (const ep of episodes) {
      if (!ep.uuid) continue;
      const existing = existingMap.get(ep.uuid);
      if (existing) {
        // Update played_up_to and duration if they increased
        if (
          ep.playedUpTo > existing.played_up_to ||
          ep.duration > existing.duration
        ) {
          toUpdate.push({
            episode_uuid: ep.uuid,
            played_up_to: Math.max(ep.playedUpTo, existing.played_up_to),
            duration: Math.max(ep.duration, existing.duration),
          });
        }
      } else {
        toInsert.push({
          user_id: userId,
          episode_uuid: ep.uuid,
          title: ep.title || "Untitled",
          podcast_uuid: ep.podcastUuid || "",
          podcast_title: ep.podcastTitle || "Unknown Podcast",
          published_at: ep.published || null,
          duration: ep.duration || 0,
          played_up_to: ep.playedUpTo || 0,
          url: ep.url || "",
          listened_date: ep.listenedDate || now,
        });
      }
    }

    // Insert new episodes
    if (toInsert.length > 0) {
      await service.from("episodes").insert(toInsert);
    }

    // Update changed episodes one by one (no bulk update on non-PK columns in supabase)
    for (const upd of toUpdate) {
      await service
        .from("episodes")
        .update({ played_up_to: upd.played_up_to, duration: upd.duration })
        .eq("user_id", userId)
        .eq("episode_uuid", upd.episode_uuid);
    }

    // Update sync state
    await service.from("sync_state").upsert(
      {
        user_id: userId,
        last_synced: now,
        time_listened: stats.timeListened,
        time_variable_speed: stats.timeVariableSpeed,
        syncing: false,
      },
      { onConflict: "user_id" }
    );

    return NextResponse.json({
      success: true,
      new_count: toInsert.length,
      updated_count: toUpdate.length,
    });
  } catch (err) {
    await service.from("sync_state").upsert(
      { user_id: userId, syncing: false },
      { onConflict: "user_id" }
    );
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
