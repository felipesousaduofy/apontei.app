# apontei — versão web (multiusuário)

Esqueleto do `apontei.` com login por e-mail/senha, banco Postgres e dados
isolados por pessoa. Feito para rodar na Vercel com banco no Supabase.

## O que já funciona

- Cadastro e login por e-mail e senha (Supabase Auth).
- Cada pessoa só vê e edita os próprios lançamentos — garantido pelo banco
  (Row Level Security), não só pela tela.
- Diário do dia com cronômetro da atividade em andamento, régua com as lacunas
  sem registro, visão de dia e de semana, e o texto consolidado pronto para
  colar no sistema de apontamento.
- API própria (`/api/lancamentos`) pronta para editar, além de criar e excluir.

## O diário (`/dashboard`)

É o apontei que rodava como HTML local, agora com os dados na sua conta.

- **Captura**: escreva e tecle <kbd>Enter</kbd>. Sem atividade aberta, isso
  inicia uma e começa a contar o tempo; com uma atividade rodando, a linha é
  anexada com o horário. <kbd>Ctrl+Enter</kbd> encerra a atual e já inicia
  outra, e <kbd>Shift+Enter</kbd> só quebra a linha.
- **Régua**: cada bloco é uma atividade, colorida pela categoria; o hachurado
  em ocre são os intervalos de 10 minutos ou mais sem nenhum registro. Clicar
  numa lacuna abre o lançamento manual já com o horário preenchido; clicar num
  bloco abre a atividade na lista.
- **Semana**: uma faixa por dia, com o total de cada um. Sábado e domingo só
  aparecem se tiveram registro. Clicar no dia volta para a visão dele.
- **Texto para apontar**: monta a saída pelo modelo dos ajustes. Dá para
  escolher o que entra, agrupar por chamado, achatar em uma linha, tirar os
  horários das linhas e conferir o limite de caracteres do seu sistema.
- **Ajustes**: arredondamento, jornada, limite de caracteres, modelo de saída,
  separador, projetos e categorias — tudo guardado na tabela `config`.

### Trazendo o histórico do apontei local

Em **Ajustes → Importar JSON**, escolha o arquivo exportado pela versão HTML.
Os lançamentos vão para a sua conta e os ajustes daquele arquivo são aplicados.
Lançamentos com a mesma data e hora de início são ignorados, então importar o
mesmo arquivo duas vezes não duplica nada. Exportar CSV e JSON continua ali do
lado, agora sempre com o histórico completo, não só o período na tela.

O que não veio junto foi a gravação em arquivo local (File System Access) e o
indicador "só no navegador": com a conta no Supabase, os lançamentos já não
dependem do armazenamento de um navegador nem de um `.json` na máquina.
- Quadro Kanban (`/kanban`) para as atividades pendentes, com arrastar e soltar
  e um atalho para virar lançamento de hora.
- Tela de gerenciamento de usuários (`/admin/usuarios`), só para
  administradores: dar e tirar permissão de admin, ativar/desativar contas e
  excluir quem não tem nenhum lançamento.

## Quadro Kanban

O botão **Quadro**, no topo do dashboard, abre o `/kanban`. São três colunas
fixas — **A fazer**, **Fazendo** e **Concluído** — e cada cartão guarda título,
chamado, projeto, prioridade, prazo e descrição.

- **Arrastar e soltar** entre e dentro das colunas; a linha roxa mostra onde o
  cartão vai cair. No celular, os botões `‹` e `›` de cada cartão fazem o mesmo.
- **Apontar** cria um lançamento de hoje, com a hora atual, já preenchido com o
  título e o chamado da tarefa. O cartão continua no quadro — apontar hora e
  concluir a tarefa são coisas separadas.
- **Prazo** vencido aparece em vermelho no cartão enquanto a tarefa não estiver
  concluída.
- **Limpar**, no topo da coluna Concluído, tira do quadro tudo que já terminou.
  Os lançamentos de hora não são afetados.

As tarefas são privadas: o RLS da tabela `tarefas` só devolve as linhas de quem
está logado, igual aos lançamentos.

## Gerenciamento de usuários

O botão **Usuários**, no topo do dashboard, só aparece para quem é
administrador. De lá dá para:

- **Tornar admin / Remover admin** — quem é admin enxerga a tela e pode mexer
  nas contas dos outros.
- **Desativar / Ativar** — desativar bloqueia o login no próprio Supabase Auth
  (não é só um "de-para" na tela) e derruba a pessoa na próxima navegação, com
  um aviso na tela de login. Os lançamentos dela continuam no banco.
- **Excluir** — apaga a conta de vez. O botão fica travado para quem tem
  qualquer lançamento; nesse caso o caminho é desativar, para não perder o
  histórico. Excluir uma conta sem lançamentos leva junto a linha de `config`.

Ninguém consegue alterar nem excluir a própria conta por essa tela — é o que
evita você tirar o próprio acesso de administrador sem querer.

### Quem é o primeiro administrador

O primeiro cadastro feito no sistema vira administrador automaticamente. Se as
contas já existiam antes desta versão, rodar o `schema.sql` atualizado promove
a conta mais antiga. Para promover alguém na mão, no SQL Editor do Supabase:

```sql
update public.perfis set is_admin = true where email = 'fulano@empresa.com.br';
```

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
   `supabase/schema.sql` e rode. Isso cria as tabelas `lancamentos`, `config`,
   `tarefas` e `perfis`, com as regras de acesso (RLS) já configuradas. O arquivo é seguro
   de rodar de novo a cada atualização — não apaga nada que já existe.
3. Em **Authentication → Providers**, confirme que **Email** está habilitado.
4. Em **Authentication → Settings**, se quiser pular a confirmação por
   e-mail durante os testes internos, desligue "Confirm email" (depois
   pode ligar de novo).
5. Em **Project Settings → API**, copie a **Project URL**, a chave
   **anon public** e a chave **service_role** — as três vão para o
   `.env.local`. A `service_role` é secreta: ignora todas as regras de RLS e é
   usada só no servidor, pela tela de usuários (listar todas as contas e
   excluir uma conta do Auth exigem essa chave). Nunca coloque ela em código
   que roda no navegador e nunca comite o `.env.local`.

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
2. Em **Environment Variables**, adicione as mesmas três variáveis do
   `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
   `SUPABASE_SERVICE_ROLE_KEY`).
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
  kanban/            quadro de tarefas pendentes
  admin/usuarios/    gerenciamento de usuários (só para administradores)
  api/lancamentos/   API REST (GET/POST/DELETE em /, PATCH/DELETE em /[id])
  api/config/        ajustes do usuário (GET/PATCH)
  api/tarefas/       API do quadro (GET/POST/DELETE em /, PATCH/DELETE em /[id])
  api/usuarios/      API de administração (GET em /, PATCH/DELETE em /[id])
lib/apontamento.js   tempo, régua, lacunas e o consolidado (funções puras)
lib/kanban.js        colunas, prioridades e o cálculo da ordem dos cartões
lib/supabase/        clientes Supabase (navegador, servidor e service_role)
lib/supabase/sessao.js  usuário + perfil, e as guardas de rota da API
middleware.js         protege /dashboard e /admin, barra conta desativada
supabase/schema.sql    schema do banco, rodar no Supabase a cada atualização
```
