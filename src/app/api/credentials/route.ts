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

  // Encrypt and store
  const service = createServiceClient();
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
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
