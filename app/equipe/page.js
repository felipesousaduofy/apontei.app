import { redirect } from 'next/navigation';
import { usuarioComPerfil } from '@/lib/supabase/sessao';
import EquipeClient from './EquipeClient';

export const metadata = { title: 'apontei. · equipe' };

export default async function PaginaEquipe() {
  const { user, perfil } = await usuarioComPerfil();
  if (!user) redirect('/login');
  if (!perfil?.is_supervisor) redirect('/dashboard');

  return (
    <EquipeClient
      email={user.email}
      nome={perfil.nome || ''}
      podeEditar={!!perfil.supervisor_pode_editar}
      podeAvisar={!!perfil.supervisor_pode_avisar}
    />
  );
}
