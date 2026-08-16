'use client';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseNavegador } from '@/lib/supabase/client';
import {
  CONFIG_PADRAO, agoraHM, diasDoPeriodo, duracaoMin, emAndamento, hmParaMin,
  hojeISO, isoDe, minParaDecimal, minParaHM, normalizar, rotuloDoPeriodo
} from '@/lib/apontamento';
import { ordenarPorUrgencia } from '@/lib/kanban';
import Marca from '../Marca';
import Icone from '../Icone';
import TemaBotao from '../TemaBotao';
import { avisarNavegacao } from '../Progresso';
import Regua from './Regua';
import Resumo from './Resumo';
import Esqueleto from './Esqueleto';
import Pendencias from './Pendencias';
import AlertaPrazos from './AlertaPrazos';
import ListaLancamentos from './ListaLancamentos';
import Consolidado from './Consolidado';
import DialogoManual from './DialogoManual';
import DialogoAjustes from './DialogoAjustes';
import Dialogo from './Dialogo';

const MANUAL_VAZIO = {
  data: '', inicio: '', fim: '', descricao: '',
  chamado: '', projeto: '', categoria: '', obs: ''
};

export default function DashboardClient({ email, ehAdmin }) {
  const router = useRouter();

  // o dia começa nulo e só é definido depois de montar: o servidor roda em UTC
  // e, à noite no Brasil, já estaria no dia seguinte
  const [dia, setDia] = useState(null);
  const [modo, setModo] = useState('dia');
  const [config, setConfig] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const [abertos, setAbertos] = useState(() => new Set());
  const [selecionados, setSelecionados] = useState(() => new Set());
  const conhecidos = useRef(new Set());

  const [opcoes, setOpcoes] = useState({ achatar: false, semHorarios: false, agrupar: false });
  const [manual, setManual] = useState(null);
  const [ajustes, setAjustes] = useState(false);
  const [confirmacao, setConfirmacao] = useState(null);
  const [saindo, setSaindo] = useState(false);

  const [tarefas, setTarefas] = useState([]);
  const [tarefasCarregadas, setTarefasCarregadas] = useState(false);
  const [alertaPrazos, setAlertaPrazos] = useState(false);

  const [, forcarRender] = useReducer(x => x + 1, 0);
  const campoRapido = useRef(null);
  const cronometroAviso = useRef(null);

  const dias = useMemo(() => (dia ? diasDoPeriodo(dia, modo) : []), [dia, modo]);

  // a API traz o período pedido mais as atividades ainda abertas de outros dias
  const doPeriodo = useMemo(
    () => lancamentos
      .filter(l => dias.includes(l.data))
      .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio)),
    [lancamentos, dias]
  );
  const ativa = emAndamento(lancamentos);

  function mostrarAviso(texto) {
    setAviso(texto);
    clearTimeout(cronometroAviso.current);
    cronometroAviso.current = setTimeout(() => setAviso(''), 2400);
  }

  /* ---------- carregamento ---------- */

  useEffect(() => {
    setDia(hojeISO());
    return () => clearTimeout(cronometroAviso.current);
  }, []);

  useEffect(() => {
    (async () => {
      const resp = await fetch('/api/config');
      const corpo = await resp.json().catch(() => ({}));
      setConfig(resp.ok ? { ...CONFIG_PADRAO, ...corpo.config } : { ...CONFIG_PADRAO });
    })();
  }, []);

  // as tarefas do quadro alimentam a fila de lançamento rápido e o alerta de
  // prazo; carregam uma vez só — o quadro é gerenciado na tela dele mesmo
  useEffect(() => {
    (async () => {
      const resp = await fetch('/api/tarefas');
      const corpo = await resp.json().catch(() => ({}));
      if (resp.ok) setTarefas(corpo.tarefas || []);
      setTarefasCarregadas(true);
    })();
  }, []);

  const pendentes = useMemo(
    () => (dia ? ordenarPorUrgencia(tarefas, hojeISO()) : []),
    [tarefas, dia]
  );
  const comPrazo = useMemo(() => pendentes.filter(p => p.prazoClasse), [pendentes]);

  // um aviso por dia, não um por visita: sem isso, ir e voltar do quadro
  // reabriria o alerta a cada navegação de volta ao diário
  useEffect(() => {
    if (!tarefasCarregadas || !comPrazo.length) return;
    const chave = `apontei-alerta-prazo-${hojeISO()}`;
    let jaMostrado = false;
    try {
      jaMostrado = !!sessionStorage.getItem(chave);
      if (!jaMostrado) sessionStorage.setItem(chave, '1');
    } catch (e) { /* modo privado: sem persistência, mostra sempre */ }
    if (!jaMostrado) setAlertaPrazos(true);
  }, [tarefasCarregadas, comPrazo.length]);

  const carregar = useCallback(async () => {
    if (!dias.length) return;
    const busca = new URLSearchParams({ de: dias[0], ate: dias[dias.length - 1], abertos: '1' });
    const resp = await fetch(`/api/lancamentos?${busca}`);
    const corpo = await resp.json().catch(() => ({}));
    setCarregando(false);
    if (!resp.ok) {
      setErro(corpo.erro || 'Não foi possível carregar os lançamentos.');
      return;
    }
    setErro('');
    setLancamentos((corpo.lancamentos || []).map(normalizar));
  }, [dias]);

  useEffect(() => { carregar(); }, [carregar]);

  // atividades novas entram selecionadas; o que você desmarcar continua assim
  useEffect(() => {
    const novos = doPeriodo.filter(l => !conhecidos.current.has(l.id)).map(l => l.id);
    if (!novos.length) return;
    novos.forEach(id => conhecidos.current.add(id));
    setSelecionados(atual => new Set([...atual, ...novos]));
  }, [doPeriodo]);

  // cronômetro: redesenha de segundo em segundo só quando há atividade aberta
  useEffect(() => {
    if (!ativa) return;
    const t = setInterval(forcarRender, 1000);
    return () => clearInterval(t);
  }, [ativa]);

  /* ---------- gravação ---------- */

  async function criar(dados) {
    const resp = await fetch('/api/lancamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok) { setErro(corpo.erro || 'Não foi possível salvar o lançamento.'); return null; }
    const novo = normalizar(corpo.lancamento);
    setLancamentos(atual => [...atual, novo]);
    return novo;
  }

  async function alterar(id, mudancas) {
    const anterior = lancamentos;
    setLancamentos(atual => atual.map(l => (l.id === id ? { ...l, ...mudancas } : l)));
    const resp = await fetch(`/api/lancamentos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mudancas)
    });
    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setLancamentos(anterior);
      setErro(corpo.erro || 'Não foi possível salvar a alteração.');
      return null;
    }
    const salvo = normalizar(corpo.lancamento);
    setLancamentos(atual => atual.map(l => (l.id === id ? salvo : l)));
    return salvo;
  }

  /* ---------- captura ---------- */

  async function encerrarAtividade() {
    if (!ativa) return;
    const fim = agoraHM();
    await alterar(ativa.id, { fim: hmParaMin(fim) < hmParaMin(ativa.inicio) ? ativa.inicio : fim });
  }

  async function iniciarAtividade(texto) {
    const anterior = ativa;
    if (anterior) await encerrarAtividade();
    const hora = agoraHM();
    setDia(hojeISO());
    await criar({
      data: hojeISO(),
      inicio: hora,
      descricao: texto ? `${hora} · ${texto}` : '',
      projeto: anterior ? anterior.projeto : '',
      categoria: config?.categorias?.[0] || ''
    });
  }

  async function anotarNaAtividade(texto) {
    if (!ativa) return iniciarAtividade(texto);
    const linha = `${agoraHM()} · ${texto}`;
    await alterar(ativa.id, { descricao: ativa.descricao ? `${ativa.descricao}\n${linha}` : linha });
  }

  /**
   * Lançamento rápido a partir de uma tarefa do quadro: encerra a atividade
   * aberta (se houver) e começa uma nova já com chamado/projeto herdados do
   * cartão. O cartão continua no quadro — apontar e concluir são coisas
   * separadas, igual no quadro.
   */
  async function lancarTarefa(tarefa) {
    const anterior = ativa;
    if (anterior) await encerrarAtividade();
    const hora = agoraHM();
    setDia(hojeISO());
    const novo = await criar({
      data: hojeISO(),
      inicio: hora,
      descricao: `${hora} · ${tarefa.titulo}`,
      chamado: tarefa.chamado || '',
      projeto: tarefa.projeto || (anterior ? anterior.projeto : ''),
      categoria: config?.categorias?.[0] || ''
    });
    if (novo) {
      setAlertaPrazos(false);
      mostrarAviso(`Iniciado: ${tarefa.titulo}`);
    }
  }

  function ajustarAltura(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(180, el.scrollHeight) + 'px';
  }

  function teclaNaCaptura(e) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    const texto = e.target.value.trim();
    if (e.ctrlKey || e.metaKey) iniciarAtividade(texto);
    else if (ativa) { if (texto) anotarNaAtividade(texto); }
    else iniciarAtividade(texto);
    e.target.value = '';
    ajustarAltura(e.target);
  }

  /* ---------- navegação ---------- */

  function moverPeriodo(passo) {
    const d = new Date(dia + 'T12:00:00');
    d.setDate(d.getDate() + passo * (modo === 'semana' ? 7 : 1));
    setDia(isoDe(d));
    setAbertos(new Set());
  }

  /* ---------- ações da lista ---------- */

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

  function alternarTodas() {
    const todas = doPeriodo.length > 0 && doPeriodo.every(l => selecionados.has(l.id));
    setSelecionados(atual => {
      const novo = new Set(atual);
      doPeriodo.forEach(l => (todas ? novo.delete(l.id) : novo.add(l.id)));
      return novo;
    });
  }

  function editarCampo(id, campo, valor) {
    setLancamentos(atual => atual.map(l => (l.id === id ? { ...l, [campo]: valor } : l)));
  }

  function gravarCampo(id, campo, valor) {
    // apagar o horário de início deixaria a linha inválida no banco; devolve o
    // valor que estava salvo em vez de mandar vazio
    if (campo === 'inicio' && !valor) {
      carregar();
      return;
    }
    alterar(id, { [campo]: campo === 'fim' ? (valor || null) : valor });
  }

  function pedirExclusao(l) {
    setConfirmacao({
      titulo: 'Excluir lançamento',
      texto: 'Este apontamento será removido do dia e do consolidado. Não dá para desfazer.',
      detalhe: l,
      confirmar: 'Excluir apontamento',
      acao: async () => {
        const anterior = lancamentos;
        setLancamentos(atual => atual.filter(x => x.id !== l.id));
        const resp = await fetch(`/api/lancamentos/${l.id}`, { method: 'DELETE' });
        if (!resp.ok) { setLancamentos(anterior); setErro('Não foi possível excluir o lançamento.'); return; }
        mostrarAviso('Apontamento excluído.');
      }
    });
  }

  /* ---------- cópia ---------- */

  async function copiar(texto, quantas) {
    if (!texto) { mostrarAviso('Nenhuma atividade selecionada.'); return; }
    try {
      await navigator.clipboard.writeText(texto);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e2) {
        mostrarAviso('Não foi possível copiar automaticamente.');
        ta.remove();
        return;
      }
      ta.remove();
    }
    mostrarAviso(quantas > 1 ? `${quantas} apontamentos copiados.` : 'Copiado.');
  }

  /* ---------- backup ---------- */

  function baixar(nome, conteudo, tipo) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function todosOsLancamentos() {
    const resp = await fetch('/api/lancamentos');
    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok) { setErro(corpo.erro || 'Não foi possível ler o histórico.'); return null; }
    return (corpo.lancamentos || []).map(normalizar);
  }

  async function exportarCsv() {
    const todos = await todosOsLancamentos();
    if (!todos) return;
    const cab = ['data', 'inicio', 'fim', 'duracao_min', 'duracao_hhmm', 'duracao_decimal',
                 'chamado', 'projeto', 'categoria', 'descricao', 'observacao'];
    const cel = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const linhas = todos.map(l => {
      const d = duracaoMin(l);
      return [l.data, l.inicio, l.fim || '', Math.round(d), minParaHM(d), minParaDecimal(d),
              l.chamado, l.projeto, l.categoria, l.descricao, l.obs].map(cel).join(';');
    });
    baixar(`apontei-${hojeISO()}.csv`, '﻿' + [cab.join(';'), ...linhas].join('\r\n'),
           'text/csv;charset=utf-8');
  }

  async function exportarJson() {
    const todos = await todosOsLancamentos();
    if (!todos) return;
    baixar(
      `apontei-${hojeISO()}.json`,
      JSON.stringify({ app: 'apontei', versao: 1, gravadoEm: new Date().toISOString(),
                       lancamentos: todos, config }, null, 2),
      'application/json'
    );
  }

  async function importar(arquivo) {
    let dados;
    try {
      dados = JSON.parse(await arquivo.text());
      if (!Array.isArray(dados.lancamentos)) throw new Error('formato');
    } catch (e) {
      setErro('Arquivo inválido: esperado um JSON exportado pelo apontei.');
      return;
    }

    const resp = await fetch('/api/lancamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lancamentos: dados.lancamentos })
    });
    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok) { setErro(corpo.erro || 'Não foi possível importar o arquivo.'); return; }

    // o apontei local grava a config em camelCase
    if (dados.config) {
      const c = dados.config;
      await salvarConfig({
        arredondamento: c.arredondamento,
        inicio_dia: c.inicioDia || c.inicio_dia,
        fim_dia: c.fimDia || c.fim_dia,
        limite_caracteres: c.limiteCaracteres ?? c.limite_caracteres,
        separador: c.separador,
        template: c.template,
        projetos: c.projetos,
        categorias: c.categorias
      }, true);
    }

    await carregar();
    mostrarAviso(
      corpo.importados
        ? `${corpo.importados} lançamento(s) importado(s)` +
          (corpo.ignorados ? `, ${corpo.ignorados} já existia(m).` : '.')
        : 'Nada novo para importar — tudo já estava aqui.'
    );
  }

  function pedirApagarTudo() {
    setConfirmacao({
      titulo: 'Apagar tudo',
      texto: 'Todos os seus lançamentos serão apagados da sua conta.',
      alerta: 'Exporte o JSON antes se quiser guardar o histórico. Não dá para desfazer.',
      confirmar: 'Apagar tudo',
      acao: async () => {
        const resp = await fetch('/api/lancamentos?tudo=1', { method: 'DELETE' });
        const corpo = await resp.json().catch(() => ({}));
        if (!resp.ok) { setErro(corpo.erro || 'Não foi possível apagar os lançamentos.'); return; }
        setLancamentos([]);
        setAjustes(false);
        mostrarAviso(`${corpo.excluidos} lançamento(s) apagado(s).`);
      }
    });
  }

  /* ---------- ajustes ---------- */

  async function salvarConfig(mudancas, silencioso) {
    const resp = await fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mudancas)
    });
    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok) { setErro(corpo.erro || 'Não foi possível salvar os ajustes.'); return; }
    setConfig({ ...CONFIG_PADRAO, ...corpo.config });
    if (!silencioso) { setAjustes(false); mostrarAviso('Ajustes salvos.'); }
  }

  async function sair() {
    setSaindo(true);
    await supabaseNavegador().auth.signOut();
    avisarNavegacao();
    router.push('/login');
    router.refresh();
  }

  /* ---------- tela ---------- */

  // a marca e o tema já aparecem enquanto o resto carrega: a página nasce com
  // a mesma moldura que vai ter depois, então nada salta de lugar
  if (!dia || !config) {
    return (
      <>
        <header className="cab">
          <div className="cab__marca">
            <Marca altura={40} />
            <span>{email}</span>
          </div>
          <div className="cab__acoes"><TemaBotao /></div>
        </header>
        <Esqueleto />
      </>
    );
  }

  const projetosSugeridos = [...new Set([
    ...(config.projetos || []),
    ...lancamentos.map(l => l.projeto)
  ].filter(Boolean))];
  const chamadosSugeridos = [...new Set(lancamentos.map(l => l.chamado).filter(Boolean))].slice(-60);

  return (
    <>
      <header className="cab">
        <div className="cab__marca">
          <Marca altura={40} />
          <span>{email}</span>
        </div>

        <div className="cab__dia">
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
          <span className="cab__rotulo">{rotuloDoPeriodo(dia, modo)}</span>
          <button className="btn" title="Ir para hoje"
                  onClick={() => { setDia(hojeISO()); setAbertos(new Set()); }}>
            <Icone nome="calendario" tamanho={15} /><span className="rotulo-btn">Hoje</span>
          </button>
        </div>

        <div className="cab__acoes">
          <button className="btn" title="Lançar manualmente"
                  onClick={() => setManual({ ...MANUAL_VAZIO, data: dia })}>
            <Icone nome="mais" tamanho={15} /><span className="rotulo-btn">Lançar</span>
          </button>
          <button className="btn" title="Ajustes" onClick={() => setAjustes(true)}>
            <Icone nome="ajustes" tamanho={15} /><span className="rotulo-btn">Ajustes</span>
          </button>
          <Link className="btn" href="/kanban" title="Quadro">
            <Icone nome="colunas" tamanho={15} /><span className="rotulo-btn">Quadro</span>
          </Link>
          {ehAdmin && (
            <Link className="btn" href="/admin/usuarios" title="Usuários">
              <Icone nome="usuarios" tamanho={15} /><span className="rotulo-btn">Usuários</span>
            </Link>
          )}
          <TemaBotao />
          <button
            className="btn btn--icone" onClick={sair} disabled={saindo}
            title={saindo ? 'Saindo…' : 'Sair da conta'}
            aria-label={saindo ? 'Saindo da conta' : 'Sair da conta'}
          >
            {saindo ? <span className="giro" /> : <Icone nome="sair" tamanho={16} />}
          </button>
        </div>
      </header>

      {erro && <p className="tarja tarja--erro">{erro}</p>}

      <Resumo lancamentos={doPeriodo} dias={dias} modo={modo} config={config} />

      <section className="captura">
        {ativa && (
          <div className="ativo">
            <div className="ativo__topo">
              <span className="ativo__pulso" />
              <span className="ativo__crono num">{minParaHM(duracaoMin(ativa))}</span>
              <span className="ativo__desde">
                desde {ativa.inicio}{ativa.data !== hojeISO() ? ` de ${ativa.data.slice(8)}/${ativa.data.slice(5, 7)}` : ''}
              </span>
              <div className="ativo__meta">
                {/* a key troca junto com a atividade: sem ela o React reaproveita
                    o input e o defaultValue da atividade anterior fica na tela */}
                <input
                  key={`chamado-${ativa.id}`}
                  list="listaChamados" placeholder="Chamado" defaultValue={ativa.chamado}
                  onBlur={e => alterar(ativa.id, { chamado: e.target.value.trim() })}
                />
                <input
                  key={`projeto-${ativa.id}`}
                  list="listaProjetos" placeholder="Projeto" defaultValue={ativa.projeto}
                  onBlur={e => alterar(ativa.id, { projeto: e.target.value.trim() })}
                />
                <select
                  value={ativa.categoria}
                  onChange={e => alterar(ativa.id, { categoria: e.target.value })}
                >
                  <option value="">—</option>
                  {!config.categorias.includes(ativa.categoria) && ativa.categoria && (
                    <option value={ativa.categoria}>{ativa.categoria}</option>
                  )}
                  {config.categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="ativo__linhas">{ativa.descricao}</div>
          </div>
        )}

        <div className="entrada">
          <textarea
            ref={campoRapido}
            rows={1}
            aria-label="Registro rápido"
            placeholder={ativa ? 'Anote o que acabou de fazer nesta atividade…' : 'O que você está fazendo agora?'}
            onInput={e => ajustarAltura(e.target)}
            onKeyDown={teclaNaCaptura}
          />
          <div className="entrada__acoes">
            <button
              className="btn btn--forte"
              onClick={() => {
                const el = campoRapido.current;
                iniciarAtividade(el.value.trim());
                el.value = '';
                ajustarAltura(el);
                el.focus();
              }}
            >
              <Icone nome={ativa ? 'mais' : 'play'} tamanho={15} />
              {ativa ? 'Nova atividade' : 'Iniciar'}
            </button>
            {ativa && (
              <button
                className="btn"
                onClick={async () => {
                  const el = campoRapido.current;
                  const texto = el.value.trim();
                  if (texto) await anotarNaAtividade(texto);
                  await encerrarAtividade();
                  el.value = '';
                  ajustarAltura(el);
                }}
              >
                <Icone nome="parar" tamanho={15} />Encerrar
              </button>
            )}
          </div>
        </div>

        <p className="dica">
          {ativa ? (
            <><kbd>Enter</kbd> acrescenta a linha à atividade atual · <kbd>Ctrl+Enter</kbd> encerra esta e inicia outra</>
          ) : (
            <><kbd>Enter</kbd> inicia uma atividade e começa a contar o tempo · <kbd>Shift+Enter</kbd> quebra linha</>
          )}
        </p>
      </section>

      <Pendencias itens={pendentes} aoApontar={lancarTarefa} />

      <Regua
        lancamentos={doPeriodo}
        dia={dia}
        modo={modo}
        dias={dias}
        config={config}
        aoClicarLacuna={(diaLacuna, inicio, fim) =>
          setManual({ ...MANUAL_VAZIO, data: diaLacuna, inicio, fim })}
        aoClicarBloco={id => {
          setAbertos(atual => new Set(atual).add(id));
          setTimeout(() => {
            document.getElementById(`lanc-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }, 0);
        }}
        aoIrParaDia={d => { setDia(d); setModo('dia'); setAbertos(new Set()); }}
      />

      <main className="corpo">
        <section className="painel">
          <div className="painel__cab">
            <h2>{modo === 'semana' ? 'Lançamentos da semana' : 'Lançamentos do dia'}</h2>
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
            aoExcluir={pedirExclusao}
            aoLancarManual={() => setManual({ ...MANUAL_VAZIO, data: dia })}
          />
        </section>

        <Consolidado
          lancamentos={doPeriodo}
          modo={modo}
          config={config}
          selecionados={selecionados}
          opcoes={opcoes}
          aoMudarOpcao={(campo, valor) => setOpcoes(atual => ({ ...atual, [campo]: valor }))}
          aoAlternarTodas={alternarTodas}
          aoCopiar={copiar}
        />
      </main>

      <datalist id="listaProjetos">
        {projetosSugeridos.map(p => <option key={p} value={p} />)}
      </datalist>
      <datalist id="listaChamados">
        {chamadosSugeridos.map(c => <option key={c} value={c} />)}
      </datalist>

      {manual && (
        <DialogoManual
          inicial={manual}
          config={config}
          aoFechar={() => setManual(null)}
          aoSalvar={async form => {
            const salvo = form.id
              ? await alterar(form.id, {
                  data: form.data, inicio: form.inicio, fim: form.fim || null,
                  descricao: form.descricao, chamado: form.chamado, projeto: form.projeto,
                  categoria: form.categoria, obs: form.obs
                })
              : await criar(form);
            if (!salvo) return false;
            setDia(form.data);
            setManual(null);
            return true;
          }}
          aoExcluir={form => { setManual(null); pedirExclusao(form); }}
        />
      )}

      {ajustes && (
        <DialogoAjustes
          config={config}
          aoFechar={() => setAjustes(false)}
          aoSalvar={salvarConfig}
          aoExportarCsv={exportarCsv}
          aoExportarJson={exportarJson}
          aoImportar={importar}
          aoApagarTudo={pedirApagarTudo}
        />
      )}

      {confirmacao && (
        <Dialogo aberto aoFechar={() => setConfirmacao(null)} largura={480}>
          <div className="dlg__cab"><h2>{confirmacao.titulo}</h2></div>
          <div className="dlg__corpo">
            <p style={{ margin: 0 }}>{confirmacao.texto}</p>
            {confirmacao.detalhe && (
              <div className="perg-detalhe">
                <div className="perg-detalhe__horas">
                  {confirmacao.detalhe.inicio}–{confirmacao.detalhe.fim || 'em andamento'}
                  {' · '}{minParaHM(duracaoMin(confirmacao.detalhe))}
                  {confirmacao.detalhe.chamado ? ` · ${confirmacao.detalhe.chamado}` : ''}
                </div>
                <div className="perg-detalhe__desc">
                  {confirmacao.detalhe.descricao || (
                    <em style={{ color: 'var(--tinta-fantasma)' }}>sem descrição</em>
                  )}
                </div>
              </div>
            )}
            {confirmacao.alerta && <p className="perg-aviso">{confirmacao.alerta}</p>}
          </div>
          <div className="dlg__pe">
            <button className="btn" onClick={() => setConfirmacao(null)}>Cancelar</button>
            <button
              className="btn btn--perigo"
              style={{ marginLeft: 'auto' }}
              onClick={async () => {
                const acao = confirmacao.acao;
                setConfirmacao(null);
                await acao();
              }}
            >
              <Icone nome="lixeira" tamanho={15} />{confirmacao.confirmar}
            </button>
          </div>
        </Dialogo>
      )}

      {alertaPrazos && (
        <AlertaPrazos
          itens={comPrazo}
          aoFechar={() => setAlertaPrazos(false)}
          aoApontar={lancarTarefa}
        />
      )}

      <div className={'aviso-copia' + (aviso ? ' mostra' : '')} role="status" aria-live="polite">
        {aviso}
      </div>
    </>
  );
}
