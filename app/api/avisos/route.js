import { NextResponse } from 'next/server';
import { exigirUsuario, exigirAutorDeAviso } from '@/lib/supabase/sessao';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validarAviso, TIPOS_DO_ADMIN } from '@/lib/avisos';

/**
 * GET: os avisos que estão valendo para quem está pedindo.
 *
 * Quem filtra por destino e por vigência é a policy do banco, não este
 * handler — por isso a consulta usa o cliente do usuário, e não o
 * service_role. Se um dia alguém esquecer um filtro aqui, o banco ainda
 * segura.
 */
export async function GET() {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;
  const { supabase, user } = guarda;

  const { data: avisos, error } = await supabase
    .from('avisos')
    .select('*')
    .order('publicar_em', { ascending: false });

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  // não faz sentido o próprio autor receber o recado que acabou de escrever —
  // mesmo espírito do neq() que /api/equipe/colegas usa para tirar o
  // supervisor da lista dele mesmo
  const paraMim = (avisos || []).filter(a => a.criado_por !== user.id);
  if (paraMim.length === 0) return NextResponse.json({ avisos: [] });

  const { data: lidos } = await supabase
    .from('avisos_lidos')
    .select('aviso_id')
    .eq('user_id', user.id);

  const jaLi = new Set((lidos || []).map(l => l.aviso_id));
  return NextResponse.json({
    avisos: paraMim.map(a => ({ ...a, lido: jaLi.has(a.id) }))
  });
}

/**
 * Resolve para quem o aviso vai, respeitando o escopo de quem publica.
 *
 * Para o supervisor o alvo é DERIVADO do perfil dele, nunca lido do corpo da
 * requisição: o corpo só escolhe entre "a equipe toda" e "uma pessoa" — e,
 * no caso da pessoa, ainda se confere que ela está mesmo na equipe dele.
 */
async function alvoPermitido(admin, { escopo, perfil, corpo }) {
  const pedido = corpo.destino;

  if (escopo === 'todos') {
    if (pedido === 'todos' || !pedido) return { destino: 'todos', destino_id: null };

    if (pedido === 'equipe') {
      const { data } = await admin.from('equipes').select('id').eq('id', corpo.destino_id).maybeSingle();
      if (!data) return { erro: 'Escolha uma equipe válida para o aviso.' };
      return { destino: 'equipe', destino_id: data.id };
    }

    if (pedido === 'usuario') {
      const { data } = await admin.from('perfis').select('id').eq('id', corpo.destino_id).maybeSingle();
      if (!data) return { erro: 'Escolha uma pessoa válida para o aviso.' };
      return { destino: 'usuario', destino_id: data.id };
    }

    return { erro: 'Destino inválido.' };
  }

  // ---- escopo 'equipe': supervisor ----
  if (pedido === 'usuario') {
    const { data: alvo } = await admin
      .from('perfis')
      .select('id, equipe_id, ativo')
      .eq('id', corpo.destino_id)
      .maybeSingle();

    if (!alvo || !alvo.ativo || alvo.equipe_id !== perfil.equipe_id) {
      return { erro: 'Você só pode avisar alguém da sua própria equipe.' };
    }
    return { destino: 'usuario', destino_id: alvo.id };
  }

  // qualquer outra coisa (inclusive um 'todos' vindo na marra) vira o único
  // destino que o supervisor tem direito de usar
  return { destino: 'equipe', destino_id: perfil.equipe_id };
}

/** POST: publica um aviso. Admin fala pelo sistema; supervisor, pela equipe. */
export async function POST(req) {
  const guarda = await exigirAutorDeAviso();
  if (guarda.resposta) return guarda.resposta;
  const { user, perfil, escopo } = guarda;

  const corpo = await req.json().catch(() => ({}));
  const { erro: erroForma, dados } = validarAviso(corpo);
  if (erroForma) return NextResponse.json({ erro: erroForma }, { status: 400 });

  // "manutenção" e "novidade" falam em nome do sistema inteiro: um supervisor
  // usando esses rótulos anunciaria como global algo que é só da equipe dele.
  if (escopo !== 'todos' && TIPOS_DO_ADMIN.includes(dados.tipo)) {
    return NextResponse.json(
      { erro: 'Avisos de manutenção e de novidade do sistema são publicados só por administradores.' },
      { status: 403 }
    );
  }

  let admin;
  try {
    admin = supabaseAdmin();
  } catch (e) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }

  const alvo = await alvoPermitido(admin, { escopo, perfil, corpo });
  if (alvo.erro) return NextResponse.json({ erro: alvo.erro }, { status: 400 });

  const { data, error } = await admin
    .from('avisos')
    .insert({
      ...dados,
      destino: alvo.destino,
      destino_id: alvo.destino_id,
      criado_por: user.id,
      // assinatura congelada no envio: se a pessoa mudar de nome ou virar
      // admin depois, o aviso antigo continua como foi publicado
      autor_nome: perfil.nome || user.email || '',
      autor_papel: escopo === 'todos' ? 'admin' : 'supervisor'
    })
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ aviso: data }, { status: 201 });
}
