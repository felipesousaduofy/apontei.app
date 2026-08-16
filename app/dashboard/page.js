import { supabaseServidor } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function Dashboard() {
  const supabase = supabaseServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const dia = hojeISO();

  const { data: lancamentos } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('data', dia)
    .order('inicio');

  return (
    <DashboardClient
      lancamentosIniciais={lancamentos || []}
      dia={dia}
      email={user?.email}
    />
  );
}
