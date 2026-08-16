// Regras de tempo, régua e consolidado do apontei.
// Tudo aqui é função pura: recebe lançamentos e config, devolve valores.
// Os nomes dos campos são os mesmos do banco (snake_case) para não precisar
// traduzir nada entre a API e a tela.

export const CONFIG_PADRAO = {
  arredondamento: 15,
  inicio_dia: '08:00',
  fim_dia: '18:00',
  limite_caracteres: 0,
  separador: '; ',
  template: '{chamado} | {projeto} | {horas}\n{descricao}',
  projetos: [],
  categorias: ['Desenvolvimento', 'Reunião', 'Suporte', 'Análise', 'Deploy', 'Documentação', 'Outros']
};

export const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/* ---------- relógio e datas ---------- */

export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function agoraHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function minutosAgora() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

/** O Postgres devolve `time` como HH:MM:SS; a tela trabalha com HH:MM. */
export function hm(valor) {
  return valor ? String(valor).slice(0, 5) : null;
}

export function hmParaMin(valor) {
  if (!valor) return null;
  const [h, m] = String(valor).split(':').map(Number);
  return h * 60 + m;
}

export function minParaHM(min) {
  const t = Math.max(0, Math.round(min));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

export function minParaDecimal(min) {
  return (Math.max(0, min) / 60).toFixed(2).replace('.', ',');
}

export function dataBR(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export function isoDe(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Meio-dia evita que o fuso empurre a data para o dia anterior. */
function comoData(iso) {
  return new Date(iso + 'T12:00:00');
}

export function nomeCurtoDoDia(iso) {
  return DIAS_CURTOS[comoData(iso).getDay()];
}

export function dataCurta(iso) {
  const d = comoData(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Semana de segunda a domingo, que é como a maioria dos sistemas fecha. */
export function semanaDe(iso) {
  const d = comoData(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return isoDe(x);
  });
}

export function diasDoPeriodo(dia, modo) {
  return modo === 'semana' ? semanaDe(dia) : [dia];
}

export function rotuloDoPeriodo(dia, modo) {
  if (modo === 'dia') {
    const d = comoData(dia);
    return `${nomeCurtoDoDia(dia)}, ${d.getDate()} de ${MESES_CURTOS[d.getMonth()]}`;
  }
  const dias = semanaDe(dia);
  const a = comoData(dias[0]);
  const b = comoData(dias[6]);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} a ${b.getDate()} de ${MESES_CURTOS[b.getMonth()]}`
    : `${a.getDate()} de ${MESES_CURTOS[a.getMonth()]} a ${b.getDate()} de ${MESES_CURTOS[b.getMonth()]}`;
}

/* ---------- lançamentos ---------- */

/** Normaliza o que vem da API: horas em HH:MM e textos nunca nulos. */
export function normalizar(l) {
  return {
    ...l,
    inicio: hm(l.inicio),
    fim: hm(l.fim),
    descricao: l.descricao || '',
    projeto: l.projeto || '',
    chamado: l.chamado || '',
    categoria: l.categoria || '',
    obs: l.obs || ''
  };
}

export function duracaoMin(l) {
  const ini = hmParaMin(l.inicio);
  if (ini === null) return 0;
  const fim = l.fim ? hmParaMin(l.fim) : (l.data === hojeISO() ? minutosAgora() : ini);
  return Math.max(0, fim - ini);
}

export function emAndamento(lancamentos) {
  return lancamentos.find(l => !l.fim) || null;
}

export function doDia(lancamentos, dia) {
  return lancamentos
    .filter(l => l.data === dia)
    .sort((a, b) => (hmParaMin(a.inicio) ?? 0) - (hmParaMin(b.inicio) ?? 0));
}

export function arredondar(min, config) {
  const passo = Number(config.arredondamento) || 0;
  if (!passo || min <= 0) return Math.round(min);
  return Math.max(passo, Math.round(min / passo) * passo);
}

export function corCategoria(nome, categorias = []) {
  const i = Math.max(0, categorias.indexOf(nome));
  return `var(--cat-${(i % 7) + 1})`;
}

export function tirarCarimbos(texto) {
  return texto.split('\n').map(l => l.replace(/^\s*\d{2}:\d{2}\s*·\s*/, '')).join('\n');
}

export function primeiraLinha(texto) {
  const l = (texto || '').split('\n').map(s => s.trim()).filter(Boolean)[0] || '';
  const limpa = l.replace(/^\d{2}:\d{2}\s*·\s*/, '');
  return limpa.length > 48 ? limpa.slice(0, 47) + '…' : limpa;
}

/* ---------- régua ---------- */

/** Janela de horas que a régua precisa mostrar para caber tudo. */
export function janelaDoDia(itens, dias, config) {
  let ini = hmParaMin(config.inicio_dia) ?? 480;
  let fim = hmParaMin(config.fim_dia) ?? 1080;

  itens.forEach(l => {
    const a = hmParaMin(l.inicio);
    const b = l.fim ? hmParaMin(l.fim) : (l.data === hojeISO() ? minutosAgora() : a);
    if (a !== null) ini = Math.min(ini, Math.floor(a / 60) * 60);
    if (b !== null) fim = Math.max(fim, Math.ceil(b / 60) * 60);
  });

  if (dias.includes(hojeISO())) fim = Math.max(fim, Math.ceil(minutosAgora() / 60) * 60);
  return { ini, fim: Math.max(fim, ini + 60) };
}

/** Intervalos de 10 minutos ou mais sem nenhum registro. */
export function calcularLacunas(itens, janela, dia, config) {
  const limite = dia === hojeISO()
    ? Math.min(janela.fim, minutosAgora())
    : Math.min(janela.fim, hmParaMin(config.fim_dia) ?? janela.fim);

  const ocupados = itens
    .map(l => {
      const a = hmParaMin(l.inicio);
      const b = l.fim ? hmParaMin(l.fim) : (l.data === hojeISO() ? minutosAgora() : a);
      return [a, b];
    })
    .filter(([a, b]) => a !== null && b !== null)
    .sort((x, y) => x[0] - y[0]);

  const fundidos = [];
  ocupados.forEach(iv => {
    const ult = fundidos[fundidos.length - 1];
    if (ult && iv[0] <= ult[1]) ult[1] = Math.max(ult[1], iv[1]);
    else fundidos.push([...iv]);
  });

  const lacunas = [];
  let cursor = hmParaMin(config.inicio_dia) ?? janela.ini;
  fundidos.forEach(([a, b]) => {
    if (a - cursor >= 10) lacunas.push([cursor, a]);
    cursor = Math.max(cursor, b);
  });
  if (limite - cursor >= 10) lacunas.push([cursor, limite]);
  return lacunas;
}

/* ---------- consolidado ---------- */

/**
 * Uma "peça" é o que vira um texto copiável: uma atividade isolada, ou um
 * chamado inteiro de um dia quando o agrupamento está ligado.
 */
export function montarPecas(itens, { selecionados, agrupar, modo, config }) {
  const sel = itens.filter(l => selecionados.has(l.id));

  if (!agrupar) {
    return sel.map(l => ({
      ids: [l.id],
      rotulo: (modo === 'semana' ? dataCurta(l.data) + ' · ' : '') +
              (l.chamado || primeiraLinha(l.descricao) || 'Sem título'),
      chamado: l.chamado,
      projeto: l.projeto,
      categoria: l.categoria,
      data: l.data,
      inicio: l.inicio,
      fim: l.fim || agoraHM(),
      bruto: duracaoMin(l),
      arredondado: arredondar(duracaoMin(l), config),
      descricao: l.descricao,
      unico: true
    }));
  }

  const mapa = new Map();
  sel.forEach(l => {
    const chamado = (l.chamado || '').trim() || '(sem chamado)';
    const chave = `${l.data}|${chamado}`;   // o apontamento é sempre por dia
    if (!mapa.has(chave)) mapa.set(chave, { chamado, data: l.data, itens: [], bruto: 0 });
    const g = mapa.get(chave);
    g.itens.push(l);
    g.bruto += duracaoMin(l);
  });

  return [...mapa.values()].map(g => ({
    ids: g.itens.map(l => l.id),
    rotulo: modo === 'semana' ? `${dataCurta(g.data)} · ${g.chamado}` : g.chamado,
    chamado: g.chamado === '(sem chamado)' ? '' : g.chamado,
    data: g.data,
    projeto: g.itens.find(l => l.projeto)?.projeto || '',
    categoria: g.itens.find(l => l.categoria)?.categoria || '',
    inicio: g.itens[0].inicio,
    fim: g.itens[g.itens.length - 1].fim || agoraHM(),
    bruto: g.bruto,
    arredondado: arredondar(g.bruto, config),
    descricao: g.itens.map(l => l.descricao).filter(Boolean).join('\n'),
    unico: false
  }));
}

export function textoDaPeca(peca, { achatar, semHorarios, config }) {
  let desc = peca.descricao;
  if (semHorarios) desc = tirarCarimbos(desc);
  desc = desc.split('\n').map(s => s.trim()).filter(Boolean)
    .join(achatar ? config.separador : '\n');

  let saida = config.template
    .replace(/{chamado}/g, peca.chamado)
    .replace(/{projeto}/g, peca.projeto)
    .replace(/{categoria}/g, peca.categoria)
    .replace(/{descricao}/g, desc)
    .replace(/{horas}/g, minParaHM(peca.arredondado))
    .replace(/{decimal}/g, minParaDecimal(peca.arredondado))
    .replace(/{inicio}/g, peca.inicio)
    .replace(/{fim}/g, peca.fim)
    .replace(/{data}/g, dataBR(peca.data));

  if (achatar) saida = saida.split('\n').map(s => s.trim()).filter(Boolean).join(config.separador);
  return saida.replace(/\s*\|\s*\|/g, ' |').replace(/^\s*\|\s*/, '').trim();
}
