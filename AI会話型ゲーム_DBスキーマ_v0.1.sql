create extension if not exists "pgcrypto";

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  current_bell int not null default 1 check (current_bell between 1 and 5),
  ending_route text null check (ending_route in ('sweet','bitter')),
  final_image_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists turns (
  id bigserial primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  role text not null check (role in ('user','npc')),
  text text not null,
  raw_llm_json jsonb null,
  created_at timestamptz not null default now()
);
create index if not exists idx_turns_session_created on turns(session_id, created_at);

create table if not exists state_snapshots (
  id bigserial primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  bell int not null default 1 check (bell between 1 and 5),
  affection int not null default 40,
  trust int not null default 40,
  tension int not null default 35,
  turns_since_touch int not null default 3,
  ending_route text null check (ending_route in ('sweet','bitter')),
  portrait_tokens jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_snapshots_session_created on state_snapshots(session_id, created_at);

create table if not exists events (
  id bigserial primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_session_created on events(session_id, created_at);
