// Definições do quadro, usadas tanto pela API quanto pela tela.
// Os ids são os mesmos valores aceitos pelo check da coluna "coluna" em tarefas.

export const COLUNAS = [
  { id: 'a_fazer', nome: 'A fazer' },
  { id: 'fazendo', nome: 'Fazendo' },
  { id: 'concluido', nome: 'Concluído' }
];

export const IDS_COLUNAS = COLUNAS.map(c => c.id);

export const PRIORIDADES = [
  { id: 'baixa', nome: 'Baixa' },
  { id: 'media', nome: 'Média' },
  { id: 'alta', nome: 'Alta' }
];

export const IDS_PRIORIDADES = PRIORIDADES.map(p => p.id);

export function nomeDaColuna(id) {
  return COLUNAS.find(c => c.id === id)?.nome || id;
}

/**
 * Ordem de um cartão inserido entre dois vizinhos. Como "ordem" é fracionária,
 * a média dos vizinhos basta e só uma linha precisa ser gravada.
 */
export function ordemEntre(anterior, proximo) {
  if (!anterior && !proximo) return 1000;
  if (!anterior) return proximo.ordem - 1;
  if (!proximo) return anterior.ordem + 1;
  return (anterior.ordem + proximo.ordem) / 2;
}

/** Quantos dias de antecedência já contam como "perto do prazo". */
export const DIAS_ALERTA_PRAZO = 2;

/**
 * Classifica o prazo de uma tarefa pendente: 'vencida' | 'proxima' | null.
 * Tarefas concluídas ou sem prazo nunca entram aqui — não há o que avisar.
 */
export function classificarPrazo(tarefa, hojeISO) {
  if (!tarefa.prazo || tarefa.coluna === 'concluido') return null;
  if (tarefa.prazo < hojeISO) return 'vencida';

  const limite = new Date(hojeISO + 'T12:00:00');
  limite.setDate(limite.getDate() + DIAS_ALERTA_PRAZO);
  const limiteISO = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, '0')}-${String(limite.getDate()).padStart(2, '0')}`;

  return tarefa.prazo <= limiteISO ? 'proxima' : null;
}

/** Peso para ordenar: o que precisa de atenção primeiro vem primeiro. */
const PESO_PRAZO = { vencida: 0, proxima: 1 };
const PESO_PRIORIDADE = { alta: 0, media: 1, baixa: 2 };

/** Tarefas pendentes (não concluídas), da mais urgente para a menos. */
export function ordenarPorUrgencia(tarefas, hojeISO) {
  return tarefas
    .filter(t => t.coluna !== 'concluido')
    .map(t => ({ tarefa: t, prazoClasse: classificarPrazo(t, hojeISO) }))
    .sort((x, y) => {
      const p = (PESO_PRAZO[x.prazoClasse] ?? 2) - (PESO_PRAZO[y.prazoClasse] ?? 2);
      if (p !== 0) return p;
      // dentro do mesmo grupo (vencida/próxima/sem alerta), o prazo mais
      // próximo vem primeiro — é a pergunta que esse alerta responde
      if (x.tarefa.prazo && y.tarefa.prazo && x.tarefa.prazo !== y.tarefa.prazo) {
        return x.tarefa.prazo < y.tarefa.prazo ? -1 : 1;
      }
      if (x.tarefa.prazo && !y.tarefa.prazo) return -1;
      if (!x.tarefa.prazo && y.tarefa.prazo) return 1;
      return PESO_PRIORIDADE[x.tarefa.prioridade] - PESO_PRIORIDADE[y.tarefa.prioridade];
    });
}
