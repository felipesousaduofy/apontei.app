import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function supabaseServidor() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesParaGravar) {
          try {
            cookiesParaGravar.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado a partir de um Server Component: o middleware já
            // cuida de manter a sessão viva, então é seguro ignorar aqui.
          }
        }
      }
    }
  );
}
