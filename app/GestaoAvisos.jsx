'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Marca from './Marca';
import Icone from './Icone';
import TemaBotao from './TemaBotao';
import Avisos from './Avisos';
import Dialogo from './dashboard/Dialogo';
import {
  TIPOS, TIPOS_DO_ADMIN, ROTULO_TIPO, ICONE_TIPO,
  EXIBICOES, ROTULO_EXIBICAO, DETALHE_EXIBICAO,
  tomDoAviso, rotuloDaOrigem, quandoCurto, vigente
} from '@/lib/avisos';

/** ISO -> valor de <input type="datetime-local">, no fuso de quem está vendo. */
function paraInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function daquiADias(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return paraInput(d.toISOString());
}

const VAZIO = {
  titulo: '', corpo: '', tipo: 'informativo',
  destino: '', destino_id: '', exibicao: 'sino',
  publicar_em: '', expira_em: ''
};

/**
 * Tela de gestão de avisos, compartilhada por /admin/avisos e /equipe/avisos.
 *
 * O que muda entre as duas é só o `escopo` que a API devolve: o admin escolhe
 * qualquer destino e qualquer tipo; o supervisor fala com a própria equipe (ou
 * com alguém dela) e sempre em tom informativo. As duas telas são a mesma para
 * o formulário não sair do ar em uma e ficar desatualizado na outra.
 */
export default function GestaoAvisos({ email, nome, voltarPara }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [form, setForm] = useState(VAZIO);
  const [editando, setEditando] = useState(null); // id do aviso em edição
  const [salvando, setSalvando] = useState(false);
  const [alvoExcluir, setAlvoExcluir] = useState(null);
  const cronometro = useRef(null);

  const escopo = dados?.escopo;
  const ehAdmin = escopo === 'todos';

  useEffect(() => {
    carregar();
    return () => clearTimeout(cronometro.current);
  }, []);

  async function carregar() {
    const resp = await fetch('/api/avisos/gerenciados');
    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok) { setErro(corpo.erro || 'Não foi possível carregar os avisos.'); return; }
    setDados(corpo);
    setForm(f => ({
      ...f,
      destino: f.destino || (corpo.escopo === 'todos' ? 'todos' : 'equipe'),
      // aviso de equipe nasce com prazo de validade: sem isso o quadro de
      // recados vira mural de papel amarelado e ninguém mais lê nenhum
      expira_em: f.expira_em || (corpo.escopo === 'todos' ? '' : daquiADias(15))
    }));
  }

  function avisar(texto) {
    setOk(texto);
    clearTimeout(cronometro.current);
    cronometro.current = setTimeout(() => setOk(''), 4000);
  }

  function mudar(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  function limpar() {
    setEditando(null);
    setForm({
      ...VAZIO,
      destino: ehAdmin ? 'todos' : 'equipe',
      expira_em: ehAdmin ? '' : daquiADias(15)
    });
  }

  function editar(aviso) {
    setEditando(aviso.id);
    setForm({
      titulo: aviso.titulo,
      corpo: aviso.corpo,
      tipo: aviso.tipo,
      destino: aviso.destino,
      destino_id: aviso.destino_id || '',
      exibicao: aviso.exibicao,
      publicar_em: paraInput(aviso.publicar_em),
      expira_em: paraInput(aviso.expira_em)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);

    const corpo = {
      titulo: form.titulo,
      corpo: form.corpo,
      tipo: form.tipo,
      exibicao: form.exibicao,
      publicar_em: form.publicar_em || undefined,
      expira_em: form.expira_em || null,
      destino: form.destino,
      destino_id: form.destino_id || null
    };

    const resp = await fetch(editando ? `/api/avisos/${editando}` : '/api/avisos', {
      method: editando ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
    });
    const resultado = await resp.json().catch(() => ({}));
    setSalvando(false);

    if (!resp.ok) { setErro(resultado.erro || 'Não foi possível publicar o aviso.'); return; }

    avisar(editando ? 'Aviso atualizado.' : 'Aviso publicado.');
    limpar();
    carregar();
  }

  async function confirmarExclusao() {
    const alvo = alvoExcluir;
    setAlvoExcluir(null);
    setErro('');

    const resp = await fetch(`/api/avisos/${alvo.id}`, { method: 'DELETE' });
    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok) { setErro(corpo.erro || 'Não foi possível excluir o aviso.'); return; }

    if (editando === alvo.id) limpar();
    avisar('Aviso removido.');
    carregar();
  }

  const tiposDisponiveis = useMemo(
    () => (ehAdmin ? TIPOS : TIPOS.filter(t => !TIPOS_DO_ADMIN.includes(t))),
    [ehAdmin]
  );

  const pessoas = dados?.opcoes?.pessoas || [];
  const equipes = dados?.opcoes?.equipes || [];
  const lista = dados?.avisos || [];

  return (
    <main className="pagina">
      <header className="topo">
        <Marca altura={34} />
        <span className="rotulo">Avisos</span>
        <span className="email" title={email}>{nome || email}</span>
        <div className="acoes">
          <Link className="btn btn--mini" href={voltarPara} title="Voltar">
            <Icone nome="esquerda" tamanho={14} /><span className="rotulo-btn">Voltar</span>
          </Link>
          <Avisos mini />
          <TemaBotao />
        </div>
      </header>

      {erro && <div className="aviso aviso--erro">{erro}</div>}
      {ok && <div className="aviso aviso--ok">{ok}</div>}

      {!dados ? (
        <p className="dica">Carregando avisos…</p>
      ) : (
        <>
          <form className="quadro form-aviso" onSubmit={enviar}>
            <h2 className="form-aviso__titulo">
              {editando ? 'Editando um aviso' : 'Publicar um aviso'}
            </h2>

            <div className="campo-grupo">
              <label className="rotulo" htmlFor="titulo">Título</label>
              <input
                id="titulo" className="campo" maxLength={120} required
                placeholder={ehAdmin ? 'Manutenção no sábado, das 8h às 12h' : 'Reunião de equipe na quinta'}
                value={form.titulo} onChange={e => mudar('titulo', e.target.value)}
              />
            </div>

            <div className="campo-grupo">
              <label className="rotulo" htmlFor="corpo">Texto</label>
              <textarea
                id="corpo" className="campo" rows={4} maxLength={4000}
                placeholder="O que a pessoa precisa saber."
                value={form.corpo} onChange={e => mudar('corpo', e.target.value)}
              />
            </div>

            <div className="form-aviso__linha">
              <div className="campo-grupo">
                <label className="rotulo" htmlFor="tipo">Tipo</label>
                <select
                  id="tipo" className="campo" value={form.tipo}
                  onChange={e => mudar('tipo', e.target.value)}
                >
                  {tiposDisponiveis.map(t => (
                    <option key={t} value={t}>{ROTULO_TIPO[t]}</option>
                  ))}
                </select>
              </div>

              <div className="campo-grupo">
                <label className="rotulo" htmlFor="destino">Para quem</label>
                <select
                  id="destino" className="campo" value={form.destino} disabled={!!editando}
                  onChange={e => { mudar('destino', e.target.value); mudar('destino_id', ''); }}
                >
                  {ehAdmin && <option value="todos">Todo mundo</option>}
                  <option value="equipe">
                    {ehAdmin ? 'Uma equipe' : `Minha equipe (${dados.minhaEquipe?.nome})`}
                  </option>
                  <option value="usuario">{ehAdmin ? 'Uma pessoa' : 'Uma pessoa da equipe'}</option>
                </select>
              </div>

              {form.destino === 'equipe' && ehAdmin && (
                <div className="campo-grupo">
                  <label className="rotulo" htmlFor="alvo-equipe">Equipe</label>
                  <select
                    id="alvo-equipe" className="campo" required disabled={!!editando}
                    value={form.destino_id} onChange={e => mudar('destino_id', e.target.value)}
                  >
                    <option value="">escolha…</option>
                    {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
                  </select>
                </div>
              )}

              {form.destino === 'usuario' && (
                <div className="campo-grupo">
                  <label className="rotulo" htmlFor="alvo-pessoa">Pessoa</label>
                  <select
                    id="alvo-pessoa" className="campo" required disabled={!!editando}
                    value={form.destino_id} onChange={e => mudar('destino_id', e.target.value)}
                  >
                    <option value="">escolha…</option>
                    {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="form-aviso__linha">
              <div className="campo-grupo">
                <label className="rotulo" htmlFor="publicar">Publicar em</label>
                <input
                  id="publicar" type="datetime-local" className="campo"
                  value={form.publicar_em} onChange={e => mudar('publicar_em', e.target.value)}
                />
              </div>
              <div className="campo-grupo">
                <label className="rotulo" htmlFor="expira">Sai do ar em</label>
                <input
                  id="expira" type="datetime-local" className="campo"
                  value={form.expira_em} onChange={e => mudar('expira_em', e.target.value)}
                />
              </div>
            </div>

            <fieldset className="grupo-exibicao">
              <legend className="rotulo">Como mostrar</legend>
              {EXIBICOES.map(nivel => (
                <label key={nivel} className="linha-marcar">
                  <input
                    type="radio" name="exibicao" value={nivel}
                    checked={form.exibicao === nivel}
                    onChange={() => mudar('exibicao', nivel)}
                  />
                  <span>
                    {ROTULO_EXIBICAO[nivel]}
                    <span className="dica" style={{ display: 'block' }}>
                      {DETALHE_EXIBICAO[nivel]}
                    </span>
                  </span>
                </label>
              ))}
              <p className="dica">
                Faixa e tela chegam sem recarregar a página, na hora em que você
                publica.{' '}
                {ehAdmin
                  ? 'O seu aviso aparece em roxo — ou vermelho, se for manutenção.'
                  : 'O aviso da equipe aparece em ocre, para não se confundir com um do sistema.'}
              </p>
            </fieldset>

            {/* só a equipe do supervisor dispensa escolha: ela vem do perfil dele */}
            {!form.destino_id && !editando
              && (form.destino === 'usuario' || (form.destino === 'equipe' && ehAdmin)) && (
              <p className="dica">Escolha para quem vai o aviso antes de publicar.</p>
            )}

            <div className="linha-acoes">
              <button className="btn btn--forte" type="submit" disabled={salvando}>
                {salvando ? <span className="giro" /> : <Icone nome="sino" tamanho={15} />}
                {editando ? 'Salvar alterações' : 'Publicar aviso'}
              </button>
              {editando && (
                <button className="btn" type="button" onClick={limpar}>Cancelar edição</button>
              )}
            </div>

            {editando && (
              <p className="dica">
                O destino não muda depois de publicado — as marcas de quem já leu
                ficariam sem sentido. Para falar com outro público, publique um novo.
              </p>
            )}
          </form>

          <h2 className="secao-titulo">
            {ehAdmin ? 'Todos os avisos' : 'Os avisos que você publicou'}
          </h2>

          {lista.length === 0 ? (
            <div className="quadro">
              <div className="vazio-estado">
                <span className="vazio-estado__icone"><Icone nome="inbox" tamanho={20} /></span>
                <p className="vazio-estado__titulo">Nenhum aviso publicado</p>
                <p className="vazio-estado__texto">
                  Use o formulário acima para publicar o primeiro.
                </p>
              </div>
            </div>
          ) : (
            <ul className="lista-gestao">
              {lista.map(a => {
                const noAr = vigente(a);
                const futuro = new Date(a.publicar_em) > new Date();
                return (
                  <li key={a.id} className={`quadro lista-gestao__item lista-gestao__item--${tomDoAviso(a)}`}>
                    <div className="lista-gestao__cab">
                      <span className={`cracha cracha--aviso-${tomDoAviso(a)}`}>
                        <Icone nome={ICONE_TIPO[a.tipo] || 'sino'} tamanho={12} />
                        {rotuloDaOrigem(a)}
                      </span>
                      <span className="cracha">{ROTULO_TIPO[a.tipo]}</span>
                      <span className="cracha cracha--prazo">{a.destino_nome}</span>
                      {a.exibicao !== 'sino' && (
                        <span className="cracha cracha--supervisor">
                          {ROTULO_EXIBICAO[a.exibicao]}
                        </span>
                      )}
                      <span className={'cracha ' + (noAr ? 'cracha--ativo' : 'cracha--inativo')}>
                        {noAr ? 'No ar' : futuro ? 'Agendado' : 'Encerrado'}
                      </span>
                    </div>

                    <p className="lista-gestao__titulo">{a.titulo}</p>
                    {a.corpo && <p className="lista-gestao__corpo">{a.corpo}</p>}

                    <div className="lista-gestao__pe">
                      <span className="dica">
                        por {a.autor_nome || '—'} · {futuro ? 'publica' : 'publicado'} {quandoCurto(a.publicar_em)}
                        {a.expira_em && ` · sai ${quandoCurto(a.expira_em)}`}
                      </span>
                      <span className="lista-gestao__leitura" title="Quantos destinatários já abriram o aviso">
                        <Icone nome="olho" tamanho={13} />
                        {a.leram} de {a.alcance} {a.alcance === 1 ? 'leu' : 'leram'}
                      </span>
                      <button className="btn btn--mini" onClick={() => editar(a)}>
                        <Icone nome="lapis" tamanho={12} />Editar
                      </button>
                      <button
                        className="btn btn--mini btn--perigo"
                        onClick={() => setAlvoExcluir(a)}
                      >
                        <Icone nome="lixeira" tamanho={12} />Excluir
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Dialogo aberto={!!alvoExcluir} aoFechar={() => setAlvoExcluir(null)} largura={420}>
        <div className="dlg__cab">
          <h2>Excluir aviso</h2>
        </div>
        <div className="dlg__corpo">
          <p>
            O aviso <strong>{alvoExcluir?.titulo}</strong> sai do ar para todo mundo,
            junto com o registro de quem já leu. Não dá para desfazer.
          </p>
        </div>
        <div className="dlg__pe">
          <button className="btn" onClick={() => setAlvoExcluir(null)}>Cancelar</button>
          <button className="btn btn--perigo" onClick={confirmarExclusao} style={{ marginLeft: 'auto' }}>
            <Icone nome="lixeira" tamanho={14} />Excluir
          </button>
        </div>
      </Dialogo>
    </main>
  );
}
