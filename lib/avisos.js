/**
 * Vocabulário dos avisos — compartilhado entre as telas e as rotas de API.
 *
 * A cor de um aviso vem de QUEM escreveu, não do assunto: com admin e
 * supervisor podendo fixar faixa ao mesmo tempo, a primeira pergunta que a
 * pessoa faz ao ver a faixa é "isso é do sistema ou é da minha equipe?".
 * A única exceção é manutenção — aí o assunto é urgente o bastante para
 * subir de tom sozinho.
 */

export const TIPOS = ['informativo', 'manutencao', 'melhoria'];

export const ROTULO_TIPO = {
  informativo: 'Informativo',
  manutencao: 'Manutenção',
  melhoria: 'Novidade'
};

export const ICONE_TIPO = {
  informativo: 'sino',
  manutencao: 'ajustes',
  melhoria: 'folha'
};

/** Tipos que só o admin pode usar: falam pelo sistema, não por uma equipe. */
export const TIPOS_DO_ADMIN = ['manutencao', 'melhoria'];

export const DESTINOS = ['todos', 'equipe', 'usuario'];

/**
 * Quanto o aviso interrompe. É um eixo só, com três degraus, em vez de duas
 * caixinhas independentes: "fixar" e "abrir na tela" ao mesmo tempo não
 * significaria nada além do degrau de cima.
 */
export const EXIBICOES = ['sino', 'faixa', 'tela'];

export const ROTULO_EXIBICAO = {
  sino: 'Só no sino',
  faixa: 'Faixa no topo da tela',
  tela: 'Abrir na frente da pessoa'
};

export const DETALHE_EXIBICAO = {
  sino: 'Entra na lista do sino e soma no contador. É o normal.',
  faixa: 'Além do sino, vira uma faixa acima de todas as telas até a pessoa clicar em “Entendi”.',
  tela: 'Aparece sozinho na frente de quem estiver com o apontei aberto, assim que for publicado.'
};

/**
 * 'sistema' (roxo) · 'manutencao' (vermelho) · 'equipe' (ocre).
 * Os três acentos que a folha de estilo já tem — nenhuma cor nova entrou
 * no sistema por causa dos avisos.
 */
export function tomDoAviso(aviso) {
  if (aviso.autor_papel === 'supervisor') return 'equipe';
  return aviso.tipo === 'manutencao' ? 'manutencao' : 'sistema';
}

export function rotuloDaOrigem(aviso) {
  if (aviso.autor_papel === 'supervisor') return 'Sua equipe';
  return aviso.tipo === 'manutencao' ? 'Manutenção' : 'Sistema';
}

/**
 * Ordem de exibição, para quando cai mais de um aviso na tela ao mesmo tempo:
 * manutenção primeiro, depois o resto do sistema, por último os da equipe —
 * e, dentro de cada faixa, o mais recente em cima.
 */
const PESO = { manutencao: 0, sistema: 1, equipe: 2 };

export function ordenarAvisos(lista) {
  return [...lista].sort((a, b) => {
    const peso = PESO[tomDoAviso(a)] - PESO[tomDoAviso(b)];
    if (peso !== 0) return peso;
    return new Date(b.publicar_em) - new Date(a.publicar_em);
  });
}

/** "hoje às 14:30", "ontem às 9:05", "12/03 às 8:00" — sem dependência externa. */
export function quandoCurto(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const hoje = new Date();
  const soData = x => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const dias = Math.round((soData(hoje) - soData(d)) / 86400000);
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (dias === 0) return `hoje às ${hora}`;
  if (dias === 1) return `ontem às ${hora}`;
  if (dias === -1) return `amanhã às ${hora}`;

  const dm = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${dm} às ${hora}`;
}

/** Um aviso está valendo agora? Mesma conta que a policy faz no banco. */
export function vigente(aviso, agora = new Date()) {
  if (new Date(aviso.publicar_em) > agora) return false;
  if (aviso.expira_em && new Date(aviso.expira_em) <= agora) return false;
  return true;
}

/**
 * Normaliza e valida o que veio do formulário. Devolve `{ erro }` ou `{ dados }`.
 * NÃO decide destino: quem pode falar com quem é decisão do servidor, em
 * /api/avisos — aqui só se checa forma.
 */
export function validarAviso(corpo) {
  const titulo = typeof corpo.titulo === 'string' ? corpo.titulo.trim() : '';
  if (!titulo) return { erro: 'Escreva um título para o aviso.' };
  if (titulo.length > 120) return { erro: 'O título passa de 120 caracteres.' };

  const texto = typeof corpo.corpo === 'string' ? corpo.corpo.trim() : '';
  if (texto.length > 4000) return { erro: 'O texto do aviso passa de 4000 caracteres.' };

  const tipo = TIPOS.includes(corpo.tipo) ? corpo.tipo : 'informativo';

  const publicar = corpo.publicar_em ? new Date(corpo.publicar_em) : new Date();
  if (Number.isNaN(publicar.getTime())) return { erro: 'Data de publicação inválida.' };

  let expira = null;
  if (corpo.expira_em) {
    expira = new Date(corpo.expira_em);
    if (Number.isNaN(expira.getTime())) return { erro: 'Data de expiração inválida.' };
    if (expira <= publicar) return { erro: 'A expiração tem que ser depois da publicação.' };
  }

  return {
    dados: {
      titulo,
      corpo: texto,
      tipo,
      exibicao: EXIBICOES.includes(corpo.exibicao) ? corpo.exibicao : 'sino',
      publicar_em: publicar.toISOString(),
      expira_em: expira ? expira.toISOString() : null
    }
  };
}
