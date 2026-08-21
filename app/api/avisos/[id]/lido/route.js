import { NextResponse } from 'next/server';
import { exigirUsuario } from '@/lib/supabase/sessao';

/**
 * POST: marca o aviso como lido para quem está pedindo.
 *
 * Vai pelo cliente do usuário, não pelo service_role: a policy de
 * avisos_lidos já garante que ninguém marca leitura no nome de outro, e o
 * insert só passa se o aviso for mesmo visível para essa pessoa (a FK exige
 * uma linha de avisos que ela consiga enxergar).
 */
export async function POST(req, { params }) {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;
  const { supabase, user } = guarda;

  // ignoreDuplicates, e não um upsert comum: abrir o mesmo aviso duas vezes
  // não é erro, mas um ON CONFLICT DO UPDATE exigiria uma policy de UPDATE em
  // avisos_lidos — que não existe de propósito, já que a data de leitura não
  // deve ser reescrita. DO NOTHING resolve sem abrir essa porta.
  const { error } = await supabase
    .from('avisos_lidos')
    .upsert(
      { aviso_id: params.id, user_id: user.id },
      { onConflict: 'aviso_id,user_id', ignoreDuplicates: true }
    );

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE: desmarca — "marcar como não lido", para reler depois. */
export async function DELETE(req, { params }) {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;
  const { supabase, user } = guarda;

  const { error } = await supabase
    .from('avisos_lidos')
    .delete()
    .eq('aviso_id', params.id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
