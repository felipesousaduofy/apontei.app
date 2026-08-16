'use client';
import { minParaDecimal, minParaHM, resumoDoPeriodo } from '@/lib/apontamento';
import Icone from '../Icone';

function Kpi({ icone, rotulo, valor, sufixo, nota, barra, estado }) {
  return (
    <div className={'kpi' + (estado ? ` kpi--${estado}` : '')}>
      <span className="kpi__rotulo rotulo">
        <Icone nome={icone} tamanho={13} />
        {rotulo}
      </span>
      <div className="kpi__valor">
        {valor}{sufixo && <small> {sufixo}</small>}
      </div>
      {barra != null && (
        <div className="kpi__barra">
          <i style={{ width: `${Math.min(100, Math.max(0, barra))}%` }} />
        </div>
      )}
      {nota && <div className="kpi__nota">{nota}</div>}
    </div>
  );
}

export default function Resumo({ lancamentos, dias, modo, config }) {
  const r = resumoDoPeriodo(lancamentos, dias, modo, config);

  // acima de 85% da jornada o dia já está praticamente coberto; abaixo de 40%
  // ainda falta muita coisa para apontar
  const estadoJornada = r.percentual >= 85 ? 'ok' : r.percentual < 40 ? 'alerta' : null;

  return (
    <section className="resumo" aria-label="Resumo do período">
      <Kpi
        icone="relogio"
        rotulo={modo === 'semana' ? 'Apontado na semana' : 'Apontado no dia'}
        valor={minParaHM(r.total)}
        nota={`${minParaDecimal(r.total)} h decimais`}
      />

      <Kpi
        icone="calendario"
        rotulo="Jornada coberta"
        valor={r.percentual}
        sufixo="%"
        barra={r.percentual}
        estado={estadoJornada}
        nota={
          `meta de ${minParaHM(r.meta)}` +
          (r.temDescanso ? ` · já descontado ${minParaHM(r.duracaoDescanso)} de descanso` : '')
        }
      />

      <Kpi
        icone="inbox"
        rotulo="Sem registro"
        valor={minParaHM(r.minutosLacuna)}
        estado={r.lacunas ? 'alerta' : 'ok'}
        nota={
          r.lacunas
            ? `${r.lacunas} ${r.lacunas === 1 ? 'intervalo aberto' : 'intervalos abertos'}`
            : 'período coberto por inteiro'
        }
      />

      <Kpi
        icone="folha"
        rotulo="Atividades"
        valor={r.atividades}
        nota={
          modo === 'semana'
            ? `em ${r.diasComRegistro} ${r.diasComRegistro === 1 ? 'dia' : 'dias'} com registro`
            : r.atividades
              ? `média de ${minParaHM(r.total / r.atividades)} cada`
              : 'nada registrado ainda'
        }
      />
    </section>
  );
}
