import { NextResponse } from 'next/server';
import { exigirAutorDeAviso } from '@/lib/supabase/sessao';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validarAviso, TIPOS_DO_ADMIN } from '@/lib/avisos';

/**
 * Carrega o aviso e confere se quem pediu pode mexer nele.
 *
 * Admin mexe em qualquer um — inclusive nos dos supervisores, que é o que dá
 * a ele o poder de moderar. Supervisor mexe só no que ele mesmo publicou.
 */
async function avisoEditavel(admin, id, guarda) {
  const { data, error } = await admin.from('avisos').select('*').eq('id', id).maybeSingle();
  if (error) return { erro: error.message, status: 500 };
  if (!data) return { erro: 'aviso não encontrado', status: 404 };

  if (guarda.escopo !== 'todos' && data.criado_por !== guarda.user.id) {
    return { erro: 'Você só pode alterar os avisos que publicou.', status: 403 };
  }
  return { aviso: data };
}

/**
 * PATCH: muda texto, tipo, fixação e janela de publicação.
 *
 * Destino não se edita de propósito: um aviso que já foi lido por uma equipe
 * mudando de dono deixaria as marcas de leitura sem sentido. Para falar com
 * outro público, publique outro aviso.
 */
export async function PATCH(req, { params }) {
  const guarda = await exigirAutorDeAviso();
  if (guarda.resposta) return guarda.resposta;

  const corpo = await req.json().catch(() => ({}));
  const { erro: erroForma, dados } = validarAviso(corpo);
  if (erroForma) return NextResponse.json({ erro: erroForma }, { status: 400 });

  if (guarda.escopo !== 'todos' && TIPOS_DO_ADMIN.includes(dados.tipo)) {
    return NextResponse.json(
      { erro: 'Avisos de manutenção e de novidade do sistema são publicados só por administradores.' },
      { status: 403 }
    );
  }

  let admin;
  try {
    admin = supabaseAdmin();
  } catch (e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }

  const alvo = await avisoEditavel(admin, params.id, guarda);
  if (alvo.erro) return NextResponse.json({ erro: alvo.erro }, { status: alvo.status });

  const { data, error } = await admin
    .from('avisos')
    .update(dados)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ aviso: data });
}

/** DELETE: tira o aviso do ar. As marcas de leitura caem junto, por cascade. */
export async function DELETE(req, { params }) {
  const guarda = await exigirAutorDeAviso();
  if (guarda.resposta) return guarda.resposta;

  let admin;
  try {
    admin = supabaseAdmin();
  } catch (e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }

  const alvo = await avisoEditavel(admin, params.id, guarda);
  if (alvo.erro) return NextResponse.json({ erro: alvo.erro }, { status: alvo.status });

  const { error } = await admin.from('avisos').delete().eq('id', params.id);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
