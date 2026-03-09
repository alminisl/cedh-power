create table parquet_versions (
  id uuid primary key default gen_random_uuid(),
  r2_key text not null,
  original_filename text,
  pair_count int not null,
  card_count int not null,
  file_size_bytes bigint,
  is_active boolean default false,
  uploaded_by text,
  created_at timestamptz default now()
);

alter table parquet_versions enable row level security;

-- Anyone can read versions (needed to show active version info)
create policy "Public can view versions" on parquet_versions
  for select using (true);

-- Only authenticated users can insert (admin check happens in app)
create policy "Authenticated users can insert versions" on parquet_versions
  for insert with check (auth.uid() is not null);

-- Only authenticated users can update (for toggling is_active)
create policy "Authenticated users can update versions" on parquet_versions
  for update using (auth.uid() is not null);
