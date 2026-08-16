import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

function irPara(req, caminho) {
  const url = req.nextUrl.clone();
  url.pathname = caminho;
  url.search = '';
  return url;
}

export async function middleware(req) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesParaGravar) {
          cookiesParaGravar.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesParaGravar.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const caminho = req.nextUrl.pathname;
  const rotaAdmin = caminho.startsWith('/admin');
  const rotaProtegida = caminho.startsWith('/dashboard') || caminho.startsWith('/kanban') || rotaAdmin;
  const rotaAuth = caminho === '/login' || caminho === '/signup';

  if (!user) {
    if (rotaProtegida) return NextResponse.redirect(irPara(req, '/login'));
    return res;
  }

  // perfil pode vir nulo se o schema.sql ainda não foi atualizado; nesse caso
  // seguimos tratando a conta como um usuário comum ativo, para não trancar
  // ninguém para fora do sistema.
  const { data: perfil } = await supabase
    .from('perfis')
    .select('is_admin, ativo')
    .eq('id', user.id)
    .maybeSingle();

  if (perfil && !perfil.ativo) {
    if (rotaProtegida) {
      const url = irPara(req, '/login');
      url.searchParams.set('motivo', 'inativo');
      return NextResponse.redirect(url);
    }
    return res; // deixa ficar no /login para ler o aviso e sair da sessão
  }

  if (rotaAuth) return NextResponse.redirect(irPara(req, '/dashboard'));
  if (rotaAdmin && !perfil?.is_admin) return NextResponse.redirect(irPara(req, '/dashboard'));

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/kanban/:path*', '/admin/:path*', '/login', '/signup']
};
