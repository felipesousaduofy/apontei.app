'use client';
import Dialogo from './Dialogo';
import Icone from '../Icone';

/**
 * Pergunta sobre o cartão do quadro, disparada pela fila de lançamento rápido
 * (Pendencias): ao iniciar, se vale mover para Fazendo; ao encerrar pelo botão
 * Encerrar, se vale concluir ou voltar para A fazer. Fechar sem escolher não
 * mexe no cartão — ele fica onde estava.
 */
export default function PerguntaCartao({ pergunta, aoFechar, aoMover }) {
  if (!pergunta) return null;
  const { tipo, tarefa } = pergunta;

  function mover(coluna) {
    aoMover(coluna);
    aoFechar();
  }

  return (
    <Dialogo aberto aoFechar={aoFechar} largura={440}>
      <div className="dlg__cab">
        <h2>Cartão do quadro</h2>
        <button className="btn btn--fantasma btn--icone" onClick={aoFechar} title="Fechar" aria-label="Fechar">
          <Icone nome="fechar" tamanho={16} />
        </button>
      </div>

      <div className="dlg__corpo">
        <p style={{ margin: 0 }}>
          {tipo === 'iniciar' ? (
            <>Você começou a trabalhar em <strong>{tarefa.titulo}</strong>. Mover o cartão para <strong>Fazendo</strong>?</>
          ) : (
            <>Você encerrou <strong>{tarefa.titulo}</strong>. Quer atualizar o cartão no quadro?</>
          )}
        </p>
      </div>

      <div className="dlg__pe">
        {tipo === 'iniciar' ? (
          <>
            <button className="btn" onClick={aoFechar}>Deixar como está</button>
            <button className="btn btn--forte" style={{ marginLeft: 'auto' }} onClick={() => mover('fazendo')}>
              <Icone nome="colunas" tamanho={15} />Mover para Fazendo
            </button>
          </>
        ) : (
          <>
            <button className="btn" onClick={() => mover('a_fazer')}>
              <Icone nome="esquerda" tamanho={15} />Voltar para A fazer
            </button>
            <button className="btn btn--forte" style={{ marginLeft: 'auto' }} onClick={() => mover('concluido')}>
              <Icone nome="seleciona" tamanho={15} />Concluir
            </button>
          </>
        )}
      </div>
    </Dialogo>
  );
}
