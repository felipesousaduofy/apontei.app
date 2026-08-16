import { redirect } from 'next/navigation';
import { usuarioComPerfil } from '@/lib/supabase/sessao';
import DashboardClient from './DashboardClient';

/**
 * A tela carrega os lançamentos no navegador, não aqui: o dia corrente depende
 * do fuso de quem está usando, e o servidor roda em UTC — à noite no Brasil ele
 * já estaria no dia seguinte.
 */
export default async function Dashboard() {
  const { user, perfil } = await usuarioComPerfil();
  if (!user) redirect('/login');

  return <DashboardClient email={user.email} ehAdmin={!!perfil?.is_admin} />;
}
