-- Drop the old restrictive SELECT policy
drop policy if exists "Users can view own decklists" on decklists;

-- Allow all authenticated users to read all decklists
create policy "Authenticated users can view all decklists" on decklists
  for select using (auth.role() = 'authenticated');
