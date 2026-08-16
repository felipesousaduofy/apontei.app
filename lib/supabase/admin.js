import { createClient } from '@supabase/supabase-js';

/**
 * Cliente com a chave service_role: ignora RLS e dá acesso à API de
 * administração do Auth (excluir conta, bloquear login).
 *
 * Só pode ser importado em código de servidor — Route Handlers e Server
 * Components. A variável não tem prefixo NEXT_PUBLIC_ justamente para o
 * Next barrar o uso no navegador.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!chave) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não configurada. Pegue a chave service_role ' +
      'em Project Settings > API no painel do Supabase e coloque no .env.local ' +
      '(e nas variáveis de ambiente da Vercel).'
    );
  }

  return createClient(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
