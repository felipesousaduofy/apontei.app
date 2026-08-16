import { redirect } from 'next/navigation';
import { usuarioComPerfil } from '@/lib/supabase/sessao';
import KanbanClient from './KanbanClient';

export const metadata = { title: 'apontei. · quadro' };

export default async function PaginaKanban() {
  const { supabase, user, perfil } = await usuarioComPerfil();
  if (!user) redirect('/login');

  const { data: tarefas } = await supabase
    .from('tarefas')
    .select('*')
    .order('coluna')
    .order('ordem');

  return (
    <KanbanClient
      tarefasIniciais={tarefas || []}
      email={user.email}
      ehAdmin={!!perfil?.is_admin}
    />
  );
}
