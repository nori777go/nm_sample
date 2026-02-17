-- AI会話型ゲーム DBスキーマ v0.1（Postgres / Supabase想定）
-- 文字コード：UTF-8

create table if not exists sessions (
  id uuid primary key,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  device_hint text,
  ending_route text check (ending_route in ('sweet','bitter')),
  final_image_url text
);

create table if not exists turns (
  id bigserial primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  turn_index int not null,
  role text not null check (role in ('user','npc','system')),
  content text not null,
  raw_llm_json jsonb,
  created_at timestamptz not null default now(),
  unique(session_id, turn_index, role)
);

create table if not exists state_snapshots (
  id bigserial primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  turn_index int not null,
  bell_id int not null check (bell_id between 0 and 5),
  trust int not null check (trust between -100 and 100),
  tension int not null check (tension between 0 and 100),
  mystery int not null check (mystery between 0 and 100),
  distance text not null check (distance in ('far','near','touch')),
  setting_guess text not null check (setting_guess in ('unknown','pit','cave','facility')),
  identity_guess text not null check (identity_guess in ('unknown','rescuer','pursuer','past_connection')),
  ending_route text check (ending_route in ('sweet','bitter')),
  portrait_tokens jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(session_id, turn_index)
);

create table if not exists events (
  id bigserial primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  turn_index int not null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_turns_session on turns(session_id);
create index if not exists idx_snapshots_session on state_snapshots(session_id);
create index if not exists idx_events_session on events(session_id);
