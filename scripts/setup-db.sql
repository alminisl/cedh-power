create table decklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  commander text,
  cards text[] not null,
  power_rank float8,
  average_pair_power float8,
  pairs_found int,
  pairs_missing int,
  total_pairs int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table decklists enable row level security;

create policy "Users can view own decklists" on decklists
  for select using (auth.uid() = user_id);

create policy "Users can insert own decklists" on decklists
  for insert with check (auth.uid() = user_id);

create policy "Users can update own decklists" on decklists
  for update using (auth.uid() = user_id);

create policy "Users can delete own decklists" on decklists
  for delete using (auth.uid() = user_id);
