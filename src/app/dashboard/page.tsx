export const dynamic = "force-dynamic";

import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import SyncButton from "@/components/SyncButton";
import NoteEditor from "@/components/NoteEditor";
import Link from "next/link";
import type { Episode, Note, SyncState } from "@/lib/types";
import LocalDate from "@/components/LocalDate";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 120) return `${mins} min`;
  const hours = mins / 60;
  if (hours < 48) return `${hours.toFixed(1)} hrs`;
  return `${(mins / (24 * 60)).toFixed(1)} days`;
}

// Podcasts collapsed into a single history row instead of per-episode
const COLLAPSED_PODCAST_UUIDS = new Set([
  "50cf73a0-6e7f-0137-f267-1d245fc5f9cf", // Harry Potter and the Methods of Rationality Audiobook
]);

interface CollapsedPodcast {
  podcast_uuid: string;
  podcast_title: string;
  episode_count: number;
  total_listened: number;
  latest_listened_date: string;
}

function buildCollapsedPodcasts(episodes: Episode[]): CollapsedPodcast[] {
  const map = new Map<string, CollapsedPodcast>();
  for (const ep of episodes) {
    if (!COLLAPSED_PODCAST_UUIDS.has(ep.podcast_uuid)) continue;
    const existing = map.get(ep.podcast_uuid);
    if (existing) {
      existing.episode_count++;
      existing.total_listened += ep.played_up_to || 0;
      if (ep.listened_date > existing.latest_listened_date) {
        existing.latest_listened_date = ep.listened_date;
      }
    } else {
      map.set(ep.podcast_uuid, {
        podcast_uuid: ep.podcast_uuid,
        podcast_title: ep.podcast_title,
        episode_count: 1,
        total_listened: ep.played_up_to || 0,
        latest_listened_date: ep.listened_date,
      });
    }
  }
  return Array.from(map.values());
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

  const collapsedPodcasts = buildCollapsedPodcasts(episodes);
  const collapsedUuids = new Set(collapsedPodcasts.map((p) => p.podcast_uuid));
  const normalEpisodes = episodes.filter((ep) => !collapsedUuids.has(ep.podcast_uuid));

  type FeedItem =
    | { kind: "episode"; data: Episode; sortDate: string }
    | { kind: "collapsed"; data: CollapsedPodcast; sortDate: string };

  const feedItems: FeedItem[] = [
    ...normalEpisodes.map((ep) => ({ kind: "episode" as const, data: ep, sortDate: ep.listened_date })),
    ...collapsedPodcasts.map((p) => ({ kind: "collapsed" as const, data: p, sortDate: p.latest_listened_date })),
  ].sort((a, b) => b.sortDate.localeCompare(a.sortDate));

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
          Last synced: <strong><LocalDate iso={syncState?.last_synced ?? null} fallback="Never" /></strong>
          {" · "}
          {episodes.length} episodes
        </p>
        <SyncButton />
      </div>

      {feedItems.length > 0 && (
        <div className="episode-list">
          <h2 className="month-header">Your Episodes</h2>
          {feedItems.map((item) => {
            if (item.kind === "collapsed") {
              const p = item.data;
              const artworkUrl = `https://static.pocketcasts.com/discover/images/webp/200/${p.podcast_uuid}.webp`;
              const note = notesMap.get(p.podcast_uuid);
              return (
                <div key={p.podcast_uuid} className="episode dashboard-episode">
                  <img className="episode-art" src={artworkUrl} alt={p.podcast_title} loading="lazy" />
                  <div className="episode-info" style={{ flex: 1 }}>
                    <div className="episode-podcast">{p.podcast_title}</div>
                    <div className="episode-meta">
                      <span><LocalDate iso={p.latest_listened_date} /></span>
                      <span>{p.episode_count} episodes · {formatDuration(p.total_listened)} listened</span>
                    </div>
                    <NoteEditor
                      episodeUuid={p.podcast_uuid}
                      initialReason={note?.reason}
                      initialTakeaways={note?.takeaways}
                    />
                  </div>
                </div>
              );
            }

            const ep = item.data;
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
                <img className="episode-art" src={artworkUrl} alt={ep.podcast_title} loading="lazy" />
                <div className="episode-info" style={{ flex: 1 }}>
                  <div className="episode-podcast">{ep.podcast_title}</div>
                  <div className="episode-title" style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
                    {ep.title}
                  </div>
                  <div className="episode-meta">
                    <span><LocalDate iso={ep.listened_date} /></span>
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
