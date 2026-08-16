import { redirect } from 'next/navigation';
import { usuarioComPerfil } from '@/lib/supabase/sessao';
import { supabaseAdmin } from '@/lib/supabase/admin';
import UsuariosClient from './UsuariosClient';

export const metadata = { title: 'apontei. · usuários' };

export default async function PaginaUsuarios() {
  const { user, perfil } = await usuarioComPerfil();
  if (!user) redirect('/login');
  if (!perfil?.is_admin) redirect('/dashboard');

  let usuarios = [];
  let erroInicial = '';

  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from('perfis_com_totais')
      .select('*')
      .order('criado_em');
    if (error) throw new Error(error.message);
    usuarios = data || [];
  } catch (e) {
    erroInicial = e.message;
  }

  return (
    <UsuariosClient
      usuariosIniciais={usuarios}
      erroInicial={erroInicial}
      meuId={user.id}
      email={user.email}
    />
  );
}
