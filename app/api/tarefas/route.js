import { NextResponse } from 'next/server';
import { exigirUsuario } from '@/lib/supabase/sessao';
import { IDS_COLUNAS, IDS_PRIORIDADES } from '@/lib/kanban';

export async function GET() {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;

  const { data, error } = await guarda.supabase
    .from('tarefas')
    .select('*')
    .order('coluna')
    .order('ordem');

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ tarefas: data });
}

export async function POST(req) {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;
  const { supabase, user } = guarda;

  const corpo = await req.json();
  const titulo = (corpo.titulo || '').trim();
  if (!titulo) return NextResponse.json({ erro: 'informe o título da tarefa' }, { status: 400 });

  const coluna = IDS_COLUNAS.includes(corpo.coluna) ? corpo.coluna : 'a_fazer';
  const prioridade = IDS_PRIORIDADES.includes(corpo.prioridade) ? corpo.prioridade : 'media';

  // entra no fim da coluna
  const { data: ultima } = await supabase
    .from('tarefas')
    .select('ordem')
    .eq('user_id', user.id)
    .eq('coluna', coluna)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('tarefas')
    .insert({
      user_id: user.id,
      titulo,
      descricao: corpo.descricao || '',
      coluna,
      ordem: ultima ? ultima.ordem + 1 : 1000,
      prioridade,
      prazo: corpo.prazo || null,
      projeto: corpo.projeto || '',
      chamado: corpo.chamado || '',
      concluido_em: coluna === 'concluido' ? new Date().toISOString() : null
    })
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ tarefa: data }, { status: 201 });
}

/** DELETE /api/tarefas?coluna=concluido — limpa uma coluna inteira. */
export async function DELETE(req) {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;
  const { supabase, user } = guarda;

  const coluna = new URL(req.url).searchParams.get('coluna');
  if (!IDS_COLUNAS.includes(coluna)) {
    return NextResponse.json({ erro: 'coluna inválida' }, { status: 400 });
  }

  const { error, count } = await supabase
    .from('tarefas')
    .delete({ count: 'exact' })
    .eq('user_id', user.id)
    .eq('coluna', coluna);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, excluidas: count ?? 0 });
}
