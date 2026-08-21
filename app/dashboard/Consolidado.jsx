'use client';
import { corCategoria, minParaDecimal, minParaHM, montarPecas, textoDaPeca } from '@/lib/apontamento';
import Icone from '../Icone';

export default function Consolidado({
  lancamentos, modo, config, selecionados, opcoes,
  aoMudarOpcao, aoAlternarTodas, aoCopiar
}) {
  const pecas = montarPecas(lancamentos, {
    selecionados,
    agrupar: opcoes.agrupar,
    modo,
    config
  });

  const limite = Number(config.limite_caracteres) || 0;
  const total = lancamentos.length;
  const marcadas = lancamentos.filter(l => selecionados.has(l.id)).length;
  const todasMarcadas = total > 0 && marcadas === total;

  const textos = pecas.map(p =>
    textoDaPeca(p, { achatar: opcoes.achatar, semHorarios: opcoes.semHorarios, config })
  );
  const somaMin = pecas.reduce((s, p) => s + p.arredondado, 0);

  return (
    <aside className="painel painel--consolidado">
      <div className="painel__cab">
        <h2>Texto para apontar</h2>
        <span className="contagem-sel">{total ? `${marcadas} de ${total}` : ''}</span>
      </div>

      <div className="opcoes">
        <button className="btn btn--mini" onClick={aoAlternarTodas}>
          <Icone nome={todasMarcadas ? 'limpaSelecao' : 'seleciona'} tamanho={14} />
          {todasMarcadas ? 'Limpar seleção' : 'Selecionar todas'}
        </button>
        <button
          className="btn btn--forte btn--mini"
          onClick={() => aoCopiar(textos.join('\n\n'), pecas.length)}
          disabled={pecas.length === 0}
        >
          <Icone nome="copiar" tamanho={14} />Copiar selecionadas
        </button>
      </div>

      <div className="opcoes">
        <label>
          <input
            type="radio" name="modoQuebra" checked={!opcoes.achatar}
            onChange={() => aoMudarOpcao('achatar', false)}
          /> Manter quebras
        </label>
        <label>
          <input
            type="radio" name="modoQuebra" checked={opcoes.achatar}
            onChange={() => aoMudarOpcao('achatar', true)}
          /> Achatar em uma linha
        </label>
        <label>
          <input
            type="checkbox" checked={opcoes.semHorarios}
            onChange={e => aoMudarOpcao('semHorarios', e.target.checked)}
          /> Remover horários
        </label>
        <label>
          <input
            type="checkbox" checked={opcoes.agrupar}
            onChange={e => aoMudarOpcao('agrupar', e.target.checked)}
          /> Agrupar por chamado
        </label>
      </div>

      <div className="consolidado__grupos">
        {pecas.length === 0 ? (
          <div className="vazio-estado">
            <span className="vazio-estado__icone"><Icone nome="inbox" tamanho={20} /></span>
            <p className="vazio-estado__titulo">
              {total ? 'Nenhuma atividade selecionada' : 'Nada para apontar ainda'}
            </p>
            <p className="vazio-estado__texto">
              {total
                ? 'Marque na lista ao lado o que você quer apontar — ou selecione todas de uma vez.'
                : 'O texto pronto para colar no sistema aparece aqui assim que houver registros.'}
            </p>
            {total > 0 && (
              <button className="btn btn--mini" onClick={aoAlternarTodas}>
                <Icone nome="seleciona" tamanho={14} />Selecionar todas
              </button>
            )}
          </div>
        ) : (
          pecas.map((p, i) => {
            const texto = textos[i];
            const estourou = limite > 0 && texto.length > limite;
            return (
              <div
                key={p.ids.join('-')}
                className={'grupo' + (p.unico ? ' grupo--unico' : '')}
                style={p.categoria
                  ? { '--cor-grupo': corCategoria(p.categoria, config.categorias) }
                  : undefined}
              >
                <div className="grupo__topo">
                  <span className="grupo__chave">{p.rotulo}</span>
                  <span className="grupo__horas">{minParaHM(p.arredondado)}</span>
                </div>
                <div className="grupo__bruto">
                  <span className="grupo__horario">{p.inicio}–{p.fim}</span>
                  {' · '}real {minParaHM(p.bruto)} · {minParaDecimal(p.arredondado)} h decimal
                  {p.unico ? '' : ` · ${p.ids.length} registros`}
                </div>
                <div className="grupo__saida">{texto}</div>
                <div className="grupo__pe">
                  <button className="btn btn--mini" onClick={() => aoCopiar(texto, 1)}>
                    <Icone nome="copiar" tamanho={14} />Copiar
                  </button>
                  <span className={'contador' + (estourou ? ' contador--estourou' : '')}>
                    {texto.length}{limite ? ` / ${limite}` : ''} caract.
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="total-dia">
        <span className="rotulo">Total apontável</span>
        <strong>{minParaHM(somaMin)} · {minParaDecimal(somaMin)} h</strong>
      </div>
    </aside>
  );
}
