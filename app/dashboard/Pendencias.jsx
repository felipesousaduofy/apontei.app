'use client';
import Link from 'next/link';
import { dataCurta } from '@/lib/apontamento';
import Icone from '../Icone';

const LIMITE = 6;

// a mesma leitura de cor por prioridade usada nos cartões do quadro
const COR_PRIORIDADE = {
  alta: 'var(--perigo)',
  media: 'var(--ocre)',
  baixa: 'var(--linha-forte)'
};

const ROTULO_PRAZO = {
  vencida: prazo => `Venceu ${dataCurta(prazo)}`,
  proxima: prazo => `Até ${dataCurta(prazo)}`
};

/**
 * Fila de tarefas pendentes do quadro, para começar a apontar sem sair do
 * diário. Some por inteiro quando não há nada pendente — não é o quadro
 * inteiro, só o atalho para o que already está na fila.
 */
export default function Pendencias({ itens, aoApontar }) {
  if (!itens.length) return null;

  const visiveis = itens.slice(0, LIMITE);
  const resto = itens.length - visiveis.length;

  return (
    <section className="pendencias" aria-label="Tarefas pendentes do quadro">
      <div className="pendencias__cab">
        <span className="rotulo">Fila do quadro</span>
        <span className="pendencias__meta">
          clique para começar a apontar agora
        </span>
      </div>

      <div className="pendencias__lista">
        {visiveis.map(({ tarefa, prazoClasse }) => (
          <button
            key={tarefa.id}
            className="pendencia"
            style={{ '--cor-cartao': COR_PRIORIDADE[tarefa.prioridade] || 'var(--linha-forte)' }}
            onClick={() => aoApontar(tarefa)}
            title={`Apontar agora: ${tarefa.titulo}`}
          >
            <Icone nome="play" tamanho={13} />
            <span className="pendencia__titulo">{tarefa.titulo}</span>
            {tarefa.chamado && <span className="tag">{tarefa.chamado}</span>}
            {prazoClasse && (
              <span className={'cracha cracha--' + (prazoClasse === 'vencida' ? 'atrasada' : 'proxima')}>
                {ROTULO_PRAZO[prazoClasse](tarefa.prazo)}
              </span>
            )}
          </button>
        ))}

        <Link href="/kanban" className="pendencia pendencia--mais">
          <Icone nome="colunas" tamanho={13} />
          {resto > 0 ? `+${resto} no quadro` : 'Ver quadro'}
        </Link>
      </div>
    </section>
  );
}
