'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Marca from '../Marca';
import { avisarNavegacao } from '../Progresso';
import { supabaseNavegador } from '@/lib/supabase/client';

export default function RedefinirSenha() {
  const router = useRouter();
  const supabase = supabaseNavegador();
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pronta, setPronta] = useState(false);
  // null = ainda checando · true = tem sessão de recuperação · false = link vencido/já usado
  const [linkValido, setLinkValido] = useState(null);

  // quem chega aqui vem do link do e-mail, já com a troca de código feita em
  // /auth/recuperar-senha. Se não tiver sessão, o link já foi usado ou venceu.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLinkValido(!!data.user));
  }, [supabase]);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (senha.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return; }
    if (senha !== confirmar) { setErro('As senhas não são iguais.'); return; }

    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) { setErro('Não foi possível salvar a nova senha: ' + error.message); return; }

    setPronta(true);
    avisarNavegacao();
    router.push('/dashboard');
    router.refresh();
  }

  if (linkValido === false) {
    return (
      <main className="pagina-auth">
        <div className="cartao-auth">
          <Marca altura={46} />
          <p className="sub">Link inválido</p>
          <p>Esse link de redefinição já foi usado ou venceu.</p>
          <p className="rodape-auth"><Link href="/esqueci-senha">Pedir um novo link</Link></p>
        </div>
      </main>
    );
  }

  return (
    <main className="pagina-auth">
      <div className="cartao-auth">
        <Marca altura={46} />
        <p className="sub">Defina sua nova senha.</p>
        {erro && <div className="erro-auth">{erro}</div>}
        <form onSubmit={salvar}>
          <div className="campo-grupo">
            <label className="rotulo" htmlFor="senha">Nova senha</label>
            <input className="campo" id="senha" type="password" required minLength={6} autoFocus
              disabled={linkValido !== true}
              value={senha} onChange={e => setSenha(e.target.value)} />
          </div>
          <div className="campo-grupo">
            <label className="rotulo" htmlFor="confirmar">Confirmar senha</label>
            <input className="campo" id="confirmar" type="password" required minLength={6}
              disabled={linkValido !== true}
              value={confirmar} onChange={e => setConfirmar(e.target.value)} />
          </div>
          <button className="btn btn--forte btn--largo" type="submit" disabled={linkValido !== true || enviando}>
            {(enviando || pronta) && <span className="giro" />}
            {pronta ? 'Entrando…' : enviando ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </main>
  );
}
