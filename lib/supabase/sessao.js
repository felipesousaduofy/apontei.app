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
