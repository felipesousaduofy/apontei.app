'use client';
import { useState } from 'react';
import Link from 'next/link';
import Marca from '../../Marca';
import Icone from '../../Icone';
import TemaBotao from '../../TemaBotao';

function dataCurta(iso) {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export default function EquipesClient({ equipesIniciais, erroInicial, email, nome }) {
  const [equipes, setEquipes] = useState(equipesIniciais);
  const [erro, setErro] = useState(erroInicial || '');
  const [nomeNovo, setNomeNovo] = useState('');
  const [criando, setCriando] = useState(false);
  const [ocupado, setOcupado] = useState(null);
  const [alvoExcluir, setAlvoExcluir] = useState(null);

  async function criarEquipe(e) {
    e.preventDefault();
    const nome = nomeNovo.trim();
    if (!nome) return;
    setErro('');
    setCriando(true);
    const resp = await fetch('/api/equipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    });
    const corpo = await resp.json().catch(() => ({}));
    setCriando(false);
    if (!resp.ok) { setErro(corpo.erro || 'Não foi possível criar a equipe.'); return; }
    setEquipes(atual => [...atual, corpo.equipe].sort((a, b) => a.nome.localeCompare(b.nome)));
    setNomeNovo('');
  }

  async function renomear(equipe, nome) {
    if (!nome.trim() || nome.trim() === equipe.nome) return;
    setErro('');
    setOcupado(equipe.id);
    const resp = await fetch(`/api/equipes/${equipe.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nome.trim() })
    });
    const corpo = await resp.json().catch(() => ({}));
    setOcupado(null);
    if (!resp.ok) { setErro(corpo.erro || 'Não foi possível renomear a equipe.'); return; }
    setEquipes(atual =>
      atual.map(eq => (eq.id === equipe.id ? corpo.equipe : eq)).sort((a, b) => a.nome.localeCompare(b.nome))
    );
  }

  async function confirmarExclusao() {
    const alvo = alvoExcluir;
    setAlvoExcluir(null);
    setErro('');
    setOcupado(alvo.id);
    const resp = await fetch(`/api/equipes/${alvo.id}`, { method: 'DELETE' });
    const corpo = await resp.json().catch(() => ({}));
    setOcupado(null);
    if (!resp.ok) { setErro(corpo.erro || 'Não foi possível excluir a equipe.'); return; }
    setEquipes(atual => atual.filter(eq => eq.id !== alvo.id));
  }

  return (
    <main className="pagina">
      <header className="topo">
        <Marca altura={34} />
        <span className="rotulo">Equipes</span>
        <span className="email" title={email}>{nome || email}</span>
        <div className="acoes">
          <Link className="btn btn--mini" href="/admin/usuarios" title="Usuários">
            <Icone nome="usuarios" tamanho={14} /><span className="rotulo-btn">Usuários</span>
          </Link>
          <Link className="btn btn--mini" href="/dashboard" title="Voltar">
            <Icone nome="esquerda" tamanho={14} /><span className="rotulo-btn">Voltar</span>
          </Link>
          <TemaBotao />
        </div>
      </header>

      {erro && <div className="aviso aviso--erro">{erro}</div>}

      <form onSubmit={criarEquipe} className="linha-acoes" style={{ marginBottom: 16 }}>
        <input
          className="campo" placeholder="Nome da nova equipe" value={nomeNovo}
          onChange={e => setNomeNovo(e.target.value)} style={{ maxWidth: 280 }}
        />
        <button className="btn btn--forte" type="submit" disabled={criando || !nomeNovo.trim()}>
          {criando && <span className="giro" />}
          <Icone nome="mais" tamanho={14} />Criar equipe
        </button>
      </form>

      <div className="quadro rolagem">
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Criada em</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {equipes.length === 0 && (
              <tr>
                <td className="celula-vazia" colSpan={3}>Nenhuma equipe cadastrada.</td>
              </tr>
            )}
            {equipes.map(eq => {
              const travado = ocupado === eq.id;
              return (
                <tr key={eq.id}>
                  <td>
                    <input
                      key={`nome-${eq.id}`}
                      className="campo" defaultValue={eq.nome} disabled={travado}
                      onBlur={e => renomear(eq, e.target.value)}
                    />
                  </td>
                  <td className="num">{dataCurta(eq.criado_em)}</td>
                  <td className="celula-acoes">
                    <div className="linha-acoes">
                      <button
                        className="btn btn--mini btn--perigo"
                        disabled={travado}
                        onClick={() => setAlvoExcluir(eq)}
                      >
                        <Icone nome="lixeira" tamanho={13} />Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="dica" style={{ marginTop: 12 }}>
        Excluir uma equipe não apaga ninguém — os membros dela só ficam sem equipe,
        e quem era supervisor perde o acesso à tela de equipe até ser colocado em outra.
      </p>

      {alvoExcluir && (
        <div className="modal-fundo" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Excluir equipe</h2>
            <p style={{ marginTop: 0 }}>
              Excluir a equipe <strong>{alvoExcluir.nome}</strong>? Os membros dela ficam sem equipe.
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
