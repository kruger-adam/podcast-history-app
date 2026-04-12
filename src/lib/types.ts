export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
}

export interface Episode {
  id: string;
  user_id: string;
  episode_uuid: string;
  title: string;
  podcast_uuid: string;
  podcast_title: string;
  published_at: string | null;
  duration: number;
  played_up_to: number;
  url: string;
  listened_date: string;
}

export interface Note {
  user_id: string;
  episode_uuid: string;
  reason: string | null;
  takeaways: string | null;
  updated_at: string;
}

export interface SyncState {
  user_id: string;
  last_synced: string | null;
  time_listened: number;
  time_variable_speed: number;
  syncing: boolean;
}

export interface PocketCastsEpisode {
  uuid: string;
  title: string;
  podcastUuid: string;
  podcastTitle?: string;
  published: string;
  duration: number;
  playedUpTo: number;
  url: string;
  listenedDate?: string;
}

export interface PocketCastsStats {
  timeListened: number;
  timeVariableSpeed: number;
}
