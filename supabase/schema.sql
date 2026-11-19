create table if not exists buildings (
  code    text primary key,              
  name    text not null,                 
  short   text not null,                
  aliases text[] not null default '{}',  
  sort    int not null default 0
);

create table if not exists rooms (
  id        text primary key,            
  building  text not null references buildings(code),
  number    text not null,               
  name      text,                        
  floor     text not null default '',
  seats     int,
  unique (building, number),
  check (id = upper(building || '-' || number))
);

create table if not exists equipment (
  id         uuid primary key default gen_random_uuid(),
  room_id    text not null references rooms(id) on delete cascade,
  key        text not null default 'vlastne',
  label      text not null check (char_length(label) between 2 and 60),
  user_id    uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (room_id, label)
);

create table if not exists equipment_votes (
  equipment_id uuid not null references equipment(id) on delete cascade,
  user_id      uuid not null references auth.users(id) default auth.uid(),
  value        text not null check (value in ('ano', 'nie')),
  created_at   timestamptz not null default now(),
  primary key (equipment_id, user_id)
);

create table if not exists tips (
  id         uuid primary key default gen_random_uuid(),
  room_id    text not null references rooms(id) on delete cascade,
  text       text not null check (char_length(text) between 3 and 80),
  user_id    uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists photos (
  id         uuid primary key default gen_random_uuid(),
  room_id    text not null references rooms(id) on delete cascade,
  path       text not null,
  user_id    uuid references auth.users(id) default auth.uid(),
  hidden     boolean not null default false,   -- moderátor môže fotku skryť
  created_at timestamptz not null default now()
);

create sequence if not exists problems_id_seq start 1000;
create table if not exists problems (
  id          bigint primary key default nextval('problems_id_seq'),
  room_id     text not null references rooms(id) on delete cascade,
  category    text not null,
  text        text not null check (char_length(text) between 3 and 300),
  photo_path  text,
  user_id     uuid references auth.users(id) default auth.uid(),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists problem_votes (
  problem_id bigint not null references problems(id) on delete cascade,
  user_id    uuid not null references auth.users(id) default auth.uid(),
  kind       text not null check (kind in ('same', 'fixed')),
  created_at timestamptz not null default now(),
  primary key (problem_id, user_id, kind)
);

-- Keď 3 rôzni študenti potvrdia „Už funguje“, problém sa uzavrie.
create or replace function close_fixed_problem() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  pid bigint := coalesce(new.problem_id, old.problem_id);
  n int;
begin
  select count(*) into n from problem_votes where problem_id = pid and kind = 'fixed';
  update problems
     set resolved_at = case when n >= 3 then coalesce(resolved_at, now()) else null end
   where id = pid;
  return null;
end $$;

drop trigger if exists trg_close_fixed on problem_votes;
create trigger trg_close_fixed after insert or delete on problem_votes
for each row execute function close_fixed_problem();

-- Row Level Security: čítať môže každý, písať len prihlásený (aj anonymne) a len za seba.
alter table buildings enable row level security;
alter table rooms enable row level security;
alter table equipment enable row level security;
alter table equipment_votes enable row level security;
alter table tips enable row level security;
alter table photos enable row level security;
alter table problems enable row level security;
alter table problem_votes enable row level security;

create policy "read buildings" on buildings for select using (true);
create policy "read rooms" on rooms for select using (true);
create policy "read equipment" on equipment for select using (true);
create policy "read equipment votes" on equipment_votes for select using (true);
create policy "read tips" on tips for select using (true);
create policy "read photos" on photos for select using (not hidden);
create policy "read problems" on problems for select using (true);
create policy "read problem votes" on problem_votes for select using (true);

create policy "add equipment" on equipment for insert to authenticated with check (user_id = auth.uid());
create policy "vote equipment" on equipment_votes for insert to authenticated with check (user_id = auth.uid());
create policy "change own vote" on equipment_votes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "remove own vote" on equipment_votes for delete to authenticated using (user_id = auth.uid());
create policy "add tip" on tips for insert to authenticated with check (user_id = auth.uid());
create policy "add photo" on photos for insert to authenticated with check (user_id = auth.uid());
create policy "add problem" on problems for insert to authenticated with check (user_id = auth.uid());
create policy "vote problem" on problem_votes for insert to authenticated with check (user_id = auth.uid());
create policy "remove own problem vote" on problem_votes for delete to authenticated using (user_id = auth.uid());

-- Úložisko fotiek (verejné čítanie, nahrávať môže prihlásený).
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
create policy "read photos files" on storage.objects for select using (bucket_id = 'photos');
create policy "upload photos files" on storage.objects for insert to authenticated with check (bucket_id = 'photos');

insert into buildings (code, name, short, aliases, sort) values
  ('L9',  'Letná 9',              'Letná 9', '{"LETNÁ 9","LETNA 9","HLAVNÁ BUDOVA","L9"}', 1),
  ('PK6', 'Park Komenského 6',    'PK 6',    '{"PARK KOMENSKÉHO 6","PARK KOMENSKEHO 6","PK 6","PK6"}', 2),
  ('PK4', 'Park Komenského 4',    'PK 4',    '{"PARK KOMENSKÉHO 4","PARK KOMENSKEHO 4","PK 4","PK4"}', 3),
  ('V4',  'Vysokoškolská 4',      'V4',      '{"VYSOKOŠKOLSKÁ 4","VYSOKOSKOLSKA 4","V4"}', 4),
  ('N9',  'Němcovej 9',           'N9',      '{"NĚMCOVEJ 9","NEMCOVEJ 9","ZDRUŽENÉ POSLUCHÁRNE","ZDRUZENE POSLUCHARNE","BN5","N9","ZP"}', 5)
on conflict (code) do nothing;

insert into rooms (id, building, number, name, floor, seats) values
  ('V4-009',   'V4',  '009',   'Učebňa V4 009',                                   '', null),
  ('V4-102',   'V4',  '102',   'Učebňa V4 102',                                   '', null),
  ('V4-147',   'V4',  '147',   'Učebňa V4 147',                                   '', null),
  ('V4-171',   'V4',  '171',   'Poslucháreň V4 171',                              '', 14),
  ('V4-179',   'V4',  '179',   'Laboratórium numerických metód prúdenia tekutín', '', 9)
on conflict (id) do nothing;

insert into rooms (id, building, number, name, floor) values
  ('L9-P25',   'L9',  'P25',   'Poslucháreň P25',                    'blok B, prízemie'),
  ('L9-P27',   'L9',  'P27',   'Poslucháreň P27',                    'blok B, prízemie'),
  ('L9-A204',  'L9',  'A204',  'Učebňa A204',                        'blok A, 2. poschodie'),
  ('L9-A504',  'L9',  'A504',  'Aurora – prednášková miestnosť',     'blok A, 5. poschodie'),
  ('L9-A512',  'L9',  'A512',  'Hyperion – laboratórium IoT',        'blok A, 5. poschodie'),
  ('L9-A514',  'L9',  'A514',  'Vulcan – laboratórium',              'blok A, 5. poschodie'),
  ('L9-A532',  'L9',  'A532',  'Solaris – laboratórium',             'blok A, 5. poschodie'),
  ('L9-A534',  'L9',  'A534',  'Romulus – laboratórium CNL',         'blok A, 5. poschodie'),
  ('L9-A536',  'L9',  'A536',  'Abydos – laboratórium',              'blok A, 5. poschodie'),
  ('L9-B501',  'L9',  'B501',  'Nyx – laboratórium',                 'blok B, 5. poschodie'),
  ('L9-B519B', 'L9',  'B519B', 'Meridian – laboratórium CNL',        'blok B, 5. poschodie'),
  ('L9-B520',  'L9',  'B520',  'Učebňa B520',                        'blok B, 5. poschodie'),
  ('L9-B524',  'L9',  'B524',  'Kronos – laboratórium',              'blok B, 5. poschodie'),
  ('L9-B526',  'L9',  'B526',  'Endor – laboratórium',               'blok B, 5. poschodie'),
  ('L9-B527',  'L9',  'B527',  'Caprica – laboratórium IoT',         'blok B, 5. poschodie'),
  ('L9-B529',  'L9',  'B529',  'Duna – laboratórium',                'blok B, 5. poschodie'),
  ('PK6-PC1',  'PK6', 'PC1',   'Učebňa PC1 (S02)',                   'suterén'),
  ('PK6-PC2',  'PK6', 'PC2',   'Učebňa PC2 (S03)',                   'suterén'),
  ('PK6-PC5',  'PK6', 'PC5',   'Poslucháreň PC5 (S07)',              'suterén'),
  ('PK6-PC6',  'PK6', 'PC6',   'Poslucháreň PC6 (S09)',              'suterén'),
  ('PK6-PC14', 'PK6', 'PC14',  'Učebňa PC14 (104)',                  '1. poschodie'),
  ('PK6-PC15', 'PK6', 'PC15',  'Učebňa PC15 (105)',                  '1. poschodie'),
  ('PK6-PC16', 'PK6', 'PC16',  'Učebňa PC16 (107)',                  '1. poschodie'),
  ('PK4-AVWS', 'PK4', 'AVWS',  'Aula VW Slovakia (Aula fyziky) 105', '1. poschodie'),
  ('N9-ZP1',   'N9',  'ZP1',   'Poslucháreň ZP1 (201)',              ''),
  ('N9-ZP4',   'N9',  'ZP4',   'Poslucháreň ZP4 (015)',              '')
on conflict (id) do nothing;
