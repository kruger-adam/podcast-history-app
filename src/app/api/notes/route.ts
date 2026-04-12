import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { episode_uuid, reason, takeaways } = await request.json();
  if (!episode_uuid) {
    return NextResponse.json({ error: "episode_uuid required" }, { status: 400 });
  }

  const service = createServiceClient();
  const reasonTrimmed = (reason || "").trim();
  const takeawaysTrimmed = (takeaways || "").trim();

  // If both fields are empty, delete the note
  if (!reasonTrimmed && !takeawaysTrimmed) {
    await service
      .from("notes")
      .delete()
      .eq("user_id", user.id)
      .eq("episode_uuid", episode_uuid);
    return NextResponse.json({ success: true, deleted: true });
  }

  const { error } = await service.from("notes").upsert(
    {
      user_id: user.id,
      episode_uuid,
      reason: reasonTrimmed || null,
      takeaways: takeawaysTrimmed || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,episode_uuid" }
  );

  if (error) {
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
