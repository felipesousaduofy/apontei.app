import { NextResponse } from 'next/server';
import { exigirAdmin } from '@/lib/supabase/sessao';
import { supabaseAdmin } from '@/lib/supabase/admin';

// bloqueio de login "para sempre" no Auth — o Supabase espera uma duração,
// não uma data. 'none' desfaz o bloqueio.
const BLOQUEIO_LONGO = '876000h';

/** PATCH: liga/desliga admin e ativa/desativa a conta. */
export async function PATCH(req, { params }) {
  const guarda = await exigirAdmin();
  if (guarda.resposta) return guarda.resposta;

  if (params.id === guarda.user.id) {
    return NextResponse.json(
      { erro: 'Você não pode alterar a permissão ou a situação da sua própria conta.' },
      { status: 400 }
    );
  }

  const corpo = await req.json();
  const alteracoes = {};
  if (typeof corpo.is_admin === 'boolean') alteracoes.is_admin = corpo.is_admin;
  if (typeof corpo.ativo === 'boolean') alteracoes.ativo = corpo.ativo;

  if (Object.keys(alteracoes).length === 0) {
    return NextResponse.json({ erro: 'nada para alterar' }, { status: 400 });
  }

  let admin;
  try {
    admin = supabaseAdmin();
  } catch (e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }

  const { data: anterior } = await admin
    .from('perfis')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!anterior) {
    return NextResponse.json({ erro: 'usuário não encontrado' }, { status: 404 });
  }

  const { data: perfil, error } = await admin
    .from('perfis')
    .update(alteracoes)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  // desativar tem que valer também no Auth, senão a pessoa continua entrando.
  if ('ativo' in alteracoes && alteracoes.ativo !== anterior.ativo) {
    const { error: erroAuth } = await admin.auth.admin.updateUserById(params.id, {
      ban_duration: alteracoes.ativo ? 'none' : BLOQUEIO_LONGO
    });

    if (erroAuth) {
      // desfaz a alteração no perfil para não ficar marcado como inativo na
      // tela enquanto o login continua liberado
      await admin.from('perfis').update({ ativo: anterior.ativo }).eq('id', params.id);
      return NextResponse.json(
        { erro: 'não foi possível alterar o acesso no Auth: ' + erroAuth.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ usuario: perfil });
}

/** DELETE: exclui a conta, desde que ela não tenha nenhum lançamento. */
export async function DELETE(req, { params }) {
  const guarda = await exigirAdmin();
  if (guarda.resposta) return guarda.resposta;

  if (params.id === guarda.user.id) {
    return NextResponse.json({ erro: 'Você não pode excluir a própria conta.' }, { status: 400 });
  }

  let admin;
  try {
    admin = supabaseAdmin();
  } catch (e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }

  const { data: perfil } = await admin
    .from('perfis')
    .select('id')
    .eq('id', params.id)
    .maybeSingle();

  if (!perfil) {
    return NextResponse.json({ erro: 'usuário não encontrado' }, { status: 404 });
  }

  const { count, error: erroContagem } = await admin
    .from('lancamentos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', params.id);

  if (erroContagem) {
    return NextResponse.json({ erro: erroContagem.message }, { status: 500 });
  }
  if (count > 0) {
    return NextResponse.json(
      {
        erro: `Este usuário tem ${count} lançamento(s) e por isso não pode ser excluído. ` +
              'Desative a conta se a pessoa saiu da equipe.',
        total_lancamentos: count
      },
      { status: 409 }
    );
  }

  // apaga a conta do Auth; perfis e config caem junto pelo on delete cascade
  const { error } = await admin.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
