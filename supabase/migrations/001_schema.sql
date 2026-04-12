-- Profiles: public user info
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$'),
  display_name text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Credentials: encrypted Pocket Casts creds
create table credentials (
  user_id uuid primary key references profiles(id) on delete cascade,
  pc_email_encrypted text not null,
  pc_password_encrypted text not null,
  updated_at timestamptz default now()
);

alter table credentials enable row level security;

create policy "Users can manage own credentials"
  on credentials for all using (auth.uid() = user_id);

-- Episodes: listening history per user
create table episodes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  episode_uuid text not null,
  title text not null,
  podcast_uuid text not null default '',
  podcast_title text not null default 'Unknown Podcast',
  published_at timestamptz,
  duration int default 0,
  played_up_to int default 0,
  url text default '',
  listened_date timestamptz not null,
  unique (user_id, episode_uuid)
);

alter table episodes enable row level security;

create policy "Episodes are publicly readable"
  on episodes for select using (true);

create policy "Users can manage own episodes"
  on episodes for all using (auth.uid() = user_id);

create index idx_episodes_user_listened on episodes (user_id, listened_date desc);

-- Notes: user-written notes on episodes
create table notes (
  user_id uuid not null references profiles(id) on delete cascade,
  episode_uuid text not null,
  reason text,
  takeaways text,
  updated_at timestamptz default now(),
  primary key (user_id, episode_uuid)
);

alter table notes enable row level security;

create policy "Notes are publicly readable"
  on notes for select using (true);

create policy "Users can insert own notes"
  on notes for insert with check (auth.uid() = user_id);

create policy "Users can update own notes"
  on notes for update using (auth.uid() = user_id);

create policy "Users can delete own notes"
  on notes for delete using (auth.uid() = user_id);

-- Sync state: per-user sync metadata + stats
create table sync_state (
  user_id uuid primary key references profiles(id) on delete cascade,
  last_synced timestamptz,
  time_listened int default 0,
  time_variable_speed int default 0,
  syncing boolean default false
);

alter table sync_state enable row level security;

create policy "Sync state is publicly readable"
  on sync_state for select using (true);

create policy "Users can manage own sync state"
  on sync_state for all using (auth.uid() = user_id);
