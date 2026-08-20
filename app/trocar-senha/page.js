'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Marca from '../Marca';
import { avisarNavegacao } from '../Progresso';
import { supabaseNavegador } from '@/lib/supabase/client';

export default function TrocarSenha() {
  const router = useRouter();
  const supabase = supabaseNavegador();
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pronta, setPronta] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (senha.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return; }
    if (senha !== confirmar) { setErro('As senhas não são iguais.'); return; }

    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setEnviando(false);
      setErro('Não foi possível salvar a nova senha: ' + error.message);
      return;
    }

    // some com a marcação — se isso falhar por qualquer motivo, a senha já
    // trocou de qualquer jeito, então não vale travar a pessoa aqui de novo
    await fetch('/api/perfil/senha-trocada', { method: 'POST' }).catch(() => {});

    setEnviando(false);
    setPronta(true);
    avisarNavegacao();
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="pagina-auth">
      <div className="cartao-auth">
        <Marca altura={46} />
        <p className="sub">Um administrador definiu uma senha temporária para sua conta. Defina uma nova senha, só sua, para continuar.</p>
        {erro && <div className="erro-auth">{erro}</div>}
        <form onSubmit={salvar}>
          <div className="campo-grupo">
            <label className="rotulo" htmlFor="senha">Nova senha</label>
            <input className="campo" id="senha" type="password" required minLength={6} autoFocus
              value={senha} onChange={e => setSenha(e.target.value)} />
          </div>
          <div className="campo-grupo">
            <label className="rotulo" htmlFor="confirmar">Confirmar senha</label>
            <input className="campo" id="confirmar" type="password" required minLength={6}
              value={confirmar} onChange={e => setConfirmar(e.target.value)} />
          </div>
          <button className="btn btn--forte btn--largo" type="submit" disabled={enviando || pronta}>
            {(enviando || pronta) && <span className="giro" />}
            {pronta ? 'Entrando…' : enviando ? 'Salvando…' : 'Salvar e entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
