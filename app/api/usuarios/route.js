import { NextResponse } from 'next/server';
import { exigirAdmin } from '@/lib/supabase/sessao';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const guarda = await exigirAdmin();
  if (guarda.resposta) return guarda.resposta;

  let admin;
  try {
    admin = supabaseAdmin();
  } catch (e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }

  const { data, error } = await admin
    .from('perfis_com_totais')
    .select('*')
    .order('criado_em');

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ usuarios: data, meuId: guarda.user.id });
}
