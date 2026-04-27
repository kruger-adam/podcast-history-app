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

  const { episode_uuid, rating } = await request.json();
  if (!episode_uuid) {
    return NextResponse.json({ error: "episode_uuid required" }, { status: 400 });
  }

  const service = createServiceClient();

  if (!rating || rating < 1 || rating > 5) {
    await service
      .from("ratings")
      .delete()
      .eq("user_id", user.id)
      .eq("episode_uuid", episode_uuid);
    return NextResponse.json({ success: true, deleted: true });
  }

  const { error } = await service.from("ratings").upsert(
    {
      user_id: user.id,
      episode_uuid,
      rating,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,episode_uuid" }
  );

  if (error) {
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
