import { NextResponse } from 'next/server';
import { supabaseServidor } from '@/lib/supabase/server';

export async function GET(req) {
  const supabase = supabaseServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: 'não autenticado' }, { status: 401 });

  const url = new URL(req.url);
  const de = url.searchParams.get('de');   // data inicial (YYYY-MM-DD)
  const ate = url.searchParams.get('ate'); // data final, inclusive

  let query = supabase.from('lancamentos').select('*').order('data').order('inicio');
  if (de) query = query.gte('data', de);
  if (ate) query = query.lte('data', ate);

  const { data, error } = await query;
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ lancamentos: data });
}

export async function POST(req) {
  const supabase = supabaseServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: 'não autenticado' }, { status: 401 });

  const corpo = await req.json();
  if (!corpo.data || !corpo.inicio) {
    return NextResponse.json({ erro: 'informe pelo menos data e início' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('lancamentos')
    .insert({
      user_id: user.id,
      data: corpo.data,
      inicio: corpo.inicio,
      fim: corpo.fim || null,
      descricao: corpo.descricao || '',
      projeto: corpo.projeto || '',
      chamado: corpo.chamado || '',
      categoria: corpo.categoria || '',
      obs: corpo.obs || ''
    })
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ lancamento: data }, { status: 201 });
}
