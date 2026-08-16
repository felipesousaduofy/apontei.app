'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseNavegador } from '@/lib/supabase/client';

export default function Login() {
  const router = useRouter();
  const supabase = supabaseNavegador();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setEnviando(false);
    if (error) {
      setErro(error.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.'
        : 'Não foi possível entrar. Tente novamente.');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="pagina-auth">
      <div className="cartao-auth">
        <h1>apontei<span className="marca-ponto">.</span></h1>
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
          <button className="btn btn--forte" type="submit" disabled={enviando} style={{ width: '100%' }}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="rodape-auth">Ainda não tem conta? <Link href="/signup">Cadastre-se</Link></p>
      </div>
    </main>
  );
}
