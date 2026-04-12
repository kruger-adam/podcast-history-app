export const dynamic = "force-dynamic";

import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import CredentialsForm from "@/components/CredentialsForm";
import Link from "next/link";

export default async function CredentialsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const service = createServiceClient();
  const { data: creds } = await service
    .from("credentials")
    .select("user_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <div className="container">
      <div className="dashboard-header">
        <Link href="/dashboard" className="back-link">← Dashboard</Link>
        <h1>Connect Pocket Casts</h1>
        <p className="subtitle">
          Your credentials are encrypted and stored securely. They&apos;re used only to sync your listening history.
        </p>
        <p className="subtitle">
          If you don&apos;t have a Pocket Casts account yet, sign up with email and password — Apple/Google sign-in is not currently supported.
        </p>
      </div>
      <CredentialsForm hasExisting={!!creds} />
    </div>
  );
}
