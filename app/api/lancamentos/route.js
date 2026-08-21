import { NextResponse } from 'next/server';
import { exigirUsuario } from '@/lib/supabase/sessao';

function limpar(corpo, userId) {
  return {
    user_id: userId,
    data: corpo.data,
    inicio: corpo.inicio,
    fim: corpo.fim || null,
    descricao: corpo.descricao || '',
    projeto: corpo.projeto || '',
    chamado: corpo.chamado || '',
    categoria: corpo.categoria || '',
    obs: corpo.obs || ''
  };
}

/**
 * GET /api/lancamentos?de=&ate=&abertos=1&usuario=
 * `abertos=1` traz junto as atividades ainda em andamento, mesmo que sejam de
 * antes do período pedido — senão um cronômetro esquecido na sexta some da tela
 * na segunda.
 * `usuario` é opcional e serve pra um supervisor ver os lançamentos de um
 * colega de equipe — sem ele, é sempre o próprio usuário logado. O RLS
 * (supervisiona) decide se a leitura é permitida; sem permissão, vem vazio.
 */
export async function GET(req) {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;
  const { supabase, user } = guarda;

  const url = new URL(req.url);
  const de = url.searchParams.get('de');
  const ate = url.searchParams.get('ate');
  const incluirAbertos = url.searchParams.get('abertos') === '1';
  const alvo = url.searchParams.get('usuario') || user.id;

  let query = supabase.from('lancamentos').select('*').eq('user_id', alvo).order('data').order('inicio');
  if (de) query = query.gte('data', de);
  if (ate) query = query.lte('data', ate);

  const { data, error } = await query;
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  let lancamentos = data;

  if (incluirAbertos) {
    const { data: abertos, error: erroAbertos } = await supabase
      .from('lancamentos')
      .select('*')
      .eq('user_id', alvo)
      .is('fim', null);

    if (erroAbertos) return NextResponse.json({ erro: erroAbertos.message }, { status: 500 });

    const porId = new Map(lancamentos.map(l => [l.id, l]));
    abertos.forEach(l => porId.set(l.id, l));
    lancamentos = [...porId.values()].sort((a, b) =>
      (a.data + a.inicio).localeCompare(b.data + b.inicio));
  }

  return NextResponse.json({ lancamentos });
}

/**
 * POST /api/lancamentos
 * Aceita um lançamento só, ou `{ lancamentos: [...] }` para importar um backup
 * do apontei local. Na importação, pares data+início que já existem são
 * ignorados, para reimportar o mesmo arquivo não duplicar nada.
 */
export async function POST(req) {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;
  const { supabase, user } = guarda;

  const corpo = await req.json();

  if (Array.isArray(corpo.lancamentos)) {
    const validos = corpo.lancamentos.filter(l => l && l.data && l.inicio);
    if (validos.length === 0) {
      return NextResponse.json({ erro: 'nenhum lançamento válido no arquivo' }, { status: 400 });
    }

    const datas = [...new Set(validos.map(l => l.data))];
    const { data: existentes, error: erroExistentes } = await supabase
      .from('lancamentos')
      .select('data, inicio')
      .in('data', datas);

    if (erroExistentes) {
      return NextResponse.json({ erro: erroExistentes.message }, { status: 500 });
    }

    const jaTem = new Set(existentes.map(l => `${l.data}|${String(l.inicio).slice(0, 5)}`));
    const novos = validos
      .filter(l => !jaTem.has(`${l.data}|${String(l.inicio).slice(0, 5)}`))
      .map(l => limpar(l, user.id));

    if (novos.length === 0) {
      return NextResponse.json({ importados: 0, ignorados: validos.length });
    }

    const { data, error } = await supabase.from('lancamentos').insert(novos).select();
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

    return NextResponse.json(
      { lancamentos: data, importados: data.length, ignorados: validos.length - data.length },
      { status: 201 }
    );
  }

  if (!corpo.data || !corpo.inicio) {
    return NextResponse.json({ erro: 'informe pelo menos data e início' }, { status: 400 });
  }

  // tarefa_id só entra pelo lançamento único — a importação em massa nunca
  // teria um cartão de quadro de origem legítimo para referenciar
  const { data, error } = await supabase
    .from('lancamentos')
    .insert({ ...limpar(corpo, user.id), tarefa_id: corpo.tarefa_id || null })
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ lancamento: data }, { status: 201 });
}

/** DELETE /api/lancamentos?tudo=1 — usado pelo "Apagar tudo" dos ajustes. */
export async function DELETE(req) {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;
  const { supabase, user } = guarda;

  if (new URL(req.url).searchParams.get('tudo') !== '1') {
    return NextResponse.json({ erro: 'confirme com tudo=1' }, { status: 400 });
  }

  const { error, count } = await supabase
    .from('lancamentos')
    .delete({ count: 'exact' })
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, excluidos: count ?? 0 });
}
