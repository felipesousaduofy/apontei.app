'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icone from './Icone';
import Dialogo from './dashboard/Dialogo';
import { supabaseNavegador } from '@/lib/supabase/client';
import { ordenarAvisos, tomDoAviso, rotuloDaOrigem, quandoCurto, ICONE_TIPO } from '@/lib/avisos';

// rede de segurança para quando o Realtime não estiver disponível (projeto
// sem a tabela na publicação, canal caído, aba que perdeu o socket). No
// caminho normal quem avisa é o canal, não este relógio.
const INTERVALO = 3 * 60 * 1000;

/**
 * Sino de avisos, faixas fixadas e o aviso que abre sozinho na tela.
 *
 * A chegada é por Realtime: o Supabase empurra o evento da tabela `avisos` e
 * a tela reage na hora, sem recarregar. O evento é só um gatilho — quem
 * decide o que essa pessoa pode ver continua sendo a policy de RLS, porque o
 * componente refaz a busca em /api/avisos em vez de ler o conteúdo que veio
 * no empurrão.
 *
 * As faixas não saem daqui pelo JSX normal: vão por portal para o
 * <div id="tarjas-avisos"> que fica no começo do <body>. É o que permite
 * plugar este componente na barra de ações de qualquer tela — as cinco têm
 * cabeçalhos diferentes — e mesmo assim a faixa nascer no topo da página.
 */
export default function Avisos({ mini = false }) {
  const [avisos, setAvisos] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [montado, setMontado] = useState(false);
  // fotografia de quem estava por ler quando a lista foi aberta: abrir marca
  // tudo como lido, mas o "novo" precisa continuar visível enquanto a pessoa
  // lê, senão a marcação some debaixo do olho dela
  const [novosAoAbrir, setNovosAoAbrir] = useState(() => new Set());
  const buscando = useRef(false);

  const buscar = useCallback(async () => {
    if (buscando.current) return;
    buscando.current = true;
    try {
      const resp = await fetch('/api/avisos');
      if (!resp.ok) return;
      const corpo = await resp.json();
      setAvisos(corpo.avisos || []);
    } catch {
      // rede fora do ar não é motivo para estourar erro na tela: o aviso
      // reaparece na próxima rodada
    } finally {
      buscando.current = false;
    }
  }, []);

  useEffect(() => {
    setMontado(true);
    buscar();

    const relogio = setInterval(buscar, INTERVALO);
    // voltar para a aba é o melhor momento para conferir: cobre o caso de
    // deixar o apontei aberto o dia todo numa aba de fundo, com o socket já
    // dormindo
    const aoVoltar = () => { if (document.visibilityState === 'visible') buscar(); };
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      clearInterval(relogio);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [buscar]);

  // '*' e não só INSERT: editar a janela de publicação, mudar o texto ou
  // excluir também precisam sumir/aparecer na tela de quem está com ela aberta
  useEffect(() => {
    const supabase = supabaseNavegador();
    const canal = supabase
      .channel('avisos-em-tempo-real')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'avisos' }, () => buscar())
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [buscar]);

  async function marcarLido(id) {
    setAvisos(atual => atual.map(a => (a.id === id ? { ...a, lido: true } : a)));
    await fetch(`/api/avisos/${id}/lido`, { method: 'POST' }).catch(() => {});
  }

  function abrirLista() {
    const naoLidos = avisos.filter(a => !a.lido);
    setNovosAoAbrir(new Set(naoLidos.map(a => a.id)));
    setAberto(true);
    // ver a lista já conta como ler. O que exige confirmação explícita é o
    // aviso que interrompe — faixa e tela têm o próprio botão "Entendi"
    naoLidos.filter(a => a.exibicao === 'sino').forEach(a => marcarLido(a.id));
  }

  const ordenados = ordenarAvisos(avisos);
  const faixas = ordenados.filter(a => a.exibicao === 'faixa' && !a.lido);
  const naTela = ordenados.filter(a => a.exibicao === 'tela' && !a.lido);
  const naoLidos = avisos.filter(a => !a.lido).length;
  const alvoFaixas = montado ? document.getElementById('tarjas-avisos') : null;

  function dispensarNaTela() {
    naTela.forEach(a => marcarLido(a.id));
  }

  return (
    <>
      <button
        className={'btn' + (mini ? ' btn--mini' : '') + ' btn--icone sino-aviso'}
        onClick={abrirLista}
        title={naoLidos > 0 ? `${naoLidos} aviso(s) por ler` : 'Avisos'}
        aria-label={naoLidos > 0 ? `Avisos, ${naoLidos} por ler` : 'Avisos'}
      >
        <Icone nome="sino" tamanho={mini ? 14 : 16} />
        {naoLidos > 0 && <span className="sino-aviso__selo">{naoLidos > 9 ? '9+' : naoLidos}</span>}
      </button>

      {alvoFaixas && createPortal(
        faixas.map(a => (
          <div key={a.id} className={`tarja-aviso tarja-aviso--${tomDoAviso(a)}`} role="status">
            <span className="tarja-aviso__marca">
              <Icone nome={ICONE_TIPO[a.tipo] || 'sino'} tamanho={14} />
              {rotuloDaOrigem(a)}
            </span>
            <div className="tarja-aviso__texto">
              <strong>{a.titulo}</strong>
              {a.corpo && <span className="tarja-aviso__corpo">{a.corpo}</span>}
            </div>
            <span className="tarja-aviso__autor">{a.autor_nome}</span>
            <button
              className="btn btn--mini" onClick={() => marcarLido(a.id)}
              title="Não mostrar esta faixa de novo"
            >
              Entendi
            </button>
          </div>
        )),
        alvoFaixas
      )}

      {/* o aviso que interrompe. Fechar equivale a dar ciência — deixar sair
          sem marcar faria ele voltar no próximo evento, o que vira armadilha */}
      <Dialogo aberto={naTela.length > 0} aoFechar={dispensarNaTela} largura={480}>
        <div className={`dlg__cab dlg__cab--${tomDoAviso(naTela[0] || {})}`}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icone nome={ICONE_TIPO[naTela[0]?.tipo] || 'sino'} tamanho={16} />
            {naTela.length === 1 ? rotuloDaOrigem(naTela[0] || {}) : `${naTela.length} avisos novos`}
          </h2>
        </div>

        <div className="dlg__corpo">
          <ul className="lista-aviso">
            {naTela.map(a => (
              <li key={a.id} className={`lista-aviso__item lista-aviso__item--${tomDoAviso(a)}`}>
                <div className="lista-aviso__cab">
                  <span className={`cracha cracha--aviso-${tomDoAviso(a)}`}>
                    <Icone nome={ICONE_TIPO[a.tipo] || 'sino'} tamanho={12} />
                    {rotuloDaOrigem(a)}
                  </span>
                  <span className="lista-aviso__quando">{quandoCurto(a.publicar_em)}</span>
                </div>
                <p className="lista-aviso__titulo">{a.titulo}</p>
                {a.corpo && <p className="lista-aviso__corpo">{a.corpo}</p>}
                <p className="lista-aviso__pe">por {a.autor_nome || 'sistema'}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="dlg__pe">
          <button className="btn btn--forte" onClick={dispensarNaTela} style={{ marginLeft: 'auto' }}>
            Entendi
          </button>
        </div>
      </Dialogo>

      {/* a lista do sino fica fora do ar enquanto houver aviso interrompendo:
          dois <dialog> modais abertos ao mesmo tempo brigam pelo foco */}
      <Dialogo
        aberto={aberto && naTela.length === 0}
        aoFechar={() => setAberto(false)}
        largura={520}
      >
        <div className="dlg__cab">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icone nome="sino" tamanho={15} />
            Avisos
          </h2>
          <button
            className="btn btn--fantasma btn--icone" onClick={() => setAberto(false)}
            title="Fechar" aria-label="Fechar"
          >
            <Icone nome="fechar" tamanho={16} />
          </button>
        </div>

        <div className="dlg__corpo">
          {ordenados.length === 0 ? (
            <div className="vazio-estado">
              <span className="vazio-estado__icone"><Icone nome="inbox" tamanho={20} /></span>
              <p className="vazio-estado__titulo">Nenhum aviso por aqui</p>
              <p className="vazio-estado__texto">
                Quando alguém publicar um aviso para você ou para a sua equipe,
                ele aparece nesta lista.
              </p>
            </div>
          ) : (
            <ul className="lista-aviso">
              {ordenados.map(a => (
                <li key={a.id} className={`lista-aviso__item lista-aviso__item--${tomDoAviso(a)}`}>
                  <div className="lista-aviso__cab">
                    <span className={`cracha cracha--aviso-${tomDoAviso(a)}`}>
                      <Icone nome={ICONE_TIPO[a.tipo] || 'sino'} tamanho={12} />
                      {rotuloDaOrigem(a)}
                    </span>
                    {novosAoAbrir.has(a.id) && <span className="lista-aviso__novo">novo</span>}
                    <span className="lista-aviso__quando">{quandoCurto(a.publicar_em)}</span>
                  </div>
                  <p className="lista-aviso__titulo">{a.titulo}</p>
                  {a.corpo && <p className="lista-aviso__corpo">{a.corpo}</p>}
                  <p className="lista-aviso__pe">
                    por {a.autor_nome || 'sistema'}
                    {a.expira_em && ` · sai do ar ${quandoCurto(a.expira_em)}`}
                    {!a.lido && a.exibicao !== 'sino' && (
                      <button
                        className="btn btn--mini" style={{ marginLeft: 8 }}
                        onClick={() => marcarLido(a.id)}
                      >
                        Entendi
                      </button>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dlg__pe">
          <button className="btn" onClick={() => setAberto(false)}>Fechar</button>
        </div>
      </Dialogo>
    </>
  );
}
