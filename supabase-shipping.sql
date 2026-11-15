-- Shipping Instruction · tablas nuevas (la tabla "cotizaciones" ya existe)
-- Ejecutar una sola vez en Supabase: SQL Editor > New query > Run

-- 1) Clientes (consignatarios)
create table if not exists public.clientes (
  id          text primary key,
  name        text not null,
  rnc         text not null default '',
  created_at  bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- 2) Historial de Shipping Instructions
create table if not exists public.shipping_instructions (
  id          text primary key,
  ref         text default '',
  consignee   text default '',
  date        date,
  svc         text default '',
  data        jsonb not null default '{}'::jsonb,
  created_at  bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at  bigint not null default (extract(epoch from now()) * 1000)::bigint
);
create index if not exists shipping_instructions_created_idx
  on public.shipping_instructions (created_at desc);

-- 3) Seguridad (mismo criterio que "cotizaciones": acceso con la clave pública)
alter table public.clientes enable row level security;
alter table public.shipping_instructions enable row level security;

drop policy if exists "clientes_select" on public.clientes;
drop policy if exists "clientes_insert" on public.clientes;
drop policy if exists "clientes_update" on public.clientes;
drop policy if exists "clientes_delete" on public.clientes;
create policy "clientes_select" on public.clientes for select to anon using (true);
create policy "clientes_insert" on public.clientes for insert to anon with check (true);
create policy "clientes_update" on public.clientes for update to anon using (true) with check (true);
create policy "clientes_delete" on public.clientes for delete to anon using (true);

drop policy if exists "si_select" on public.shipping_instructions;
drop policy if exists "si_insert" on public.shipping_instructions;
drop policy if exists "si_update" on public.shipping_instructions;
drop policy if exists "si_delete" on public.shipping_instructions;
create policy "si_select" on public.shipping_instructions for select to anon using (true);
create policy "si_insert" on public.shipping_instructions for insert to anon with check (true);
create policy "si_update" on public.shipping_instructions for update to anon using (true) with check (true);
create policy "si_delete" on public.shipping_instructions for delete to anon using (true);

-- 4) Clientes recurrentes (RNC vacío = pendiente de completar)
insert into public.clientes (id, name, rnc) values
  ('grupo-armir',        'GRUPO ARMIR SRL',                                      '132-397495'),
  ('dracma',             'DRACMA SRL',                                           '132732626'),
  ('world-solving',      'WORLD SOLVING SRL',                                    '133477351'),
  ('ballester-hermanos', 'BALLESTER HERMANOS',                                   '66-0175269'),
  ('grupo-cgar',         'GRUPO CGAR',                                           '131560921'),
  ('inmek-srl',          'INMEK SRL',                                            ''),
  ('share-capital',      'SHARE CAPITAL DEVELOPMENT & CONSULTING BY JAMCO SRL',  '1-32-26711-7'),
  ('lantor-auto-parts',  'LANTOR AUTO PARTS SRL',                                ''),
  ('b-fernandez',        'B. FERNANDEZ & HNOS., INC.',                           ''),
  ('interflash-imser',   'INTERFLASH MULTI SERVICIOS IMSER SRL',                 '132466594'),
  ('megared-telecom',    'MEGARED TELECOM SRL',                                  '132455541')
on conflict (id) do nothing;
