'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Marca from '../Marca';
import Icone from '../Icone';
import TemaBotao from '../TemaBotao';
import { COLUNAS, IDS_COLUNAS, PRIORIDADES, ordemEntre } from '@/lib/kanban';

// a faixa lateral do cartão: prioridade num relance, sem depender de ler o crachá
const COR_PRIORIDADE = {
  alta: 'var(--perigo)',
  media: 'var(--ocre)',
  baixa: 'var(--linha-forte)'
};

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function agoraHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// formata direto da string, sem passar por Date, para o servidor e o navegador
// renderizarem exatamente a mesma coisa
function dataCurta(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}`;
}

/**
 * Fica fora do KanbanClient de propósito: um componente declarado dentro de
 * outro muda de identidade a cada render, o que remontaria os cartões no meio
 * de um arraste e cancelaria o gesto.
 */
function Cartao({ tarefa, colunaId, arrastando, hoje, aoArrastar, aoEncerrar, aoPassarPorCima, aoSoltar, aoMover, aoApontar, aoAbrir }) {
  const atrasada = hoje && tarefa.prazo && tarefa.prazo < hoje && tarefa.coluna !== 'concluido';
  const concluida = tarefa.coluna === 'concluido';
  const posicao = IDS_COLUNAS.indexOf(colunaId);

  return (
    <article
      className={
        'cartao' +
        (arrastando === tarefa.id ? ' cartao--arrastando' : '') +
        (concluida ? ' cartao--concluido' : '')
      }
      style={{ '--cor-cartao': COR_PRIORIDADE[tarefa.prioridade] || 'var(--linha-forte)' }}
      draggable
      onDragStart={e => aoArrastar(e, tarefa)}
      onDragEnd={aoEncerrar}
      onDragOver={e => {
        e.preventDefault();
        e.stopPropagation();
        aoPassarPorCima(e, colunaId, tarefa);
      }}
      onDrop={e => {
        e.preventDefault();
        e.stopPropagation();
        aoSoltar(e, colunaId, tarefa);
      }}
    >
      <div className="cartao-titulo">{tarefa.titulo}</div>

      <div className="cartao-meta">
        {tarefa.chamado && <span className="cracha">{tarefa.chamado}</span>}
        {tarefa.projeto && <span className="cracha">{tarefa.projeto}</span>}
        {!concluida && (
          <span className={`cracha cracha--${tarefa.prioridade}`}>
            {PRIORIDADES.find(p => p.id === tarefa.prioridade)?.nome}
          </span>
        )}
        {tarefa.prazo && (
          <span className={'cracha cracha--prazo' + (atrasada ? ' cracha--atrasada' : '')}>
            {atrasada ? 'Venceu ' : 'Até '}{dataCurta(tarefa.prazo)}
          </span>
        )}
      </div>

      <div className="cartao-acoes">
        <button
          className="btn btn--mini" title="Mover para a coluna anterior"
          aria-label="Mover para a coluna anterior"
          disabled={posicao === 0} onClick={() => aoMover(tarefa, -1)}
        >
          <Icone nome="esquerda" tamanho={13} />
        </button>
        <button
          className="btn btn--mini" title="Mover para a próxima coluna"
          aria-label="Mover para a próxima coluna"
          disabled={posicao === IDS_COLUNAS.length - 1} onClick={() => aoMover(tarefa, 1)}
        >
          <Icone nome="direita" tamanho={13} />
        </button>
        <button
          className="btn btn--mini" style={{ marginLeft: 'auto' }}
          title="Criar um lançamento de hoje com o título e o chamado desta tarefa"
          onClick={() => aoApontar(tarefa)}
        >
          <Icone nome="relogio" tamanho={13} />Apontar
        </button>
        <button className="btn btn--mini" onClick={() => aoAbrir(tarefa)}>
          <Icone nome="lapis" tamanho={13} />Abrir
        </button>
      </div>
    </article>
  );
}

export default function KanbanClient({ tarefasIniciais, email, ehAdmin }) {
  const [tarefas, setTarefas] = useState(tarefasIniciais);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoChamado, setNovoChamado] = useState('');
  const [novaPrioridade, setNovaPrioridade] = useState('media');
  const [criando, setCriando] = useState(false);

  const [arrastando, setArrastando] = useState(null);
  const [indicador, setIndicador] = useState(null); // { coluna, antesDe }

  const [editando, setEditando] = useState(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [alvoExcluir, setAlvoExcluir] = useState(null);
  const [confirmarLimpeza, setConfirmarLimpeza] = useState(false);

  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const cronometroAviso = useRef(null);

  // só depois de montar, para o "atrasada" não depender do fuso do servidor
  const [hoje, setHoje] = useState(null);
  useEffect(() => {
    setHoje(hojeISO());
    return () => clearTimeout(cronometroAviso.current);
  }, []);

  function mostrarAviso(texto) {
    setAviso(texto);
    clearTimeout(cronometroAviso.current);
    cronometroAviso.current = setTimeout(() => setAviso(''), 4000);
  }

  function porColuna(colunaId) {
    return tarefas
      .filter(t => t.coluna === colunaId)
      .sort((a, b) => a.ordem - b.ordem);
  }

  /** Aplica a mudança na tela na hora e desfaz se a API recusar. */
  async function salvar(tarefa, mudancas) {
    const anterior = tarefas;
    setErro('');
    setTarefas(atual => atual.map(t => (t.id === tarefa.id ? { ...t, ...mudancas } : t)));

    const resp = await fetch(`/api/tarefas/${tarefa.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mudancas)
    });
    const corpo = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      setTarefas(anterior);
      setErro(corpo.erro || 'Não foi possível salvar a tarefa.');
      return null;
    }
    setTarefas(atual => atual.map(t => (t.id === tarefa.id ? corpo.tarefa : t)));
    return corpo.tarefa;
  }

  async function criar(e) {
    e.preventDefault();
    const titulo = novoTitulo.trim();
    if (!titulo) return;

    setCriando(true);
    setErro('');
    const resp = await fetch('/api/tarefas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, chamado: novoChamado.trim(), prioridade: novaPrioridade })
    });
    const corpo = await resp.json().catch(() => ({}));
    setCriando(false);

    if (!resp.ok) {
      setErro(corpo.erro || 'Não foi possível criar a tarefa.');
      return;
    }
    setTarefas(atual => [...atual, corpo.tarefa]);
    setNovoTitulo('');
    setNovoChamado('');
    setNovaPrioridade('media');
  }

  // ---- arrastar e soltar ----------------------------------------------

  function comecarArrasto(e, tarefa) {
    setArrastando(tarefa.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tarefa.id); // o Firefox exige algum dado
  }

  function encerrarArrasto() {
    setArrastando(null);
    setIndicador(null);
  }

  /** Metade de cima do cartão insere antes dele; metade de baixo, depois. */
  function alvoNoCartao(e, colunaId, tarefa) {
    const retangulo = e.currentTarget.getBoundingClientRect();
    if (e.clientY <= retangulo.top + retangulo.height / 2) return tarefa.id;
    const lista = porColuna(colunaId);
    const i = lista.findIndex(t => t.id === tarefa.id);
    return lista[i + 1]?.id ?? null;
  }

  function calcularOrdem(colunaId, antesDe, idArrastado) {
    const lista = porColuna(colunaId).filter(t => t.id !== idArrastado);
    const i = antesDe ? lista.findIndex(t => t.id === antesDe) : -1;
    const posicao = i === -1 ? lista.length : i;
    return ordemEntre(lista[posicao - 1], lista[posicao]);
  }

  async function soltar(colunaId, antesDe) {
    const id = arrastando;
    encerrarArrasto();
    if (!id) return;

    const tarefa = tarefas.find(t => t.id === id);
    if (!tarefa || antesDe === id) return;

    const ordem = calcularOrdem(colunaId, antesDe, id);
    if (tarefa.coluna === colunaId && tarefa.ordem === ordem) return;
    await salvar(tarefa, { coluna: colunaId, ordem });
  }

  /** Mesmo movimento pelos botões, para toque e teclado. */
  async function moverLado(tarefa, passo) {
    const destino = IDS_COLUNAS[IDS_COLUNAS.indexOf(tarefa.coluna) + passo];
    if (!destino) return;
    const lista = porColuna(destino).filter(t => t.id !== tarefa.id);
    await salvar(tarefa, { coluna: destino, ordem: ordemEntre(lista[lista.length - 1], null) });
  }

  // ---- ações do cartão -------------------------------------------------

  async function apontar(tarefa) {
    setErro('');
    const hora = agoraHM();
    const resp = await fetch('/api/lancamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: hojeISO(),
        inicio: hora,
        descricao: tarefa.titulo,
        chamado: tarefa.chamado,
        projeto: tarefa.projeto
      })
    });
    const corpo = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      setErro(corpo.erro || 'Não foi possível criar o lançamento.');
      return;
    }
    mostrarAviso(`Lançado às ${hora}: ${tarefa.titulo}`);
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    const alvo = tarefas.find(t => t.id === editando.id);
    if (!alvo) { setEditando(null); return; }

    setSalvandoEdicao(true);
    const salvo = await salvar(alvo, {
      titulo: editando.titulo,
      descricao: editando.descricao,
      chamado: editando.chamado,
      projeto: editando.projeto,
      prioridade: editando.prioridade,
      prazo: editando.prazo || null,
      coluna: editando.coluna
    });
    setSalvandoEdicao(false);
    if (salvo) setEditando(null);
  }

  async function confirmarExclusao() {
    const alvo = alvoExcluir;
    setAlvoExcluir(null);
    setEditando(null);
    setErro('');

    const anterior = tarefas;
    setTarefas(atual => atual.filter(t => t.id !== alvo.id));
    const resp = await fetch(`/api/tarefas/${alvo.id}`, { method: 'DELETE' });
    if (!resp.ok) {
      setTarefas(anterior);
      setErro('Não foi possível excluir a tarefa.');
    }
  }

  async function limparConcluidas() {
    setConfirmarLimpeza(false);
    setErro('');
    const anterior = tarefas;
    setTarefas(atual => atual.filter(t => t.coluna !== 'concluido'));

    const resp = await fetch('/api/tarefas?coluna=concluido', { method: 'DELETE' });
    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setTarefas(anterior);
      setErro(corpo.erro || 'Não foi possível limpar as concluídas.');
      return;
    }
    mostrarAviso(`${corpo.excluidas} tarefa(s) concluída(s) removida(s) do quadro.`);
  }

  // ---- tela ------------------------------------------------------------

  return (
    <main className="pagina pagina--larga">
      <header className="topo">
        <Marca altura={34} />
        <span className="rotulo">Quadro</span>
        <span className="email">{email}</span>
        <div className="acoes">
          <Link className="btn btn--mini" href="/dashboard">
            <Icone nome="relogio" tamanho={14} />Apontamentos
          </Link>
          {ehAdmin && (
            <Link className="btn btn--mini" href="/admin/usuarios">
              <Icone nome="usuarios" tamanho={14} />Usuários
            </Link>
          )}
          <TemaBotao />
        </div>
      </header>

      {erro && <div className="aviso aviso--erro">{erro}</div>}
      {aviso && <div className="aviso aviso--ok">{aviso}</div>}

      <form className="barra-nova-tarefa" onSubmit={criar}>
        <input
          className="campo"
          placeholder="O que precisa ser feito?"
          value={novoTitulo}
          onChange={e => setNovoTitulo(e.target.value)}
          style={{ flex: 2, minWidth: 180 }}
        />
        <input
          className="campo"
          placeholder="Chamado"
          value={novoChamado}
          onChange={e => setNovoChamado(e.target.value)}
          style={{ flex: 1, minWidth: 110 }}
        />
        <select
          className="campo"
          aria-label="Prioridade"
          value={novaPrioridade}
          onChange={e => setNovaPrioridade(e.target.value)}
          style={{ width: 'auto' }}
        >
          {PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <button className="btn btn--forte" type="submit" disabled={criando}>
          <Icone nome="mais" tamanho={15} />{criando ? 'Criando…' : 'Adicionar'}
        </button>
      </form>

      <div className="kanban">
        {COLUNAS.map(coluna => {
          const lista = porColuna(coluna.id);
          const alvoDaVez = indicador?.coluna === coluna.id;

          return (
            <section
              key={coluna.id}
              className={'coluna' + (alvoDaVez ? ' coluna--alvo' : '')}
              onDragOver={e => {
                e.preventDefault();
                setIndicador({ coluna: coluna.id, antesDe: null });
              }}
              onDrop={e => {
                e.preventDefault();
                soltar(coluna.id, null);
              }}
            >
              <div className="coluna-topo">
                <span className="rotulo">{coluna.nome}</span>
                <span className="num contagem">{lista.length}</span>
                {coluna.id === 'concluido' && lista.length > 0 && (
                  <button
                    className="btn btn--mini"
                    onClick={() => setConfirmarLimpeza(true)}
                    title="Remover do quadro todas as tarefas concluídas"
                  >
                    <Icone nome="lixeira" tamanho={13} />Limpar
                  </button>
                )}
              </div>

              <div className="coluna-corpo">
                {lista.length === 0 && (
                  <p className="coluna-vazia">
                    {coluna.id === 'a_fazer' ? 'Nada pendente por aqui.' : 'Arraste um cartão para cá.'}
                  </p>
                )}

                {lista.map(tarefa => (
                  <div key={tarefa.id}>
                    {alvoDaVez && indicador.antesDe === tarefa.id && <div className="marcador-solta" />}
                    <Cartao
                      tarefa={tarefa}
                      colunaId={coluna.id}
                      arrastando={arrastando}
                      hoje={hoje}
                      aoArrastar={comecarArrasto}
                      aoEncerrar={encerrarArrasto}
                      aoPassarPorCima={(e, colunaId, t) =>
                        setIndicador({ coluna: colunaId, antesDe: alvoNoCartao(e, colunaId, t) })
                      }
                      aoSoltar={(e, colunaId, t) => soltar(colunaId, alvoNoCartao(e, colunaId, t))}
                      aoMover={moverLado}
                      aoApontar={apontar}
                      aoAbrir={t => setEditando({ ...t, prazo: t.prazo || '' })}
                    />
                  </div>
                ))}

                {alvoDaVez && indicador.antesDe === null && <div className="marcador-solta" />}
              </div>
            </section>
          );
        })}
      </div>

      <p className="dica" style={{ marginTop: 12 }}>
        Arraste os cartões entre as colunas, ou use ‹ e › no toque. <strong>Apontar</strong> cria
        um lançamento de hoje com o título e o chamado da tarefa — a tarefa continua no quadro.
      </p>

      {editando && (
        <div className="modal-fundo" role="dialog" aria-modal="true">
          <form className="modal modal--largo" onSubmit={salvarEdicao}>
            <h2>Tarefa</h2>

            <div className="campo-grupo">
              <label className="rotulo" htmlFor="t-titulo">Título</label>
              <input
                className="campo" id="t-titulo" required autoFocus value={editando.titulo}
                onChange={e => setEditando({ ...editando, titulo: e.target.value })}
              />
            </div>

            <div className="linha-campos">
              <div className="campo-grupo">
                <label className="rotulo" htmlFor="t-chamado">Chamado</label>
                <input
                  className="campo" id="t-chamado" value={editando.chamado}
                  onChange={e => setEditando({ ...editando, chamado: e.target.value })}
                />
              </div>
              <div className="campo-grupo">
                <label className="rotulo" htmlFor="t-projeto">Projeto</label>
                <input
                  className="campo" id="t-projeto" value={editando.projeto}
                  onChange={e => setEditando({ ...editando, projeto: e.target.value })}
                />
              </div>
            </div>

            <div className="linha-campos">
              <div className="campo-grupo">
                <label className="rotulo" htmlFor="t-prioridade">Prioridade</label>
                <select
                  className="campo" id="t-prioridade" value={editando.prioridade}
                  onChange={e => setEditando({ ...editando, prioridade: e.target.value })}
                >
                  {PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="campo-grupo">
                <label className="rotulo" htmlFor="t-prazo">Prazo</label>
                <input
                  className="campo" id="t-prazo" type="date" value={editando.prazo || ''}
                  onChange={e => setEditando({ ...editando, prazo: e.target.value })}
                />
              </div>
              <div className="campo-grupo">
                <label className="rotulo" htmlFor="t-coluna">Coluna</label>
                <select
                  className="campo" id="t-coluna" value={editando.coluna}
                  onChange={e => setEditando({ ...editando, coluna: e.target.value })}
                >
                  {COLUNAS.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>

            <div className="campo-grupo">
              <label className="rotulo" htmlFor="t-descricao">Descrição</label>
              <textarea
                className="campo" id="t-descricao" rows={4} value={editando.descricao}
                onChange={e => setEditando({ ...editando, descricao: e.target.value })}
              />
            </div>

            <div className="linha-botoes">
              <button
                className="btn btn--perigo" type="button"
                onClick={() => setAlvoExcluir(editando)}
              >
                <Icone nome="lixeira" tamanho={15} />Excluir
              </button>
              <button
                className="btn" type="button" style={{ marginLeft: 'auto' }}
                onClick={() => setEditando(null)}
              >
                Cancelar
              </button>
              <button className="btn btn--forte" type="submit" disabled={salvandoEdicao}>
                <Icone nome="seleciona" tamanho={15} />{salvandoEdicao ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {alvoExcluir && (
        <div className="modal-fundo" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Excluir tarefa</h2>
            <p style={{ marginTop: 0 }}>Excluir “{alvoExcluir.titulo}”? Não dá para desfazer.</p>
            <p className="dica">Os lançamentos já feitos a partir dela continuam no histórico.</p>
            <div className="linha-botoes">
              <button className="btn" onClick={() => setAlvoExcluir(null)}>Cancelar</button>
              <button className="btn btn--perigo" style={{ marginLeft: 'auto' }} onClick={confirmarExclusao}>
                <Icone nome="lixeira" tamanho={15} />Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmarLimpeza && (
        <div className="modal-fundo" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Limpar concluídas</h2>
            <p style={{ marginTop: 0 }}>
              Remover do quadro as {porColuna('concluido').length} tarefa(s) da coluna Concluído?
            </p>
            <p className="dica">Os lançamentos de horas não são afetados.</p>
            <div className="linha-botoes">
              <button className="btn" onClick={() => setConfirmarLimpeza(false)}>Cancelar</button>
              <button className="btn btn--perigo" style={{ marginLeft: 'auto' }} onClick={limparConcluidas}>
                <Icone nome="lixeira" tamanho={15} />Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
