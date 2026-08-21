import { NextResponse } from 'next/server';
import { exigirUsuario } from '@/lib/supabase/sessao';
import { supabaseAdmin } from '@/lib/supabase/admin';

const NOME_MAX = 60;

/**
 * PATCH: a pessoa muda o próprio nome de exibição — é o que aparece no lugar
 * do e-mail pelas telas.
 *
 * Passa pelo cliente service_role porque perfis só tem policy de leitura: toda
 * escrita na tabela é feita por rota de API, nunca direto do navegador. O id
 * vem da sessão, nunca do corpo, então ninguém renomeia a conta de outro.
 */
export async function PATCH(req) {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;

  const corpo = await req.json().catch(() => ({}));
  if (typeof corpo.nome !== 'string') {
    return NextResponse.json({ erro: 'informe o nome' }, { status: 400 });
  }
  // espaços repetidos viram um só: o nome é usado em lista e cabeçalho
  const nome = corpo.nome.trim().replace(/\s+/g, ' ').slice(0, NOME_MAX);

  let admin;
  try {
    admin = supabaseAdmin();
  } catch (e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }

  const { data, error } = await admin
    .from('perfis')
    .update({ nome })
    .eq('id', guarda.user.id)
    .select('id, nome, email')
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ perfil: data });
}
