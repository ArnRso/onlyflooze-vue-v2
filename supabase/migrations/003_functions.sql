-- Résumé mensuel par catégorie (dépensé vs objectif)
create or replace function monthly_summary(target_month date)
returns table (
  category_id   uuid,
  category_name text,
  total         numeric,
  goal          numeric,
  tx_count      int
)
language sql
security definer
set search_path = public
as $$
  select
    c.id                                    as category_id,
    c.name                                  as category_name,
    coalesce(sum(t.amount), 0)              as total,
    bg.amount                               as goal,
    count(t.id)::int                        as tx_count
  from categories c
  left join transactions t
         on t.category_id = c.id
        and t.user_id = auth.uid()
        and date_trunc('month', t.date) = date_trunc('month', target_month)
        and not t.is_ignored
  left join budget_goals bg
         on bg.category_id = c.id
        and bg.user_id = auth.uid()
        and bg.month = date_trunc('month', target_month)::date
  where c.user_id = auth.uid()
  group by c.id, c.name, bg.amount
  order by abs(coalesce(sum(t.amount), 0)) desc;
$$;
