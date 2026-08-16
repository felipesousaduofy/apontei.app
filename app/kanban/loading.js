import Marca from '../Marca';
import { COLUNAS } from '@/lib/kanban';

// quantos cartões-fantasma por coluna: só para a coluna nascer com altura
const CARTOES = { a_fazer: 3, fazendo: 2, concluido: 2 };

export default function Carregando() {
  return (
    <main className="pagina pagina--larga" aria-busy="true" aria-live="polite">
      <header className="topo">
        <Marca altura={34} />
        <span className="rotulo">Quadro</span>
      </header>

      <span className="rotulo" style={{ position: 'absolute', left: -9999 }}>
        Carregando o quadro…
      </span>

      <div className="barra-nova-tarefa" aria-hidden="true">
        <div className="esqueleto esq-linha" style={{ flex: 2, minWidth: 180, height: 20 }} />
        <div className="esqueleto esq-linha" style={{ flex: 1, minWidth: 110, height: 20 }} />
        <div className="esqueleto esq-linha" style={{ width: 96, height: 20 }} />
      </div>

      <div className="kanban" aria-hidden="true">
        {COLUNAS.map(coluna => (
          <section key={coluna.id} className="coluna">
            <div className="coluna-topo">
              <span className="rotulo">{coluna.nome}</span>
            </div>
            <div className="coluna-corpo">
              {Array.from({ length: CARTOES[coluna.id] ?? 2 }, (_, i) => (
                <div key={i} className="cartao" style={{ cursor: 'default' }}>
                  <div className="esqueleto esq-linha" style={{ width: `${88 - i * 12}%` }} />
                  <div className="cartao-meta">
                    <div
                      className="esqueleto"
                      style={{ width: 58, height: 16, borderRadius: 'var(--r-pilula)' }}
                    />
                    <div
                      className="esqueleto"
                      style={{ width: 44, height: 16, borderRadius: 'var(--r-pilula)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
