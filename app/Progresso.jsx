'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Barra de progresso das trocas de tela.
 *
 * No App Router a rota nova é montada no servidor: entre o clique e a tela
 * existe uma ida ao Supabase que, sem nada se mexendo, parece travamento.
 *
 * A barra começa no clique de qualquer link interno, ou no evento
 * `apontei:navegando` para quem navega por código (o login, o Sair), e termina
 * quando o pathname realmente muda — não num tempo chutado.
 */

const LIMITE_MS = 12000; // trava de segurança: navegação que nunca conclui

export default function Progresso() {
  const caminho = usePathname();
  const [largura, setLargura] = useState(0); // 0 = escondida
  const avanco = useRef(null);
  const saida = useRef(null);
  const desistencia = useRef(null);

  const parar = useCallback(() => {
    clearInterval(avanco.current);
    clearTimeout(desistencia.current);
    avanco.current = null;
    setLargura(100);
    saida.current = setTimeout(() => setLargura(0), 280);
  }, []);

  const comecar = useCallback(() => {
    if (avanco.current) return; // já está correndo
    clearTimeout(saida.current);
    setLargura(8);

    // avanço desacelerando: encosta em 90% e espera a rota trocar de verdade
    avanco.current = setInterval(() => {
      setLargura(l => (l >= 90 ? l : l + Math.max(0.4, (90 - l) / 14)));
    }, 90);

    desistencia.current = setTimeout(parar, LIMITE_MS);
  }, [parar]);

  // a rota mudou: encerra o que estava correndo
  useEffect(() => {
    if (avanco.current) parar();
  }, [caminho, parar]);

  useEffect(() => {
    function noClique(e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = e.target.closest?.('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;

      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return; // âncora ou a mesma tela

      comecar();
    }

    document.addEventListener('click', noClique, true);
    window.addEventListener('apontei:navegando', comecar);
    return () => {
      document.removeEventListener('click', noClique, true);
      window.removeEventListener('apontei:navegando', comecar);
      clearInterval(avanco.current);
      clearTimeout(saida.current);
      clearTimeout(desistencia.current);
    };
  }, [comecar]);

  if (!largura) return null;

  // decorativa: quem usa leitor de tela recebe o aviso pelo aria-busy dos
  // esqueletos e pelo texto do próprio botão ("Entrando…")
  return (
    <div className="progresso" aria-hidden="true">
      <i style={{ width: `${largura}%`, opacity: largura >= 100 ? 0 : 1 }} />
    </div>
  );
}

/** Avisa a barra de uma navegação feita por código, antes do router.push. */
export function avisarNavegacao() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('apontei:navegando'));
  }
}
