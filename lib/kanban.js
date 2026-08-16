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
