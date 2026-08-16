'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseNavegador } from '@/lib/supabase/client';

function agoraHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function DashboardClient({ lancamentosIniciais, dia, email }) {
  const router = useRouter();
  const supabase = supabaseNavegador();
  const [lancamentos, setLancamentos] = useState(lancamentosIniciais);
  const [texto, setTexto] = useState('');
  const [chamado, setChamado] = useState('');
  const [alvoExcluir, setAlvoExcluir] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function adicionar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setSalvando(true);
    const resp = await fetch('/api/lancamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: dia, inicio: agoraHM(), descricao: texto.trim(), chamado: chamado.trim() })
    });
    setSalvando(false);
    if (!resp.ok) return;
    const { lancamento } = await resp.json();
    setLancamentos(atual => [...atual, lancamento].sort((a, b) => a.inicio.localeCompare(b.inicio)));
    setTexto('');
    setChamado('');
  }

  async function confirmarExclusao() {
    const id = alvoExcluir.id;
    setAlvoExcluir(null);
    const resp = await fetch(`/api/lancamentos/${id}`, { method: 'DELETE' });
    if (resp.ok) setLancamentos(atual => atual.filter(l => l.id !== id));
  }

  async function sair() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 60px' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 22 }}>
        <h1 style={{ fontFamily: 'var(--fonte-rotulo)', fontSize: 20, margin: 0 }}>
          apontei<span style={{ color: 'var(--ocre)' }}>.</span>
        </h1>
        <span style={{ fontSize: 13, color: 'var(--tinta-fraca)' }}>{email}</span>
        <button className="btn btn--mini" style={{ marginLeft: 'auto' }} onClick={sair}>Sair</button>
      </header>

      <form onSubmit={adicionar} style={{
        display: 'flex', gap: 10, background: 'var(--ficha)', border: '1px solid var(--linha-forte)',
        borderRadius: 'var(--r)', padding: 10, marginBottom: 22
      }}>
        <input className="campo" placeholder="O que você fez?" value={texto}
          onChange={e => setTexto(e.target.value)} style={{ flex: 2 }} />
        <input className="campo" placeholder="Chamado" value={chamado}
          onChange={e => setChamado(e.target.value)} style={{ flex: 1 }} />
        <button className="btn btn--forte" type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Lançar'}
        </button>
      </form>

      <div className="rotulo" style={{ marginBottom: 8 }}>Hoje · {lancamentos.length} registro(s)</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid var(--linha-forte)', borderRadius: 'var(--r)', background: 'var(--ficha)' }}>
        {lancamentos.length === 0 && (
          <li style={{ padding: 20, textAlign: 'center', color: 'var(--tinta-fantasma)' }}>Nada lançado ainda hoje.</li>
        )}
        {lancamentos.map((l, i) => (
          <li key={l.id} style={{
            display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px',
            borderBottom: i < lancamentos.length - 1 ? '1px solid var(--linha)' : 'none'
          }}>
            <span className="num" style={{ fontSize: 12, color: 'var(--tinta-fraca)', width: 46 }}>{l.inicio}</span>
            <span style={{ flex: 1 }}>
              {l.descricao}
              {l.chamado && <span className="rotulo" style={{ marginLeft: 8 }}>{l.chamado}</span>}
            </span>
            <button className="btn btn--mini btn--perigo" onClick={() => setAlvoExcluir(l)}>Excluir</button>
          </li>
        ))}
      </ul>

      {alvoExcluir && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,31,28,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{ background: 'var(--ficha)', border: '1px solid var(--linha-forte)', borderRadius: 'var(--r)', padding: 20, maxWidth: 380 }}>
            <p style={{ marginTop: 0 }}>Excluir este apontamento? Não dá para desfazer.</p>
            <p style={{ fontSize: 13, color: 'var(--tinta-fraca)' }}>{alvoExcluir.inicio} · {alvoExcluir.descricao}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => setAlvoExcluir(null)}>Cancelar</button>
              <button className="btn btn--perigo" style={{ marginLeft: 'auto' }} onClick={confirmarExclusao}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
