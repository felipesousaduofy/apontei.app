'use client';
import { useState } from 'react';
import Link from 'next/link';
import Marca from '../Marca';
import { supabaseNavegador } from '@/lib/supabase/client';

export default function EsqueciSenha() {
  const supabase = supabaseNavegador();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/recuperar-senha`
    });
    setEnviando(false);
    if (error) {
      // limite de envio é um aviso "tente daqui a pouco" — não revela se o
      // e-mail existe, então não precisa ficar escondido atrás da tela de
      // sucesso como os outros erros
      if (/rate limit/i.test(error.message)) {
        setErro('Muitos pedidos de redefinição em pouco tempo. Aguarde alguns minutos e tente de novo.');
      } else {
        setErro('Não foi possível enviar o e-mail. Tente novamente.');
      }
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <main className="pagina-auth">
        <div className="cartao-auth">
          <Marca altura={46} />
          <p className="sub">Confira seu e-mail.</p>
          <p>
            Se <strong>{email}</strong> tiver uma conta no apontei, enviamos um link
            para redefinir a senha. O link vence depois de um tempo — se não chegar em
            alguns minutos, olhe o spam ou peça de novo.
          </p>
          <p className="rodape-auth"><Link href="/login">Voltar para o login</Link></p>
        </div>
      </main>
    );
  }

  return (
    <main className="pagina-auth">
      <div className="cartao-auth">
        <Marca altura={46} />
        <p className="sub">Informe seu e-mail para receber um link de redefinição de senha.</p>
        {erro && <div className="erro-auth">{erro}</div>}
        <form onSubmit={enviar}>
          <div className="campo-grupo">
            <label className="rotulo" htmlFor="email">E-mail</label>
            <input className="campo" id="email" type="email" required autoFocus
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button className="btn btn--forte btn--largo" type="submit" disabled={enviando}>
            {enviando && <span className="giro" />}
            {enviando ? 'Enviando…' : 'Enviar link de redefinição'}
          </button>
        </form>
        <p className="rodape-auth">Lembrou a senha? <Link href="/login">Entrar</Link></p>
      </div>
    </main>
  );
}
