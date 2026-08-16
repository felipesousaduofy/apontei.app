'use client';
import { useState } from 'react';
import Dialogo from './Dialogo';
import { hmParaMin } from '@/lib/apontamento';

export default function DialogoManual({ inicial, config, aoFechar, aoSalvar, aoExcluir }) {
  const [form, setForm] = useState(inicial);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const editando = !!inicial.id;

  function mudar(campo, valor) {
    setForm(atual => ({ ...atual, [campo]: valor }));
  }

  async function enviar(e) {
    e.preventDefault();
    if (!form.inicio) { setErro('Informe pelo menos o horário de início.'); return; }
    if (form.fim && hmParaMin(form.fim) < hmParaMin(form.inicio)) {
      setErro('O fim não pode ser antes do início.');
      return;
    }
    setErro('');
    setSalvando(true);
    const ok = await aoSalvar(form);
    setSalvando(false);
    if (!ok) setErro('Não foi possível salvar o lançamento.');
  }

  return (
    <Dialogo aberto aoFechar={aoFechar}>
      <form onSubmit={enviar}>
        <div className="dlg__cab">
          <h2>{editando ? 'Editar lançamento' : 'Lançamento manual'}</h2>
          <button type="button" className="btn btn--fantasma btn--mini" onClick={aoFechar}>Fechar</button>
        </div>

        <div className="dlg__corpo">
          {erro && <div className="erro-auth">{erro}</div>}

          <div className="grade" style={{ marginBottom: 14 }}>
            <div>
              <span className="rotulo campo-rot">Data</span>
              <input
                type="date" className="campo" value={form.data}
                onChange={e => mudar('data', e.target.value)}
              />
            </div>
            <div className="grade">
              <div>
                <span className="rotulo campo-rot">Início</span>
                <input
                  type="time" className="campo" value={form.inicio}
                  onChange={e => mudar('inicio', e.target.value)}
                />
              </div>
              <div>
                <span className="rotulo campo-rot">Fim</span>
                <input
                  type="time" className="campo" value={form.fim || ''}
                  onChange={e => mudar('fim', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="bloco-campo">
            <span className="rotulo campo-rot">Descrição do que foi realizado</span>
            <textarea
              className="campo" rows={7} autoFocus
              placeholder="Uma linha por etapa concluída."
              value={form.descricao}
              onChange={e => mudar('descricao', e.target.value)}
            />
          </div>

          <div className="grade" style={{ marginBottom: 14 }}>
            <div>
              <span className="rotulo campo-rot">Chamado / tarefa</span>
              <input
                className="campo" list="listaChamados" placeholder="ex.: INC-4821"
                value={form.chamado} onChange={e => mudar('chamado', e.target.value)}
              />
            </div>
            <div>
              <span className="rotulo campo-rot">Projeto / cliente</span>
              <input
                className="campo" list="listaProjetos"
                value={form.projeto} onChange={e => mudar('projeto', e.target.value)}
              />
            </div>
          </div>

          <div className="bloco-campo">
            <span className="rotulo campo-rot">Categoria</span>
            <select className="campo" value={form.categoria} onChange={e => mudar('categoria', e.target.value)}>
              <option value="">—</option>
              {!config.categorias.includes(form.categoria) && form.categoria && (
                <option value={form.categoria}>{form.categoria}</option>
              )}
              {config.categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="bloco-campo">
            <span className="rotulo campo-rot">Observação interna (não vai para o apontamento)</span>
            <input className="campo" value={form.obs} onChange={e => mudar('obs', e.target.value)} />
          </div>
        </div>

        <div className="dlg__pe">
          {editando && (
            <button type="button" className="btn btn--perigo" onClick={() => aoExcluir(form)}>Excluir</button>
          )}
          <button type="submit" className="btn btn--forte" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar lançamento'}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
