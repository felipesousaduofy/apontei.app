/**
 * Esqueleto do diário enquanto a config e os lançamentos não chegam.
 *
 * Reproduz a altura das seções reais (resumo, régua, lista) para a tela não
 * pular quando o conteúdo entra — o `aria-busy` no container avisa quem usa
 * leitor de tela que aquilo ainda está carregando.
 */
export default function Esqueleto() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="rotulo" style={{ position: 'absolute', left: -9999 }}>
        Carregando o diário…
      </span>

      <section className="resumo" aria-hidden="true">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="kpi">
            <div className="esqueleto esq-linha" style={{ width: '55%', height: 10 }} />
            <div className="esqueleto" style={{ width: '45%', height: 28, marginTop: 12 }} />
            <div className="esqueleto esq-linha" style={{ width: '70%', height: 9, marginTop: 10 }} />
          </div>
        ))}
      </section>

      <section className="regua" aria-hidden="true">
        <div className="regua__cab">
          <div className="esqueleto esq-linha" style={{ width: 90 }} />
          <div className="esqueleto esq-linha" style={{ width: 60, marginLeft: 'auto' }} />
        </div>
        <div className="esqueleto" style={{ height: 50, borderRadius: 'var(--r-md)' }} />
      </section>

      <main className="corpo" aria-hidden="true">
        <section className="painel">
          <div className="painel__cab">
            <div className="esqueleto esq-linha" style={{ width: 140 }} />
          </div>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="esq-lanc">
              <div className="esqueleto esq-linha" style={{ width: 90, flex: 'none' }} />
              <div className="esqueleto esq-linha" style={{ width: 46, flex: 'none' }} />
              <div style={{ flex: 1 }}>
                <div className="esqueleto esq-linha" style={{ width: `${85 - i * 9}%` }} />
                <div
                  className="esqueleto esq-linha"
                  style={{ width: '38%', height: 9, marginTop: 8 }}
                />
              </div>
            </div>
          ))}
        </section>

        <aside className="painel">
          <div className="painel__cab">
            <div className="esqueleto esq-linha" style={{ width: 120 }} />
          </div>
          <div style={{ padding: 14 }}>
            <div className="esqueleto" style={{ height: 70, borderRadius: 'var(--r)' }} />
            <div
              className="esqueleto"
              style={{ height: 70, borderRadius: 'var(--r)', marginTop: 12 }}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
