import { NextResponse } from 'next/server';
import { exigirUsuario } from '@/lib/supabase/sessao';

const CAMPOS_PERMITIDOS = ['data', 'inicio', 'fim', 'descricao', 'projeto', 'chamado', 'categoria', 'obs'];

export async function PATCH(req, { params }) {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;
  const { supabase } = guarda;

  const corpo = await req.json();
  const alteracoes = {};
  for (const campo of CAMPOS_PERMITIDOS) {
    if (campo in corpo) alteracoes[campo] = corpo[campo];
  }

  // a política de RLS decide quem pode editar: o dono, ou um supervisor da
  // mesma equipe com permissão de edição. Sem permissão, não bate nenhuma
  // linha e o erro do .single() vira 404 abaixo.
  const { data, error } = await supabase
    .from('lancamentos')
    .update(alteracoes)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 404 });
  return NextResponse.json({ lancamento: data });
}

export async function DELETE(req, { params }) {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;
  const { supabase } = guarda;

  const { error } = await supabase
    .from('lancamentos')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
