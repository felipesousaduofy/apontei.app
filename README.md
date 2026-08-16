# apontei — versão web (multiusuário)

Esqueleto do `apontei.` com login por e-mail/senha, banco Postgres e dados
isolados por pessoa. Feito para rodar na Vercel com banco no Supabase.

## O que já funciona

- Cadastro e login por e-mail e senha (Supabase Auth).
- Cada pessoa só vê e edita os próprios lançamentos — garantido pelo banco
  (Row Level Security), não só pela tela.
- Lançar atividade do dia, listar e excluir com confirmação.
- API própria (`/api/lancamentos`) pronta para editar, além de criar e excluir.

## O que ainda falta portar do protótipo local (`apontei.html`)

A tela atual é deliberadamente enxuta, só para provar que login → banco →
tela funciona de ponta a ponta. Ainda não tem: régua do dia, visão semana,
consolidado com seleção por atividade, timer de atividade em andamento,
categorias/projetos configuráveis, exportar CSV/JSON. É a próxima etapa,
depois que você validar que a base está no ar e funcionando.

## Passo a passo para colocar no ar

### 1. Criar o projeto no Supabase
1. Crie uma conta em supabase.com e um novo projeto.
2. Vá em **SQL Editor** → **New query**, cole o conteúdo de
   `supabase/schema.sql` e rode. Isso cria as tabelas `lancamentos` e
   `config`, com as regras de acesso (RLS) já configuradas.
3. Em **Authentication → Providers**, confirme que **Email** está habilitado.
4. Em **Authentication → Settings**, se quiser pular a confirmação por
   e-mail durante os testes internos, desligue "Confirm email" (depois
   pode ligar de novo).
5. Em **Project Settings → API**, copie a **Project URL** e a chave
   **anon public** — vão para o `.env.local`.

### 2. Rodar localmente
```bash
cp .env.local.example .env.local
# edite .env.local com a URL e a chave do passo anterior
npm install
npm run dev
```
Abra http://localhost:3000 — deve cair na tela de login.

### 3. Subir para o GitHub
```bash
git init
git add .
git commit -m "primeira versão do apontei web"
gh repo create apontei-web --private --source=. --push
# ou: crie o repositório pelo site do GitHub e siga as instruções de push
```

### 4. Publicar na Vercel
1. Em vercel.com, **Add New → Project**, importe o repositório do GitHub.
2. Em **Environment Variables**, adicione as mesmas duas variáveis do
   `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. Deploy. A cada push na branch principal, a Vercel publica sozinha.

### 5. Convidar a equipe
Cada pessoa acessa a URL da Vercel e cria a própria conta em **Cadastre-se**.
Não existe um passo de "convite" — qualquer um com o link pode se cadastrar.
Se isso for um problema, dá para restringir por domínio de e-mail (ex.: só
`@suaempresa.com.br`) — é um ajuste pequeno na tela de cadastro, me avise
quando chegar nessa etapa.

## Migrando o que já foi apontado no protótipo local

O `apontei.html` tem um botão **Exportar backup** que gera um `.json` com
todos os lançamentos. Guarde esses arquivos de cada pessoa; quando a tabela
`lancamentos` estiver criada, dá para escrever um script pequeno que lê os
JSONs e insere no Supabase com o `user_id` de cada um. Aviso quando chegar
nessa etapa, que eu preparo o script.

## Estrutura do projeto

```
app/
  login/            tela de entrar
  signup/           tela de cadastro
  dashboard/         tela principal (protegida pelo middleware)
  api/lancamentos/   API REST (GET/POST em /, PATCH/DELETE em /[id])
lib/supabase/        clientes Supabase (navegador e servidor)
middleware.js         protege /dashboard e redireciona quem já logou
supabase/schema.sql    schema do banco, rodar uma vez no Supabase
```
