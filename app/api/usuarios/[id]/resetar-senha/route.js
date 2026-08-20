import { NextResponse } from 'next/server';
import { exigirAdmin } from '@/lib/supabase/sessao';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST: reenvia para o usuário o mesmo e-mail de redefinição de senha do
 * "esqueci minha senha" — o admin nunca fica sabendo nem define a senha de
 * outra pessoa, só dispara o link.
 */
export async function POST(req, { params }) {
  const guarda = await exigirAdmin();
  if (guarda.resposta) return guarda.resposta;

  let admin;
  try {
    admin = supabaseAdmin();
  } catch (e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }

  const { data: perfil } = await admin
    .from('perfis')
    .select('email')
    .eq('id', params.id)
    .maybeSingle();

  if (!perfil) {
    return NextResponse.json({ erro: 'usuário não encontrado' }, { status: 404 });
  }

  const origem = new URL(req.url).origin;
  const { error } = await admin.auth.resetPasswordForEmail(perfil.email, {
    redirectTo: `${origem}/auth/recuperar-senha`
  });

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, email: perfil.email });
}
