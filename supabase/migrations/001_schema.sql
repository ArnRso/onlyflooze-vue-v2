-- Extensions
create extension if not exists "pg_trgm";

-- CATEGORIES
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  name       text not null,
  icon       text,
  color      text,
  is_income  boolean not null default false,
  created_at timestamptz not null default now()
);

-- ACCOUNTS
create table if not exists accounts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  name       text not null,
  bank       text,
  currency   text not null default 'EUR',
  created_at timestamptz not null default now()
);

-- RECURRING PATTERNS
create table if not exists recurring_patterns (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users not null,
  label              text not null,
  label_pattern      text,
  category_id        uuid references categories on delete set null,
  expected_amount    numeric(12,2),
  amount_tolerance   numeric(5,4) not null default 0.20,
  frequency          text not null check (frequency in ('monthly','quarterly','annual','weekly')),
  day_of_month       int check (day_of_month between 1 and 31),
  day_tolerance      int not null default 3,
  month_end_behavior text not null default 'last_or_first'
                     check (month_end_behavior in ('last_or_first','last','first')),
  is_income          boolean not null default false,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- TRANSACTIONS
create table if not exists transactions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users not null,
  account_id           uuid references accounts on delete set null,
  external_id          text,
  date                 date not null,
  amount               numeric(12,2) not null,
  label                text not null,
  label_normalized     text,
  category_id          uuid references categories on delete set null,
  recurring_pattern_id uuid references recurring_patterns on delete set null,
  is_recurring         boolean not null default false,
  is_ignored           boolean not null default false,
  ml_category_score    numeric(4,3),
  note                 text,
  created_at           timestamptz not null default now(),
  -- Dédoublonnage à l'import
  unique nulls not distinct (user_id, account_id, external_id)
);

-- BUDGET GOALS
create table if not exists budget_goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  category_id uuid references categories on delete cascade not null,
  month       date not null,   -- toujours le 1er du mois
  amount      numeric(12,2) not null,
  created_at  timestamptz not null default now(),
  unique (user_id, category_id, month)
);

-- ML TRAINING DATA
create table if not exists ml_training_data (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users not null,
  label_normalized text not null,
  category_id      uuid references categories on delete cascade not null,
  confirmed_at     timestamptz not null default now(),
  unique (user_id, label_normalized)
);

-- INDEX
create index if not exists idx_tx_user_date      on transactions (user_id, date desc);
create index if not exists idx_tx_recurring      on transactions (user_id, recurring_pattern_id) where is_recurring = true;
create index if not exists idx_tx_label_norm     on transactions using gin (label_normalized gin_trgm_ops);
create index if not exists idx_ml_label_norm     on ml_training_data using gin (label_normalized gin_trgm_ops);
