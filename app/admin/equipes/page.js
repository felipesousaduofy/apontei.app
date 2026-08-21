import { redirect } from 'next/navigation';
import { usuarioComPerfil } from '@/lib/supabase/sessao';
import { supabaseAdmin } from '@/lib/supabase/admin';
import EquipesClient from './EquipesClient';

export const metadata = { title: 'apontei. · equipes' };

export default async function PaginaEquipes() {
  const { user, perfil } = await usuarioComPerfil();
  if (!user) redirect('/login');
  if (!perfil?.is_admin) redirect('/dashboard');

  let equipes = [];
  let erroInicial = '';

  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin.from('equipes').select('*').order('nome');
    if (error) throw new Error(error.message);
    equipes = data || [];
  } catch (e) {
    erroInicial = e.message;
  }

  return (
    <EquipesClient
      equipesIniciais={equipes}
      erroInicial={erroInicial}
      email={user.email}
      nome={perfil?.nome || ''}
    />
  );
}
