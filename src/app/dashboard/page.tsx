export const dynamic = "force-dynamic";

import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import SyncButton from "@/components/SyncButton";
import NoteEditor from "@/components/NoteEditor";
import Link from "next/link";
import type { Episode, Note, SyncState } from "@/lib/types";

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 120) return `${mins} min`;
  const hours = mins / 60;
  if (hours < 48) return `${hours.toFixed(1)} hrs`;
  return `${(mins / (24 * 60)).toFixed(1)} days`;
}

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const service = createServiceClient();

  const [profileResult, syncStateResult, episodesResult, notesResult, credsResult] =
    await Promise.all([
      supabase.from("profiles").select("username, display_name").eq("id", user!.id).single(),
      service.from("sync_state").select("*").eq("user_id", user!.id).maybeSingle(),
      service
        .from("episodes")
        .select("*")
        .eq("user_id", user!.id)
        .order("listened_date", { ascending: false }),
      service.from("notes").select("*").eq("user_id", user!.id),
      service.from("credentials").select("user_id").eq("user_id", user!.id).maybeSingle(),
    ]);

  const profile = profileResult.data;
  const syncState = syncStateResult.data as SyncState | null;
  const episodes = (episodesResult.data || []) as Episode[];
  const notesMap = new Map<string, Note>(
    ((notesResult.data || []) as Note[]).map((n) => [n.episode_uuid, n])
  );
  const hasCreds = !!credsResult.data;

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        {profile && (
          <div className="dashboard-links">
            <Link href={`/u/${profile.username}`} className="profile-link" target="_blank">
              View public profile →
            </Link>
            <Link href="/dashboard/credentials" className="settings-link">
              {hasCreds ? "Update Pocket Casts credentials" : "Connect Pocket Casts"}
            </Link>
          </div>
        )}
      </div>

      {!hasCreds && (
        <div className="notice">
          <p>
            Connect your Pocket Casts account to start syncing your listening history.{" "}
            <Link href="/dashboard/credentials">Connect now →</Link>
          </p>
        </div>
      )}

      <div className="sync-status">
        <p className="text-dim">
          Last synced: <strong>{formatDate(syncState?.last_synced ?? null)}</strong>
          {" · "}
          {episodes.length} episodes
        </p>
        <SyncButton />
      </div>

      {episodes.length > 0 && (
        <div className="episode-list">
          <h2 className="month-header">Your Episodes</h2>
          {episodes.map((ep) => {
            const note = notesMap.get(ep.episode_uuid);
            const played = ep.played_up_to || ep.duration;
            const durationMin = Math.floor(ep.duration / 60);
            const playedMin = Math.floor(played / 60);
            const durationStr = durationMin
              ? playedMin < durationMin - 1
                ? `${playedMin}/${durationMin} min`
                : `✓ ${durationMin} min`
              : "";
            const artworkUrl = `https://static.pocketcasts.com/discover/images/webp/200/${ep.podcast_uuid}.webp`;

            return (
              <div key={ep.episode_uuid} className="episode dashboard-episode">
                <img
                  className="episode-art"
                  src={artworkUrl}
                  alt={ep.podcast_title}
                  loading="lazy"
                />
                <div className="episode-info" style={{ flex: 1 }}>
                  <div className="episode-podcast">{ep.podcast_title}</div>
                  <div className="episode-title" style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
                    {ep.title}
                  </div>
                  <div className="episode-meta">
                    <span>{formatDate(ep.listened_date)}</span>
                    {durationStr && <span>{durationStr}</span>}
                  </div>
                  <NoteEditor
                    episodeUuid={ep.episode_uuid}
                    initialReason={note?.reason}
                    initialTakeaways={note?.takeaways}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {episodes.length === 0 && hasCreds && (
        <p className="text-dim" style={{ marginTop: "2rem" }}>
          No episodes yet. Click &ldquo;Sync Now&rdquo; to fetch your listening history.
        </p>
      )}
    </div>
  );
}
