'use client';
import { minParaDecimal, minParaHM, montarPecas, textoDaPeca } from '@/lib/apontamento';

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
    <aside className="painel">
      <div className="painel__cab">
        <h2>Texto para apontar</h2>
        <span className="contagem-sel">{total ? `${marcadas} de ${total}` : ''}</span>
      </div>

      <div className="opcoes">
        <button className="btn btn--mini" onClick={aoAlternarTodas}>
          {todasMarcadas ? 'Limpar seleção' : 'Selecionar todas'}
        </button>
        <button
          className="btn btn--forte btn--mini"
          onClick={() => aoCopiar(textos.join('\n\n'), pecas.length)}
        >
          Copiar selecionadas
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

      <div>
        {pecas.length === 0 ? (
          <div className="vazio-msg">
            {total
              ? 'Nenhuma atividade selecionada. Marque na lista ao lado o que você quer apontar.'
              : 'O texto pronto para colar aparece aqui assim que houver registros.'}
          </div>
        ) : (
          pecas.map((p, i) => {
            const texto = textos[i];
            const estourou = limite > 0 && texto.length > limite;
            return (
              <div key={p.ids.join('-')} className={'grupo' + (p.unico ? ' grupo--unico' : '')}>
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
                  <button className="btn btn--mini" onClick={() => aoCopiar(texto, 1)}>Copiar</button>
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
