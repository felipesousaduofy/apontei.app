'use client';
import Link from 'next/link';
import Dialogo from './Dialogo';
import Icone from '../Icone';
import { dataCurta } from '@/lib/apontamento';

const ROTULO = {
  vencida: prazo => `Venceu ${dataCurta(prazo)}`,
  proxima: prazo => `Até ${dataCurta(prazo)}`
};

/**
 * Aviso de tarefas vencidas ou perto do prazo, mostrado uma vez por dia ao
 * abrir o diário — quem chamou já decidiu que vale mostrar (a checagem de
 * "já mostrei hoje" fica em DashboardClient, perto do resto do estado da tela).
 */
export default function AlertaPrazos({ itens, aoFechar, aoApontar }) {
  const vencidas = itens.filter(i => i.prazoClasse === 'vencida');
  const proximas = itens.filter(i => i.prazoClasse === 'proxima');

  return (
    <Dialogo aberto aoFechar={aoFechar} largura={480}>
      <div className="dlg__cab">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icone nome="sino" tamanho={15} />
          Prazos para ficar de olho
        </h2>
        <button className="btn btn--fantasma btn--icone" onClick={aoFechar} title="Fechar" aria-label="Fechar">
          <Icone nome="fechar" tamanho={16} />
        </button>
      </div>

      <div className="dlg__corpo">
        {vencidas.length > 0 && (
          <div className="bloco-campo">
            <span className="rotulo campo-rot" style={{ color: 'var(--perigo)' }}>
              {vencidas.length === 1 ? '1 tarefa vencida' : `${vencidas.length} tarefas vencidas`}
            </span>
            <ul className="lista-alerta">
              {vencidas.map(({ tarefa, prazoClasse }) => (
                <li key={tarefa.id} className="lista-alerta__item">
                  <span className="lista-alerta__titulo">{tarefa.titulo}</span>
                  <span className="cracha cracha--atrasada">{ROTULO[prazoClasse](tarefa.prazo)}</span>
                  <button className="btn btn--mini" onClick={() => aoApontar(tarefa)}>
                    <Icone nome="play" tamanho={12} />Apontar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {proximas.length > 0 && (
          <div className="bloco-campo">
            <span className="rotulo campo-rot" style={{ color: 'var(--lacuna)' }}>
              {proximas.length === 1 ? '1 tarefa perto do prazo' : `${proximas.length} tarefas perto do prazo`}
            </span>
            <ul className="lista-alerta">
              {proximas.map(({ tarefa, prazoClasse }) => (
                <li key={tarefa.id} className="lista-alerta__item">
                  <span className="lista-alerta__titulo">{tarefa.titulo}</span>
                  <span className="cracha cracha--proxima">{ROTULO[prazoClasse](tarefa.prazo)}</span>
                  <button className="btn btn--mini" onClick={() => aoApontar(tarefa)}>
                    <Icone nome="play" tamanho={12} />Apontar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="dlg__pe">
        <button className="btn" onClick={aoFechar}>Fechar</button>
        <Link className="btn btn--forte" href="/kanban" style={{ marginLeft: 'auto' }}>
          <Icone nome="colunas" tamanho={15} />Ver quadro completo
        </Link>
      </div>
    </Dialogo>
  );
}
