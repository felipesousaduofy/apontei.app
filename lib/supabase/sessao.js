import { NextResponse } from 'next/server';
import { supabaseServidor } from './server';

/** Usuário logado + a linha de perfis dele (permissão e situação da conta). */
export async function usuarioComPerfil() {
  const supabase = supabaseServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, perfil: null };

  const { data: perfil } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return { supabase, user, perfil };
}

/**
 * Guarda para Route Handlers. Devolve `{ resposta }` quando a requisição
 * deve parar ali, ou `{ supabase, user, perfil }` quando pode seguir.
 */
export async function exigirUsuario() {
  const { supabase, user, perfil } = await usuarioComPerfil();

  if (!user) {
    return { resposta: NextResponse.json({ erro: 'não autenticado' }, { status: 401 }) };
  }
  if (perfil && !perfil.ativo) {
    return { resposta: NextResponse.json({ erro: 'conta desativada' }, { status: 403 }) };
  }
  return { supabase, user, perfil };
}

/** Igual à anterior, mas exige também a permissão de administrador. */
export async function exigirAdmin() {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda;

  if (!guarda.perfil) {
    return {
      resposta: NextResponse.json(
        { erro: 'perfil não encontrado — rode o supabase/schema.sql atualizado' },
        { status: 403 }
      )
    };
  }
  if (!guarda.perfil.is_admin) {
    return {
      resposta: NextResponse.json({ erro: 'acesso restrito a administradores' }, { status: 403 })
    };
  }
  return guarda;
}

/**
 * Guarda das rotas de aviso. Acrescenta `escopo` ao resultado:
 *
 * - `'todos'`  — admin: publica para o sistema inteiro, para qualquer equipe
 *                ou para qualquer pessoa.
 * - `'equipe'` — supervisor com `supervisor_pode_avisar`: publica só para a
 *                própria equipe ou para alguém que esteja nela.
 *
 * Quem chama nunca deve ler `destino`/`destino_id` do corpo da requisição
 * quando o escopo é `'equipe'` — o alvo se deriva do perfil (ver
 * `alvoPermitido` em /api/avisos). Validar o que o cliente mandou, em vez de
 * derivar, é o caminho curto para alguém publicar `destino: 'todos'` na mão.
 */
export async function exigirAutorDeAviso() {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda;

  const { perfil } = guarda;
  if (!perfil) {
    return {
      resposta: NextResponse.json(
        { erro: 'perfil não encontrado — rode o supabase/schema.sql atualizado' },
        { status: 403 }
      )
    };
  }

  if (perfil.is_admin) return { ...guarda, escopo: 'todos' };

  if (perfil.is_supervisor && perfil.supervisor_pode_avisar) {
    // supervisor sem equipe não tem para quem falar. Sem esta checagem o
    // aviso seria gravado com destino_id nulo e não apareceria para ninguém,
    // o que parece "sumiu" em vez de "faltou configurar".
    if (!perfil.equipe_id) {
      return {
        resposta: NextResponse.json(
          {
            erro: 'Você ainda não está em uma equipe, então não há para quem ' +
                  'publicar. Peça a um administrador para colocar você na equipe ' +
                  'que supervisiona.'
          },
          { status: 409 }
        )
      };
    }
    return { ...guarda, escopo: 'equipe' };
  }

  return {
    resposta: NextResponse.json(
      { erro: 'você não tem permissão para publicar avisos' },
      { status: 403 }
    )
  };
}
