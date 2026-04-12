import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard/credentials";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Session is now active — create the profile if it doesn't exist yet
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const username = user.user_metadata?.username;
        if (username) {
          // Use service client so this never fails due to RLS or session timing
          const service = createServiceClient();
          const { error: profileError } = await service
            .from("profiles")
            .upsert({ id: user.id, username }, { onConflict: "id" });

          if (profileError) {
            console.error("Profile creation failed:", profileError);
            return NextResponse.redirect(`${origin}/login?error=profile_setup`);
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
