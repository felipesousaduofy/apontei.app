import './globals.css';
import Progresso from './Progresso';

export const metadata = {
  title: 'apontei.',
  description: 'Diário de apontamento da equipe'
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#E6EAE1' },
    { media: '(prefers-color-scheme: dark)', color: '#141817' }
  ]
};

// Roda antes da primeira pintura: sem isso a tela pisca clara antes do React
// montar e aplicar o tema escuro salvo.
const TEMA_INICIAL = `
try {
  var t = localStorage.getItem('apontei-tema');
  if (t === 'claro' || t === 'escuro') document.documentElement.dataset.tema = t;
} catch (e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_INICIAL }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Public+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Progresso />
        {/* destino das faixas de aviso fixado — fica aqui, e não dentro de
            cada tela, para a faixa nascer no topo da página em qualquer uma
            delas (ver app/Avisos.jsx) */}
        <div id="tarjas-avisos" />
        {children}
      </body>
    </html>
  );
}
