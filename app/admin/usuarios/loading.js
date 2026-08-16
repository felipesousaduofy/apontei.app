import Marca from '../../Marca';

const COLUNAS = ['Usuário', 'Cadastro', 'Lançamentos', 'Permissão', 'Situação', 'Ações'];

export default function Carregando() {
  return (
    <main className="pagina" aria-busy="true" aria-live="polite">
      <header className="topo">
        <Marca altura={34} />
        <span className="rotulo">Usuários</span>
      </header>

      <span className="rotulo" style={{ position: 'absolute', left: -9999 }}>
        Carregando os usuários…
      </span>

      <div className="quadro rolagem" aria-hidden="true">
        <table className="tabela">
          <thead>
            <tr>{COLUNAS.map(c => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }, (_, i) => (
              <tr key={i}>
                <td>
                  <div className="esqueleto esq-linha" style={{ width: 170 }} />
                  <div
                    className="esqueleto esq-linha"
                    style={{ width: 120, height: 9, marginTop: 6 }}
                  />
                </td>
                <td><div className="esqueleto esq-linha" style={{ width: 76 }} /></td>
                <td><div className="esqueleto esq-linha" style={{ width: 34, marginLeft: 'auto' }} /></td>
                <td>
                  <div
                    className="esqueleto"
                    style={{ width: 62, height: 18, borderRadius: 'var(--r-pilula)' }}
                  />
                </td>
                <td>
                  <div
                    className="esqueleto"
                    style={{ width: 54, height: 18, borderRadius: 'var(--r-pilula)' }}
                  />
                </td>
                <td>
                  <div className="linha-acoes">
                    <div className="esqueleto esq-linha" style={{ width: 88, height: 24 }} />
                    <div className="esqueleto esq-linha" style={{ width: 66, height: 24 }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
