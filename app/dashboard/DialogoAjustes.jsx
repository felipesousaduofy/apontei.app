'use client';
import { useRef, useState } from 'react';
import Dialogo from './Dialogo';
import Icone from '../Icone';
import { CONFIG_PADRAO, hmParaMin } from '@/lib/apontamento';

export default function DialogoAjustes({
  config, nome, email, aoFechar, aoSalvar, aoSalvarNome,
  aoExportarCsv, aoExportarJson, aoImportar, aoApagarTudo
}) {
  const [form, setForm] = useState({
    ...config,
    nome: nome || '',
    projetos: (config.projetos || []).join('\n'),
    categorias: (config.categorias || []).join('\n')
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const arquivo = useRef(null);

  function mudar(campo, valor) {
    setForm(atual => ({ ...atual, [campo]: valor }));
  }

  function linhas(texto) {
    return texto.split('\n').map(s => s.trim()).filter(Boolean);
  }

  async function salvar() {
    if (
      form.intervalo_ativo &&
      hmParaMin(form.intervalo_fim) <= hmParaMin(form.intervalo_inicio)
    ) {
      setErro('O fim do intervalo de descanso precisa ser depois do início.');
      return;
    }
    setErro('');
    setSalvando(true);

    // o nome mora em perfis, não em config: só vai ao servidor se mudou, e se
    // falhar não adianta seguir gravando o resto como se tivesse dado tudo certo
    if (aoSalvarNome && form.nome.trim() !== (nome || '').trim()) {
      const ok = await aoSalvarNome(form.nome);
      if (!ok) { setSalvando(false); return; }
    }

    await aoSalvar({
      arredondamento: Number(form.arredondamento),
      inicio_dia: form.inicio_dia || '08:00',
      fim_dia: form.fim_dia || '18:00',
      limite_caracteres: Number(form.limite_caracteres) || 0,
      template: form.template,
      separador: form.separador || '; ',
      projetos: linhas(form.projetos),
      categorias: linhas(form.categorias).length ? linhas(form.categorias) : CONFIG_PADRAO.categorias,
      intervalo_ativo: !!form.intervalo_ativo,
      intervalo_inicio: form.intervalo_inicio || '12:00',
      intervalo_fim: form.intervalo_fim || '13:00'
    });
    setSalvando(false);
  }

  return (
    <Dialogo aberto aoFechar={aoFechar}>
      <div className="dlg__cab">
        <h2>Ajustes</h2>
        <button
          className="btn btn--fantasma btn--icone" onClick={aoFechar}
          title="Fechar" aria-label="Fechar"
        >
          <Icone nome="fechar" tamanho={16} />
        </button>
      </div>

      <div className="dlg__corpo">
        {erro && <div className="erro-auth">{erro}</div>}

        <div className="bloco-campo">
          <span className="rotulo campo-rot">Seu nome</span>
          <input
            className="campo" maxLength={60} placeholder="Como você quer aparecer no apontei"
            value={form.nome} onChange={e => mudar('nome', e.target.value)}
          />
          <p className="ajuda">
            É o que aparece no lugar do e-mail pelas telas — inclusive para quem
            supervisiona a equipe. Deixando em branco, volta a mostrar {email}.
          </p>
        </div>

        <hr className="divisor" />

        <div className="grade grade--4" style={{ marginBottom: 14 }}>
          <div>
            <span className="rotulo campo-rot">Arredondar</span>
            <select
              className="campo" value={form.arredondamento}
              onChange={e => mudar('arredondamento', e.target.value)}
            >
              <option value="0">Sem</option>
              <option value="5">5 min</option>
              <option value="15">15 min</option>
              <option value="30">30 min</option>
            </select>
          </div>
          <div>
            <span className="rotulo campo-rot">Jornada de</span>
            <input
              type="time" className="campo" value={String(form.inicio_dia).slice(0, 5)}
              onChange={e => mudar('inicio_dia', e.target.value)}
            />
          </div>
          <div>
            <span className="rotulo campo-rot">até</span>
            <input
              type="time" className="campo" value={String(form.fim_dia).slice(0, 5)}
              onChange={e => mudar('fim_dia', e.target.value)}
            />
          </div>
          <div>
            <span className="rotulo campo-rot">Limite de caract.</span>
            <input
              type="number" className="campo" min="0" step="50" placeholder="0 = sem limite"
              value={form.limite_caracteres || ''}
              onChange={e => mudar('limite_caracteres', e.target.value)}
            />
          </div>
        </div>

        <div className="bloco-campo">
          <label className="chip-opcao">
            <input
              type="checkbox" checked={!!form.intervalo_ativo}
              onChange={e => mudar('intervalo_ativo', e.target.checked)}
            />
            Descontar um intervalo de descanso das horas sem registro
          </label>
          {form.intervalo_ativo && (
            <div className="grade" style={{ marginTop: 9 }}>
              <div>
                <span className="rotulo campo-rot">Das</span>
                <input
                  type="time" className="campo"
                  value={String(form.intervalo_inicio || '12:00').slice(0, 5)}
                  onChange={e => mudar('intervalo_inicio', e.target.value)}
                />
              </div>
              <div>
                <span className="rotulo campo-rot">Até</span>
                <input
                  type="time" className="campo"
                  value={String(form.intervalo_fim || '13:00').slice(0, 5)}
                  onChange={e => mudar('intervalo_fim', e.target.value)}
                />
              </div>
            </div>
          )}
          <p className="ajuda">
            Ex.: almoço combinado das 12h às 14h. Esse período some da régua e do
            cálculo de "sem registro" — a jornada esperada também é reduzida na
            mesma quantidade, então ninguém precisa apontar o horário do almoço.
          </p>
        </div>

        <div className="bloco-campo">
          <span className="rotulo campo-rot">Modelo de saída</span>
          <textarea
            className="campo" rows={4} value={form.template}
            onChange={e => mudar('template', e.target.value)}
          />
          <p className="ajuda">
            Campos disponíveis: {'{chamado} {projeto} {categoria} {descricao} {horas} {decimal} {inicio} {fim} {data}'}
          </p>
        </div>

        <div className="bloco-campo">
          <span className="rotulo campo-rot">Separador ao achatar em uma linha</span>
          <input className="campo" value={form.separador} onChange={e => mudar('separador', e.target.value)} />
        </div>

        <div className="grade">
          <div>
            <span className="rotulo campo-rot">Projetos / clientes (um por linha)</span>
            <textarea
              className="campo" rows={6} value={form.projetos}
              onChange={e => mudar('projetos', e.target.value)}
            />
          </div>
          <div>
            <span className="rotulo campo-rot">Categorias (uma por linha)</span>
            <textarea
              className="campo" rows={6} value={form.categorias}
              onChange={e => mudar('categorias', e.target.value)}
            />
          </div>
        </div>

        <hr className="divisor" />

        <span className="rotulo campo-rot">Onde os dados ficam</span>
        <div className="arquivo-caixa">
          <div className="arquivo-caixa__estado">
            <span className="chip__ponto" style={{ background: 'var(--ok)' }} />
            <span>Gravando na sua conta do apontei</span>
          </div>
          <p className="ajuda">
            Cada alteração vai direto para o banco assim que você sai do campo. Não
            depende mais do armazenamento deste navegador nem de um arquivo local —
            entrando com o mesmo e-mail em qualquer máquina, os lançamentos estão lá.
          </p>
        </div>

        <span className="rotulo campo-rot">Backup e migração</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={aoExportarCsv}>Exportar CSV</button>
          <button className="btn" onClick={aoExportarJson}>Exportar JSON</button>
          <button className="btn" onClick={() => arquivo.current?.click()}>Importar JSON</button>
          <button className="btn btn--perigo" onClick={aoApagarTudo}>
            <Icone nome="lixeira" tamanho={15} />Apagar tudo
          </button>
          <input
            type="file" ref={arquivo} accept="application/json" hidden
            onChange={e => {
              const arq = e.target.files?.[0];
              e.target.value = '';
              if (arq) aoImportar(arq);
            }}
          />
        </div>
        <p className="ajuda">
          O JSON é o mesmo formato do apontei que você roda local — use o Importar
          para trazer o histórico daquele arquivo para cá. Lançamentos com a mesma
          data e hora de início são ignorados, então importar duas vezes não duplica.
        </p>
      </div>

      <div className="dlg__pe">
        <button className="btn btn--forte" onClick={salvar} disabled={salvando}>
          {salvando ? <span className="giro" /> : <Icone nome="seleciona" tamanho={15} />}
          {salvando ? 'Salvando…' : 'Salvar ajustes'}
        </button>
      </div>
    </Dialogo>
  );
}
