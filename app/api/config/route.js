import { NextResponse } from 'next/server';
import { exigirUsuario } from '@/lib/supabase/sessao';
import { CONFIG_PADRAO } from '@/lib/apontamento';

const CAMPOS = [
  'arredondamento', 'inicio_dia', 'fim_dia', 'limite_caracteres',
  'separador', 'template', 'projetos', 'categorias'
];

export async function GET() {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;
  const { supabase, user } = guarda;

  const { data, error } = await supabase
    .from('config')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  // quem se cadastrou antes do gatilho existir pode não ter linha de config
  if (!data) {
    const { data: criada, error: erroCriar } = await supabase
      .from('config')
      .insert({ user_id: user.id })
      .select()
      .single();
    if (erroCriar) return NextResponse.json({ config: { ...CONFIG_PADRAO } });
    return NextResponse.json({ config: criada });
  }

  return NextResponse.json({ config: data });
}

export async function PATCH(req) {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;
  const { supabase, user } = guarda;

  const corpo = await req.json();
  const alteracoes = {};
  for (const campo of CAMPOS) {
    if (!(campo in corpo)) continue;

    if (campo === 'projetos' || campo === 'categorias') {
      if (!Array.isArray(corpo[campo])) continue;
      alteracoes[campo] = corpo[campo].map(v => String(v).trim()).filter(Boolean);
    } else if (campo === 'arredondamento' || campo === 'limite_caracteres') {
      alteracoes[campo] = Number(corpo[campo]) || 0;
    } else {
      alteracoes[campo] = corpo[campo];
    }
  }

  if (!alteracoes.categorias?.length) delete alteracoes.categorias;
  if (Object.keys(alteracoes).length === 0) {
    return NextResponse.json({ erro: 'nada para alterar' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('config')
    .upsert({ user_id: user.id, ...alteracoes })
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ config: data });
}
