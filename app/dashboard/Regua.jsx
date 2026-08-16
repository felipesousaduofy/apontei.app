'use client';
import {
  calcularLacunas, corCategoria, dataCurta, doDia, duracaoMin, hmParaMin,
  hojeISO, intervaloDescanso, janelaDoDia, minParaHM, minutosAgora,
  nomeCurtoDoDia, primeiraLinha
} from '@/lib/apontamento';

function Faixa({ dia, itens, janela, config, ehUnico, aoClicarLacuna, aoClicarBloco }) {
  const largura = janela.fim - janela.ini;
  const pos = m => ((m - janela.ini) / largura) * 100;
  const lacunas = calcularLacunas(itens, janela, dia, config);
  const descanso = intervaloDescanso(config);

  return (
    <>
      {descanso && (() => {
        const ini = Math.max(janela.ini, descanso[0]);
        const fim = Math.min(janela.fim, descanso[1]);
        if (fim <= ini) return null;
        return (
          <div
            className="descanso"
            style={{ left: `${pos(ini)}%`, width: `${pos(fim) - pos(ini)}%` }}
            title={`Intervalo de descanso combinado: ${minParaHM(descanso[0])}–${minParaHM(descanso[1])} — não conta como horas sem registro`}
          >
            <span className="descanso__rot">
              {fim - ini >= 40 && ehUnico ? 'Descanso' : ''}
            </span>
          </div>
        );
      })()}

      {lacunas.map(([a, b]) => (
        <button
          key={`lacuna-${a}`}
          className="vazio"
          style={{ left: `${pos(a)}%`, width: `${pos(b) - pos(a)}%` }}
          title={`Sem registro entre ${minParaHM(a)} e ${minParaHM(b)} — clique para preencher`}
          onClick={() => aoClicarLacuna(dia, minParaHM(a), minParaHM(b))}
        >
          <span className="vazio__rot">{b - a >= 40 && ehUnico ? minParaHM(b - a) : ''}</span>
        </button>
      ))}

      {itens.map(l => {
        const a = hmParaMin(l.inicio);
        if (a === null) return null;
        const b = l.fim ? hmParaMin(l.fim) : (l.data === hojeISO() ? minutosAgora() : a);
        const larg = Math.max(0.4, pos(b) - pos(a));
        const rotulo = l.chamado || primeiraLinha(l.descricao) || 'Sem título';

        return (
          <button
            key={l.id}
            className={'bloco' + (l.fim ? '' : ' bloco--ativo')}
            style={{
              left: `${pos(a)}%`,
              width: `${larg}%`,
              background: corCategoria(l.categoria, config.categorias)
            }}
            title={`${l.inicio}–${l.fim || 'agora'} · ${rotulo}`}
            onClick={() => aoClicarBloco(l.id)}
          >
            <span className="bloco__rot">{larg > 7 && ehUnico ? rotulo : ''}</span>
          </button>
        );
      })}
    </>
  );
}

export default function Regua({
  lancamentos, dia, modo, dias, config, aoClicarLacuna, aoClicarBloco, aoIrParaDia
}) {
  const ehUnico = modo === 'dia';
  const janela = janelaDoDia(lancamentos, dias, config);
  const largura = janela.fim - janela.ini;

  const marcasHora = [];
  for (let m = Math.ceil(janela.ini / 60) * 60; m <= janela.fim; m += 60) {
    marcasHora.push(m);
  }

  const totalMin = lancamentos.reduce((s, l) => s + duracaoMin(l), 0);

  // no modo semana, sábado e domingo só aparecem se tiveram registro
  const visiveis = ehUnico
    ? dias
    : dias.filter((d, i) => i < 5 || doDia(lancamentos, d).length > 0);

  let meta;
  if (ehUnico) {
    const n = calcularLacunas(doDia(lancamentos, dia), janela, dia, config).length;
    meta = n
      ? `${n} ${n === 1 ? 'intervalo sem registro' : 'intervalos sem registro'}`
      : 'dia coberto por inteiro';
  } else {
    const comRegistro = dias.filter(d => doDia(lancamentos, d).length).length;
    meta = comRegistro
      ? `${comRegistro} dia(s) com registro · média de ${minParaHM(totalMin / comRegistro)}`
      : 'nenhum registro na semana';
  }

  return (
    <section className="regua">
      <div className="regua__cab">
        <span className="rotulo">{ehUnico ? 'Régua do dia' : 'Régua da semana'}</span>
        <span className="regua__meta">{meta}</span>
        <span className="regua__total num">{minParaHM(totalMin)}</span>
      </div>

      <div className={'regua__trilho' + (ehUnico ? '' : ' regua__trilho--semana')}>
        {ehUnico ? (
          <Faixa
            dia={dia}
            itens={doDia(lancamentos, dia)}
            janela={janela}
            config={config}
            ehUnico
            aoClicarLacuna={aoClicarLacuna}
            aoClicarBloco={aoClicarBloco}
          />
        ) : (
          visiveis.map(d => {
            const itensDoDia = doDia(lancamentos, d);
            const total = itensDoDia.reduce((s, l) => s + duracaoMin(l), 0);
            return (
              <div key={d} className={'faixa' + (d === hojeISO() ? ' faixa--hoje' : '')}>
                <button className="faixa__rot" title="Ver só este dia" onClick={() => aoIrParaDia(d)}>
                  <span className="faixa__nome">{nomeCurtoDoDia(d)}</span>
                  <span className="faixa__num num">{dataCurta(d)}</span>
                </button>
                <div className="faixa__trilho">
                  <Faixa
                    dia={d}
                    itens={itensDoDia}
                    janela={janela}
                    config={config}
                    ehUnico={false}
                    aoClicarLacuna={aoClicarLacuna}
                    aoClicarBloco={aoClicarBloco}
                  />
                </div>
                <span className={'faixa__total num' + (total ? '' : ' faixa__total--zero')}>
                  {total ? minParaHM(total) : '—'}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className={'regua__horas' + (ehUnico ? '' : ' regua__horas--semana')}>
        {marcasHora.map(m => (
          <span key={m} className="regua__hora" style={{ left: `${((m - janela.ini) / largura) * 100}%` }}>
            {minParaHM(m)}
          </span>
        ))}
      </div>
    </section>
  );
}
