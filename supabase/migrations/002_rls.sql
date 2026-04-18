-- Activer RLS
alter table categories         enable row level security;
alter table accounts           enable row level security;
alter table recurring_patterns enable row level security;
alter table transactions       enable row level security;
alter table budget_goals       enable row level security;
alter table ml_training_data   enable row level security;

-- Policy unique par table : chaque user ne voit que ses données
create policy "owner_all" on categories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "owner_all" on accounts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "owner_all" on recurring_patterns
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "owner_all" on transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "owner_all" on budget_goals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "owner_all" on ml_training_data
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
