import { NextResponse } from 'next/server';
import { supabaseServidor } from '@/lib/supabase/server';

/**
 * Aonde o link do e-mail de confirmação cai depois que o Supabase valida o
 * código. Troca o `code` da URL pela sessão de verdade — sem isso, a conta
 * fica confirmada mas a pessoa continua sem estar logada, e teria que entrar
 * com e-mail e senha de novo.
 */
export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const proximo = url.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = supabaseServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(proximo, url.origin));
  }

  const destino = new URL('/login', url.origin);
  destino.searchParams.set('motivo', 'link_invalido');
  return NextResponse.redirect(destino);
}
