'use client';
import { useState } from 'react';
import Dialogo from './Dialogo';
import Icone from '../Icone';
import { PRIORIDADES } from '@/lib/kanban';

/**
 * Criação rápida de tarefa direto do diário — o mesmo POST /api/tarefas do
 * quadro, só que sem precisar sair do dashboard. Entra em "A fazer"; só a
 * descrição completa fica para quem abrir o cartão no quadro depois.
 */
export default function DialogoNovaTarefa({ aoFechar, aoCriar }) {
  const [titulo, setTitulo] = useState('');
  const [chamado, setChamado] = useState('');
  const [projeto, setProjeto] = useState('');
  const [prioridade, setPrioridade] = useState('media');
  const [prazo, setPrazo] = useState('');
  const [erro, setErro] = useState('');
  const [criando, setCriando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    const t = titulo.trim();
    if (!t) { setErro('Informe o título da tarefa.'); return; }
    setErro('');
    setCriando(true);
    const ok = await aoCriar({
      titulo: t,
      chamado: chamado.trim(),
      projeto: projeto.trim(),
      prioridade,
      prazo: prazo || null
    });
    setCriando(false);
    if (!ok) setErro('Não foi possível criar a tarefa.');
  }

  return (
    <Dialogo aberto aoFechar={aoFechar} largura={440}>
      <form onSubmit={enviar}>
        <div className="dlg__cab">
          <h2>Nova tarefa</h2>
          <button
            type="button" className="btn btn--fantasma btn--icone" onClick={aoFechar}
            title="Fechar" aria-label="Fechar"
          >
            <Icone nome="fechar" tamanho={16} />
          </button>
        </div>

        <div className="dlg__corpo">
          {erro && <div className="erro-auth">{erro}</div>}

          <div className="campo-grupo">
            <label className="rotulo" htmlFor="nt-titulo">Título</label>
            <input
              id="nt-titulo" className="campo" required autoFocus
              placeholder="O que precisa ser feito?"
              value={titulo} onChange={e => setTitulo(e.target.value)}
            />
          </div>

          <div className="linha-campos" style={{ marginBottom: 14 }}>
            <div className="campo-grupo" style={{ marginBottom: 0 }}>
              <label className="rotulo" htmlFor="nt-chamado">Chamado</label>
              <input
                id="nt-chamado" className="campo" list="listaChamados" placeholder="opcional"
                value={chamado} onChange={e => setChamado(e.target.value)}
              />
            </div>
            <div className="campo-grupo" style={{ marginBottom: 0 }}>
              <label className="rotulo" htmlFor="nt-projeto">Projeto</label>
              <input
                id="nt-projeto" className="campo" list="listaProjetos" placeholder="opcional"
                value={projeto} onChange={e => setProjeto(e.target.value)}
              />
            </div>
          </div>

          <div className="linha-campos">
            <div className="campo-grupo">
              <label className="rotulo" htmlFor="nt-prioridade">Prioridade</label>
              <select
                id="nt-prioridade" className="campo"
                value={prioridade} onChange={e => setPrioridade(e.target.value)}
              >
                {PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="campo-grupo">
              <label className="rotulo" htmlFor="nt-prazo">Prazo</label>
              <input
                id="nt-prazo" className="campo" type="date"
                value={prazo} onChange={e => setPrazo(e.target.value)}
              />
            </div>
          </div>

          <p className="ajuda">
            Entra na coluna A fazer. A descrição completa dá para escrever
            depois, abrindo o cartão no quadro.
          </p>
        </div>

        <div className="dlg__pe">
          <button type="submit" className="btn btn--forte" disabled={criando}>
            {criando ? <span className="giro" /> : <Icone nome="mais" tamanho={15} />}
            {criando ? 'Criando…' : 'Criar tarefa'}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
