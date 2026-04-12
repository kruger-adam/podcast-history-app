import { createServerClient } from "@/lib/supabase/server";
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
          // upsert so a double-click on the confirmation link doesn't error
          await supabase.from("profiles").upsert(
            { id: user.id, username },
            { onConflict: "id" }
          );
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
