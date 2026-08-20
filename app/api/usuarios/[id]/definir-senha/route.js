import { NextResponse } from 'next/server';
import { exigirAdmin } from '@/lib/supabase/sessao';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST: fallback para quando o e-mail de redefinição não sai (SMTP fora do
 * ar, por exemplo). O admin define uma senha temporária na mão e repassa
 * para o usuário por fora do sistema; a conta fica marcada para trocar essa
 * senha no primeiro login antes de usar o resto do app.
 */
export async function POST(req, { params }) {
  const guarda = await exigirAdmin();
  if (guarda.resposta) return guarda.resposta;

  if (params.id === guarda.user.id) {
    return NextResponse.json(
      { erro: 'Você não pode definir a própria senha por aqui — use "esqueci minha senha".' },
      { status: 400 }
    );
  }

  const corpo = await req.json().catch(() => ({}));
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  if (senha.length < 6) {
    return NextResponse.json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' }, { status: 400 });
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

  const { error: erroAuth } = await admin.auth.admin.updateUserById(params.id, { password: senha });
  if (erroAuth) return NextResponse.json({ erro: erroAuth.message }, { status: 500 });

  const { error: erroPerfil } = await admin
    .from('perfis')
    .update({ deve_trocar_senha: true })
    .eq('id', params.id);

  if (erroPerfil) return NextResponse.json({ erro: erroPerfil.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
