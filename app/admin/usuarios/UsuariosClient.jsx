'use client';
import { useEffect, useRef, useState } from 'react';
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

export default function UsuariosClient({
  usuariosIniciais, equipesIniciais, erroInicial, meuId, email, nome
}) {
  const equipes = equipesIniciais || [];
  const [usuarios, setUsuarios] = useState(usuariosIniciais);
  const [erro, setErro] = useState(erroInicial || '');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(null); // id da linha em operação
  const [alvoExcluir, setAlvoExcluir] = useState(null);
  const [alvoSenhaManual, setAlvoSenhaManual] = useState(null);
  const [campoSenhaManual, setCampoSenhaManual] = useState('');
  const [senhaResultado, setSenhaResultado] = useState(null); // { email, senha }
  const [copiado, setCopiado] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [menu, setMenu] = useState(null); // { id, topo, direita }
  const cronometroAviso = useRef(null);

  const admins = usuarios.filter(u => u.is_admin).length;
  // lido da lista, não guardado no estado do menu: assim os rótulos do menu
  // ("Tornar" vira "Remover") acompanham a alteração sem precisar reabrir
  const doMenu = menu ? usuarios.find(u => u.id === menu.id) : null;
  const menuOcupado = !!doMenu && ocupado === doMenu.id;

  // rolar a página moveria a linha e deixaria o painel — que é fixed — solto no
  // meio da tela; fechar é mais honesto do que ficar recalculando a posição
  useEffect(() => {
    if (!menu) return;
    const fechar = () => setMenu(null);
    const naTecla = e => { if (e.key === 'Escape') setMenu(null); };
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    window.addEventListener('keydown', naTecla);
    return () => {
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
      window.removeEventListener('keydown', naTecla);
    };
  }, [menu]);

  // abre abaixo do botão; nas últimas linhas da tabela não caberia embaixo,
  // então ancora pelo rodapé e sobe. A altura máxima é o espaço que sobrar —
  // o painel rola por dentro em vez de vazar da tela.
  function abrirMenu(e, usuario) {
    const r = e.currentTarget.getBoundingClientRect();
    const direita = window.innerWidth - r.right;
    const abaixo = window.innerHeight - r.bottom - 12;
    const acima = r.top - 12;
    const paraCima = abaixo < 300 && acima > abaixo;

    setMenu(paraCima
      ? { id: usuario.id, base: window.innerHeight - r.top + 6, direita, limite: acima }
      : { id: usuario.id, topo: r.bottom + 6, direita, limite: abaixo });
  }

  function mostrarAviso(texto) {
    setAviso(texto);
    clearTimeout(cronometroAviso.current);
    cronometroAviso.current = setTimeout(() => setAviso(''), 4000);
  }

  // sem símbolos/acentos de propósito: vai ser digitada por outra pessoa,
  // provavelmente lida num WhatsApp ou papel
  function gerarSenhaTemporaria() {
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '').slice(0, 10);
  }

  function abrirDefinirSenha(usuario) {
    setErro('');
    setMenu(null);
    setCampoSenhaManual(gerarSenhaTemporaria());
    setAlvoSenhaManual(usuario);
  }

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

  async function resetarSenha(usuario) {
    setErro('');
    setMenu(null);
    setOcupado(usuario.id);
    const resp = await fetch(`/api/usuarios/${usuario.id}/resetar-senha`, { method: 'POST' });
    const corpo = await resp.json().catch(() => ({}));
    setOcupado(null);

    if (!resp.ok) {
      setErro(corpo.erro || 'Não foi possível enviar o e-mail de redefinição.');
      return;
    }
    mostrarAviso(`E-mail de redefinição de senha enviado para ${corpo.email}.`);
  }

  async function definirSenha(usuario, senha) {
    setErro('');
    setOcupado(usuario.id);
    const resp = await fetch(`/api/usuarios/${usuario.id}/definir-senha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha })
    });
    const corpo = await resp.json().catch(() => ({}));
    setOcupado(null);

    if (!resp.ok) {
      setErro(corpo.erro || 'Não foi possível definir a senha.');
      return;
    }
    setAlvoSenhaManual(null);
    setUsuarios(atual =>
      atual.map(u => (u.id === usuario.id ? { ...u, deve_trocar_senha: true } : u))
    );
    setSenhaResultado({ email: usuario.email, senha });
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
        <span className="email" title={email}>{nome || email}</span>
        <div className="acoes">
          <button
            className="btn btn--mini" onClick={atualizarLista} disabled={atualizando}
            title="Atualizar lista"
          >
            {atualizando ? <span className="giro" /> : <Icone nome="relogio" tamanho={14} />}
            <span className="rotulo-btn">{atualizando ? 'Atualizando…' : 'Atualizar'}</span>
          </button>
          <Link className="btn btn--mini" href="/admin/equipes" title="Equipes">
            <Icone nome="colunas" tamanho={14} /><span className="rotulo-btn">Equipes</span>
          </Link>
          <Link className="btn btn--mini" href="/dashboard" title="Voltar">
            <Icone nome="esquerda" tamanho={14} /><span className="rotulo-btn">Voltar</span>
          </Link>
          <TemaBotao />
        </div>
      </header>

      {erro && <div className="aviso aviso--erro">{erro}</div>}
      {aviso && <div className="aviso aviso--ok">{aviso}</div>}

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
              <th>Equipe</th>
              <th>Situação</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 && (
              <tr>
                <td className="celula-vazia" colSpan={7}>Nenhum usuário cadastrado.</td>
              </tr>
            )}
            {usuarios.map(u => {
              const souEu = u.id === meuId;
              const travado = ocupado === u.id;

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
                    <div className="pilha-crachas">
                      <span className={u.is_admin ? 'cracha cracha--admin' : 'cracha'}>
                        {u.is_admin ? 'Admin' : 'Usuário'}
                      </span>
                      {u.is_supervisor && (
                        <span
                          className="cracha cracha--supervisor"
                          title={u.supervisor_pode_editar
                            ? 'Vê e edita os lançamentos da equipe'
                            : 'Só vê os lançamentos da equipe'}
                        >
                          Supervisor {u.supervisor_pode_editar ? '· edita' : '· vê'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <select
                      className="campo" style={{ minWidth: 140 }}
                      value={u.equipe_id || ''} disabled={travado}
                      onChange={e => alterar(u, { equipe_id: e.target.value || null })}
                    >
                      <option value="">sem equipe</option>
                      {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className={u.ativo ? 'cracha cracha--ativo' : 'cracha cracha--inativo'}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    {u.deve_trocar_senha && <div className="dica">precisa trocar a senha</div>}
                  </td>
                  <td className="celula-acoes">
                    <button
                      className="btn btn--mini btn--icone"
                      disabled={travado}
                      aria-haspopup="menu"
                      aria-expanded={menu?.id === u.id}
                      title={`Ações de ${u.nome || u.email}`}
                      aria-label={`Ações de ${u.nome || u.email}`}
                      onClick={e => (menu?.id === u.id ? setMenu(null) : abrirMenu(e, u))}
                    >
                      {travado ? <span className="giro" /> : <Icone nome="maisOpcoes" tamanho={15} />}
                    </button>
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

      {doMenu && (
        <>
          <div className="menu-fundo" onClick={() => setMenu(null)} />
          <div
            className="menu" role="menu"
            style={{ top: menu.topo, bottom: menu.base, right: menu.direita, maxHeight: menu.limite }}
          >
            <div className="menu__titulo">{doMenu.nome || doMenu.email}</div>

            <button
              className="menu__item" role="menuitem" disabled={menuOcupado}
              onClick={() => alterar(doMenu, { is_supervisor: !doMenu.is_supervisor })}
            >
              <Icone nome="usuarios" tamanho={15} />
              {doMenu.is_supervisor ? 'Deixar de ser supervisor' : 'Tornar supervisor da equipe'}
            </button>
            {doMenu.is_supervisor && (
              <button
                className="menu__item" role="menuitem" disabled={menuOcupado}
                onClick={() => alterar(doMenu, { supervisor_pode_editar: !doMenu.supervisor_pode_editar })}
              >
                <Icone nome={doMenu.supervisor_pode_editar ? 'olho' : 'lapis'} tamanho={15} />
                {doMenu.supervisor_pode_editar
                  ? 'Restringir a só visualizar'
                  : 'Permitir editar lançamentos'}
              </button>
            )}
            {doMenu.is_supervisor && !doMenu.equipe_id && (
              <div className="menu__nota">
                Sem equipe, não supervisiona ninguém — escolha uma equipe na coluna Equipe.
              </div>
            )}

            {doMenu.id !== meuId && (
              <>
                <div className="menu__sep" />
                <button
                  className="menu__item" role="menuitem"
                  onClick={() => alterar(doMenu, { is_admin: !doMenu.is_admin })}
                >
                  <Icone nome="escudo" tamanho={15} />
                  {doMenu.is_admin ? 'Remover permissão de admin' : 'Tornar administrador'}
                </button>

                <div className="menu__sep" />
                <button
                  className="menu__item" role="menuitem" disabled={menuOcupado}
                  onClick={() => resetarSenha(doMenu)}
                >
                  <Icone nome="sino" tamanho={15} />
                  Enviar e-mail de redefinição
                </button>
                <button
                  className="menu__item" role="menuitem" disabled={menuOcupado}
                  onClick={() => abrirDefinirSenha(doMenu)}
                >
                  <Icone nome="chave" tamanho={15} />
                  Definir senha manualmente
                </button>

                <div className="menu__sep" />
                <button
                  className="menu__item" role="menuitem"
                  onClick={() => alterar(doMenu, { ativo: !doMenu.ativo })}
                >
                  <Icone nome={doMenu.ativo ? 'bloquear' : 'seleciona'} tamanho={15} />
                  {doMenu.ativo ? 'Desativar conta' : 'Reativar conta'}
                </button>
                <button
                  className="menu__item menu__item--perigo" role="menuitem"
                  disabled={menuOcupado || doMenu.total_lancamentos > 0}
                  title={doMenu.total_lancamentos > 0
                    ? 'Só dá para excluir quem não tem nenhum lançamento. Desative a conta.'
                    : undefined}
                  onClick={() => { setMenu(null); setAlvoExcluir(doMenu); }}
                >
                  <Icone nome="lixeira" tamanho={15} />
                  Excluir conta
                </button>
                {doMenu.total_lancamentos > 0 && (
                  <div className="menu__nota">
                    Tem {doMenu.total_lancamentos} lançamento(s): desative em vez de excluir.
                  </div>
                )}
              </>
            )}

            {doMenu.id === meuId && (
              <div className="menu__nota">
                Sua própria conta: permissão de admin e situação não podem ser alteradas por aqui.
              </div>
            )}
          </div>
        </>
      )}

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
      {alvoSenhaManual && (
        <div className="modal-fundo" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Definir senha manualmente</h2>
            <p style={{ marginTop: 0 }}>
              Use quando o e-mail de redefinição não estiver saindo. Defina uma senha
              temporária para <strong>{alvoSenhaManual.email}</strong> e repasse para a
              pessoa por fora do sistema (WhatsApp, presencial etc). Ela vai ser
              obrigada a trocar por uma senha só dela no primeiro login.
            </p>
            <div className="campo-grupo">
              <label className="rotulo" htmlFor="senha-manual">Senha temporária</label>
              <input
                className="campo" id="senha-manual" type="text" minLength={6} autoFocus
                value={campoSenhaManual} onChange={e => setCampoSenhaManual(e.target.value)}
              />
            </div>
            <div className="linha-botoes">
              <button
                type="button" className="btn btn--mini"
                onClick={() => setCampoSenhaManual(gerarSenhaTemporaria())}
              >
                Gerar outra
              </button>
            </div>
            <div className="linha-botoes" style={{ marginTop: 14 }}>
              <button className="btn" onClick={() => setAlvoSenhaManual(null)}>Cancelar</button>
              <button
                className="btn btn--forte"
                style={{ marginLeft: 'auto' }}
                disabled={campoSenhaManual.length < 6}
                onClick={() => definirSenha(alvoSenhaManual, campoSenhaManual)}
              >
                Definir senha
              </button>
            </div>
          </div>
        </div>
      )}

      {senhaResultado && (
        <div className="modal-fundo" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Senha definida</h2>
            <p style={{ marginTop: 0 }}>
              Repasse esta senha para <strong>{senhaResultado.email}</strong> por fora do
              sistema. Ela não vai aparecer de novo depois de fechar esta janela.
            </p>
            <div className="campo-grupo">
              <input
                className="campo num" readOnly value={senhaResultado.senha}
                onFocus={e => e.target.select()}
              />
            </div>
            <div className="linha-botoes">
              <button
                type="button" className="btn btn--mini"
                onClick={() => {
                  navigator.clipboard.writeText(senhaResultado.senha).then(() => {
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 2000);
                  });
                }}
              >
                {copiado ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                className="btn btn--forte"
                style={{ marginLeft: 'auto' }}
                onClick={() => setSenhaResultado(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
