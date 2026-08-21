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

-- ---------------------------------------------------------------
-- equipes: agrupamento de usuários. Um supervisor enxerga (e, com permissão
-- extra, edita) os lançamentos de quem está na mesma equipe que ele.
-- ---------------------------------------------------------------
create table if not exists public.equipes (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  criado_em timestamptz not null default now()
);

alter table public.perfis add column if not exists equipe_id uuid references public.equipes(id) on delete set null;
alter table public.perfis add column if not exists is_supervisor boolean not null default false;
alter table public.perfis add column if not exists supervisor_pode_editar boolean not null default false;
-- permissão de publicar avisos para a própria equipe (seção de avisos, no fim
-- do arquivo). Fica aqui em cima porque perfis_com_totais já precisa dela.
alter table public.perfis add column if not exists supervisor_pode_avisar boolean not null default false;
create index if not exists perfis_equipe on public.perfis (equipe_id);

-- security definer para poder ser usada dentro das próprias políticas de
-- perfis sem cair em recursão infinita de RLS
create or replace function public.eh_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin and ativo from public.perfis where id = uid), false);
$$;

-- uid enxerga os lançamentos de "dono" porque é supervisor da mesma equipe
create or replace function public.supervisiona(uid uuid, dono uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select true
    from public.perfis sup
    join public.perfis alvo on alvo.equipe_id = sup.equipe_id
    where sup.id = uid and alvo.id = dono
      and sup.is_supervisor and sup.ativo and sup.equipe_id is not null
  ), false);
$$;

-- igual à anterior, mas exige também a permissão extra de editar/excluir
create or replace function public.supervisiona_com_edicao(uid uuid, dono uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select true
    from public.perfis sup
    join public.perfis alvo on alvo.equipe_id = sup.equipe_id
    where sup.id = uid and alvo.id = dono
      and sup.is_supervisor and sup.supervisor_pode_editar and sup.ativo and sup.equipe_id is not null
  ), false);
$$;

-- ---------------------------------------------------------------
-- Row Level Security: cada usuário só acessa as próprias linhas
-- ---------------------------------------------------------------
alter table public.lancamentos enable row level security;
alter table public.config enable row level security;
alter table public.tarefas enable row level security;
alter table public.perfis enable row level security;
alter table public.equipes enable row level security;

drop policy if exists "lancamentos: dono lê" on public.lancamentos;
create policy "lancamentos: dono lê" on public.lancamentos
  for select using (auth.uid() = user_id or public.supervisiona(auth.uid(), user_id));

drop policy if exists "lancamentos: dono grava" on public.lancamentos;
create policy "lancamentos: dono grava" on public.lancamentos
  for insert with check (auth.uid() = user_id);

drop policy if exists "lancamentos: dono edita" on public.lancamentos;
create policy "lancamentos: dono edita" on public.lancamentos
  for update
  using (auth.uid() = user_id or public.supervisiona_com_edicao(auth.uid(), user_id))
  with check (auth.uid() = user_id or public.supervisiona_com_edicao(auth.uid(), user_id));

drop policy if exists "lancamentos: dono exclui" on public.lancamentos;
create policy "lancamentos: dono exclui" on public.lancamentos
  for delete using (auth.uid() = user_id or public.supervisiona_com_edicao(auth.uid(), user_id));

drop policy if exists "config: dono lê" on public.config;
create policy "config: dono lê" on public.config
  for select using (auth.uid() = user_id or public.supervisiona(auth.uid(), user_id));

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

-- perfis: cada um lê o próprio, o admin lê todos, e um supervisor lê os
-- colegas da própria equipe (pra montar a lista de quem ele pode supervisionar).
-- Só existe policy de leitura, de propósito: criar perfil é tarefa do gatilho
-- mais abaixo, e alterar/excluir passa obrigatoriamente por /api/usuarios com a
-- chave service_role. É o que garante que "desativado" valha ao mesmo tempo na
-- tabela e no bloqueio de login do Auth, sem um caminho paralelo dessincronizar
-- os dois.
drop policy if exists "perfis: dono ou admin lê" on public.perfis;
create policy "perfis: dono ou admin lê" on public.perfis
  for select using (
    auth.uid() = id or public.eh_admin(auth.uid()) or public.supervisiona(auth.uid(), id)
  );

drop policy if exists "perfis: admin edita" on public.perfis;

-- nome de equipe não é dado sensível: qualquer autenticado lê. Criar/renomear/
-- excluir passa só pela API com service_role, igual perfis.
drop policy if exists "equipes: autenticado lê" on public.equipes;
create policy "equipes: autenticado lê" on public.equipes
  for select using (auth.role() = 'authenticated');

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
  p.deve_trocar_senha,
  p.equipe_id,
  e.nome as equipe_nome,
  p.is_supervisor,
  p.supervisor_pode_editar,
  p.supervisor_pode_avisar
from public.perfis p
left join (
  select user_id, count(*) as total
  from public.lancamentos
  group by user_id
) t on t.user_id = p.id
left join public.equipes e on e.id = p.equipe_id;

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

-- ---------------------------------------------------------------
-- avisos: recados publicados de cima para baixo (admin -> todo mundo,
-- supervisor -> a própria equipe ou uma pessoa dela).
--
-- O alvo é guardado como REGRA ("todos", "a equipe X", "o usuário Y"), não
-- como uma cópia por destinatário. É o que faz quem se cadastrar amanhã já
-- entrar vendo o aviso de manutenção de sábado, sem ninguém ter que refazer
-- o envio.
--
-- autor_nome e autor_papel são fotografia do momento do envio, de propósito:
-- se o supervisor virar admin depois, o aviso antigo continua assinado como
-- veio — e continua pintado com a cor de quem o escreveu na época.
-- ---------------------------------------------------------------
create table if not exists public.avisos (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  corpo         text not null default '',
  tipo          text not null default 'informativo'
                check (tipo in ('informativo', 'manutencao', 'melhoria')),
  destino       text not null default 'todos'
                check (destino in ('todos', 'equipe', 'usuario')),
  destino_id    uuid,
  -- quanto o aviso interrompe: só conta no sino, vira faixa no topo, ou abre
  -- na frente da pessoa assim que chega. O check vem logo abaixo, com nome
  -- próprio, para instalação nova e migração acabarem na mesma constraint.
  exibicao      text not null default 'sino',
  publicar_em   timestamptz not null default now(),
  expira_em     timestamptz,
  criado_por    uuid references auth.users(id) on delete set null,
  autor_nome    text not null default '',
  autor_papel   text not null default 'admin'
                check (autor_papel in ('admin', 'supervisor')),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- "todos" não tem alvo; "equipe" e "usuario" não existem sem um
  constraint avisos_destino_coerente check (
    (destino = 'todos' and destino_id is null)
    or (destino <> 'todos' and destino_id is not null)
  )
);

create index if not exists avisos_vigencia on public.avisos (publicar_em desc);
create index if not exists avisos_autor on public.avisos (criado_por);

-- quem rodou a primeira versão desta seção tem "fixado" (boolean) em vez de
-- "exibicao" (três níveis). Converte sem perder o que já estava publicado:
-- fixado = true vira 'faixa', o resto vira 'sino'.
alter table public.avisos add column if not exists exibicao text not null default 'sino';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'avisos' and column_name = 'fixado'
  ) then
    update public.avisos set exibicao = case when fixado then 'faixa' else 'sino' end;
    alter table public.avisos drop column fixado;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'avisos_exibicao_valida' and conrelid = 'public.avisos'::regclass
  ) then
    alter table public.avisos add constraint avisos_exibicao_valida
      check (exibicao in ('sino', 'faixa', 'tela'));
  end if;
end $$;

-- Realtime: sem isto o navegador só descobre um aviso novo na próxima
-- varredura (ou quando a pessoa recarrega a página). Com a tabela na
-- publicação, o Supabase empurra o evento e a tela reage na hora.
--
-- O evento serve só de gatilho: o cliente refaz a busca pela API em vez de
-- ler o conteúdo que veio no empurrão, para que quem enxerga o quê continue
-- sendo decidido pela policy de RLS, e não pelo canal.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'avisos'
  ) then
    alter publication supabase_realtime add table public.avisos;
  end if;
exception
  -- projeto sem Realtime habilitado: segue sem tempo real, no intervalo de
  -- segurança do cliente. Não é motivo para o schema inteiro falhar.
  when undefined_object then null;
end $$;

drop trigger if exists trg_avisos_atualizado on public.avisos;
create trigger trg_avisos_atualizado
  before update on public.avisos
  for each row execute function public.tocar_atualizado_em();

-- quem já leu o quê. Fica no banco, e não no localStorage, para o aviso não
-- voltar do zero quando a pessoa abre o sistema no celular.
create table if not exists public.avisos_lidos (
  aviso_id uuid not null references public.avisos(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  lido_em  timestamptz not null default now(),
  primary key (aviso_id, user_id)
);

create index if not exists avisos_lidos_usuario on public.avisos_lidos (user_id);

-- equipe da pessoa, para resolver o alvo "equipe" dentro da policy sem ler
-- perfis direto (o que cairia na RLS da própria tabela)
create or replace function public.minha_equipe(uid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select equipe_id from public.perfis where id = uid and ativo;
$$;

alter table public.avisos enable row level security;
alter table public.avisos_lidos enable row level security;

-- só leitura por policy: publicar, editar e excluir passam por /api/avisos com
-- a chave service_role, que é onde mora a regra de quem pode falar com quem.
-- A vigência entra aqui dentro de propósito — aviso fora da janela não existe
-- para o destinatário, nem por engano de uma tela que esqueceu de filtrar.
drop policy if exists "avisos: destinatário lê" on public.avisos;
create policy "avisos: destinatário lê" on public.avisos
  for select using (
    -- exigir sessão é o que impede o ramo "todos" de virar leitura pública:
    -- as outras tabelas se protegem sozinhas porque comparam com auth.uid(),
    -- que é nulo para o anônimo — aqui "todos" não compara com ninguém, e sem
    -- esta linha um aviso de manutenção sairia com a chave anon, sem login.
    auth.role() = 'authenticated'
    and now() >= publicar_em
    and (expira_em is null or now() < expira_em)
    and (
      destino = 'todos'
      or (destino = 'usuario' and destino_id = auth.uid())
      or (destino = 'equipe' and destino_id = public.minha_equipe(auth.uid()))
    )
  );

-- o supervisor precisa ver quem da equipe leu o recado dele; supervisiona() é
-- exatamente esse predicado e já existe para os lançamentos.
drop policy if exists "avisos_lidos: dono lê" on public.avisos_lidos;
drop policy if exists "avisos_lidos: dono ou supervisor lê" on public.avisos_lidos;
create policy "avisos_lidos: dono ou supervisor lê" on public.avisos_lidos
  for select using (auth.uid() = user_id or public.supervisiona(auth.uid(), user_id));

drop policy if exists "avisos_lidos: dono marca" on public.avisos_lidos;
create policy "avisos_lidos: dono marca" on public.avisos_lidos
  for insert with check (auth.uid() = user_id);

drop policy if exists "avisos_lidos: dono desmarca" on public.avisos_lidos;
create policy "avisos_lidos: dono desmarca" on public.avisos_lidos
  for delete using (auth.uid() = user_id);
