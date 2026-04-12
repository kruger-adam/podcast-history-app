import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { login } from "@/lib/pocketcasts";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  // Validate by attempting a Pocket Casts login
  try {
    await login(email, password);
  } catch {
    return NextResponse.json(
      { error: "Invalid Pocket Casts credentials. Check your email and password." },
      { status: 422 }
    );
  }

  // Ensure the profile row exists (FK required by credentials table)
  const service = createServiceClient();
  const username = user.user_metadata?.username;
  if (username) {
    const { error: profileError } = await service
      .from("profiles")
      .upsert({ id: user.id, username }, { onConflict: "id" });
    if (profileError) {
      console.error("Profile upsert failed:", profileError);
      return NextResponse.json({ error: `Profile error: ${profileError.message}` }, { status: 500 });
    }
  } else {
    // Check if a profile already exists
    const { data: existingProfile } = await service
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!existingProfile) {
      console.error("No profile and no username in metadata for user:", user.id, "metadata:", user.user_metadata);
      return NextResponse.json({ error: "Account setup incomplete: no username found. Please contact support." }, { status: 500 });
    }
  }

  // Encrypt and store
  const { error } = await service.from("credentials").upsert(
    {
      user_id: user.id,
      pc_email_encrypted: encrypt(email),
      pc_password_encrypted: encrypt(password),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Credentials upsert failed:", error);
    return NextResponse.json({ error: `DB error: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
