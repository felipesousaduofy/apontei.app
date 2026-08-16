'use client';
import { useEffect, useRef } from 'react';

/**
 * Envelope em cima do <dialog> nativo: dá backdrop, Esc e foco de graça.
 * O React não abre o dialog sozinho — showModal() precisa ser chamado no ref.
 */
export default function Dialogo({ aberto, aoFechar, children, largura }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (aberto && !el.open) el.showModal();
    if (!aberto && el.open) el.close();
  }, [aberto]);

  if (!aberto) return null;

  return (
    <dialog
      ref={ref}
      style={largura ? { width: `min(${largura}px, 94vw)` } : undefined}
      onClose={aoFechar}
      onCancel={aoFechar}
    >
      {children}
    </dialog>
  );
}
