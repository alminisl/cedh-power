-- Drop the old restrictive SELECT policy
drop policy if exists "Users can view own decklists" on decklists;
drop policy if exists "Authenticated users can view all decklists" on decklists;

-- Allow anyone (including anonymous / unauthenticated visitors) to read decklists
create policy "Public can view all decklists" on decklists
  for select using (true);

-- Also allow public reads on deck_snapshots so power-rank history is visible
drop policy if exists "Users can view own snapshots" on deck_snapshots;
drop policy if exists "Authenticated users can view all snapshots" on deck_snapshots;

create policy "Public can view all snapshots" on deck_snapshots
  for select using (true);
