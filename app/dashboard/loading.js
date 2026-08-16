import Marca from '../Marca';
import Esqueleto from './Esqueleto';

/**
 * Fallback enquanto o servidor resolve a sessão e monta a página.
 *
 * É o mesmo esqueleto que o DashboardClient usa esperando os lançamentos, então
 * a transição entre "carregando no servidor" e "carregando no navegador" não
 * troca o desenho da tela — só preenche.
 */
export default function Carregando() {
  return (
    <>
      <header className="cab">
        <div className="cab__marca">
          <Marca altura={40} />
        </div>
      </header>
      <Esqueleto />
    </>
  );
}
