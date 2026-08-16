import { NextResponse } from 'next/server';
import { supabaseServidor } from '@/lib/supabase/server';

const CAMPOS_PERMITIDOS = ['data', 'inicio', 'fim', 'descricao', 'projeto', 'chamado', 'categoria', 'obs'];

export async function PATCH(req, { params }) {
  const supabase = supabaseServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: 'não autenticado' }, { status: 401 });

  const corpo = await req.json();
  const alteracoes = {};
  for (const campo of CAMPOS_PERMITIDOS) {
    if (campo in corpo) alteracoes[campo] = corpo[campo];
  }

  // a política de RLS já impede editar registro de outra pessoa;
  // o filtro por user_id aqui é só para retornar 404 em vez de um 200 vazio
  const { data, error } = await supabase
    .from('lancamentos')
    .update(alteracoes)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 404 });
  return NextResponse.json({ lancamento: data });
}

export async function DELETE(req, { params }) {
  const supabase = supabaseServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: 'não autenticado' }, { status: 401 });

  const { error } = await supabase
    .from('lancamentos')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
