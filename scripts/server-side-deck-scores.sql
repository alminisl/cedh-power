-- Deck scores are computed server-side (POST /api/decks, POST /api/decks/recompute)
-- using the service role key, which bypasses RLS. Remove the client's ability to
-- write decks/snapshots directly so nobody can submit a made-up power_rank.
--
-- Run AFTER deploying the app with SUPABASE_SERVICE_ROLE_KEY set.

do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('decklists', 'deck_snapshots')
      and cmd in ('INSERT', 'UPDATE', 'ALL')
  loop
    execute format('drop policy %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- Reads stay public and users can still delete their own decks.
drop policy if exists "Public can view all decklists" on decklists;
create policy "Public can view all decklists" on decklists
  for select using (true);

drop policy if exists "Public can view all snapshots" on deck_snapshots;
create policy "Public can view all snapshots" on deck_snapshots
  for select using (true);

drop policy if exists "Users can delete own decklists" on decklists;
create policy "Users can delete own decklists" on decklists
  for delete using (auth.uid() = user_id);
