/**
 * Set de ícones do apontei.
 *
 * São desenhados aqui em vez de virem de um pacote: são poucos, o traço
 * precisa acompanhar o peso da Archivo Narrow dos rótulos, e assim o app
 * continua sem dependência de front-end.
 *
 * Todos usam `currentColor`, então herdam a cor do botão em que estão.
 * Quando o ícone acompanha um texto visível ele é decorativo e sai da árvore
 * de acessibilidade (`aria-hidden`); quando é a única coisa dentro do
 * controle, quem chama passa `titulo` — ou põe `aria-label` no botão.
 */

const DESENHOS = {
  // --- captura -----------------------------------------------------------
  play: <path d="M8 5.2v13.6a.8.8 0 0 0 1.22.68l11-6.8a.8.8 0 0 0 0-1.36l-11-6.8A.8.8 0 0 0 8 5.2Z" fill="currentColor" stroke="none" />,
  parar: <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />,
  mais: <path d="M12 5v14M5 12h14" />,

  // --- navegação ---------------------------------------------------------
  esquerda: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  direita: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  calendario: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  colunas: (
    <>
      <rect x="3.5" y="4.5" width="4.5" height="15" rx="1.5" />
      <rect x="9.75" y="4.5" width="4.5" height="10.5" rx="1.5" />
      <rect x="16" y="4.5" width="4.5" height="7" rx="1.5" />
    </>
  ),
  usuarios: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.8 19.5c0-3.2 2.8-5.4 6.2-5.4s6.2 2.2 6.2 5.4" />
      <path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.4M17.4 14.6c2.3.7 3.8 2.5 3.8 4.9" />
    </>
  ),
  sair: (
    <>
      <path d="M14.5 3.5h3.5a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-3.5" />
      <path d="M13 12H3.5M7 8.5 3.5 12 7 15.5" />
    </>
  ),

  // --- ações -------------------------------------------------------------
  ajustes: (
    <>
      <path d="M3.5 7h8M15.5 7h5M3.5 12h4M11.5 12h9M3.5 17h9M16.5 17h4" />
      <circle cx="13.5" cy="7" r="2.1" />
      <circle cx="9.5" cy="12" r="2.1" />
      <circle cx="14.5" cy="17" r="2.1" />
    </>
  ),
  copiar: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
      <path d="M15.5 5.5v-.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h.5" />
    </>
  ),
  lixeira: (
    <>
      <path d="M3.5 6.5h17M9.5 6.5V4.8a1.8 1.8 0 0 1 1.8-1.8h1.4a1.8 1.8 0 0 1 1.8 1.8v1.7" />
      <path d="M5.8 6.5 6.9 19a2 2 0 0 0 2 1.8h6.2a2 2 0 0 0 2-1.8l1.1-12.5" />
      <path d="M10 10.5v6M14 10.5v6" />
    </>
  ),
  lapis: (
    <>
      <path d="M4 20.5 4.9 16 16.4 4.5a2.2 2.2 0 0 1 3.1 3.1L8 19.1 4 20.5Z" />
      <path d="M14.8 6.1 17.9 9.2" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 6.8V12l3.4 2.1" />
    </>
  ),
  sino: (
    <>
      <path d="M12 3.2c-3.3 0-5.6 2.5-5.6 6v3.1c0 .9-.3 1.7-.9 2.5l-1 1.3c-.5.6-.1 1.4.6 1.4h13.8c.7 0 1.1-.8.6-1.4l-1-1.3c-.6-.8-.9-1.6-.9-2.5V9.2c0-3.5-2.3-6-5.6-6Z" />
      <path d="M9.6 20a2.5 2.5 0 0 0 4.8 0" />
    </>
  ),
  fechar: <path d="M6 6l12 12M18 6 6 18" />,
  seleciona: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M7.8 12.2 10.7 15l5.5-5.7" />
    </>
  ),
  limpaSelecao: <rect x="3.5" y="3.5" width="17" height="17" rx="3" />,

  // --- estados vazios ----------------------------------------------------
  folha: (
    <>
      <path d="M13.5 3H7a2.5 2.5 0 0 0-2.5 2.5v13A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5V9" />
      <path d="M13.5 3 19.5 9h-4.5a1.5 1.5 0 0 1-1.5-1.5V3Z" />
      <path d="M8.5 13h7M8.5 16.5h4.5" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13.5 6 5.4A2.2 2.2 0 0 1 8.1 4h7.8a2.2 2.2 0 0 1 2.1 1.4l2.5 8.1" />
      <path d="M3.5 13.5h4.2l1.2 2.6h6.2l1.2-2.6h4.2v4.3A2.2 2.2 0 0 1 18.3 20H5.7a2.2 2.2 0 0 1-2.2-2.2v-4.3Z" />
    </>
  ),

  // --- tema --------------------------------------------------------------
  sol: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.4v2.2M12 19.4v2.2M4.2 12H2M22 12h-2.2M6.5 6.5 4.9 4.9M19.1 19.1l-1.6-1.6M17.5 6.5l1.6-1.6M4.9 19.1l1.6-1.6" />
    </>
  ),
  lua: <path d="M20.4 14.4A9 9 0 0 1 9.6 3.6a9 9 0 1 0 10.8 10.8Z" />,
  sistema: (
    <>
      <rect x="2.8" y="4" width="18.4" height="13" rx="2.2" />
      <path d="M8.5 20.5h7M12 17v3.5" />
    </>
  )
};

export default function Icone({ nome, tamanho = 16, titulo, className = '' }) {
  const desenho = DESENHOS[nome];
  if (!desenho) return null;

  return (
    <svg
      className={('icone ' + className).trim()}
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={titulo ? 'img' : undefined}
      aria-label={titulo || undefined}
      aria-hidden={titulo ? undefined : 'true'}
      focusable="false"
    >
      {titulo && <title>{titulo}</title>}
      {desenho}
    </svg>
  );
}
