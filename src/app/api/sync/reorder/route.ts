import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { login, fetchEpisodes } from "@/lib/pocketcasts";
import { NextResponse } from "next/server";

// POST /api/sync/reorder — one-time fix to backfill listened_date based on history order
export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  const { data: creds, error: credsError } = await service
    .from("credentials")
    .select("pc_email_encrypted, pc_password_encrypted")
    .eq("user_id", user.id)
    .single();

  if (credsError || !creds) {
    return NextResponse.json(
      { error: "No Pocket Casts credentials found." },
      { status: 422 }
    );
  }

  const email = decrypt(creds.pc_email_encrypted);
  const password = decrypt(creds.pc_password_encrypted);

  const token = await login(email, password);
  const episodes = await fetchEpisodes(token);

  // episodes are ordered most-recent first with listenedDate already assigned
  let updatedCount = 0;
  for (const ep of episodes) {
    if (!ep.uuid || !ep.listenedDate) continue;
    const { error } = await service
      .from("episodes")
      .update({ listened_date: ep.listenedDate })
      .eq("user_id", user.id)
      .eq("episode_uuid", ep.uuid);
    if (!error) updatedCount++;
  }

  return NextResponse.json({ success: true, updated_count: updatedCount });
}
