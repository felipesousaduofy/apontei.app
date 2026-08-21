import { redirect } from 'next/navigation';
import { usuarioComPerfil } from '@/lib/supabase/sessao';
import GestaoAvisos from '../../GestaoAvisos';

export const metadata = { title: 'apontei. · avisos da equipe' };

/**
 * O middleware já barra quem não é supervisor em /equipe/*. Aqui se confere a
 * permissão extra de publicar, que é o admin quem liga — mesma ideia do
 * supervisor_pode_editar na tela de lançamentos da equipe.
 */
export default async function PaginaAvisosEquipe() {
  const { user, perfil } = await usuarioComPerfil();
  if (!user) redirect('/login');
  if (!perfil?.is_supervisor) redirect('/dashboard');
  if (!perfil?.supervisor_pode_avisar) redirect('/equipe');

  return (
    <GestaoAvisos
      email={user.email}
      nome={perfil?.nome || ''}
      voltarPara="/equipe"
    />
  );
}
