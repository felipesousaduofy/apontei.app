'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabaseNavegador } from '@/lib/supabase/client';

export default function Signup() {
  const supabase = supabaseNavegador();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function cadastrar(e) {
    e.preventDefault();
    setErro('');
    if (senha.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return; }
    setEnviando(true);
    const { error } = await supabase.auth.signUp({ email, password: senha });
    setEnviando(false);
    if (error) { setErro('Não foi possível criar a conta: ' + error.message); return; }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <main className="pagina-auth">
        <div className="cartao-auth">
          <h1>apontei<span className="marca-ponto">.</span></h1>
          <p className="sub">Quase lá.</p>
          <p>Enviamos um link de confirmação para <strong>{email}</strong>. Abra o e-mail e confirme para poder entrar.</p>
          <p className="rodape-auth"><Link href="/login">Voltar para o login</Link></p>
        </div>
      </main>
    );
  }

  return (
    <main className="pagina-auth">
      <div className="cartao-auth">
        <h1>apontei<span className="marca-ponto">.</span></h1>
        <p className="sub">Crie sua conta para começar a apontar.</p>
        {erro && <div className="erro-auth">{erro}</div>}
        <form onSubmit={cadastrar}>
          <div className="campo-grupo">
            <label className="rotulo" htmlFor="email">E-mail</label>
            <input className="campo" id="email" type="email" required autoFocus
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="campo-grupo">
            <label className="rotulo" htmlFor="senha">Senha</label>
            <input className="campo" id="senha" type="password" required minLength={6}
              value={senha} onChange={e => setSenha(e.target.value)} />
          </div>
          <button className="btn btn--forte" type="submit" disabled={enviando} style={{ width: '100%' }}>
            {enviando ? 'Criando…' : 'Criar conta'}
          </button>
        </form>
        <p className="rodape-auth">Já tem conta? <Link href="/login">Entrar</Link></p>
      </div>
    </main>
  );
}
