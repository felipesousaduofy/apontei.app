import { NextResponse } from 'next/server';
import { supabaseServidor } from '@/lib/supabase/server';

/**
 * Aonde cai o link de "esqueci minha senha" / reset disparado pelo admin.
 *
 * É uma rota separada do /auth/callback (em vez de reusar `?next=...`)
 * porque o Supabase monta o link final concatenando `?code=...` sem checar
 * se a URL de redirect já tem uma query string — com `?next=/redefinir-senha`
 * o `code` vinha grudado dentro do valor de `next` em vez de virar um
 * parâmetro próprio, e a troca de sessão sempre falhava.
 *
 * Se a troca der certo, quem chega em /redefinir-senha já tem sessão pra
 * definir a nova senha; se falhar (link vencido ou já usado), a própria
 * página detecta a ausência de sessão e avisa.
 */
export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (code) {
    const supabase = supabaseServidor();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL('/redefinir-senha', url.origin));
}
