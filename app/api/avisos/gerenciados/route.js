import { NextResponse } from 'next/server';
import { exigirAutorDeAviso } from '@/lib/supabase/sessao';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET: o que alimenta a tela de gestão de avisos.
 *
 * Devolve três coisas de uma vez para a tela não precisar de três idas ao
 * servidor: os avisos que a pessoa pode gerenciar, quantos destinatários cada
 * um tem (e quantos já leram) e as opções de destino que ela pode escolher.
 *
 * O admin vê tudo — inclusive o que os supervisores publicaram, que é o que
 * lhe permite moderar. O supervisor vê só o que ele mesmo escreveu.
 */
export async function GET() {
  const guarda = await exigirAutorDeAviso();
  if (guarda.resposta) return guarda.resposta;
  const { user, perfil, escopo } = guarda;

  let admin;
  try {
    admin = supabaseAdmin();
  } catch (e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }

  let consulta = admin.from('avisos').select('*').order('publicar_em', { ascending: false });
  if (escopo !== 'todos') consulta = consulta.eq('criado_por', user.id);

  const [{ data: avisos, error }, { data: pessoas }, { data: equipes }] = await Promise.all([
    consulta,
    admin.from('perfis').select('id, nome, email, equipe_id, ativo').order('nome'),
    admin.from('equipes').select('id, nome').order('nome')
  ]);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  const todasPessoas = pessoas || [];
  const ids = (avisos || []).map(a => a.id);

  const { data: leituras } = ids.length
    ? await admin.from('avisos_lidos').select('aviso_id').in('aviso_id', ids)
    : { data: [] };

  const contagem = new Map();
  (leituras || []).forEach(l => contagem.set(l.aviso_id, (contagem.get(l.aviso_id) || 0) + 1));

  const ativos = todasPessoas.filter(p => p.ativo);
  const nomeDe = new Map(todasPessoas.map(p => [p.id, p.nome || p.email]));
  const nomeEquipe = new Map((equipes || []).map(e => [e.id, e.nome]));

  // o autor não conta como destinatário: ele não recebe o próprio aviso,
  // então incluí-lo faria "3 de 4 leram" nunca fechar
  function alcance(aviso) {
    if (aviso.destino === 'usuario') return 1;
    const alvo = aviso.destino === 'equipe'
      ? ativos.filter(p => p.equipe_id === aviso.destino_id)
      : ativos;
    return alvo.filter(p => p.id !== aviso.criado_por).length;
  }

  const lista = (avisos || []).map(a => ({
    ...a,
    leram: contagem.get(a.id) || 0,
    alcance: alcance(a),
    destino_nome: a.destino === 'todos'
      ? 'Todo mundo'
      : a.destino === 'equipe'
        ? (nomeEquipe.get(a.destino_id) || 'equipe removida')
        : (nomeDe.get(a.destino_id) || 'pessoa removida')
  }));

  // o supervisor só escolhe entre a própria equipe e quem está nela
  const opcoesPessoas = escopo === 'todos'
    ? ativos
    : ativos.filter(p => p.equipe_id === perfil.equipe_id && p.id !== user.id);

  return NextResponse.json({
    avisos: lista,
    escopo,
    minhaEquipe: escopo === 'todos'
      ? null
      : { id: perfil.equipe_id, nome: nomeEquipe.get(perfil.equipe_id) || 'sua equipe' },
    opcoes: {
      equipes: escopo === 'todos' ? (equipes || []) : [],
      pessoas: opcoesPessoas.map(p => ({ id: p.id, nome: p.nome || p.email }))
    }
  });
}
