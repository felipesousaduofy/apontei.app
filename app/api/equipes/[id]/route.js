import { NextResponse } from 'next/server';
import { exigirAdmin } from '@/lib/supabase/sessao';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function PATCH(req, { params }) {
  const guarda = await exigirAdmin();
  if (guarda.resposta) return guarda.resposta;

  const corpo = await req.json().catch(() => ({}));
  const nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : '';
  if (!nome) return NextResponse.json({ erro: 'informe o nome da equipe' }, { status: 400 });

  let admin;
  try {
    admin = supabaseAdmin();
  } catch (e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }

  const { data, error } = await admin
    .from('equipes')
    .update({ nome })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 404 });
  return NextResponse.json({ equipe: data });
}

/** DELETE: apaga a equipe — membros ficam sem equipe (on delete set null). */
export async function DELETE(req, { params }) {
  const guarda = await exigirAdmin();
  if (guarda.resposta) return guarda.resposta;

  let admin;
  try {
    admin = supabaseAdmin();
  } catch (e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }

  const { error } = await admin.from('equipes').delete().eq('id', params.id);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
