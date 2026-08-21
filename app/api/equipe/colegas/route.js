import { NextResponse } from 'next/server';
import { exigirUsuario } from '@/lib/supabase/sessao';

/** GET: colegas da própria equipe, pra quem é supervisor escolher quem ver. */
export async function GET() {
  const guarda = await exigirUsuario();
  if (guarda.resposta) return guarda.resposta;
  const { supabase, user, perfil } = guarda;

  if (!perfil?.is_supervisor || !perfil.equipe_id) {
    return NextResponse.json({ erro: 'sem permissão de supervisor' }, { status: 403 });
  }

  // o RLS (supervisiona) já é quem decide de verdade; o filtro aqui só evita
  // devolver o próprio supervisor na lista
  const { data, error } = await supabase
    .from('perfis')
    .select('id, nome, email')
    .eq('equipe_id', perfil.equipe_id)
    .eq('ativo', true)
    .neq('id', user.id)
    .order('nome');

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ colegas: data });
}
