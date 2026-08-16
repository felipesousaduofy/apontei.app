import { NextResponse } from 'next/server';
import { exigirUsuario } from '@/lib/supabase/sessao';
import { IDS_COLUNAS, IDS_PRIORIDADES } from '@/lib/kanban';

export async function PATCH(req, { params }) {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;
  const { supabase, user } = guarda;

  const corpo = await req.json();
  const alteracoes = {};

  if ('titulo' in corpo) {
    const titulo = (corpo.titulo || '').trim();
    if (!titulo) return NextResponse.json({ erro: 'o título não pode ficar vazio' }, { status: 400 });
    alteracoes.titulo = titulo;
  }
  if ('descricao' in corpo) alteracoes.descricao = corpo.descricao || '';
  if ('projeto' in corpo) alteracoes.projeto = corpo.projeto || '';
  if ('chamado' in corpo) alteracoes.chamado = corpo.chamado || '';
  if ('prazo' in corpo) alteracoes.prazo = corpo.prazo || null;
  if ('ordem' in corpo && Number.isFinite(Number(corpo.ordem))) {
    alteracoes.ordem = Number(corpo.ordem);
  }
  if ('prioridade' in corpo) {
    if (!IDS_PRIORIDADES.includes(corpo.prioridade)) {
      return NextResponse.json({ erro: 'prioridade inválida' }, { status: 400 });
    }
    alteracoes.prioridade = corpo.prioridade;
  }
  if ('coluna' in corpo) {
    if (!IDS_COLUNAS.includes(corpo.coluna)) {
      return NextResponse.json({ erro: 'coluna inválida' }, { status: 400 });
    }
    alteracoes.coluna = corpo.coluna;
  }

  if (Object.keys(alteracoes).length === 0) {
    return NextResponse.json({ erro: 'nada para alterar' }, { status: 400 });
  }

  if ('coluna' in alteracoes) {
    const { data: atual } = await supabase
      .from('tarefas')
      .select('coluna')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!atual) return NextResponse.json({ erro: 'tarefa não encontrada' }, { status: 404 });

    // só mexe no carimbo quando a coluna realmente muda, senão editar o título
    // de uma tarefa concluída reescreveria a data de conclusão
    if (atual.coluna !== alteracoes.coluna) {
      alteracoes.concluido_em = alteracoes.coluna === 'concluido' ? new Date().toISOString() : null;
    }
  }

  const { data, error } = await supabase
    .from('tarefas')
    .update(alteracoes)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 404 });
  return NextResponse.json({ tarefa: data });
}

export async function DELETE(req, { params }) {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;
  const { supabase, user } = guarda;

  const { error } = await supabase
    .from('tarefas')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
