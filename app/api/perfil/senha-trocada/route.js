import { NextResponse } from 'next/server';
import { exigirUsuario } from '@/lib/supabase/sessao';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST: chamado pela própria pessoa depois de trocar a senha temporária que
 * o admin definiu, pra tirar a marcação de "precisa trocar senha" e liberar
 * o resto do app. Só mexe na própria linha — o id vem da sessão, nunca do
 * corpo da requisição.
 */
export async function POST() {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;

  let admin;
  try {
    admin = supabaseAdmin();
  } catch (e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }

  const { error } = await admin
    .from('perfis')
    .update({ deve_trocar_senha: false })
    .eq('id', guarda.user.id);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
