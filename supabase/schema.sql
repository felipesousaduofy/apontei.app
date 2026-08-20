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
  categorias         text[] not null default array['Desenvolvimento','Reunião','Suporte','Análise','Deploy','Documentação','Outros'],
  intervalo_ativo    boolean not null default false,
  intervalo_inicio   time not null default '12:00',
  intervalo_fim      time not null default '13:00'
);

-- quem já tinha a tabela antes deste intervalo existir: adiciona as colunas
-- sem perder o resto. Rodar de novo não faz mal.
alter table public.config add column if not exists intervalo_ativo boolean not null default false;
alter table public.config add column if not exists intervalo_inicio time not null default '12:00';
alter table public.config add column if not exists intervalo_fim time not null default '13:00';

-- ---------------------------------------------------------------
-- tarefas: cartões do quadro Kanban
--
-- "ordem" é fracionária de propósito: para mover um cartão entre outros dois
-- basta gravar a média das ordens dos vizinhos, mexendo em uma linha só, sem
-- renumerar a coluna inteira.
-- ---------------------------------------------------------------
create table if not exists public.tarefas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  titulo        text not null,
  descricao     text not null default '',
  coluna        text not null default 'a_fazer'
                check (coluna in ('a_fazer', 'fazendo', 'concluido')),
  ordem         double precision not null default 0,
  prioridade    text not null default 'media'
                check (prioridade in ('baixa', 'media', 'alta')),
  prazo         date,
  projeto       text not null default '',
  chamado       text not null default '',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  concluido_em  timestamptz
);

create index if not exists tarefas_usuario_coluna on public.tarefas (user_id, coluna, ordem);

drop trigger if exists trg_tarefas_atualizado on public.tarefas;
create trigger trg_tarefas_atualizado
  before update on public.tarefas
  for each row execute function public.tocar_atualizado_em();

-- liga um lançamento ao cartão do quadro que o originou (lançamento rápido em
-- Pendencias, no diário) — fica em branco pra tudo que foi digitado à mão.
-- Só existe depois daqui porque "tarefas" precisa existir primeiro; apagar o
-- cartão não apaga o lançamento, só solta a referência.
alter table public.lancamentos add column if not exists tarefa_id uuid references public.tarefas(id) on delete set null;
create index if not exists lancamentos_tarefa on public.lancamentos (tarefa_id) where tarefa_id is not null;

-- ---------------------------------------------------------------
-- perfis: espelho de auth.users com permissão e situação da conta
-- ---------------------------------------------------------------
create table if not exists public.perfis (
  id        uuid primary key references auth.users(id) on delete cascade,
  email     text not null default '',
  nome      text not null default '',
  is_admin  boolean not null default false,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

create index if not exists perfis_email on public.perfis (email);

-- liga quando um admin define a senha manualmente (fallback para quando o
-- envio de e-mail falha): força a pessoa a trocar por uma senha só dela
-- antes de deixar usar o resto do app. Some sozinho quando ela troca.
alter table public.perfis add column if not exists deve_trocar_senha boolean not null default false;

-- security definer para poder ser usada dentro das próprias políticas de
-- perfis sem cair em recursão infinita de RLS
create or replace function public.eh_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin and ativo from public.perfis where id = uid), false);
$$;

-- ---------------------------------------------------------------
-- Row Level Security: cada usuário só acessa as próprias linhas
-- ---------------------------------------------------------------
alter table public.lancamentos enable row level security;
alter table public.config enable row level security;
alter table public.tarefas enable row level security;
alter table public.perfis enable row level security;

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

drop policy if exists "tarefas: dono lê" on public.tarefas;
create policy "tarefas: dono lê" on public.tarefas
  for select using (auth.uid() = user_id);

drop policy if exists "tarefas: dono grava" on public.tarefas;
create policy "tarefas: dono grava" on public.tarefas
  for insert with check (auth.uid() = user_id);

drop policy if exists "tarefas: dono edita" on public.tarefas;
create policy "tarefas: dono edita" on public.tarefas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tarefas: dono exclui" on public.tarefas;
create policy "tarefas: dono exclui" on public.tarefas
  for delete using (auth.uid() = user_id);

-- perfis: cada um lê o próprio, o admin lê todos.
-- Só existe policy de leitura, de propósito: criar perfil é tarefa do gatilho
-- mais abaixo, e alterar/excluir passa obrigatoriamente por /api/usuarios com a
-- chave service_role. É o que garante que "desativado" valha ao mesmo tempo na
-- tabela e no bloqueio de login do Auth, sem um caminho paralelo dessincronizar
-- os dois.
drop policy if exists "perfis: dono ou admin lê" on public.perfis;
create policy "perfis: dono ou admin lê" on public.perfis
  for select using (auth.uid() = id or public.eh_admin(auth.uid()));

drop policy if exists "perfis: admin edita" on public.perfis;

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

-- cria o perfil junto com a conta. O primeiro cadastro do sistema vira
-- administrador, senão ninguém conseguiria abrir a tela de usuários.
create or replace function public.criar_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  primeiro boolean;
begin
  select not exists (select 1 from public.perfis) into primeiro;
  insert into public.perfis (id, email, nome, is_admin)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'nome', ''),
    primeiro
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_criar_perfil on auth.users;
create trigger trg_criar_perfil
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- mantém o e-mail do perfil igual ao do login se a pessoa trocar de e-mail
create or replace function public.sincronizar_email_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.perfis set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_sincronizar_email on auth.users;
create trigger trg_sincronizar_email
  after update of email on auth.users
  for each row execute function public.sincronizar_email_perfil();

-- ---------------------------------------------------------------
-- perfis_com_totais: lista de usuários já com a contagem de lançamentos,
-- usada pela tela de gerenciamento para saber quem pode ser excluído.
--
-- ATENÇÃO: a view roda com as permissões de quem consulta (security_invoker),
-- então a contagem só sai correta quando lida com a chave service_role, no
-- servidor — que é como /api/usuarios a consulta. Para um usuário comum o RLS
-- de lancamentos limita a contagem aos registros dele, de propósito.
--
-- security_invoker existe a partir do Postgres 15. Se o seu projeto Supabase
-- for mais antigo e a linha der erro, apague só o "with (security_invoker = on)"
-- e rode de novo — mas aí também remova o acesso de leitura da view para as
-- roles anon e authenticated: revoke select on public.perfis_com_totais
-- from anon, authenticated;
-- ---------------------------------------------------------------
create or replace view public.perfis_com_totais
with (security_invoker = on) as
select
  p.id,
  p.email,
  p.nome,
  p.is_admin,
  p.ativo,
  p.criado_em,
  coalesce(t.total, 0)::int as total_lancamentos,
  -- no fim de propósito: CREATE OR REPLACE VIEW não deixa mudar a posição
  -- das colunas que já existem, só acrescentar novas no final
  p.deve_trocar_senha
from public.perfis p
left join (
  select user_id, count(*) as total
  from public.lancamentos
  group by user_id
) t on t.user_id = p.id;

-- ---------------------------------------------------------------
-- Compatibilidade: cria perfil e config para quem já tinha se cadastrado
-- antes destas tabelas existirem. Rodar de novo não faz mal.
-- ---------------------------------------------------------------
insert into public.perfis (id, email, nome, criado_em)
select u.id, coalesce(u.email, ''), coalesce(u.raw_user_meta_data->>'nome', ''), u.created_at
from auth.users u
on conflict (id) do nothing;

insert into public.config (user_id)
select u.id from auth.users u
on conflict (user_id) do nothing;

-- se ninguém é administrador ainda, promove a conta mais antiga
update public.perfis
set is_admin = true
where not exists (select 1 from public.perfis outros where outros.is_admin)
  and id = (select id from public.perfis order by criado_em, id limit 1);
