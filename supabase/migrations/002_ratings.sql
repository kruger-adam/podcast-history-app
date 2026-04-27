-- Ratings: 1-5 star ratings on episodes
create table ratings (
  user_id uuid not null references profiles(id) on delete cascade,
  episode_uuid text not null,
  rating smallint not null check (rating between 1 and 5),
  updated_at timestamptz default now(),
  primary key (user_id, episode_uuid)
);

alter table ratings enable row level security;

create policy "Ratings are publicly readable"
  on ratings for select using (true);

create policy "Users can insert own ratings"
  on ratings for insert with check (auth.uid() = user_id);

create policy "Users can update own ratings"
  on ratings for update using (auth.uid() = user_id);

create policy "Users can delete own ratings"
  on ratings for delete using (auth.uid() = user_id);
