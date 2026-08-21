'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Marca from '../Marca';
import Icone from '../Icone';
import TemaBotao from '../TemaBotao';
import Avisos from '../Avisos';
import Resumo from '../dashboard/Resumo';
import ListaLancamentos from '../dashboard/ListaLancamentos';
import { CONFIG_PADRAO, diasDoPeriodo, hojeISO, isoDe, normalizar, rotuloDoPeriodo } from '@/lib/apontamento';

export default function EquipeClient({ email, nome, podeEditar, podeAvisar }) {
  const [colegas, setColegas] = useState([]);
  const [carregandoColegas, setCarregandoColegas] = useState(true);
  const [colegaId, setColegaId] = useState('');
  const [dia, setDia] = useState(null);
  const [modo, setModo] = useState('dia');
  const [config, setConfig] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [abertos, setAbertos] = useState(() => new Set());
  const [selecionados, setSelecionados] = useState(() => new Set());
  const [alvoExcluir, setAlvoExcluir] = useState(null);

  useEffect(() => { setDia(hojeISO()); }, []);

  useEffect(() => {
    fetch('/api/equipe/colegas')
      .then(resp => resp.json())
      .then(corpo => {
        const lista = corpo.colegas || [];
        setColegas(lista);
        if (lista.length) setColegaId(lista[0].id);
      })
      .catch(() => setErro('Não foi possível carregar os colegas de equipe.'))
      .finally(() => setCarregandoColegas(false));
  }, []);

  const dias = useMemo(() => (dia ? diasDoPeriodo(dia, modo) : []), [dia, modo]);

  const carregar = useCallback(async () => {
    if (!colegaId || !dias.length) return;
    setCarregando(true);
    const busca = new URLSearchParams({
      usuario: colegaId, de: dias[0], ate: dias[dias.length - 1], abertos: '1'
    });
    const resp = await fetch(`/api/lancamentos?${busca}`);
    const corpo = await resp.json().catch(() => ({}));
    setCarregando(false);
    if (!resp.ok) {
      setErro(corpo.erro || 'Não foi possível carregar os lançamentos.');
      return;
    }
    setErro('');
    setLancamentos((corpo.lancamentos || []).map(normalizar));
  }, [colegaId, dias]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!colegaId) { setConfig({ ...CONFIG_PADRAO }); return; }
    fetch(`/api/config?usuario=${colegaId}`)
      .then(resp => resp.json())
      .then(corpo => setConfig(corpo.config || { ...CONFIG_PADRAO }))
      .catch(() => setConfig({ ...CONFIG_PADRAO }));
  }, [colegaId]);

  const doPeriodo = useMemo(
    () => lancamentos
      .filter(l => dias.includes(l.data))
      .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio)),
    [lancamentos, dias]
  );

  function moverPeriodo(passo) {
    const d = new Date(dia + 'T12:00:00');
    d.setDate(d.getDate() + passo * (modo === 'semana' ? 7 : 1));
    setDia(isoDe(d));
    setAbertos(new Set());
  }

  function trocarColega(id) {
    setColegaId(id);
    setAbertos(new Set());
  }

  function alternarAberto(id) {
    setAbertos(atual => {
      const novo = new Set(atual);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }

  function alternarSelecao(id) {
    setSelecionados(atual => {
      const novo = new Set(atual);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }

  function editarCampo(id, campo, valor) {
    if (!podeEditar) return;
    setLancamentos(atual => atual.map(l => (l.id === id ? { ...l, [campo]: valor } : l)));
  }

  async function gravarCampo(id, campo, valor) {
    if (!podeEditar) return;
    if (campo === 'inicio' && !valor) { carregar(); return; }

    const anterior = lancamentos;
    const mudanca = { [campo]: campo === 'fim' ? (valor || null) : valor };
    setLancamentos(atual => atual.map(l => (l.id === id ? { ...l, ...mudanca } : l)));

    const resp = await fetch(`/api/lancamentos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mudanca)
    });
    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setLancamentos(anterior);
      setErro(corpo.erro || 'Não foi possível salvar a alteração.');
      return;
    }
    setLancamentos(atual => atual.map(l => (l.id === id ? normalizar(corpo.lancamento) : l)));
  }

  async function confirmarExclusao() {
    const alvo = alvoExcluir;
    setAlvoExcluir(null);
    const anterior = lancamentos;
    setLancamentos(atual => atual.filter(l => l.id !== alvo.id));
    const resp = await fetch(`/api/lancamentos/${alvo.id}`, { method: 'DELETE' });
    if (!resp.ok) {
      setLancamentos(anterior);
      setErro('Não foi possível excluir o lançamento.');
    }
  }

  const colegaAtual = colegas.find(c => c.id === colegaId);

  if (dia === null) return null;

  return (
    <main className="pagina">
      <header className="topo">
        <Marca altura={34} />
        <span className="rotulo">Equipe</span>
        <span className="email" title={email}>{nome || email}</span>
        <div className="acoes">
          {podeAvisar && (
            <Link className="btn btn--mini" href="/equipe/avisos" title="Avisar a equipe">
              <Icone nome="sino" tamanho={14} /><span className="rotulo-btn">Avisar equipe</span>
            </Link>
          )}
          <Link className="btn btn--mini" href="/dashboard" title="Voltar">
            <Icone nome="esquerda" tamanho={14} /><span className="rotulo-btn">Voltar</span>
          </Link>
          <Avisos mini />
          <TemaBotao />
        </div>
      </header>

      {erro && <div className="aviso aviso--erro">{erro}</div>}

      {carregandoColegas ? (
        <p className="dica">Carregando colegas de equipe…</p>
      ) : colegas.length === 0 ? (
        <div className="quadro">
          <div className="vazio-estado">
            <span className="vazio-estado__icone"><Icone nome="usuarios" tamanho={20} /></span>
            <p className="vazio-estado__titulo">Nenhum colega na sua equipe</p>
            <p className="vazio-estado__texto">
              Peça a um administrador para colocar as pessoas que você supervisiona
              na mesma equipe que a sua.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="barra-filtro">
            <div className="barra-filtro__campo">
              <div className="barra-filtro__rot">
                <label className="rotulo" htmlFor="colega">Colega</label>
                <span
                  className={'cracha' + (podeEditar ? ' cracha--supervisor' : '')}
                  title={podeEditar
                    ? 'Você pode editar e excluir os lançamentos da equipe'
                    : 'Você só pode visualizar os lançamentos da equipe'}
                >
                  {podeEditar ? 'Pode editar' : 'Somente leitura'}
                </span>
              </div>
              <select
                id="colega" className="campo" value={colegaId}
                onChange={e => trocarColega(e.target.value)}
              >
                {colegas.map(c => <option key={c.id} value={c.id}>{c.nome || c.email}</option>)}
              </select>
            </div>

            <div className="controles-periodo">
              <div className="alternador" role="group" aria-label="Período">
                {['dia', 'semana'].map(m => (
                  <button
                    key={m}
                    className={'alternador__opcao' + (modo === m ? ' alternador__opcao--ativa' : '')}
                    onClick={() => { if (modo !== m) { setModo(m); setAbertos(new Set()); } }}
                  >
                    {m === 'dia' ? 'Dia' : 'Semana'}
                  </button>
                ))}
              </div>
              <button className="seta" title="Período anterior" aria-label="Período anterior"
                      onClick={() => moverPeriodo(-1)}>
                <Icone nome="esquerda" tamanho={16} />
              </button>
              <input
                type="date" aria-label="Dia" value={dia}
                onChange={e => { setDia(e.target.value || hojeISO()); setAbertos(new Set()); }}
              />
              <button className="seta" title="Próximo período" aria-label="Próximo período"
                      onClick={() => moverPeriodo(1)}>
                <Icone nome="direita" tamanho={16} />
              </button>
              <button className="btn btn--mini" title="Ir para hoje"
                      onClick={() => { setDia(hojeISO()); setAbertos(new Set()); }}>
                <Icone nome="calendario" tamanho={15} /><span className="rotulo-btn">Hoje</span>
              </button>
            </div>
          </div>

          {config && (
            <Resumo
              lancamentos={doPeriodo} dias={dias} modo={modo} config={config}
              className="resumo--solto"
            />
          )}

          {config && (
            <section className="painel" style={{ marginTop: 18 }}>
              <div className="painel__cab">
                <h2>{rotuloDoPeriodo(dia, modo)}</h2>
                <span className="rotulo" style={{ marginLeft: 'auto' }}>
                  {carregando ? 'carregando…' : doPeriodo.length
                    ? `${doPeriodo.length} ${doPeriodo.length === 1 ? 'registro' : 'registros'}`
                    : ''}
                </span>
              </div>
              <ListaLancamentos
                lancamentos={doPeriodo}
                dia={dia}
                modo={modo}
                config={config}
                abertos={abertos}
                selecionados={selecionados}
                aoAlternarAberto={alternarAberto}
                aoAlternarSelecao={alternarSelecao}
                aoEditarCampo={editarCampo}
                aoGravarCampo={gravarCampo}
                aoExcluir={l => setAlvoExcluir(l)}
                somenteLeitura={!podeEditar}
                semSelecao
              />
            </section>
          )}
        </>
      )}

      {alvoExcluir && (
        <div className="modal-fundo" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Excluir lançamento</h2>
            <p style={{ marginTop: 0 }}>
              Excluir este apontamento de <strong>{colegaAtual?.nome || colegaAtual?.email}</strong>?
              Não dá para desfazer.
            </p>
            <div className="linha-botoes">
              <button className="btn" onClick={() => setAlvoExcluir(null)}>Cancelar</button>
              <button
                className="btn btn--perigo" style={{ marginLeft: 'auto' }}
                onClick={confirmarExclusao}
              >
                <Icone nome="lixeira" tamanho={15} />Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
