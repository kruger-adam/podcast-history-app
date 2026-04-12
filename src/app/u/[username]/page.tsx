export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Episode, Note, SyncState } from "@/lib/types";

interface Props {
  params: Promise<{ username: string }>;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC";
  } catch {
    return iso;
  }
}

function formatDateShort(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  } catch {
    return "";
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 120) return `${mins} min`;
  const hours = mins / 60;
  if (hours < 48) return `${hours.toFixed(1)} hrs`;
  return `${(mins / (24 * 60)).toFixed(1)} days`;
}

function groupByMonth(episodes: Episode[]): Map<string, Episode[]> {
  const groups = new Map<string, Episode[]>();
  for (const ep of episodes) {
    const key = new Date(ep.listened_date).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ep);
  }
  return groups;
}

function getPodcastStats(episodes: Episode[]) {
  const stats = new Map<string, { episodes: number; time: number; first: string; last: string; podcast_uuid: string }>();
  for (const ep of episodes) {
    const name = ep.podcast_title || "Unknown";
    if (!stats.has(name)) {
      stats.set(name, { episodes: 0, time: 0, first: ep.listened_date, last: ep.listened_date, podcast_uuid: ep.podcast_uuid });
    }
    const s = stats.get(name)!;
    s.episodes++;
    s.time += ep.played_up_to || ep.duration;
    if (ep.listened_date < s.first) s.first = ep.listened_date;
    if (ep.listened_date > s.last) s.last = ep.listened_date;
  }
  return Array.from(stats.entries()).sort((a, b) => b[1].time - a[1].time);
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  const [episodesResult, notesResult, syncStateResult] = await Promise.all([
    service
      .from("episodes")
      .select("*")
      .eq("user_id", profile.id)
      .or("played_up_to.gte.60,duration.gte.60")
      .order("listened_date", { ascending: false }),
    service.from("notes").select("*").eq("user_id", profile.id),
    service.from("sync_state").select("*").eq("user_id", profile.id).maybeSingle(),
  ]);

  const episodes = (episodesResult.data || []) as Episode[];
  const notesMap = new Map<string, Note>(
    ((notesResult.data || []) as Note[]).map((n) => [n.episode_uuid, n])
  );
  const syncState = syncStateResult.data as SyncState | null;

  const totalMinutes = Math.floor(
    episodes.reduce((sum, ep) => sum + (ep.played_up_to || ep.duration), 0) / 60
  );
  const podcastSet = new Set(episodes.map((ep) => ep.podcast_title));
  const timeStr = totalMinutes < 120
    ? `${totalMinutes.toLocaleString()} min`
    : totalMinutes < 2 * 24 * 60
    ? `${(totalMinutes / 60).toFixed(1)} hrs`
    : `${(totalMinutes / (24 * 60)).toFixed(1)} days`;

  const avgSpeed =
    syncState && syncState.time_listened > 0
      ? ((syncState.time_listened + syncState.time_variable_speed) / syncState.time_listened).toFixed(1)
      : null;

  const monthGroups = groupByMonth(episodes);
  const podcastStats = getPodcastStats(episodes);
  const maxTime = podcastStats[0]?.[1].time || 1;

  const displayName = profile.display_name || profile.username;

  return (
    <div className="container">
      <h1>{displayName}&apos;s Podcast History</h1>
      <p className="subtitle">What they&apos;ve been listening to lately</p>

      <div className="stats">
        <div className="stat">
          <span className="stat-num">{episodes.length.toLocaleString()}</span>
          episodes
        </div>
        <div className="stat">
          <span className="stat-num">{podcastSet.size.toLocaleString()}</span>
          podcasts
        </div>
        <div className="stat">
          <span className="stat-num">{timeStr}</span>
          listened
        </div>
        {avgSpeed && (
          <div className="stat">
            <span className="stat-num">{avgSpeed}x</span>
            avg speed
          </div>
        )}
      </div>

      {podcastStats.length > 0 && (
        <div className="podcast-stats">
          <details open>
            <summary className="month-header" style={{ cursor: "pointer", listStyle: "none" }}>
              Podcasts ▾
            </summary>
            <div className="podcast-list">
              {podcastStats.map(([name, ps]) => {
                const pct = (ps.time / maxTime) * 100;
                const artworkUrl = `https://static.pocketcasts.com/discover/images/webp/200/${ps.podcast_uuid}.webp`;
                const dateFrom = formatDateShort(ps.first);
                const dateTo = formatDateShort(ps.last);
                const dateRange = dateFrom === dateTo ? dateTo : dateFrom && dateTo ? `${dateFrom} – ${dateTo}` : dateTo;
                return (
                  <div key={name} className="podcast-row">
                    <img className="podcast-row-art" src={artworkUrl} alt={name} loading="lazy" />
                    <div className="podcast-row-info">
                      <div className="podcast-row-name">{name}</div>
                      <div className="podcast-row-meta">
                        {ps.episodes} ep · {formatDuration(ps.time)}{dateRange ? ` · ${dateRange}` : ""}
                      </div>
                      <div className="podcast-bar-bg">
                        <div className="podcast-bar" style={{ width: `${pct.toFixed(0)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </div>
      )}

      {Array.from(monthGroups.entries()).map(([month, eps]) => (
        <div key={month}>
          <h2 className="month-header">{month}</h2>
          {eps.map((ep) => {
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
            const published = ep.published_at
              ? new Date(ep.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
              : "";

            return (
              <div key={ep.episode_uuid} className="episode">
                <img className="episode-art" src={artworkUrl} alt={ep.podcast_title} loading="lazy" />
                <div className="episode-info">
                  <div className="episode-podcast">{ep.podcast_title}</div>
                  <a
                    className="episode-title"
                    href={`https://www.google.com/search?q=${encodeURIComponent(ep.podcast_title + " " + ep.title)}&btnI`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ep.title}
                  </a>
                  <div className="episode-meta">
                    {published && <span>{published}</span>}
                    {durationStr && <span>{durationStr}</span>}
                  </div>
                  {note && (note.reason || note.takeaways) && (
                    <NoteDisplay reason={note.reason} takeaways={note.takeaways} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="footer">
        Last synced: {formatDate(syncState?.last_synced ?? null)}<br />
        Powered by Pocket Casts
      </div>
    </div>
  );
}

function NoteDisplay({ reason, takeaways }: { reason: string | null; takeaways: string | null }) {
  const parts: string[] = [];
  if (reason) parts.push(`<span class="note-label">Why I listened:</span> ${escapeHtml(reason)}`);
  if (takeaways) parts.push(`<span class="note-label">Takeaways:</span> ${escapeHtml(takeaways)}`);
  const fullHtml = parts.join("<br>");

  const firstText = reason || takeaways || "";
  const previewLimit = 120;

  if (firstText.length <= previewLimit && !(reason && takeaways)) {
    return (
      <div className="episode-notes" dangerouslySetInnerHTML={{ __html: fullHtml }} />
    );
  }

  const preview = firstText.slice(0, previewLimit).replace(/\s\S+$/, "") + "...";
  const firstLabel = reason ? "Why I listened" : "Takeaways";
  const previewHtml = `<span class="note-label">${firstLabel}:</span> ${escapeHtml(preview)}`;

  return (
    <div className="episode-notes">
      <span className="note-preview">
        <span dangerouslySetInnerHTML={{ __html: previewHtml }} />{" "}
        <span className="note-toggle">more</span>
      </span>
      <div className="note-full">
        <span dangerouslySetInnerHTML={{ __html: fullHtml }} />{" "}
        <span className="note-toggle">less</span>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
