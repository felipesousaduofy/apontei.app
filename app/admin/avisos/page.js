import { redirect } from 'next/navigation';
import { usuarioComPerfil } from '@/lib/supabase/sessao';
import GestaoAvisos from '../../GestaoAvisos';

export const metadata = { title: 'apontei. · avisos' };

export default async function PaginaAvisosAdmin() {
  const { user, perfil } = await usuarioComPerfil();
  if (!user) redirect('/login');
  if (!perfil?.is_admin) redirect('/dashboard');

  return (
    <GestaoAvisos
      email={user.email}
      nome={perfil?.nome || ''}
      voltarPara="/admin/usuarios"
    />
  );
}
