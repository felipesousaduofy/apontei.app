-- apontei — schema do banco (Supabase / Postgres)
-- Rode isso em: Supabase > SQL Editor > New query > colar e executar.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- lancamentos: um registro de atividade
-- ---------------------------------------------------------------
create table if not exists public.lancamentos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  data         date not null,
  inicio       time not null,
  fim          time,
  descricao    text not null default '',
  projeto      text not null default '',
  chamado      text not null default '',
  categoria    text not null default '',
  obs          text not null default '',
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists lancamentos_usuario_data on public.lancamentos (user_id, data);

-- mantém atualizado_em em dia a cada UPDATE
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_lancamentos_atualizado on public.lancamentos;
create trigger trg_lancamentos_atualizado
  before update on public.lancamentos
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------
-- config: ajustes por usuário (arredondamento, template, etc.)
-- ---------------------------------------------------------------
create table if not exists public.config (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  arredondamento     int not null default 15,
  inicio_dia         time not null default '08:00',
  fim_dia            time not null default '18:00',
  limite_caracteres  int not null default 0,
  separador          text not null default '; ',
  template           text not null default '{chamado} | {projeto} | {horas}' || chr(10) || '{descricao}',
  projetos           text[] not null default '{}',
  categorias         text[] not null default array['Desenvolvimento','Reunião','Suporte','Análise','Deploy','Documentação','Outros']
);

-- ---------------------------------------------------------------
-- Row Level Security: cada usuário só acessa as próprias linhas
-- ---------------------------------------------------------------
alter table public.lancamentos enable row level security;
alter table public.config enable row level security;

drop policy if exists "lancamentos: dono lê" on public.lancamentos;
create policy "lancamentos: dono lê" on public.lancamentos
  for select using (auth.uid() = user_id);

drop policy if exists "lancamentos: dono grava" on public.lancamentos;
create policy "lancamentos: dono grava" on public.lancamentos
  for insert with check (auth.uid() = user_id);

drop policy if exists "lancamentos: dono edita" on public.lancamentos;
create policy "lancamentos: dono edita" on public.lancamentos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lancamentos: dono exclui" on public.lancamentos;
create policy "lancamentos: dono exclui" on public.lancamentos
  for delete using (auth.uid() = user_id);

drop policy if exists "config: dono lê" on public.config;
create policy "config: dono lê" on public.config
  for select using (auth.uid() = user_id);

drop policy if exists "config: dono grava" on public.config;
create policy "config: dono grava" on public.config
  for insert with check (auth.uid() = user_id);

drop policy if exists "config: dono edita" on public.config;
create policy "config: dono edita" on public.config
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- cria a linha de config automaticamente quando alguém se cadastra
create or replace function public.criar_config_padrao()
returns trigger language plpgsql security definer as $$
begin
  insert into public.config (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_criar_config on auth.users;
create trigger trg_criar_config
  after insert on auth.users
  for each row execute function public.criar_config_padrao();
