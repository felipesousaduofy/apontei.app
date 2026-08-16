'use client';
import { Fragment } from 'react';
import {
  corCategoria, dataBR, doDia, duracaoMin, hojeISO, minParaHM,
  nomeCurtoDoDia, rotuloDoPeriodo
} from '@/lib/apontamento';

export default function ListaLancamentos({
  lancamentos, dia, modo, config, abertos, selecionados,
  aoAlternarAberto, aoAlternarSelecao, aoEditarCampo, aoGravarCampo, aoExcluir
}) {
  if (!lancamentos.length) {
    return (
      <ul className="lista">
        <li className="vazio-msg">
          Nenhum registro em {modo === 'semana' ? rotuloDoPeriodo(dia, modo) : dataBR(dia)}.
          <br />
          {modo === 'semana'
            ? 'Volte para a visão de dia para começar a registrar.'
            : 'Comece a escrever no campo acima ou clique numa lacuna da régua.'}
        </li>
      </ul>
    );
  }

  let diaAtual = null;

  return (
    <ul className="lista">
      {lancamentos.map(l => {
        const aberto = abertos.has(l.id);
        const marcado = selecionados.has(l.id);

        let separador = null;
        if (modo === 'semana' && l.data !== diaAtual) {
          diaAtual = l.data;
          const total = doDia(lancamentos, l.data).reduce((s, x) => s + duracaoMin(x), 0);
          separador = (
            <li className={'dia-sep' + (l.data === hojeISO() ? ' dia-sep--hoje' : '')}>
              <span className="dia-sep__nome">{nomeCurtoDoDia(l.data)} {dataBR(l.data)}</span>
              <span className="dia-sep__total num">{minParaHM(total)}</span>
            </li>
          );
        }

        // digitar só mexe no estado local; a gravação acontece ao sair do campo
        const texto = nome => ({
          value: l[nome] || '',
          onChange: e => aoEditarCampo(l.id, nome, e.target.value),
          onBlur: e => aoGravarCampo(l.id, nome, e.target.value)
        });
        const escolha = nome => ({
          value: l[nome] || '',
          onChange: e => {
            aoEditarCampo(l.id, nome, e.target.value);
            aoGravarCampo(l.id, nome, e.target.value);
          }
        });

        return (
          <Fragment key={l.id}>
            {separador}
            <li
              id={`lanc-${l.id}`}
              className={'lanc' + (aberto ? ' lanc--aberto' : '') + (marcado ? '' : ' lanc--fora')}
            >
              <div className="lanc__topo">
                <label className="lanc__sel" title="Incluir esta atividade no texto para apontar">
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => aoAlternarSelecao(l.id)}
                    aria-label="Incluir no texto para apontar"
                  />
                </label>

                <button className="lanc__linha" aria-expanded={aberto} onClick={() => aoAlternarAberto(l.id)}>
                  <span className="lanc__horas">{l.inicio}–{l.fim || '···'}</span>
                  <span className="lanc__dur num">{minParaHM(duracaoMin(l))}</span>
                  <span className="lanc__corpo">
                    <span className="lanc__desc">
                      {l.descricao || <em style={{ color: 'var(--tinta-fantasma)' }}>sem descrição</em>}
                    </span>
                    <span className="lanc__tags">
                      {l.chamado && <span className="tag">{l.chamado}</span>}
                      {l.projeto && <span className="tag">{l.projeto}</span>}
                      {l.categoria && (
                        <span
                          className="tag tag--cat"
                          style={{ background: corCategoria(l.categoria, config.categorias) }}
                        >
                          {l.categoria}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </div>

              {aberto && (
                <div className="lanc__editor">
                  <div className="grade grade--4" style={{ marginBottom: 10 }}>
                    <div>
                      <span className="rotulo campo-rot">Início</span>
                      <input type="time" className="campo" {...texto('inicio')} />
                    </div>
                    <div>
                      <span className="rotulo campo-rot">Fim</span>
                      <input type="time" className="campo" {...texto('fim')} />
                    </div>
                    <div>
                      <span className="rotulo campo-rot">Chamado</span>
                      <input className="campo" list="listaChamados" {...texto('chamado')} />
                    </div>
                    <div>
                      <span className="rotulo campo-rot">Projeto</span>
                      <input className="campo" list="listaProjetos" {...texto('projeto')} />
                    </div>
                  </div>

                  <span className="rotulo campo-rot">Descrição</span>
                  <textarea className="campo" rows={6} {...texto('descricao')} />

                  <div className="grade" style={{ marginTop: 10 }}>
                    <div>
                      <span className="rotulo campo-rot">Categoria</span>
                      <select className="campo" {...escolha('categoria')}>
                        <option value="">—</option>
                        {!config.categorias.includes(l.categoria) && l.categoria && (
                          <option value={l.categoria}>{l.categoria}</option>
                        )}
                        {config.categorias.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <span className="rotulo campo-rot">Observação interna</span>
                      <input className="campo" {...texto('obs')} />
                    </div>
                  </div>

                  <div className="lanc__editor-acoes">
                    <button className="btn" onClick={() => aoAlternarAberto(l.id)}>Fechar</button>
                    <button className="btn btn--perigo" onClick={() => aoExcluir(l)}>Excluir</button>
                  </div>
                </div>
              )}
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}
