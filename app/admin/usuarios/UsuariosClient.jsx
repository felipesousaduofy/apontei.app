'use client';
import { useState } from 'react';
import Link from 'next/link';
import Marca from '../../Marca';
import Icone from '../../Icone';
import TemaBotao from '../../TemaBotao';

// formata direto da string ISO para não depender do fuso do navegador
// (evitaria bater com o que o servidor renderizou)
function dataCurta(iso) {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export default function UsuariosClient({ usuariosIniciais, erroInicial, meuId, email }) {
  const [usuarios, setUsuarios] = useState(usuariosIniciais);
  const [erro, setErro] = useState(erroInicial || '');
  const [ocupado, setOcupado] = useState(null); // id da linha em operação
  const [alvoExcluir, setAlvoExcluir] = useState(null);
  const [atualizando, setAtualizando] = useState(false);

  const admins = usuarios.filter(u => u.is_admin).length;

  async function alterar(usuario, mudancas) {
    setErro('');
    setOcupado(usuario.id);
    const resp = await fetch(`/api/usuarios/${usuario.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mudancas)
    });
    const corpo = await resp.json().catch(() => ({}));
    setOcupado(null);

    if (!resp.ok) {
      setErro(corpo.erro || 'Não foi possível salvar a alteração.');
      return;
    }
    setUsuarios(atual =>
      atual.map(u => (u.id === usuario.id ? { ...u, ...corpo.usuario } : u))
    );
  }

  async function confirmarExclusao() {
    const alvo = alvoExcluir;
    setAlvoExcluir(null);
    setErro('');
    setOcupado(alvo.id);
    const resp = await fetch(`/api/usuarios/${alvo.id}`, { method: 'DELETE' });
    const corpo = await resp.json().catch(() => ({}));
    setOcupado(null);

    if (!resp.ok) {
      setErro(corpo.erro || 'Não foi possível excluir o usuário.');
      if (typeof corpo.total_lancamentos === 'number') {
        setUsuarios(atual =>
          atual.map(u =>
            u.id === alvo.id ? { ...u, total_lancamentos: corpo.total_lancamentos } : u
          )
        );
      }
      return;
    }
    setUsuarios(atual => atual.filter(u => u.id !== alvo.id));
  }

  async function atualizarLista() {
    setErro('');
    setAtualizando(true);
    const resp = await fetch('/api/usuarios');
    const corpo = await resp.json().catch(() => ({}));
    setAtualizando(false);
    if (!resp.ok) {
      setErro(corpo.erro || 'Não foi possível recarregar a lista.');
      return;
    }
    setUsuarios(corpo.usuarios || []);
  }

  return (
    <main className="pagina">
      <header className="topo">
        <Marca altura={34} />
        <span className="rotulo">Usuários</span>
        <span className="email">{email}</span>
        <div className="acoes">
          <button className="btn btn--mini" onClick={atualizarLista} disabled={atualizando}>
            <Icone nome="relogio" tamanho={14} />{atualizando ? 'Atualizando…' : 'Atualizar'}
          </button>
          <Link className="btn btn--mini" href="/dashboard">
            <Icone nome="esquerda" tamanho={14} />Voltar
          </Link>
          <TemaBotao />
        </div>
      </header>

      {erro && <div className="aviso aviso--erro">{erro}</div>}

      <div className="rotulo" style={{ marginBottom: 8 }}>
        {usuarios.length} conta(s) · {admins} administrador(es)
      </div>

      <div className="quadro rolagem">
        <table className="tabela">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Cadastro</th>
              <th style={{ textAlign: 'right' }}>Lançamentos</th>
              <th>Permissão</th>
              <th>Situação</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 && (
              <tr>
                <td className="vazio" colSpan={6}>Nenhum usuário cadastrado.</td>
              </tr>
            )}
            {usuarios.map(u => {
              const souEu = u.id === meuId;
              const travado = ocupado === u.id;
              const temLancamentos = u.total_lancamentos > 0;

              return (
                <tr key={u.id} className={souEu ? 'eu' : undefined}>
                  <td>
                    <div>{u.nome || u.email}</div>
                    {u.nome && <div className="dica">{u.email}</div>}
                    {souEu && <div className="dica">você</div>}
                  </td>
                  <td className="num">{dataCurta(u.criado_em)}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{u.total_lancamentos}</td>
                  <td>
                    <span className={u.is_admin ? 'cracha cracha--admin' : 'cracha'}>
                      {u.is_admin ? 'Admin' : 'Usuário'}
                    </span>
                  </td>
                  <td>
                    <span className={u.ativo ? 'cracha cracha--ativo' : 'cracha cracha--inativo'}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="celula-acoes">
                    {souEu ? (
                      <span className="dica">sem ações na própria conta</span>
                    ) : (
                      <div className="linha-acoes">
                        <button
                          className="btn btn--mini"
                          disabled={travado}
                          onClick={() => alterar(u, { is_admin: !u.is_admin })}
                        >
                          {u.is_admin ? 'Remover admin' : 'Tornar admin'}
                        </button>
                        <button
                          className="btn btn--mini"
                          disabled={travado}
                          onClick={() => alterar(u, { ativo: !u.ativo })}
                        >
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          className="btn btn--mini btn--perigo"
                          disabled={travado || temLancamentos}
                          title={
                            temLancamentos
                              ? 'Só dá para excluir quem não tem nenhum lançamento. Desative a conta.'
                              : 'Excluir definitivamente'
                          }
                          onClick={() => setAlvoExcluir(u)}
                        >
                          <Icone nome="lixeira" tamanho={13} />Excluir
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="dica" style={{ marginTop: 12 }}>
        Desativar bloqueia o login e derruba a pessoa da tela, mas mantém os
        lançamentos dela. Excluir só é permitido para contas sem nenhum
        lançamento, e apaga a conta de vez.
      </p>

      {alvoExcluir && (
        <div className="modal-fundo" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Excluir usuário</h2>
            <p style={{ marginTop: 0 }}>
              Excluir a conta de <strong>{alvoExcluir.email}</strong>? Não dá para desfazer.
            </p>
            <p className="dica">
              A conta não tem lançamentos, então nada de histórico será perdido.
            </p>
            <div className="linha-botoes">
              <button className="btn" onClick={() => setAlvoExcluir(null)}>Cancelar</button>
              <button
                className="btn btn--perigo"
                style={{ marginLeft: 'auto' }}
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
