import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return (
    <div className="landing">
      <h1>Podcast History</h1>
      <p className="subtitle">
        A shareable page that tracks what you&apos;ve been listening to. Connect your Pocket Casts account and get a public profile at <code style={{ color: "var(--accent)", fontSize: "0.9em" }}>/u/you</code>.
      </p>
      <div className="landing-actions">
        <Link href="/signup" className="btn-primary">Get started</Link>
        <Link href="/login" className="btn-secondary">Sign in</Link>
      </div>
      <div className="landing-features">
        <div className="landing-feature">Automatically syncs every 12 hours</div>
        <div className="landing-feature">Public profile page you can share</div>
        <div className="landing-feature">Add notes — why you listened, what you took away</div>
        <div className="landing-feature">Stats: total time, avg playback speed, top podcasts</div>
      </div>
    </div>
  );
}
