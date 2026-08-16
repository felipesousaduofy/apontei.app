'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Marca from '../Marca';
import { supabaseNavegador } from '@/lib/supabase/client';

export default function Login() {
  const router = useRouter();
  const supabase = supabaseNavegador();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // quem foi desativado é mandado para cá pelo middleware; encerra a sessão
  // que sobrou no navegador e explica o que aconteceu.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('motivo') !== 'inativo') return;
    setErro('Sua conta foi desativada. Fale com um administrador do apontei.');
    supabaseNavegador().auth.signOut();
  }, []);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setEnviando(false);
    if (error) {
      if (error.message === 'Invalid login credentials') {
        setErro('E-mail ou senha incorretos.');
      } else if (/banned/i.test(error.message)) {
        setErro('Sua conta foi desativada. Fale com um administrador do apontei.');
      } else {
        setErro('Não foi possível entrar. Tente novamente.');
      }
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="pagina-auth">
      <div className="cartao-auth">
        <Marca altura={46} />
        <p className="sub">Entre com sua conta da equipe.</p>
        {erro && <div className="erro-auth">{erro}</div>}
        <form onSubmit={entrar}>
          <div className="campo-grupo">
            <label className="rotulo" htmlFor="email">E-mail</label>
            <input className="campo" id="email" type="email" required autoFocus
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="campo-grupo">
            <label className="rotulo" htmlFor="senha">Senha</label>
            <input className="campo" id="senha" type="password" required
              value={senha} onChange={e => setSenha(e.target.value)} />
          </div>
          <button className="btn btn--forte btn--largo" type="submit" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="rodape-auth">Ainda não tem conta? <Link href="/signup">Cadastre-se</Link></p>
      </div>
    </main>
  );
}
