'use client';
import { useEffect, useState } from 'react';
import Icone from './Icone';

/**
 * Alterna claro → escuro → sistema.
 *
 * A escolha vive em `data-tema` no <html> e no localStorage; quem aplica isso
 * antes da primeira pintura é o script no layout, para a tela não piscar
 * branco antes de virar escura.
 */

const CICLO = ['sistema', 'claro', 'escuro'];
const ROTULOS = {
  sistema: { icone: 'sistema', texto: 'Tema do sistema' },
  claro: { icone: 'sol', texto: 'Tema claro' },
  escuro: { icone: 'lua', texto: 'Tema escuro' }
};

export default function TemaBotao() {
  // começa como 'sistema' nos dois lados para o HTML do servidor bater com o
  // do cliente; o valor real entra depois de montar
  const [tema, setTema] = useState('sistema');
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    const salvo = document.documentElement.dataset.tema;
    setTema(CICLO.includes(salvo) ? salvo : 'sistema');
    setMontado(true);
  }, []);

  function alternar() {
    const proximo = CICLO[(CICLO.indexOf(tema) + 1) % CICLO.length];
    setTema(proximo);

    if (proximo === 'sistema') {
      delete document.documentElement.dataset.tema;
      try { localStorage.removeItem('apontei-tema'); } catch (e) { /* modo privado */ }
    } else {
      document.documentElement.dataset.tema = proximo;
      try { localStorage.setItem('apontei-tema', proximo); } catch (e) { /* modo privado */ }
    }
  }

  const atual = ROTULOS[tema];

  return (
    <button
      className="btn btn--icone"
      onClick={alternar}
      title={`${atual.texto} — clique para trocar`}
      aria-label={`${atual.texto}. Clique para trocar de tema.`}
    >
      {/* antes de montar não dá para saber o tema salvo: mostra o neutro */}
      <Icone nome={montado ? atual.icone : 'sistema'} tamanho={16} />
    </button>
  );
}
