// Meu Painel — telas e interação.
import * as R from './regras.js';
import * as S from './store.js';
import * as N from './nuvem.js';
import * as E from './estudio.js';
import { MOLDES } from './moldes.js';

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const main = $('#main');
const janela = $('#janela');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => R.hojeISO();
const st = () => S.get();
const L = () => st().listas;
const nomeDe = (lista, id) => (lista.find((x) => x.id === id) || {}).nome || '';
const horaAtual = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// ---------- Cores (projetos, categorias e datas) ----------
const CORES = [
  { id: 'malva', nome: 'Malva', forte: '#806A7C', claro: '#ECE4EA' },
  { id: 'azul', nome: 'Azul', forte: '#5F7488', claro: '#E1E8EE' },
  { id: 'caramelo', nome: 'Caramelo', forte: '#9C6F47', claro: '#F2E6D8' },
  { id: 'salvia', nome: 'Sálvia', forte: '#5C6854', claro: '#E3E8DA' },
  { id: 'eucalipto', nome: 'Eucalipto', forte: '#4C5A6E', claro: '#DFE3EA' },
  { id: 'nude', nome: 'Nude', forte: '#A27A62', claro: '#F4E9DF' },
  { id: 'vinho', nome: 'Vinho', forte: '#7A4350', claro: '#F0E0E3' },
  { id: 'rosa', nome: 'Rosa antigo', forte: '#AD6E65', claro: '#F3E2DE' },
];
const corPorId = (id) => CORES.find((c) => c.id === id);
function corProjeto(p) {
  if (!p) return null;
  const i = (st().projetos || []).indexOf(p);
  return corPorId(p.cor) || CORES[Math.max(0, i) % CORES.length];
}
const corProjetoId = (id) => corProjeto((st().projetos || []).find((p) => p.id === id));
const ORDEM_CAT = ['salvia', 'azul', 'caramelo', 'malva', 'eucalipto', 'nude', 'vinho', 'rosa'];
function corCategoria(id) {
  const i = L().categorias.findIndex((c) => c.id === id);
  return i < 0 ? null : corPorId(ORDEM_CAT[i % ORDEM_CAT.length]);
}
const estiloCor = (c) => (c ? `style="--cor:${c.forte};--cor-claro:${c.claro}"` : '');

// ---------- Aviso (toast) com "Desfazer" ----------
let toastTimer;
function aviso(msg, { desfazer = false } = {}) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${desfazer ? '<button type="button" data-acao="desfazer">Desfazer</button>' : ''}`;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), desfazer ? 6000 : 2600);
}

function logar(campo, n = 1) {
  const d = hoje();
  const s = st();
  s.log[d] = s.log[d] || {};
  s.log[d][campo] = Math.max(0, (s.log[d][campo] || 0) + n);
}

// ---------- Rotas ----------
const rotas = {
  hoje: telaHoje, tarefas: telaTarefas, classificar: telaClassificar,
  projetos: telaProjetos, projeto: telaProjeto,
  roteiros: telaRoteiros, aula: telaAula, post: telaPost, estudio: telaEstudio,
  leituras: telaLeituras, livro: telaLivro,
  links: telaLinks, patrimonio: telaPatrimonio, fechar: telaFechar,
  ajustes: telaAjustes, mais: telaMais,
};
const menuDe = { projeto: 'projetos', classificar: 'tarefas', habitos: 'hoje', aula: 'roteiros', post: 'roteiros', estudio: 'roteiros', livro: 'leituras', fechar: 'patrimonio' };

function rota() {
  const partes = (location.hash.replace(/^#\/?/, '') || 'hoje').split('/');
  return { nome: rotas[partes[0]] ? partes[0] : 'hoje', args: partes.slice(1).map(decodeURIComponent) };
}
let rotaAtual = '';
function render() {
  const { nome, args } = rota();
  const mudouTela = rotaAtual !== location.hash;
  rotaAtual = location.hash;
  const menu = menuDe[nome] || nome;
  $$('.menu a').forEach((a) => a.classList.toggle('ativo', a.dataset.tela === menu || (menu === 'mais' && a.dataset.tela === 'mais')));
  if (['leituras', 'links', 'patrimonio', 'ajustes', 'livro', 'fechar'].includes(nome)) $('.menu a[data-tela=mais]').classList.add('ativo');
  main.innerHTML = rotas[nome](...args) || '';
  if (mudouTela) window.scrollTo(0, 0);
  depoisDeRender(nome);
  atualizarSelo();
}
// Re-desenha a tela sem perder a rolagem.
function redesenhar() { const y = window.scrollY; render(); window.scrollTo(0, y); }
window.addEventListener('hashchange', render);

function atualizarSelo() {
  const n = R.paraHoje(st().tarefas, hoje(), L()).length;
  try { if (n && navigator.setAppBadge) navigator.setAppBadge(n); else if (navigator.clearAppBadge) navigator.clearAppBadge(); } catch { /* sem selo */ }
  document.title = n ? `(${n}) Meu Painel` : 'Meu Painel';
}

// ======================================================================
// HOJE
// ======================================================================
// Linha de tarefa: o nome usa a largura toda; hora, projeto, categoria e dia ficam numa linha pequena embaixo.
// semDia: a lista já está agrupada por dia (ex.: AMANHÃ), então não repete o dia na etiqueta.
function itemTarefa(t, d, { semDia = false } = {}) {
  const venc = R.vencimento(t);
  const atras = R.atrasada(t, d);
  const urg = atras && R.urgente(t, L());
  const cat = nomeDe(L().categorias, t.categoria);
  const falta = R.faltamDias(t, d);
  const qd = venc ? (R.comPrazo(t) && falta >= 0 ? (falta === 0 ? 'Prazo hoje' : `Até ${R.quando(venc, d)} · ${falta === 1 ? 'falta 1 dia' : `faltam ${falta} dias`}`) : t.quando === 'semana' && venc >= d ? 'Esta semana' : R.quando(venc, d)) : '';
  const hora = t.hora && t.quando === 'data' ? t.hora : '';
  const tipoQd = atras ? 'q-atraso' : qd === 'Amanhã' || qd === 'Prazo hoje' ? 'q-amanha' : qd === 'Esta semana' || R.comPrazo(t) ? 'q-semana' : 'q-depois';
  const cp = corProjetoId(t.projeto);
  const cc = corCategoria(t.categoria);
  const proj = nomeProjeto(t.projeto);
  const meta = [
    hora ? `<span class="hora">${esc(hora)}</span>` : '',
    t.repetir ? '<span title="Repete">↻</span>' : '',
    proj ? `<span class="tag tag-cor" ${estiloCor(cp)}>${esc(proj)}</span>` : '',
    cat && !proj ? `<span class="tag tag-cor" ${estiloCor(cc)}>${esc(cat)}</span>` : '', // com projeto, a categoria é repetida
    qd && qd !== 'Hoje' && !(semDia && !atras) ? `<span class="quando ${tipoQd}">${esc(qd)}</span>` : '',
  ].filter(Boolean).join('');
  return `<li class="tarefa ${cp ? 'com-projeto' : ''} ${atras ? 'atrasada' : ''} ${urg ? 'urgente' : ''} ${t.feitaEm ? 'feita' : ''}" ${estiloCor(cp)}>
    <button class="check ${t.feitaEm ? 'feito' : ''}" data-acao="concluir" data-id="${t.id}" aria-label="Concluir"></button>
    <div class="txt" data-acao="abrirTarefa" data-id="${t.id}"><span>${esc(t.texto)}</span>
      ${meta ? `<div class="meta">${meta}</div>` : ''}
      ${t.primeiroPasso ? `<small>Primeiro passo: ${esc(t.primeiroPasso)}</small>` : ''}
      ${R.comPrazo(t) && !t.feitaEm ? `<small class="parte-hoje">${t.pedaco ? `Hoje: ${esc(t.pedaco)} · ` : ''}${t.parteFeita === d ? '✓ parte de hoje feita' : falta > 0 ? `<button class="link-acao" data-acao="parteHoje" data-id="${t.id}">Fiz a parte de hoje</button>` : ''}</small>` : ''}</div>
    ${t.feitaEm ? '' : `<button class="fazer-agora" data-acao="fazerAgora" data-id="${t.id}" title="Vou fazer agora (abre o Pomodoro)" aria-label="Vou fazer agora">▶</button>`}
  </li>`;
}

function telaHoje() {
  const s = st();
  const d = hoje();
  const lista = R.paraHoje(s.tarefas, d, L());
  const feitasHoje = s.tarefas.filter((t) => t.feitaEm === d || t.ultimaVez === d);
  const caixa = s.tarefas.filter(R.naCaixa).length;
  const semData = R.semData(s.tarefas).length;
  const vit = R.vitorias(s, d);

  // Linhas curtas
  const linhas = [];
  R.postsDeHoje(s.posts, d).forEach((p) => linhas.push(`<div class="linha-hoje"><span class="rot">Post</span><span class="espaco">${esc(p.titulo)} ${p.formato ? `<span class="tag">${esc(nomeDe(L().formatos, p.formato))}</span>` : ''}</span><a href="#/post/${p.id}">Abrir roteiro</a></div>`));
  const ra = R.resumoAulas(s.aulas, L().etapasAula, d);
  const atrasAulas = R.aulasAtrasadas(s.aulas, L().etapasAula, d).length;
  if ((ra.total || atrasAulas) && s.ajustes.hojeAulas !== false) linhas.push(blocoAulasHoje(d, ra));
  if (s.ajustes.hojeLeitura !== false) { const ml = blocoLeituraHoje(d); if (ml) linhas.push(ml); }
  const clube = R.avisoClube(s.clube.encontros, d);
  if (clube) {
    const enc = s.clube.encontros.find((e) => e.data === (clube === 'hoje' ? d : R.somaDias(d, 1)));
    linhas.push(`<div class="linha-hoje"><span class="rot">Clube</span><span class="espaco">${clube === 'hoje' ? 'Clube hoje' : 'Clube amanhã'}${enc && enc.hora ? ` às ${esc(enc.hora)}` : ''}</span><a href="#/leituras/clube/${enc ? enc.id : ''}">Ver pauta</a></div>`);
  }
  if (R.mostrarFecharMes(s.meses, d) && s.contas.length) linhas.push(`<div class="linha-hoje"><span class="rot">Patrimônio</span><span class="espaco">Fechar o mês de ${R.nomeMes(R.mesDe(d))}</span><a href="#/fechar/${R.mesDe(d)}">Fechar</a></div>`);
  const ideia = blocoIdeiaDoDia();
  if (ideia) linhas.push(ideia);
  const proxSemana = s.ajustes.hojeSemana !== false ? blocoProximasSemana(d) : '';
  const resumo = s.ajustes.hojeResumo !== false ? blocoResumoSemana(d) : '';

  // Aviso do fim do dia
  const fimDoDia = R.mostrarAvisoFimDoDia(s.tarefas, d, horaAtual(), s.ajustes.horarioAviso, s.avisos.fimDoDia);

  // Lembrete de cópia
  const temDados = s.tarefas.length + s.posts.length + s.aulas.length + s.livros.length > 0;
  const ultimo = (s.ajustes.ultimoBackup || s.criadoEm || S.agora()).slice(0, 10);
  const pedirCopia = temDados && s.avisos.backup !== d && R.diasEntre(ultimo, d) >= 7;

  return `
  <header class="hoje-topo">
    <p class="data">${esc(R.dataPorExtenso(d))}</p>
    <p class="frase">${esc(s.ajustes.frase)}</p>
  </header>
  <form class="anotar" data-form="anotar"><input name="texto" placeholder="Colocar na Caixa do Depois…" autocomplete="off" aria-label="Anotar uma tarefa"><button class="btn" type="submit">Anotar</button></form>
  <div class="hoje-acoes"><button class="comecar" data-acao="comecar">✦ Começar pequeno</button></div>
  <div class="hoje-grade ${s.ajustes.hojeCalendario === false ? 'sem-lado' : ''}"><div class="hoje-principal">

  ${fimDoDia ? `<div class="cartao aviso-gentil" style="margin-bottom:18px"><b>Ficou coisa para amanhã? Tudo bem.</b>
    <div class="linha" style="margin-top:10px"><button class="btn btn-pequeno" data-acao="passarAmanha">Passar para amanhã</button><button class="btn btn-2 btn-pequeno" data-acao="comecar">Escolher 1 para fazer agora</button><button class="btn-3" data-acao="dispensarFimDoDia">Fechar</button></div></div>` : ''}

  <section class="cartao">
    <h2>Para hoje</h2>
    ${lista.length ? `<ul class="tarefas">${lista.map((t) => itemTarefa(t, d)).join('')}</ul>` : `<p class="vazio">Tudo feito por hoje.${R.proximasDaSemana(s.tarefas, d, L()).length ? ' Quer adiantar uma da semana?' : ''}</p>`}
    ${feitasHoje.length ? `<details style="margin-top:8px"><summary class="muted" style="cursor:pointer;font-size:13px">Feitas hoje (${feitasHoje.length})</summary><ul class="tarefas">${feitasHoje.map((t) => `<li class="tarefa feita"><button class="check feito" data-acao="reabrir" data-id="${t.id}" aria-label="Desfazer"></button><div class="txt"><span>${esc(t.texto)}</span></div></li>`).join('')}</ul></details>` : ''}
  </section>

  ${resumo}
  ${linhas.length || proxSemana ? `<div class="linhas-hoje">${proxSemana}${linhas.join('')}</div>` : ''}

  <footer class="rodape-hoje">
    ${vit ? `<span class="vitorias">Hoje você fez ${vit} ${vit === 1 ? 'coisa' : 'coisas'}</span>` : ''}
    ${N.configurada() && !N.conectada() ? '<span><a href="#/ajustes">Entrar para sincronizar com o celular</a></span>' : ''}
    ${caixa ? `<span>${caixa} na Caixa · <a href="#/classificar">Classificar</a></span>` : ''}
    ${semData ? `<span>${semData} sem data · <a href="#/tarefas">Ver</a></span>` : ''}
    ${pedirCopia ? `<span>Salvar cópia da semana? <button class="link-acao" data-acao="salvarCopia">Salvar</button> · <button class="link-acao" data-acao="dispensarCopia" style="color:var(--texto-2)">Agora não</button></span>` : ''}
  </footer>
  </div>${s.ajustes.hojeCalendario !== false ? `<aside class="hoje-lado">${blocoCalendario()}</aside>` : ''}</div>`;
}

// ---------- Meta de leitura do clube (no Hoje) ----------
// Guarda em que página ela estava no começo do dia, para a meta não mudar enquanto lê.
function blocoLeituraHoje(d) {
  const s = st();
  const livro = s.livros.find((l) => l.id === s.clube.livroAtual);
  const enc = R.proximoEncontro(s.clube.encontros, d);
  if (!livro || !enc) return '';
  const ld = s.clube.leituraDia;
  if (!ld || ld.data !== d || ld.livroId !== livro.id) { s.clube.leituraDia = { data: d, livroId: livro.id, pagina: Number(livro.paginaAtual) || 0 }; S.salvar(); }
  const m = R.metaLeituraHoje(livro, enc, d, s.clube.leituraDia.pagina);
  if (!m) return '';
  return `<div class="linha-hoje leitura-hoje" style="align-items:flex-start"><span class="rot" style="padding-top:2px">Leitura</span>
    <div class="espaco">${m.feita ? `<span>✓ Meta de hoje feita: <b>${esc(livro.nome)}</b> até a pág. ${m.alvo}.</span>` : `<span><b>${esc(livro.nome)}</b>: ler até a <b>pág. ${m.alvo}</b> hoje (${m.paginasHoje} páginas)</span>`}
      <small class="muted" style="display:block">Encontro ${esc(R.quando(enc.data, d).toLowerCase())}, até a pág. ${esc(enc.atePagina)} · você está na pág. ${Number(livro.paginaAtual) || 0}</small>
      <form class="linha" data-form="pagina" data-id="${livro.id}" style="margin-top:8px"><input class="campo" name="pagina" type="number" min="0" placeholder="Parei na página…" style="width:150px"><button class="btn btn-2 btn-pequeno" type="submit">Atualizar</button></form></div></div>`;
}

// ---------- Resumo da semana (no domingo) ----------
function blocoResumoSemana(d) {
  const s = st();
  if (R.diaSemana(d) !== 0 || s.avisos.resumo === d) return '';
  const r = R.resumoSemana(s.log, d);
  const itens = [
    [r.tarefas, 'tarefa feita', 'tarefas feitas'], [r.etapas, 'etapa de aula', 'etapas de aula'], [r.postsGravados, 'post gravado', 'posts gravados'],
    [r.postsPostados, 'post postado', 'posts postados'], [r.paginas, 'página lida', 'páginas lidas'], [r.pomodoros, 'pomodoro', 'pomodoros'],
  ].filter(([n]) => n > 0);
  if (!itens.length) return '';
  return `<section class="cartao resumo-semana"><div class="secao-titulo"><h2>Sua semana</h2><button class="btn-3 btn-pequeno" data-acao="fecharResumo">Fechar</button></div>
    <div class="resumo-itens">${itens.map(([n, um, varios]) => `<div><b>${n}</b><span>${n === 1 ? um : varios}</span></div>`).join('')}</div>
    <p class="muted" style="margin:10px 0 0;font-size:13.5px">Isso foi o que você fez de segunda até hoje. Boa semana que vem!</p></section>`;
}

// ---------- Calendário (no Hoje) ----------
let mesCal = '';
let diaCal = '';
function blocoCalendario() {
  const s = st();
  const d = hoje();
  const ym = mesCal || R.mesDe(d);
  const sel = diaCal || d;
  const semanas = R.semanasDoMes(ym);
  const cel = (dia) => {
    const ev = R.eventosDoDia(s, dia, d);
    const tipos = [...new Set(ev.map((e) => e.tipo))];
    const corT = (e) => { const c = e.tipo === 'tarefa' && corProjetoId((s.tarefas.find((t) => t.id === e.id) || {}).projeto); return c ? ` style="background:${c.forte}"` : ''; };
    const pontos = [...new Map(ev.map((e) => [`${e.tipo}${corT(e)}`, e])).values()].slice(0, 4);
    const classes = ['dia', dia.slice(0, 7) !== ym ? 'fora' : '', dia === d ? 'hoje' : '', dia === sel ? 'sel' : ''].join(' ');
    return `<button class="${classes}" data-acao="diaCal" data-dia="${dia}" aria-label="${esc(R.dataPorExtenso(dia))}${ev.length ? `, ${ev.length} itens` : ''}"><span>${Number(dia.slice(8))}</span><i class="pontos">${pontos.map((e) => `<b class="p-${e.tipo}"${corT(e)}></b>`).join('')}</i></button>`;
  };
  const evSel = R.eventosDoDia(s, sel, d);
  const ir = { tarefa: 'abrirTarefa', post: 'irPost', clube: 'irEncontro' };
  return `<section class="cartao calendario">
    <div class="secao-titulo"><h2 style="margin:0;text-transform:capitalize">${esc(R.nomeMes(ym))} <span class="muted" style="font-family:var(--sans);font-size:14px;font-weight:500">${ym.slice(0, 4)}</span></h2>
      <div class="linha" style="gap:2px"><button class="icone" data-acao="mesCal" data-d="-1" aria-label="Mês anterior">‹</button><button class="icone" data-acao="mesCal" data-d="0" aria-label="Hoje" style="font-size:12px;width:auto;padding:0 6px">Hoje</button><button class="icone" data-acao="mesCal" data-d="1" aria-label="Próximo mês">›</button></div></div>
    <div class="cal-grade">${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((x) => `<span class="cal-sem">${x}</span>`).join('')}${semanas.flat().map(cel).join('')}</div>
    <div class="cal-legenda"><span><b class="p-tarefa"></b>Tarefa (cor do projeto)</span><span><b class="p-post"></b>Post</span><span><b class="p-clube"></b>Clube</span></div>
    <div class="cal-dia"><div class="grupo-dia" style="margin-top:0">${esc(sel === d ? 'Hoje' : R.dataPorExtenso(sel))}</div>
      ${evSel.length ? `<ul class="lista">${evSel.map((e) => `<li class="item" style="padding:6px 2px"><b class="ponto-lista p-${e.tipo}"${e.tipo === 'tarefa' ? (() => { const c = corProjetoId((s.tarefas.find((t) => t.id === e.id) || {}).projeto); return c ? ` style="background:${c.forte}"` : ''; })() : ''}></b><div class="principal" data-acao="${ir[e.tipo]}" data-id="${e.id}" style="${e.feito ? 'text-decoration:line-through;color:var(--texto-2)' : ''}">${e.hora ? `<b class="hora-cal">${esc(e.hora)}</b> ` : ''}${esc(e.texto)}</div></li>`).join('')}</ul>` : '<p class="vazio" style="padding:2px 0">Nada marcado.</p>'}
      ${sel > d ? `<button class="btn-3 btn-pequeno" data-acao="tarefaNoDia" data-dia="${sel}" style="margin-top:4px">+ Tarefa neste dia</button>` : ''}
    </div>
  </section>`;
}

// ---------- Ideia do dia ----------
function candidatoAtual() {
  const s = st();
  const d = hoje();
  if (!R.mostrarIdeiaDoDia({ ligada: s.ajustes.ideiaDoDia, posts: s.posts, aulas: s.aulas, etapas: L().etapasAula, hoje: d, hojeNao: s.ideia.hojeNao })) return null;
  const recentes = { ...s.ideia.recentes };
  if (s.ideia.data === d) delete recentes[s.ideia.id];
  const cands = R.candidatosIdeia(s.posts, s.livros, d, recentes);
  if (!cands.length) return null;
  let c = s.ideia.data === d ? cands.find((x) => x.id === s.ideia.id) : null;
  if (!c) {
    c = cands[0];
    s.ideia.data = d; s.ideia.id = c.id; s.ideia.recentes[c.id] = d;
    S.salvar();
  }
  return c;
}
// Aulas da semana no Hoje: o tema de cada aula que falta e a próxima etapa.
function blocoAulasHoje(d, ra) {
  const etapas = L().etapasAula;
  const faltam = [...R.aulasAtrasadas(st().aulas, etapas, d).map((a) => ({ a, atras: true })),
    ...R.aulasDaSemana(st().aulas, d).filter((a) => !R.pronta(a, etapas)).map((a) => ({ a, atras: false }))];
  const itens = faltam.map(({ a, atras }) => {
    const p = R.proximaEtapa(a, etapas);
    return `<li><a href="#/aula/${a.id}">${esc(a.titulo || 'Aula sem tema')}</a>${p ? ` <span class="tag">${esc(p.nome)}</span>` : ''}${atras ? ' <span class="quando q-atraso">semana passada</span>' : ''}</li>`;
  }).join('');
  return `<div class="linha-hoje" style="align-items:flex-start"><span class="rot" style="padding-top:2px">Aulas</span>
    <div class="espaco"><span>${ra.total ? `${ra.prontas} de ${ra.total} prontas nesta semana` : 'Nenhuma aula nesta semana'}</span>
    ${itens ? `<ul class="aulas-hoje">${itens}</ul>` : ''}</div><a href="#/roteiros/aulas">Ver</a></div>`;
}

// Próximas da semana: uma por vez, para adiantar quando sobrar tempo.
let idxSemana = 0;
function blocoProximasSemana(d) {
  const lista = R.proximasDaSemana(st().tarefas, d, L());
  if (!lista.length) return '';
  idxSemana = ((idxSemana % lista.length) + lista.length) % lista.length;
  const t = lista[idxSemana];
  const venc = R.vencimento(t);
  const qd = t.quando === 'semana' ? 'Esta semana' : R.quando(venc, d);
  const cp = corProjetoId(t.projeto);
  const podeAdiantar = !t.hora && !t.repetir;
  return `<div class="linha-hoje proximas-semana" style="align-items:flex-start"><span class="rot" style="padding-top:4px">Na semana</span>
    <div class="espaco"><p class="frase-ideia" style="font-size:17px">${esc(t.texto)}</p>
      <div class="meta-semana"><span class="quando ${qd === 'Amanhã' ? 'q-amanha' : 'q-semana'}">${esc(qd)}${t.hora ? ` · ${esc(t.hora)}` : ''}</span>${nomeProjeto(t.projeto) ? ` <span class="tag tag-cor" ${estiloCor(cp)}>${esc(nomeProjeto(t.projeto))}</span>` : ''}</div>
      <div class="linha" style="margin-top:10px">${podeAdiantar ? `<button class="btn btn-pequeno" data-acao="adiantarHoje" data-id="${t.id}">Fazer hoje</button>` : ''}<button class="btn btn-2 btn-pequeno" data-acao="fazerAgora" data-id="${t.id}">▶ Fazer agora</button><button class="btn-3" data-acao="concluir" data-id="${t.id}">Já fiz</button></div></div>
    ${lista.length > 1 ? `<div class="nav-semana"><button class="icone" data-acao="outraSemana" data-d="-1" aria-label="Anterior">‹</button><span class="muted">${idxSemana + 1}/${lista.length}</span><button class="icone" data-acao="outraSemana" data-d="1" aria-label="Próxima">›</button></div>` : ''}</div>`;
}

function blocoIdeiaDoDia() {
  const c = candidatoAtual();
  if (!c) return '';
  const fmt = c.formato ? nomeDe(L().formatos, c.formato) : '';
  const f = R.frasesIdeia(c, fmt);
  const gravar = c.tipo === 'gravar';
  return `<div class="linha-hoje ideia-dia" style="align-items:flex-start"><span class="rot" style="padding-top:4px">${gravar ? 'Para gravar' : 'Ideia do dia'}</span>
    <div class="espaco"><p class="frase-ideia">${esc(f.frase)}</p><span class="muted" style="font-size:13.5px">${esc(f.extra)}</span>
    <div class="linha" style="margin-top:10px"><button class="btn btn-pequeno" data-acao="ideiaFazer">${gravar ? 'Vou gravar' : 'Vou fazer'}</button>${c.postId ? `<button class="btn btn-2 btn-pequeno" data-acao="irPost" data-id="${c.postId}">${gravar ? 'Ver roteiro' : 'Ver ideia'}</button>` : ''}<button class="btn btn-2 btn-pequeno" data-acao="ideiaOutra">Outra</button><button class="btn-3" data-acao="ideiaHojeNao">Hoje não</button></div></div></div>`;
}

// ======================================================================
// TAREFAS
// ======================================================================
let filtroCat = '';
let verFeitas = false;
function telaTarefas() {
  const s = st();
  const d = hoje();
  const filtra = (arr) => (filtroCat ? arr.filter((t) => t.categoria === filtroCat) : arr);
  const caixa = s.tarefas.filter(R.naCaixa);
  const hojeL = filtra(R.paraHoje(s.tarefas, d, L()));
  const semana = filtra(R.estaSemana(s.tarefas, d));
  const proximos = filtra(R.proximosDias(s.tarefas, d));
  const semData = filtra(R.semData(s.tarefas));
  const porDia = {};
  proximos.forEach((t) => { (porDia[t.data] = porDia[t.data] || []).push(t); });
  const porPri = L().prioridades.map((p) => ({ nome: p.nome, itens: semData.filter((t) => t.prioridade === p.id) }));
  const semPri = semData.filter((t) => !L().prioridades.some((p) => p.id === t.prioridade));
  const feitas = s.tarefas.filter((t) => t.feitaEm).sort((a, b) => b.feitaEm.localeCompare(a.feitaEm)).slice(0, 60);

  return `
  <div class="topo"><div><h1>Tarefas</h1></div><button class="btn btn-2" data-acao="novaTarefa">+ Tarefa com detalhes</button></div>
  <form class="anotar" data-form="anotar"><input name="texto" placeholder="Colocar na Caixa do Depois…" autocomplete="off"><button class="btn" type="submit">Anotar</button></form>

  <section class="cartao">
    <div class="secao-titulo"><h2>Caixa ${caixa.length ? `<span class="muted" style="font-family:var(--sans);font-size:15px;font-weight:500">(${caixa.length})</span>` : ''}</h2>${caixa.length ? '<a class="btn btn-pequeno" href="#/classificar">Classificar</a>' : ''}</div>
    ${caixa.length ? `<ul class="tarefas">${caixa.map((t) => `<li class="tarefa"><button class="check" data-acao="concluir" data-id="${t.id}" aria-label="Concluir"></button><div class="txt" data-acao="abrirTarefa" data-id="${t.id}"><span>${esc(t.texto)}</span></div></li>`).join('')}</ul>` : '<p class="vazio">Caixa vazia.</p>'}
  </section>

  <div class="filtros" style="margin-top:24px"><span class="muted" style="font-size:13px">Categoria:</span>
    <button class="chip ${!filtroCat ? 'sel' : ''}" data-acao="filtroCat" data-id="">Todas</button>
    ${L().categorias.map((c) => `<button class="chip ${filtroCat === c.id ? 'sel' : ''}" data-acao="filtroCat" data-id="${c.id}">${esc(c.nome)}</button>`).join('')}
  </div>

  <div class="grade-2">
    <div>
      <section class="cartao"><h2>Hoje e atrasadas</h2>${hojeL.length ? `<ul class="tarefas">${hojeL.map((t) => itemTarefa(t, d)).join('')}</ul>` : '<p class="vazio">Nada para hoje.</p>'}</section>
      <section class="cartao"><h2>Esta semana</h2><p class="dica" style="margin:-6px 0 6px">Até domingo, sem dia certo.</p>${semana.length ? `<ul class="tarefas">${semana.map((t) => itemTarefa(t, d)).join('')}</ul>` : '<p class="vazio">Nada.</p>'}</section>
      <section class="cartao"><h2>Próximos dias</h2>${Object.keys(porDia).length ? Object.entries(porDia).map(([dia, ts]) => `<div class="grupo-dia">${esc(R.quando(dia, d))}</div><ul class="tarefas">${ts.map((t) => itemTarefa(t, d, { semDia: true })).join('')}</ul>`).join('') : '<p class="vazio">Nada marcado.</p>'}</section>
    </div>
    <div>
      <section class="cartao"><h2>Sem data</h2>
        ${semData.length ? porPri.filter((g) => g.itens.length).map((g) => `<div class="grupo-dia">${esc(g.nome)}</div><ul class="tarefas">${g.itens.map((t) => itemTarefa(t, d)).join('')}</ul>`).join('') + (semPri.length ? `<div class="grupo-dia">Sem prioridade</div><ul class="tarefas">${semPri.map((t) => itemTarefa(t, d)).join('')}</ul>` : '') : '<p class="vazio">Nenhuma tarefa sem data.</p>'}
      </section>
      <section class="secao"><button class="btn-3" data-acao="verFeitas">${verFeitas ? 'Esconder feitas' : 'Ver feitas'}</button>
        ${verFeitas ? `<ul class="tarefas">${feitas.map((t) => `<li class="tarefa feita"><button class="check feito" data-acao="reabrir" data-id="${t.id}" aria-label="Reabrir"></button><div class="txt"><span>${esc(t.texto)}</span><small>${esc(R.ddmm(t.feitaEm))}</small></div></li>`).join('') || '<p class="vazio">Nenhuma ainda.</p>'}</ul>` : ''}
      </section>
    </div>
  </div>`;
}

// ---------- Classificar (uma por vez) ----------
let pulados = new Set();
let escolha = {};
function telaClassificar() {
  const caixa = st().tarefas.filter(R.naCaixa);
  const fila = caixa.filter((t) => !pulados.has(t.id));
  if (!fila.length) {
    pulados = new Set();
    return `<div class="classificar"><div class="topo"><h1>Classificar</h1></div><div class="cartao"><p style="font-family:var(--serif);font-size:22px;margin:0">Caixa vazia.</p><p class="muted">Tudo classificado.</p><div class="linha" style="margin-top:12px"><a class="btn" href="#/hoje">Ir para Hoje</a><a class="btn btn-2" href="#/tarefas">Ver tarefas</a></div></div></div>`;
  }
  const t = fila[0];
  if (escolha.id !== t.id) escolha = { id: t.id, quando: 'sem', data: '', prioridade: t.prioridade || '', categoria: t.categoria || '', tempo: t.tempo || '', passo: t.primeiroPasso || '', projeto: t.projeto || '' };
  const chips = (grupo, lista) => lista.map((x) => `<button type="button" class="chip ${escolha[grupo] === x.id ? 'sel' : ''}" data-acao="escolher" data-grupo="${grupo}" data-id="${x.id}">${esc(x.nome)}</button>`).join('');
  const quandoOps = [{ id: 'hoje', nome: 'Hoje' }, { id: 'amanha', nome: 'Amanhã' }, { id: 'semana', nome: 'Esta semana' }, { id: 'data', nome: 'Escolher data' }, { id: 'sem', nome: 'Sem data' }];
  return `<div class="classificar">
    <div class="topo"><div><h1>Classificar</h1><p class="contador">${caixa.length} na Caixa</p></div><a class="btn-3" href="#/tarefas">Sair</a></div>
    <div class="cartao">
      <input class="campo-grande" id="cl-texto" value="${esc(t.texto)}" aria-label="Tarefa" style="width:100%;font-family:var(--serif);font-size:20px">
      <div class="grupo"><span>Quando</span><div class="chips">${chips('quando', quandoOps)}</div>
        <div class="linha" style="margin-top:8px"><input type="date" class="campo" id="cl-data" value="${esc(escolha.data)}" ${escolha.quando === 'data' ? '' : 'hidden'}>
        <label class="linha" id="cl-hora-rot" style="gap:6px;font-size:13px;color:var(--texto-2)" ${['hoje', 'amanha', 'data'].includes(escolha.quando) ? '' : 'hidden'}>Horário (opcional)<input type="time" class="campo" id="cl-hora" value="${esc(escolha.hora || '')}"></label></div></div>
      <div class="grupo"><span>Prioridade</span><div class="chips">${chips('prioridade', L().prioridades)}</div></div>
      <div class="grupo"><span>Categoria</span><div class="chips">${chips('categoria', L().categorias)}</div></div>
      <div class="grupo"><span>Tempo</span><div class="chips">${chips('tempo', L().tempos)}</div></div>
      ${projetosAtivos().length ? `<div class="grupo"><span>Projeto</span><div class="chips">${chips('projeto', projetosAtivos())}</div></div>` : ''}
      <div class="grupo" id="cl-passo-grupo" ${R.ehLonga(L(), escolha.tempo) ? '' : 'hidden'}><span>Qual é o primeiro passo?</span>
        <input class="campo" id="cl-passo" style="width:100%" placeholder="Uma ação bem pequena (pode pular)" value="${esc(escolha.passo)}"></div>
      <div class="linha" style="margin-top:22px"><button class="btn" data-acao="classificarPronto">Pronto →</button><button class="btn btn-2" data-acao="classificarPular">Pular</button><span class="espaco"></span><button class="btn-perigo btn" data-acao="classificarApagar">Apagar</button></div>
    </div></div>`;
}

// ---------- Janela de tarefa (detalhes) ----------
function abrirTarefa(id) {
  const s = st();
  const t = id ? s.tarefas.find((x) => x.id === id) : { id: '', texto: '', classificada: true, quando: 'sem' };
  if (!t) return;
  const opc = (lista, sel) => `<option value="">—</option>${lista.map((x) => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}`;
  const rep = t.repetir || {};
  const dias = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  janela.innerHTML = `<form class="janela" data-form="tarefa" data-id="${t.id}" method="dialog">
    <h2>${id ? 'Tarefa' : 'Nova tarefa'}</h2>
    <label>Tarefa<input class="campo" name="texto" value="${esc(t.texto)}" required></label>
    <p class="dica" data-mostra="quando-ate-dica" ${t.quando === 'ate' ? '' : 'hidden'} style="margin:0">Com prazo, a tarefa aparece todo dia no Hoje até você terminar. Escreva abaixo um pedaço pequeno para cada dia.</p>
    <label data-mostra="quando-ate" ${t.quando === 'ate' ? '' : 'hidden'}>Pedaço de cada dia (opcional)<input class="campo" name="pedaco" value="${esc(t.pedaco || '')}" placeholder="Ex.: 20 páginas, 1 parte do PDF, 2 slides"></label>
    <div class="duas">
      <label>Quando<select class="campo" name="quando" data-muda="quando">
        <option value="sem" ${t.quando === 'sem' || !t.quando ? 'selected' : ''}>Sem data</option>
        <option value="semana" ${t.quando === 'semana' ? 'selected' : ''}>Esta semana</option>
        <option value="data" ${t.quando === 'data' ? 'selected' : ''}>No dia</option>
        <option value="ate" ${t.quando === 'ate' ? 'selected' : ''}>Até o dia (prazo)</option></select></label>
      <div data-mostra="quando-data" class="duas" ${t.quando === 'data' || t.quando === 'ate' ? '' : 'hidden'} style="gap:8px"><label>Dia<input type="date" class="campo" name="data" value="${esc(t.data || '')}"></label><label data-mostra="quando-hora" ${t.quando === 'ate' ? 'hidden' : ''}>Horário (opcional)<input type="time" class="campo" name="hora" value="${esc(t.hora || '')}"></label></div>
    </div>
    <div class="duas">
      <label>Prioridade<select class="campo" name="prioridade">${opc(L().prioridades, t.prioridade)}</select></label>
      <label>Categoria<select class="campo" name="categoria">${opc(L().categorias, t.categoria)}</select></label>
    </div>
    <div class="duas">
      <label>Tempo<select class="campo" name="tempo">${opc(L().tempos, t.tempo)}</select></label>
      <label>Repetir<select class="campo" name="repetir" data-muda="repetir">
        <option value="">Não repete</option>
        <option value="dia" ${rep.tipo === 'dia' ? 'selected' : ''}>Todo dia</option>
        <option value="semana" ${rep.tipo === 'semana' ? 'selected' : ''}>Toda semana</option>
        <option value="mes" ${rep.tipo === 'mes' ? 'selected' : ''}>Todo mês</option>
        <option value="ano" ${rep.tipo === 'ano' ? 'selected' : ''}>Todo ano</option></select></label>
    </div>
    <div data-mostra="rep-semana" ${rep.tipo === 'semana' ? '' : 'hidden'}><div class="dias">${dias.map((n, i) => `<label><input type="checkbox" name="repDia" value="${i}" ${(rep.dias || []).includes(i) ? 'checked' : ''}>${n}</label>`).join('')}</div></div>
    <label data-mostra="rep-mes" ${rep.tipo === 'mes' ? '' : 'hidden'}>Dia do mês<input type="number" min="1" max="31" class="campo" name="repDiaMes" value="${esc(rep.dia || 10)}"></label>
    <label data-mostra="rep-ano" ${rep.tipo === 'ano' ? '' : 'hidden'}>Data (dia e mês)<input type="date" class="campo" name="repAno" value="${rep.tipo === 'ano' ? `${new Date().getFullYear()}-${String(rep.mes).padStart(2, '0')}-${String(rep.dia).padStart(2, '0')}` : ''}"></label>
    <label>Projeto<select class="campo" name="projeto">${opcProjetos(t.projeto)}</select></label>
    <label>Primeiro passo (opcional)<input class="campo" name="primeiroPasso" value="${esc(t.primeiroPasso || '')}" placeholder="Uma ação bem pequena para destravar"></label>
    <div class="botoes">${id ? '<button type="button" class="btn btn-perigo" data-acao="apagarTarefa" data-id="' + t.id + '">Apagar</button>' : ''}${id && !t.feitaEm ? '<button type="button" class="btn btn-2" data-acao="fazerAgora" data-id="' + t.id + '">▶ Vou fazer agora</button>' : ''}<span class="espaco"></span>
      <button type="button" class="btn btn-3" data-acao="fecharJanela">Cancelar</button><button class="btn" type="submit">Salvar</button></div>
  </form>`;
  janela.showModal();
}
function salvarTarefa(form) {
  const f = new FormData(form);
  const id = form.dataset.id;
  const d = hoje();
  const tipoRep = f.get('repetir');
  let repetir = null;
  if (tipoRep === 'dia') repetir = { tipo: 'dia' };
  if (tipoRep === 'semana') { const ds = f.getAll('repDia').map(Number); repetir = { tipo: 'semana', dias: ds.length ? ds : [R.diaSemana(d)] }; }
  if (tipoRep === 'mes') repetir = { tipo: 'mes', dia: Math.min(31, Math.max(1, Number(f.get('repDiaMes')) || 1)) };
  if (tipoRep === 'ano') { const v = f.get('repAno') || d; repetir = { tipo: 'ano', mes: Number(v.slice(5, 7)), dia: Number(v.slice(8, 10)) }; }
  const base = {
    texto: String(f.get('texto')).trim(), prioridade: f.get('prioridade'), categoria: f.get('categoria'), tempo: f.get('tempo'),
    primeiroPasso: String(f.get('primeiroPasso') || '').trim(), repetir, classificada: true, projeto: f.get('projeto') || '',
  };
  let quando = f.get('quando');
  let dataT = f.get('data') || '';
  if (quando === 'data' && !dataT) dataT = d;
  if (quando === 'ate' && !dataT) dataT = R.somaDias(d, 7);
  if (repetir) {
    quando = 'data';
    const ainda = dataT && R.repeteEm(repetir, dataT) ? dataT : R.primeiraRepeticao(repetir, d);
    dataT = ainda;
  }
  Object.assign(base, { quando, data: quando === 'data' || quando === 'ate' ? dataT : null, semanaFim: quando === 'semana' ? R.domingo(d) : null, hora: quando === 'data' ? (f.get('hora') || '') : '', pedaco: quando === 'ate' ? String(f.get('pedaco') || '').trim() : '' });
  S.mudar((s) => {
    if (id) Object.assign(s.tarefas.find((x) => x.id === id), base);
    else s.tarefas.push({ id: S.uid(), criadaEm: S.agora(), ...base });
  });
  janela.close();
  redesenhar();
}

// ======================================================================
// HÁBITOS (mês)
// ======================================================================
let mesHabitos = '';
function telaHabitosMes() {
  const s = st();
  const ym = mesHabitos || R.mesDe(hoje());
  const [a, m] = ym.split('-').map(Number);
  const n = R.ultimoDiaMes(a, m);
  const dias = Array.from({ length: n }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
  return `<div class="topo"><div><h1>Hábitos</h1><p>${esc(R.nomeMes(ym))} de ${a}</p></div>
    <div class="linha"><button class="icone" data-acao="mesHab" data-d="-1" aria-label="Mês anterior">‹</button><button class="icone" data-acao="mesHab" data-d="1" aria-label="Próximo mês">›</button><a class="btn btn-2" href="#/ajustes">Editar hábitos</a></div></div>
    <div class="cartao" style="overflow-x:auto">
    ${s.habitos.length ? `<table class="grade-habitos"><tr><th class="nome"></th>${dias.map((x) => `<th>${Number(x.slice(8))}</th>`).join('')}<th class="nome" style="padding-left:12px">Sequência</th></tr>
    ${s.habitos.map((h) => `<tr><td class="nome">${esc(h.emoji || '')} ${esc(h.nome)}</td>${dias.map((x) => {
      const previsto = (h.dias || []).includes(R.diaSemana(x));
      const sim = (s.habitosFeitos[x] || []).includes(h.id);
      return `<td><span class="ponto ${sim ? 'sim' : ''} ${!previsto && !sim ? 'nao-previsto' : ''}"></span></td>`;
    }).join('')}<td class="nome" style="padding-left:12px">${R.sequencia(h, s.habitosFeitos, hoje())} dias</td></tr>`).join('')}</table>` : '<p class="vazio">Nenhum hábito ainda. Crie os seus em Ajustes.</p>'}
    </div>`;
}

// ======================================================================
// COMEÇAR PEQUENO / FOCO / POMODORO
// ======================================================================
let opcoes = [];
let opcaoIdx = 0;
function comecarPequeno() {
  const s = st();
  opcoes = R.opcoesComecar(s.tarefas, L(), s.aquecimentos, hoje());
  opcaoIdx = 0;
  mostrarOpcao();
}
function mostrarOpcao() {
  if (!opcoes.length) {
    janela.innerHTML = `<div class="janela"><h2>Começar pequeno</h2><p class="muted">Ainda não há nada pequeno para sugerir. Escreva um primeiro passo numa tarefa ou crie aquecimentos em Ajustes.</p><div class="botoes"><button class="btn" data-acao="fecharJanela">Ok</button></div></div>`;
    janela.showModal();
    return;
  }
  const o = opcoes[opcaoIdx % opcoes.length];
  const rot = { passo: 'Primeiro passo', tarefa: 'Tarefa rápida', aquecimento: 'Aquecimento' }[o.tipo];
  janela.innerHTML = `<div class="janela" style="text-align:center;padding:34px 30px">
    <span class="muted" style="text-transform:uppercase;letter-spacing:.08em;font-size:12px;font-weight:600">${rot}</span>
    <p style="font-family:var(--serif);font-size:26px;line-height:1.3;margin:6px 0">${esc(o.texto)}</p>
    ${o.de ? `<p class="muted" style="margin:0">de: ${esc(o.de)}</p>` : ''}
    <div class="linha" style="justify-content:center;margin-top:18px"><button class="btn" data-acao="comecarFoco">Começar</button><button class="btn btn-2" data-acao="outraOpcao">Outra</button></div>
    <button class="btn-3" data-acao="fecharJanela" style="margin-top:4px">Agora não</button></div>`;
  if (!janela.open) janela.showModal();
}
function iniciarFoco(texto, tarefaId) {
  S.mudar((s) => {
    s.foco = { texto, tarefaId: tarefaId || '', modo: 'curto', inicio: Date.now(), fim: Date.now() + 5 * 60000, ciclo: 1, mini: false, acabou: false };
    logar('inicios');
  });
  desenharFoco();
}
const pomo = () => st().ajustes.pomodoro;
// Post mudou de situação: tarefas de prazo acompanham, e o avanço entra no resumo da semana.
function postMudouSituacao(s, p, antes) {
  s.tarefas = R.tarefasConformeSituacao(s.tarefas, p, hoje());
  const n = (x) => R.ORDEM_POST.indexOf(x);
  if (n(antes) < n('gravado') && n(p.situacao) >= n('gravado')) logar('postsGravados');
  if (n(antes) < n('postado') && n(p.situacao) >= n('postado')) logar('postsPostados');
}
// Tarefa de prazo concluída: marca a etapa da aula como pronta ou avança o post.
function etapaFeitaPelaTarefa(s, t) {
  if (t && t.postId && t.feitaEm) {
    const p = s.posts.find((x) => x.id === t.postId);
    if (p) { const antes = p.situacao; p.situacao = R.situacaoPelaTarefa(p, t); if (p.situacao !== antes) postMudouSituacao(s, p, antes); }
    return;
  }
  if (!t || !t.aulaId || !t.feitaEm) return;
  const a = s.aulas.find((x) => x.id === t.aulaId);
  if (!a) return;
  a.etapas = a.etapas || {};
  if (!a.etapas[t.etapa]) { a.etapas[t.etapa] = t.feitaEm; logar('etapas'); }
}
// "Vou fazer agora": abre o Pomodoro direto, ligado à tarefa (Concluí marca a tarefa como feita).
function fazerAgora(id) {
  const t = st().tarefas.find((x) => x.id === id);
  if (!t) return;
  if (janela.open) janela.close();
  S.mudar((s) => {
    s.foco = { texto: t.texto, tarefaId: t.id, modo: 'foco', inicio: Date.now(), fim: Date.now() + pomo().foco * 60000, ciclo: 1, mini: false, acabou: false };
    logar('inicios');
  });
  desenharFoco();
}
function iniciarPomodoro() {
  S.mudar((s) => { s.foco = { ...s.foco, modo: 'foco', fim: Date.now() + pomo().foco * 60000, ciclo: 1, acabou: false }; });
  desenharFoco();
}
function somSuave() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.35);
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.35 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.35 + 0.9);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + i * 0.35); o.stop(ctx.currentTime + i * 0.35 + 1);
    });
  } catch { /* sem som */ }
}
function mmss(ms) { const t = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; }
// Avança o Pomodoro quando o tempo acaba (também se a tela ficou fechada).
function avancarFoco() {
  const f = st().foco;
  if (!f || f.acabou) return false;
  if (f.modo === 'livre') return false;
  if (Date.now() < f.fim) return false;
  if (f.modo === 'curto') { S.mudar((s) => { s.foco.acabou = true; }); somSuave(); return true; }
  const p = pomo();
  S.mudar((s) => {
    const x = s.foco;
    if (x.modo === 'foco') {
      logar('pomodoros');
      const longa = x.ciclo % p.ciclos === 0;
      x.modo = longa ? 'longa' : 'pausa';
      x.fim = x.fim + (longa ? p.longa : p.pausa) * 60000;
    } else {
      x.modo = 'foco'; x.ciclo += 1; x.fim = x.fim + p.foco * 60000;
    }
    if (x.fim < Date.now()) x.fim = Date.now() + (x.modo === 'foco' ? p.foco : p.pausa) * 60000;
  });
  somSuave();
  return true;
}
function desenharFoco() {
  const el = $('#foco');
  const f = st().foco;
  if (!f) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.classList.toggle('mini', !!f.mini);
  const resta = f.modo === 'livre' ? Date.now() - f.inicio : f.fim - Date.now();
  const rot = { curto: 'Só 5 minutos', livre: 'Continuando', foco: `Pomodoro · foco ${f.ciclo}`, pausa: 'Pausa', longa: 'Pausa longa' }[f.modo];
  if (f.mini) {
    el.innerHTML = `<button class="pilula" data-acao="focoAbrir">${esc(rot)} · <span data-relogio>${mmss(resta)}</span></button>`;
    return;
  }
  const opcoesFim = f.modo === 'curto' && f.acabou;
  el.innerHTML = `<div class="foco-caixa">
    <span class="rot">${esc(rot)}</span>
    <h2>${esc(f.texto)}</h2>
    <div class="relogio ${f.modo === 'pausa' || f.modo === 'longa' ? 'pausa' : ''}" data-relogio>${opcoesFim ? '05:00' : mmss(resta)}</div>
    ${opcoesFim ? `<p style="font-family:var(--serif);font-size:20px;margin:-6px 0 18px">Você começou. Isso já conta.</p>
      <div class="linha"><button class="btn" data-acao="focoContinuar">Continuar</button><button class="btn btn-2" data-acao="focoPomodoro">Pomodoro</button><button class="btn btn-2" data-acao="focoConclui">Concluí</button><button class="btn-3" data-acao="focoParar">Parar aqui</button></div>`
    : `<div class="linha">${f.modo === 'curto' || f.modo === 'livre' ? '<button class="btn btn-2" data-acao="focoPomodoro">Pomodoro</button>' : ''}${f.tarefaId ? '<button class="btn btn-2" data-acao="focoConclui">Concluí</button>' : '<button class="btn btn-2" data-acao="focoConclui">Feito</button>'}<button class="btn-3" data-acao="focoMini">Minimizar</button><button class="btn-3" data-acao="focoParar">Parar</button></div>`}
  </div>`;
}
setInterval(() => {
  const f = st() && st().foco;
  if (!f) return;
  if (avancarFoco()) { desenharFoco(); return; }
  const r = $('[data-relogio]');
  if (r && !(f.modo === 'curto' && f.acabou)) r.textContent = mmss(f.modo === 'livre' ? Date.now() - f.inicio : f.fim - Date.now());
}, 1000);

// ======================================================================
// ROTEIROS (aulas e posts)
// ======================================================================
let buscaRot = '';
let filtroPost = { formato: '', funcao: '', serie: '' };
let verPostados = false;
let verTodasIdeias = false;
const grupoAberto = { posts: new Set(), aulas: new Set() };
// Cartões de cada grupo (Ideia, Roteiro…): mostram só o primeiro item; o resto abre ao tocar.
function cartoesGrupos(tipo, grupos, linha, extra = () => '') {
  const busca = !!buscaRot.trim();
  return grupos.map((g) => {
    const varios = g.itens.length > 1;
    const aberto = busca || grupoAberto[tipo].has(g.id);
    const mostrar = aberto ? g.itens : g.itens.slice(0, 1);
    const titulo = varios && !busca
      ? `<button class="grupo-topo" data-acao="abrirGrupo" data-tipo="${tipo}" data-id="${g.id}" aria-expanded="${aberto}"><h2>${esc(g.nome)}</h2><span class="seta" aria-hidden="true">›</span></button>`
      : `<h2>${esc(g.nome)}</h2>`;
    return `<section class="cartao grupo ${aberto ? 'aberto' : ''}"><div class="secao-titulo">${titulo}${aberto ? extra(g) : ''}</div>
      ${g.itens.length ? `<ul class="lista">${mostrar.map(linha).join('')}</ul>${varios && !busca ? `<button class="mais-links" data-acao="abrirGrupo" data-tipo="${tipo}" data-id="${g.id}">${aberto ? 'Mostrar só o primeiro' : 'Ver os outros'}</button>` : ''}` : `<p class="vazio">${g.total ? 'Nada no último mês.' : 'Nada aqui.'}</p>`}</section>`;
  });
}
const textoPuro = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
const casa = (txt) => !buscaRot || txt.toLowerCase().includes(buscaRot.toLowerCase());

function cartaoAula(a, d, mostrarOnde = true) {
  const etapas = L().etapasAula;
  const prox = R.proximaEtapa(a, etapas);
  const atras = a.semana && a.semana < R.segunda(d) && !R.pronta(a, etapas);
  return `<div class="aula ${atras ? 'atrasada' : ''}">
    <div class="aula-cab"><span class="titulo" data-acao="irAula" data-id="${a.id}">${esc(a.titulo || 'Aula sem título')}</span>
      ${mostrarOnde ? `<span class="onde">${esc([nomeDe(L().produtos, a.produto), a.modulo].filter(Boolean).join(' · '))}</span>` : ''}
      ${a.semana ? `<span class="onde">· semana de ${esc(R.ddmm(a.semana))}</span>` : ''}
      ${R.pronta(a, etapas) ? '<span class="tag v">Pronta</span>' : ''}</div>
    <div class="etapas">${etapas.map((e) => `<button class="etapa ${a.etapas && a.etapas[e.id] ? 'feita' : ''} ${prox && prox.id === e.id ? 'proxima' : ''}" data-acao="etapa" data-id="${a.id}" data-etapa="${e.id}">${esc(e.nome)}</button>`).join('')}</div>
  </div>`;
}

function telaRoteiros(aba = 'aulas') {
  const s = st();
  const d = hoje();
  const etapas = L().etapasAula;
  const abas = `<div class="abas"><a href="#/roteiros/aulas" class="${aba === 'aulas' ? 'sel' : ''}">Aulas</a><a href="#/roteiros/posts" class="${aba === 'posts' ? 'sel' : ''}">Posts</a></div>`;
  const busca = `<input class="busca" type="search" placeholder="Buscar em títulos e roteiros…" value="${esc(buscaRot)}" data-busca="roteiros">`;
  if (aba === 'posts') return abas + telaPosts(busca);

  const aulas = s.aulas.filter((a) => casa(`${a.titulo} ${a.modulo} ${textoPuro(a.texto)}`));
  const semana = R.aulasDaSemana(aulas, d);
  const atrasadas = R.aulasAtrasadas(aulas, etapas, d);
  const linhaAula = (a) => `<li class="item"><div class="principal" data-acao="irAula" data-id="${a.id}"><b>${esc(a.titulo || 'Aula sem título')}</b><small>${esc([nomeDe(L().produtos, a.produto), a.modulo, a.semana ? `semana de ${R.ddmm(a.semana)}` : 'sem semana'].filter(Boolean).join(' · '))}</small></div><span class="mini-prog">${R.etapasFeitas(a, etapas)}/${etapas.length}</span></li>`;
  return `${abas}
  <div class="topo"><div><h1>Aulas</h1></div><div class="linha">${busca}<button class="btn" data-acao="novaAula">+ Aula</button></div></div>
  <section class="cartao"><h2>Esta semana</h2>
    ${semana.length || atrasadas.length ? [...atrasadas, ...semana].map((a) => cartaoAula(a, d)).join('') : '<p class="vazio">Nenhuma aula planejada para esta semana.</p>'}
  </section>
  ${(() => { const c = cartoesGrupos('aulas', R.gruposAulas(aulas, etapas).filter((g, i) => i === 0 || g.itens.length), linhaAula); const m = Math.ceil(c.length / 2); return `<div class="grade-2 iguais grupos" style="margin-top:18px"><div>${c.slice(0, m).join('')}</div><div>${c.slice(m).join('')}</div></div>`; })()}
  ${!aulas.length ? '<p class="vazio">Nenhuma aula ainda.</p>' : ''}`;
}

function telaPosts(busca) {
  const s = st();
  const d = hoje();
  const series = [...new Set(s.posts.map((p) => p.serie).filter(Boolean))].sort();
  let posts = s.posts.filter((p) => casa(`${p.titulo} ${p.serie} ${textoPuro(p.texto)}`));
  if (filtroPost.formato) posts = posts.filter((p) => p.formato === filtroPost.formato);
  if (filtroPost.funcao) posts = posts.filter((p) => p.funcao === filtroPost.funcao);
  if (filtroPost.serie) posts = posts.filter((p) => p.serie === filtroPost.serie);
  const sel = (nome, lista, valor) => `<select class="campo" data-filtro-post="${nome}"><option value="">${{ formato: 'Formato', funcao: 'Função', serie: 'Série' }[nome]}: todos</option>${lista.map((x) => `<option value="${esc(x.id)}" ${valor === x.id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select>`;
  const linha = (p) => `<li class="item"><div class="principal" data-acao="irPost" data-id="${p.id}"><b style="${R.postAtrasado(p, d) ? 'color:var(--rose-1)' : ''}">${esc(p.titulo)}</b><small>${esc([p.serie, p.data ? R.quando(p.data, d) : ''].filter(Boolean).join(' · '))}</small></div>
    ${p.formato ? `<span class="tag">${esc(nomeDe(L().formatos, p.formato))}</span>` : ''}${p.funcao ? `<span class="tag v">${esc(nomeDe(L().funcoes, p.funcao))}</span>` : ''}</li>`;
  const umMes = R.somaDias(d, -31);
  const grupos = L().situacoesPost.map((sit) => {
    const itens = posts.filter((p) => p.situacao === sit.id).sort((a, b) => (a.data || '9').localeCompare(b.data || '9') || (a.criadaEm || '').localeCompare(b.criadaEm || '') || (a.ordem ?? 0) - (b.ordem ?? 0));
    return { id: sit.id, nome: sit.nome, itens };
  });
  const extra = (g) => (g.id === 'postado' && g.itens.some((p) => p.data && p.data < umMes) ? `<button class="btn-3" data-acao="verPostados">${verPostados ? 'Só o último mês' : 'Ver todos'}</button>` : '');
  if (!verPostados) { const g = grupos.find((x) => x.id === 'postado'); if (g) g.itensLista = g.itens.filter((p) => !p.data || p.data >= umMes); }
  return `<div class="topo"><div><h1>Posts</h1></div><div class="linha">${busca}<button class="btn" data-acao="novoPost">+ Post</button></div></div>
    <div class="filtros">${sel('formato', L().formatos, filtroPost.formato)}${sel('funcao', L().funcoes, filtroPost.funcao)}${sel('serie', series.map((x) => ({ id: x, nome: x })), filtroPost.serie)}</div>
    ${(() => { const c = cartoesGrupos('posts', grupos.map((g) => (g.itensLista ? { ...g, itens: g.itensLista, total: g.itens.length } : g)), linha, extra); return `<div class="grade-2 iguais grupos"><div>${c[0]}</div><div>${c.slice(1).join('')}</div></div>`; })()}`;
}

// ---------- Editor de roteiro ----------
const ferramentas = `<div class="ferramentas">
  <button type="button" data-cmd="h2" title="Título"><b>T</b></button>
  <button type="button" data-cmd="h3" title="Subtítulo"><b style="font-size:12px">T</b></button>
  <button type="button" data-cmd="p" title="Texto normal">¶</button>
  <button type="button" data-cmd="ul" title="Lista">• Lista</button>
  <button type="button" data-cmd="bold" title="Negrito"><b>N</b></button>
  <button type="button" data-cmd="mark" title="Destaque"><span style="background:var(--rose-4);padding:0 4px">Destaque</span></button>
  <span class="sep"></span>
  <button type="button" data-acao="inserirTrecho">❝ Trecho de livro</button>
  <span class="espaco"></span><span class="salvo" data-salvo></span>
</div>`;
function telaAula(id) {
  const a = st().aulas.find((x) => x.id === id);
  if (!a) return '<p class="vazio">Aula não encontrada. <a href="#/roteiros/aulas">Voltar</a></p>';
  const opc = (lista, sel) => `<option value="">—</option>${lista.map((x) => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}`;
  return `<div class="editor-topo"><a class="btn-3" href="#/roteiros/aulas">← Aulas</a><span class="espaco"></span>
    <button class="btn btn-2 btn-pequeno" data-acao="copiarTexto">Copiar texto</button><button class="btn btn-2 btn-pequeno" data-acao="imprimir">Imprimir / PDF</button><button class="btn btn-2 btn-pequeno" data-acao="duplicar" data-tipo="aula" data-id="${a.id}">Duplicar</button><button class="btn btn-perigo btn-pequeno" data-acao="apagarRoteiro" data-tipo="aula" data-id="${a.id}">Apagar</button></div>
  <textarea class="titulo-editor" rows="1" data-campo-aula="titulo" placeholder="Título da aula">${esc(a.titulo)}</textarea>
  <div class="campos">
    <label>Produto<select class="campo" data-campo-aula="produto">${opc(L().produtos, a.produto)}</select></label>
    <label>Módulo<input class="campo" data-campo-aula="modulo" value="${esc(a.modulo || '')}" placeholder="Ex.: Módulo 2"></label>
    <label>Semana planejada<input type="date" class="campo" data-campo-aula="semana" value="${esc(a.semana || '')}"></label>
    <label>Link do PDF<input class="campo" data-campo-aula="pdf" value="${esc(a.pdf || '')}" placeholder="https://…"></label>
    ${a.pdf ? `<a class="link-acao" href="${esc(a.pdf)}" target="_blank" rel="noopener" style="margin-top:16px">Abrir PDF</a>` : ''}
  </div>
  <div class="prazos-aula nao-imprimir">${L().etapasAula.map((e) => {
    const feita = a.etapas && a.etapas[e.id];
    const t = R.tarefaDaEtapa(st().tarefas, a.id, e.id);
    const prazo = t ? t.data : '';
    const atras = prazo && !feita && prazo < hoje();
    return `<div class="prazo-etapa"><button class="etapa ${feita ? 'feita' : ''} ${(R.proximaEtapa(a, L().etapasAula) || {}).id === e.id ? 'proxima' : ''}" data-acao="etapa" data-id="${a.id}" data-etapa="${e.id}">${esc(e.nome)}</button>
      <label class="prazo-campo ${atras ? 'atrasado' : ''}"><span>Prazo</span><input type="date" class="campo" data-prazo-etapa="${e.id}" value="${esc(prazo || '')}"></label>
      ${prazo && !feita ? `<span class="quando ${atras ? 'q-atraso' : 'q-depois'}">${esc(R.quando(prazo, hoje()))}</span>` : ''}</div>`;
  }).join('')}<p class="muted dica-prazo">Cada prazo vira uma tarefa com data, que aparece no Hoje. Quando a etapa fica pronta, a tarefa é marcada como feita (e vice-versa).</p></div>
  ${ferramentas}
  <div class="editor" contenteditable="true" data-editor="aula" data-id="${a.id}">${a.texto || ''}</div>`;
}
function telaPost(id) {
  const p = st().posts.find((x) => x.id === id);
  if (!p) return '<p class="vazio">Post não encontrado. <a href="#/roteiros/posts">Voltar</a></p>';
  const opc = (lista, sel, vazio = '—') => `<option value="">${vazio}</option>${lista.map((x) => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}`;
  const series = [...new Set(st().posts.map((x) => x.serie).filter(Boolean))];
  return `<div class="editor-topo"><a class="btn-3" href="#/roteiros/posts">← Posts</a><span class="espaco"></span>
    <a class="btn btn-pequeno" href="#/estudio/${p.id}">✦ ${p.estudio ? 'Continuar no Estúdio' : 'Criar no Estúdio'}</a>
    <button class="btn btn-2 btn-pequeno" data-acao="copiarTexto">Copiar texto</button><button class="btn btn-2 btn-pequeno" data-acao="imprimir">Imprimir / PDF</button><button class="btn btn-2 btn-pequeno" data-acao="duplicar" data-tipo="post" data-id="${p.id}">Duplicar</button><button class="btn btn-perigo btn-pequeno" data-acao="apagarRoteiro" data-tipo="post" data-id="${p.id}">Apagar</button></div>
  <textarea class="titulo-editor" rows="1" data-campo-post="titulo" placeholder="Título do post">${esc(p.titulo)}</textarea>
  <div class="campos">
    <label>Situação<select class="campo" data-campo-post="situacao">${L().situacoesPost.map((x) => `<option value="${x.id}" ${x.id === p.situacao ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></label>
    <label>Formato<select class="campo" data-campo-post="formato">${opc(L().formatos, p.formato)}</select></label>
    <label>Função<select class="campo" data-campo-post="funcao">${opc(L().funcoes, p.funcao)}</select></label>
    <label>Projeto<select class="campo" data-campo-post="projeto">${opcProjetos(p.projeto)}</select></label>
    <label>Série<input class="campo" data-campo-post="serie" value="${esc(p.serie || '')}" list="lista-series" placeholder="Opcional"><datalist id="lista-series">${series.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></label>
    ${R.ETAPAS_POST.map((e) => { const t = R.tarefaDoPost(st().tarefas, p.id, e.id); return `<label>${e.id === 'roteiro' ? 'Prazo do roteiro' : 'Prazo para gravar'}<input type="date" class="campo" data-prazo-post="${e.id}" value="${esc(t ? t.data : '')}"></label>`; }).join('')}
    <label>Data de postar<input type="date" class="campo" data-campo-post="data" value="${esc(p.data || '')}"></label>
    <label>Link<input class="campo" data-campo-post="link" value="${esc(p.link || '')}" placeholder="Opcional"></label>
  </div>
  ${ferramentas}
  <div class="editor" contenteditable="true" data-editor="post" data-id="${p.id}">${p.texto || ''}</div>
  ${p.situacao !== 'postado' && (p.estudio || textoPuro(p.texto).trim()) ? checagemPost(p) : ''}`;
}
function checagemPost(p) {
  const e = E.estudioDe(p);
  const n = E.CHECAGEM.filter((c) => e.check[c.id]).length;
  return `<section class="cartao checagem-post nao-imprimir"><div class="secao-titulo"><h2>Antes de gravar</h2><small class="muted">${n} de ${E.CHECAGEM.length}</small></div>
    <ul class="checagem">${E.CHECAGEM.map((c) => `<li><button class="check ${e.check[c.id] ? 'feito' : ''}" data-acao="postCheck" data-id="${c.id}" aria-label="Marcar"></button><span>${esc(c.texto)}</span></li>`).join('')}</ul></section>`;
}

// ---------- Estúdio de Roteiro ----------
// Um passo por vez: a ideia, a gravação, as referências, o começo, o meio, o final e a edição.
let buscaMolde = '';
let verMoldeId = '';
let verTodosMoldes = false;
const moldePorId = (id) => MOLDES.find((m) => m.id === id);
const idsFavoritos = () => (Array.isArray(st().ajustes.moldesFavoritos) ? st().ajustes.moldesFavoritos : E.MOLDES_PADRAO);
function caixaMolde(m) {
  if (!m) return '';
  return `<section class="cartao molde-lado"><h2>Molde</h2><p class="molde-nome"><b>${esc(m.formato)}</b><small>${esc(m.criador)}</small></p>
    <details><summary>Ver o esqueleto</summary><pre class="molde-texto">${esc(m.molde)}</pre></details></section>`;
}
// Miniaturas das imagens do post, para consultar enquanto escreve.
function caixaImagens(e) {
  if (!e.imagens.length) return '';
  return `<section class="cartao"><h2>Suas imagens</h2><div class="imagens-mini">${e.imagens.map((i) => `<figure><img data-img="${esc(i.caminho)}" alt="">${i.nota ? `<figcaption>${esc(i.nota)}</figcaption>` : ''}</figure>`).join('')}</div></section>`;
}
async function preencherImagens() {
  for (const img of $$('img[data-img]:not([src])')) {
    const url = await N.verImagem(img.dataset.img).catch(() => '');
    if (url) img.src = url; else img.classList.add('sem-imagem');
  }
}
function cartaoMolde(m, e) {
  const fav = idsFavoritos().includes(m.id);
  return `<div class="molde-txt ${e.molde === m.id ? 'sel' : ''} ${verMoldeId === m.id ? 'aberto' : ''}">
    <button class="molde-txt-topo" data-acao="verMolde" data-id="${verMoldeId === m.id ? '' : m.id}"><b>${esc(m.formato)}</b><small>${esc(m.criador)}</small><i>“${esc(m.gancho)}”</i>${e.molde === m.id ? '<span class="selo">✓ escolhido</span>' : ''}</button>
    ${verMoldeId === m.id ? `<div class="molde-txt-corpo">${m.conceito ? `<p class="muted"><b>O que ensina:</b> ${esc(m.conceito)}</p>` : ''}<pre class="molde-texto">${esc(m.molde)}</pre>
      <div class="linha"><button class="btn btn-pequeno" data-acao="estudioMolde" data-id="${e.molde === m.id ? '' : m.id}">${e.molde === m.id ? 'Tirar o molde' : 'Usar este molde'}</button>${m.link ? `<a class="btn-3" href="${esc(m.link)}" target="_blank" rel="noopener">Ver o reel</a>` : ''}
      <span class="espaco"></span><button class="btn-3" data-acao="estudioFavorito" data-id="${m.id}">${fav ? '★ Tirar dos 10' : '☆ Pôr nos 10'}</button></div></div>` : ''}
  </div>`;
}
function telaEstudio(id) {
  const p = st().posts.find((x) => x.id === id);
  if (!p) return '<p class="vazio">Post não encontrado. <a href="#/roteiros/posts">Voltar</a></p>';
  const e = E.estudioDe(p);
  const feitos = E.passosFeitos(e);
  const molde = moldePorId(e.molde);
  const i = Math.max(0, E.PASSOS.findIndex((x) => x.id === e.passo));
  const abas = `<div class="abas passos">${E.PASSOS.map((x, n) => `<button class="${x.id === e.passo ? 'sel' : ''} ${feitos[x.id] ? 'feito' : ''}" data-acao="estudioPasso" data-passo="${x.id}"><span class="num">${feitos[x.id] ? '✓' : n + 1}</span>${esc(x.nome)}</button>`).join('')}</div>`;
  const campo = (nome, valor, ph, extra = '') => `<textarea class="campo cresce estudio-campo" rows="2" data-estudio="${nome}" ${extra} placeholder="${esc(ph)}">${esc(valor)}</textarea>`;
  const pergunta = (t) => `<p class="pergunta">${t}</p>`;
  const chips = (nome, opcoes, atual) => `<div class="chips">${opcoes.map((o) => { const v = o.id || o; return `<button class="chip ${atual === v ? 'sel' : ''}" data-acao="estudioEscolha" data-campo="${nome}" data-valor="${esc(v)}">${esc(o.nome || o)}</button>`; }).join('')}</div>`;
  const anotacao = textoPuro(p.texto).replace(/\s+/g, ' ').trim();
  const cartaoIdeia = `<section class="cartao"><h2>A ideia</h2><p class="frase-ideia">${esc(p.titulo || 'Sem título')}</p>${anotacao ? `<p class="muted">${esc(anotacao.length > 500 ? `${anotacao.slice(0, 500)}…` : anotacao)}</p>` : ''}</section>`;
  const lembreteFinal = `<p class="lembrete">Aonde o vídeo quer chegar: <b>${esc(e.final.trim() || '(escreva no passo 1)')}</b></p>`;
  const fala = E.rotuloFala(e);
  setTimeout(() => { preencherImagens(); const a = $('.abas.passos .sel'); if (a) a.scrollIntoView({ block: 'nearest', inline: 'center' }); }, 0);
  let corpo = '';
  if (e.passo === 'ideia') {
    corpo = `<div class="grade-2"><section class="cartao"><h2>Para quem e para quê</h2>
      ${pergunta('Para quem é este vídeo?')}${campo('publico', e.publico, 'Ex.: aluna que está começando a vender vestidos de festa')}
      ${pergunta('O que a pessoa vai levar?')}${chips('objetivo', E.OBJETIVOS, e.objetivo)}
      ${pergunta('Qual frase precisa ficar na cabeça dela?')}${campo('final', e.final, 'Ex.: Corpete não se aperta. Se sustenta.', 'rows="3"')}
      <p class="muted" style="font-size:13px">Pode ser um rascunho. Você volta nela no passo “O final”.</p></section>
      <div>${cartaoIdeia}<section class="cartao dica"><h2>Por que pensar na frase agora</h2><p class="muted">Quando você sabe aonde quer chegar, o meio fica óbvio e o começo vira a parte mais fácil. É o croqui: ninguém corta o tecido antes de saber qual vestido quer.</p></section></div></div>`;
  } else if (e.passo === 'gravacao') {
    const dicas = {
      camera: 'Você aparece falando. O que aparece além de você (peças, gestos, textos) ajuda quem assiste sem som.',
      narrado: 'Sua voz por cima de imagens. Pense numa imagem diferente para cada frase: é aí que o visual explica a fala.',
      semfala: 'Texto na tela e música. Cada tela com uma ideia só, curta, e tempo para ler.',
      tutorial: 'Mostrando as mãos. Grave de cima, com boa luz, e mostre o resultado logo no começo.',
      misto: 'Misture você falando com cenas de apoio. Anote no meio o que aparece em cada parte.',
    };
    corpo = `<div class="grade-2"><section class="cartao"><h2>Como vai ser gravado</h2>
      ${pergunta('Qual é o formato?')}${chips('formato', E.FORMATOS, e.formato)}
      ${pergunta('Quanto tempo, mais ou menos?')}${chips('duracao', E.DURACOES, e.duracao)}
      ${pergunta('Onde você vai gravar?')}${campo('cenario', e.cenario, 'Ex.: no ateliê, na mesa de corte, com luz da janela')}
      ${pergunta('O que vai aparecer?')}${campo('mostrar', e.mostrar, 'Ex.: o vestido no manequim, o corpete por dentro, eu')}</section>
      <div>${e.formato ? `<section class="cartao dica"><h2>${esc(E.formatoDe(e).nome)}</h2><p class="muted">${esc(dicas[e.formato])}</p></section>` : ''}${cartaoIdeia}</div></div>`;
  } else if (e.passo === 'referencias') {
    const favs = E.favoritos(MOLDES, idsFavoritos());
    const todos = E.filtrarMoldes(MOLDES, buscaMolde);
    corpo = `<section class="cartao zona-imagens" data-zona-imagens><div class="secao-titulo"><h2>Imagens para este post</h2>
      <label class="btn btn-pequeno">+ Adicionar imagens<input type="file" accept="image/*" multiple data-img-post hidden></label></div>
      ${N.conectada() ? '' : '<p class="aviso-nuvem">Para guardar imagens, entre na sua conta em Mais → Ajustes.</p>'}
      ${e.imagens.length ? `<div class="imagens-post">${e.imagens.map((im) => `<figure><img data-img="${esc(im.caminho)}" alt=""><input class="campo" data-img-nota="${im.id}" value="${esc(im.nota || '')}" placeholder="Nota: usar no começo, cena 2…"><button class="apagar-img" data-acao="estudioApagarImg" data-id="${im.id}" aria-label="Apagar imagem">×</button></figure>`).join('')}</div>`
        : '<p class="vazio">Fotos das peças, tecidos, prints de inspiração, croquis… No Mac, arraste ou cole (⌘V) aqui. No celular, toque em Adicionar.</p>'}</section>
      <section class="cartao"><div class="secao-titulo"><h2>Moldes</h2>${e.molde ? '' : '<small class="muted">opcional</small>'}</div>
      <p class="muted" style="margin-top:0">Toque num molde para ver como ele funciona.</p>
      <div class="moldes-txt">${favs.map((m) => cartaoMolde(m, e)).join('')}</div>
      <div class="linha" style="margin-top:14px"><button class="btn btn-2" data-acao="verTodosMoldes">${verTodosMoldes ? 'Esconder as outras referências' : `Ver todas as referências (${MOLDES.length})`}</button></div>
      ${verTodosMoldes ? `<div style="margin-top:14px"><input class="campo" data-busca="moldes" value="${esc(buscaMolde)}" placeholder="Buscar: lista, costura, livro…">
        <div class="moldes-txt" style="margin-top:10px">${todos.filter((m) => !idsFavoritos().includes(m.id)).map((m) => cartaoMolde(m, e)).join('') || '<p class="vazio">Nenhum molde com essa busca.</p>'}</div></div>` : ''}
      </section>`;
  } else if (e.passo === 'gancho') {
    corpo = `<div class="grade-2"><section class="cartao"><h2>O começo</h2>
      <p class="muted">Escreva 3 começos para o mesmo final e escolha um.</p>${lembreteFinal}
      ${e.ganchos.map((g, n) => `<div class="opcao-gancho ${e.gancho === n ? 'sel' : ''}"><button class="bolinha" data-acao="estudioGancho" data-i="${n}" aria-label="Escolher a opção ${n + 1}">${e.gancho === n ? '✓' : n + 1}</button>${campo('ganchos', g, e.formato === 'semfala' ? 'O texto da primeira tela' : 'Uma frase que abre a curiosidade para o final', `data-i="${n}"`)}</div>`).join('')}
      ${pergunta('O que aparece na primeira cena?')}${campo('cenaGancho', e.cenaGancho, 'Ex.: o vestido pronto girando, e depois o corte para o avesso')}
      </section>
      <div><section class="cartao"><h2>Tipos de começo da sua coleção</h2><ul class="tipos-gancho">${E.TIPOS_GANCHO.map((x) => `<li><b>${esc(x.nome)}</b><small>“${esc(x.ex)}” · ${esc(x.quem)}</small></li>`).join('')}</ul></section>
      ${molde ? `<section class="cartao"><h2>Começo do molde</h2><p><i>“${esc(molde.gancho)}”</i></p><small class="muted">${esc(molde.criador)}</small></section>` : ''}${caixaImagens(e)}</div></div>`;
  } else if (e.passo === 'meio') {
    corpo = `<div class="grade-2"><section class="cartao"><h2>O meio</h2>
      <p class="muted">Só o que leva até a frase final, no máximo 3 partes.</p>${lembreteFinal}
      ${e.meio.map((m, n) => `<div class="parte-bloco"><span class="parte-num">Parte ${n + 1}</span>
        <label class="parte"><span>${esc(fala)}</span>${campo('meio', m, n === 0 ? 'A situação, o problema ou a cena' : n === 1 ? 'O que ninguém percebe / a explicação' : 'A prova: um número, um caso, um trecho', `data-i="${n}"`)}</label>
        <label class="parte"><span>O que aparece na tela</span>${campo('cenas', e.cenas[n] || '', 'Ex.: close na costura, desenho mostrando a força no tecido', `data-i="${n}" rows="1"`)}</label></div>`).join('')}
      <div class="linha"><button class="btn-3" data-acao="estudioMaisParte">+ Parte</button><button class="btn-3" data-acao="estudioTrecho">❝ Trecho de livro</button></div></section>
      <div>${caixaMolde(molde)}${caixaImagens(e)}</div></div>`;
  } else if (e.passo === 'final') {
    corpo = `<div class="grade-2"><section class="cartao"><h2>O final</h2>
      ${pergunta('A frase que precisa ficar')}${campo('final', e.final, 'Ex.: Corpete não se aperta. Se sustenta.', 'rows="3"')}
      ${pergunta('O que aparece no final?')}${campo('cenaFinal', e.cenaFinal, 'Ex.: o vestido na cliente, você olhando para a câmera')}
      ${pergunta('O que a pessoa deve fazer quando o vídeo acabar?')}${chips('acao', E.ACOES, e.acao)}
      ${e.acao && e.acao !== 'Só a frase final' ? `${pergunta('Como você vai pedir? (opcional)')}${campo('cta', e.cta, 'Ex.: Guarda para o próximo vestido de festa.')}` : ''}</section>
      <div>${cartaoIdeia}${caixaImagens(e)}</div></div>`;
  } else {
    const montado = E.montarHTML(e, molde, esc);
    corpo = `<div class="grade-2"><section class="cartao"><h2>Edição e postagem</h2>
      ${pergunta('O que o visual vai explicar?')}${campo('visuais', e.visuais, 'Animações, ilustrações, setas, textos que mostram o que você está falando. Ex.: desenho do corpete com as barbatanas aparecendo', 'rows="3"')}
      ${pergunta('Texto da capa')}${campo('capa', e.capa, 'Poucas palavras, que façam querer abrir')}
      ${pergunta('Música')}${campo('musica', e.musica, 'Ex.: instrumental calma, sem letra')}
      ${pergunta('Legenda do post')}${campo('legenda', e.legenda, 'O texto que vai embaixo do vídeo', 'rows="4"')}</section>
      <div><section class="cartao dica"><h2>O visual explica a fala</h2><p class="muted">Para cada frase importante, pergunte: que imagem mostraria isso sem eu precisar falar? Um desenho, um antes e depois, uma seta, um número grande na tela.</p></section>${caixaImagens(e)}</div></div>
      <section class="cartao montar"><div class="secao-titulo"><h2>Como vai ficar</h2><div class="linha"><button class="btn btn-2" data-acao="estudioClaude">Pedir ao Claude</button><button class="btn" data-acao="estudioMontar" ${montado ? '' : 'disabled'}>Montar roteiro no post</button></div></div>
      ${montado ? `<div class="previa">${montado}</div>` : '<p class="vazio">Escreva pelo menos a frase final ou o começo.</p>'}
      <p class="muted" style="font-size:13px;margin:12px 0 0">Montar coloca o roteiro no editor do post${p.texto ? ', acima das suas anotações' : ''}, com a lista de gravação, e a ideia passa para Roteiro. A checagem fica no fim da página do post.</p></section>`;
  }
  const ant = E.PASSOS[i - 1];
  const prox = E.PASSOS[i + 1];
  return `<div class="editor-topo"><a class="btn-3" href="#/post/${p.id}">← Post</a><span class="espaco"></span><button class="btn btn-2 btn-pequeno" data-acao="estudioClaude">Pedir ao Claude</button></div>
    <div class="topo" style="margin-bottom:16px"><div><p class="rot-estudio">Estúdio de Roteiro</p><h1>${esc(p.titulo || 'Sem título')}</h1></div></div>
    ${abas}${corpo}
    <div class="linha passos-nav">${ant ? `<button class="btn btn-2" data-acao="estudioPasso" data-passo="${ant.id}">← ${esc(ant.nome)}</button>` : ''}<span class="espaco"></span>${prox ? `<button class="btn" data-acao="estudioPasso" data-passo="${prox.id}">${esc(prox.nome)} →</button>` : ''}</div>`;
}
function mudarEstudio(fn, re = true, id = rota().args[0]) {
  S.mudar((s) => { const p = s.posts.find((x) => x.id === id); if (!p) return; p.estudio = E.estudioDe(p); fn(p.estudio, p); });
  if (re) redesenhar();
}
// Imagens do post: diminui (até 1280 px), guarda na nuvem e anota no estúdio.
function encolherImagem(arquivo, max = 1280) {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => {
      const f = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob((b) => (b ? ok(b) : erro(new Error('imagem'))), 'image/jpeg', 0.82);
    };
    img.onerror = () => erro(new Error('Não consegui abrir essa imagem.'));
    img.src = URL.createObjectURL(arquivo);
  });
}
async function adicionarImagens(arquivos) {
  const lista = [...(arquivos || [])].filter((f) => f.type.startsWith('image/'));
  if (!lista.length) return;
  const postId = rota().args[0];
  if (!N.conectada()) { aviso('Entre na sua conta (Mais → Ajustes) para guardar imagens.'); return; }
  aviso(lista.length > 1 ? `Guardando ${lista.length} imagens…` : 'Guardando a imagem…');
  let ok = 0;
  for (const arq of lista) {
    try {
      const blob = await encolherImagem(arq);
      const id = S.uid();
      const caminho = await N.enviarImagem(blob, id);
      mudarEstudio((e) => { e.imagens.push({ id, caminho, nota: '' }); }, false, postId);
      ok++;
    } catch (err) { aviso(err.message || 'Não consegui guardar a imagem.'); }
  }
  if (ok) { aviso(ok > 1 ? `${ok} imagens guardadas` : 'Imagem guardada'); if (rota().nome === 'estudio') redesenharQuandoLivre(); }
}

let salvarEditorTimer;
function salvarEditor(el) {
  clearTimeout(salvarEditorTimer);
  const marca = $('[data-salvo]');
  if (marca) marca.textContent = 'Salvando…';
  salvarEditorTimer = setTimeout(() => {
    const lista = el.dataset.editor === 'aula' ? 'aulas' : 'posts';
    S.mudar((s) => { const x = s[lista].find((y) => y.id === el.dataset.id); if (x) x.texto = el.innerHTML; });
    if (marca) marca.textContent = 'Salvo';
  }, 400);
}
let ultimaSelecao = null;
function guardarSelecao() {
  const sel = window.getSelection();
  if (sel.rangeCount && $('.editor') && $('.editor').contains(sel.anchorNode)) ultimaSelecao = sel.getRangeAt(0).cloneRange();
}
function comando(cmd) {
  const ed = $('.editor');
  if (!ed) return;
  ed.focus();
  if (cmd === 'h2' || cmd === 'h3' || cmd === 'p') document.execCommand('formatBlock', false, cmd);
  if (cmd === 'ul') document.execCommand('insertUnorderedList');
  if (cmd === 'bold') document.execCommand('bold');
  if (cmd === 'mark') {
    const bg = document.queryCommandValue('backColor');
    const ligado = bg && bg.replace(/\s/g, '') === 'rgb(234,205,196)';
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('backColor', false, ligado ? 'transparent' : '#EACDC4');
    document.execCommand('styleWithCSS', false, false);
  }
  salvarEditor(ed);
}
let temaJanela = '';
function janelaTrechos() {
  const todos = [];
  st().livros.forEach((l) => (l.trechos || []).forEach((t) => todos.push({ ...t, livro: l.nome, autor: l.autor })));
  const trechos = todos.filter((t) => passaTema(t, temaJanela));
  trechos.sort((a, b) => (b.conteudo ? 1 : 0) - (a.conteudo ? 1 : 0));
  janela.innerHTML = `<div class="janela"><h2>Trecho de livro</h2>
    ${todos.length ? chipsTemas(todos, temaJanela, 'temaJanela') : ''}
    ${trechos.length ? `<div style="max-height:50vh;overflow:auto">${trechos.map((t, i) => `<div class="trecho" style="cursor:pointer" data-acao="usarTrecho" data-i="${i}"><q>${esc(t.texto)}</q><small>${esc(t.livro)}${t.autor ? `, ${esc(t.autor)}` : ''}${t.pagina ? ` · p. ${esc(t.pagina)}` : ''}${t.conteudo ? ' · usar em conteúdo' : ''}</small></div>`).join('')}</div>` : '<p class="muted">Nenhum trecho guardado ainda. Guarde trechos em Leituras.</p>'}
    <div class="botoes"><button class="btn btn-3" data-acao="fecharJanela">Fechar</button></div></div>`;
  janela._trechos = trechos;
  if (!janela.open) janela.showModal();
}

// ======================================================================
// LEITURAS
// ======================================================================
let buscaTrecho = '';
function capa(l, grande = false) {
  return l.capa ? `<img class="capa ${grande ? 'grande' : ''}" src="${l.capa}" alt="">` : `<div class="capa ${grande ? 'grande' : ''}">${esc(l.nome)}</div>`;
}
let buscaLivro = '';
const anosAbertos = new Set();
// Lidos separados por ano (de término): o ano atual aberto, os outros fechados com o número de livros.
function lidosPorAno(livros, estante) {
  if (!livros.length) return estante(livros);
  const anoAtual = hoje().slice(0, 4);
  const grupos = new Map();
  R.lidosRecentesPrimeiro(livros).forEach((l) => { const a = (l.fim || '').slice(0, 4) || 'sem'; if (!grupos.has(a)) grupos.set(a, []); grupos.get(a).push(l); });
  return [...grupos.entries()].map(([ano, itens]) => {
    const aberto = ano === anoAtual ? !anosAbertos.has(`-${ano}`) : anosAbertos.has(ano);
    const chave = ano === anoAtual ? `-${ano}` : ano;
    return `<div class="ano-lidos ${aberto ? 'aberto' : ''}"><button class="ano-topo" data-acao="abrirAno" data-ano="${chave}" aria-expanded="${aberto}"><b>${ano === 'sem' ? 'Sem data de término' : ano}</b><span class="muted">${itens.length} ${itens.length === 1 ? 'livro' : 'livros'}</span><span class="seta" aria-hidden="true">›</span></button>${aberto ? estante(itens) : ''}</div>`;
  }).join('');
}
// Livro do clube escolhido no campo com busca (livro atual ou próximos).
function escolherLivroClube(el) {
  if (!el.value.trim()) return;
  if (el.dataset.encontroLivro) {
    const id = livroPeloNome(el.value);
    if (!id) { aviso('Não achei esse livro na estante.'); return; }
    S.mudar((s) => { const e = s.clube.encontros.find((x) => x.id === el.dataset.encontroLivro); if (e) e.livroId = id; });
    el.blur(); aviso('Livro do encontro trocado'); redesenhar(); return;
  }
  const id = livroPeloNome(el.value);
  if (!id) { aviso('Não achei esse livro na estante.'); return; }
  const c = st().clube;
  if (el.matches('[data-add-proximo]')) {
    if (c.proximos.includes(id) || c.livroAtual === id) { aviso('Esse livro já está no clube.'); el.value = ''; return; }
    S.mudar((s) => { s.clube.proximos.push(id); });
  } else {
    if (c.livroAtual === id) return;
    S.mudar((s) => {
      s.clube.livroAtual = id;
      const l = s.livros.find((x) => x.id === id);
      if (l && l.situacao !== 'lido') { l.situacao = 'lendo'; l.inicio = l.inicio || hoje(); }
      s.clube.proximos = s.clube.proximos.filter((x) => x !== id);
    });
  }
  el.blur();
  redesenhar();
}
// Acha o livro pelo nome escolhido na lista (sem diferenciar maiúsculas e acentos).
const livroPeloNome = (nome) => { const q = semAcento(String(nome).trim()); const l = st().livros.find((x) => semAcento(x.nome) === q); return l ? l.id : ''; };
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function telaLeituras(aba = 'estante', encontroId = '') {
  const abas = `<div class="abas"><a href="#/leituras/estante" class="${aba === 'estante' ? 'sel' : ''}">Estante</a><a href="#/leituras/clube" class="${aba === 'clube' ? 'sel' : ''}">Clube do Livro</a><a href="#/leituras/trechos" class="${aba === 'trechos' ? 'sel' : ''}">Trechos</a></div>`;
  if (aba === 'clube') return abas + (encontroId ? telaEncontro(encontroId) : telaClube());
  if (aba === 'trechos') return abas + telaTrechos();
  const s = st();
  const ano = new Date().getFullYear();
  const meta = s.ajustes.metaLivros[ano] || 0;
  const lidos = R.lidosNoAno(s.livros, ano);
  const porSit = (id) => s.livros.filter((l) => l.situacao === id);
  const lendo = porSit('lendo');
  const estante = (arr) => (arr.length ? `<div class="estante">${arr.map((l) => `<div class="livro" data-acao="irLivro" data-id="${l.id}">${capa(l)}<b>${esc(l.nome)}</b><span class="muted">${esc(l.autor || '')}</span></div>`).join('')}</div>` : '<p class="vazio">Nenhum.</p>');
  return `${abas}
  <div class="topo"><div><h1>Leituras</h1><p>${meta ? `${lidos} de ${meta} livros lidos em ${ano}` : `${lidos} ${lidos === 1 ? 'livro lido' : 'livros lidos'} em ${ano}`} · <button class="link-acao" data-acao="metaLivros">${meta ? 'mudar meta' : 'definir meta do ano'}</button></p>
    ${meta ? `<div class="barra" style="width:260px"><i style="width:${Math.min(100, Math.round((lidos / meta) * 100))}%"></i></div>` : ''}</div>
    <div class="linha"><input class="busca" type="search" placeholder="🔍 Buscar livro ou autora…" value="${esc(buscaLivro)}" data-busca="livros"><button class="btn" data-acao="novoLivro">+ Livro</button></div></div>
  ${buscaLivro.trim() ? (() => {
    const q = semAcento(buscaLivro.trim());
    const achados = s.livros.filter((l) => semAcento(`${l.nome} ${l.autor || ''}`).includes(q));
    return `<section class="secao" style="margin-top:0"><h2 style="margin-bottom:12px">${achados.length ? `${achados.length} ${achados.length === 1 ? 'livro encontrado' : 'livros encontrados'}` : 'Nenhum livro encontrado'}</h2>${achados.length ? `<div class="estante">${achados.map((l) => `<div class="livro" data-acao="irLivro" data-id="${l.id}">${capa(l)}<b>${esc(l.nome)}</b><span class="muted">${esc([l.autor, nomeDe(L().situacoesLivro, l.situacao)].filter(Boolean).join(' · '))}</span></div>`).join('')}</div>` : ''}</section>`;
  })() : `<section class="secao" style="margin-top:0"><h2 style="margin-bottom:12px">${esc(nomeDe(L().situacoesLivro, 'lendo'))}</h2>
    ${lendo.length ? `<div class="livros-lendo">${lendo.map((l) => `<div class="cartao livro-card"><div data-acao="irLivro" data-id="${l.id}">${capa(l)}</div><div style="flex:1;min-width:0"><b data-acao="irLivro" data-id="${l.id}" style="cursor:pointer;font-family:var(--serif);font-size:17px">${esc(l.nome)}</b><div class="muted" style="font-size:13px">${esc(l.autor || '')}</div>
      <div class="barra"><i style="width:${R.progressoLivro(l)}%"></i></div><div class="muted" style="font-size:12.5px">${l.paginas ? `${R.progressoLivro(l)}% · página ${l.paginaAtual || 0} de ${l.paginas}` : 'Informe o total de páginas no livro'}</div>
      <form class="linha" data-form="pagina" data-id="${l.id}" style="margin-top:10px"><input class="campo" name="pagina" type="number" min="0" placeholder="Parei na página…" style="width:150px"><button class="btn btn-pequeno" type="submit">Atualizar</button></form></div></div>`).join('')}</div>` : '<p class="vazio">Nenhum livro em leitura.</p>'}
  </section>
  ${['proximo', 'naoiniciado', 'quero', 'lido', 'abandonado'].map((id) => `<section class="secao"><h2 style="margin-bottom:12px">${esc(nomeDe(L().situacoesLivro, id))}</h2>${id === 'lido' ? lidosPorAno(porSit(id), estante) : estante(porSit(id))}</section>`).join('')}`}`;
}
let encontrosAbertos = false;
// Página de um encontro do clube: data, até onde ler, pauta e como foi.
function telaEncontro(id) {
  const s = st();
  const e = s.clube.encontros.find((x) => x.id === id);
  if (!e) return '<p class="vazio">Encontro não encontrado. <a href="#/leituras/clube">Voltar</a></p>';
  const lv = s.livros.find((l) => l.id === e.livroId);
  return `<div class="editor-topo"><a class="btn-3" href="#/leituras/clube">← Clube do Livro</a><span class="espaco"></span><button class="btn btn-perigo btn-pequeno" data-acao="apagarEncontro" data-id="${e.id}">Apagar encontro</button></div>
  <div class="topo" style="margin-bottom:16px"><div><p class="rot-estudio">Encontro do clube</p><h1>${e.data ? esc(R.dataPorExtenso(e.data)) : 'Encontro sem data'}</h1>${lv ? `<p class="muted" style="margin:2px 0 0">${esc(lv.nome)}${lv.autor ? ` · ${esc(lv.autor)}` : ''}</p>` : ''}</div></div>
  <div class="grade-2"><section class="cartao"><div style="display:grid;gap:12px">
    <label class="muted" style="font-size:12px">Livro do encontro<input class="campo" type="search" list="lista-livros" data-encontro-livro="${e.id}" value="${esc(lv ? lv.nome : '')}" placeholder="🔍 Digite o nome do livro…" style="width:100%" autocomplete="off"></label>
    <datalist id="lista-livros">${s.livros.map((l) => `<option value="${esc(l.nome)}">${esc(l.autor || '')}</option>`).join('')}</datalist>
    <div class="duas"><label class="muted" style="font-size:12px">Data<input type="date" class="campo" data-encontro="${e.id}" data-campo="data" value="${esc(e.data || '')}" style="width:100%"></label>
    <label class="muted" style="font-size:12px">Horário<input type="time" class="campo" data-encontro="${e.id}" data-campo="hora" value="${esc(e.hora || '')}" style="width:100%"></label></div>
    <div class="duas"><label class="muted" style="font-size:12px">Até a página<input type="number" class="campo" data-encontro="${e.id}" data-campo="atePagina" value="${esc(e.atePagina || '')}" style="width:100%"></label>
    <label class="muted" style="font-size:12px">Observação (ex.: até o capítulo 8)<input class="campo" data-encontro="${e.id}" data-campo="obs" value="${esc(e.obs || '')}" style="width:100%"></label></div>
    <label class="muted" style="font-size:12px">Pauta: perguntas, trechos e observações<textarea class="campo cresce" data-encontro="${e.id}" data-campo="pauta" rows="10">${esc(e.pauta || '')}</textarea></label>
    <div class="linha"><button class="btn btn-2 btn-pequeno" data-acao="puxarTrecho" data-id="${e.id}">❝ Puxar trecho do livro</button></div>
  </div></section>
  <div><section class="cartao"><h2>Como foi</h2><textarea class="campo cresce" data-encontro="${e.id}" data-campo="comoFoi" rows="6" placeholder="Depois do encontro: o que rendeu, quem participou, o que levar para o próximo…">${esc(e.comoFoi || '')}</textarea></section></div></div>`;
}
function telaClube() {
  const s = st();
  const d = hoje();
  const c = s.clube;
  const livro = s.livros.find((l) => l.id === c.livroAtual);
  const prox = R.proximoEncontro(c.encontros, d);
  const ritmo = R.ritmoClube(livro, prox, d);
  const encontros = [...c.encontros].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const proximos = c.proximos.map((id) => s.livros.find((l) => l.id === id)).filter(Boolean);
  return `<div class="topo"><div><h1>Clube do Livro</h1></div><button class="btn" data-acao="novoEncontro">+ Encontro</button></div>
  <div class="grade-2">
    <div>
      <section class="cartao"><div class="linha" style="align-items:flex-start;gap:18px">${livro ? `<div data-acao="irLivro" data-id="${livro.id}">${capa(livro)}</div>` : ''}<div class="espaco">
        <label class="muted" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">Livro atual do clube</label>
        <input class="campo" type="search" list="lista-livros" data-clube-livro value="${esc(livro ? livro.nome : '')}" placeholder="🔍 Digite o nome do livro…" style="width:100%;margin:4px 0 12px" autocomplete="off">
        ${prox ? `<p style="margin:0;font-family:var(--serif);font-size:19px">Próximo encontro: ${esc(R.quando(prox.data, d))}${R.quando(prox.data, d).includes('/') ? '' : ` (${esc(R.ddmm(prox.data))})`}</p>
          ${ritmo ? `<p class="muted" style="margin:4px 0 0">${ritmo.faltam ? `faltam ${ritmo.faltam} páginas · ${ritmo.porDia} por dia` : 'Leitura em dia para o encontro'}</p>` : prox.atePagina ? '' : '<p class="muted" style="margin:4px 0 0">Defina até onde ler no encontro.</p>'}`
          : '<p class="muted" style="margin:0">Nenhum encontro marcado.</p>'}
      </div></div></section>
      <section class="secao"><h2 style="margin-bottom:10px">Encontros</h2>
        ${encontros.length ? (() => {
          const futuros = encontros.filter((e) => !e.data || e.data >= d).sort((x, y) => (x.data || '9').localeCompare(y.data || '9'));
          const passados = encontros.filter((e) => e.data && e.data < d); // já vem do mais recente para o mais antigo
          const linhaEnc = (e) => {
            const lv = e.livroId ? s.livros.find((l) => l.id === e.livroId) : null;
            const info = [lv && lv.nome, e.atePagina && `até a pág. ${e.atePagina}`, e.obs].filter(Boolean).join(' · ');
            const tag = !e.data ? '<span class="tag">Sem data</span>' : e.data < d ? '<span class="tag v">Feito</span>' : prox && e.id === prox.id ? '<span class="quando q-amanha">Próximo</span>' : '';
            return `<li class="item"><div class="principal" data-acao="irEncontro" data-id="${e.id}"><b>${e.data ? esc(R.dataPorExtenso(e.data)) : 'Encontro sem data'}${e.data && e.data.slice(0, 4) !== d.slice(0, 4) ? ` de ${e.data.slice(0, 4)}` : ''}${e.hora ? ` · ${esc(e.hora)}` : ''}</b>${info ? `<small>${esc(info)}</small>` : ''}</div>${tag}<span class="seta-item" aria-hidden="true">›</span></li>`;
          };
          const verTodos = encontrosAbertos;
          return `${futuros.length ? `<section class="cartao"><h2>Próximos</h2><ul class="lista">${futuros.map(linhaEnc).join('')}</ul></section>` : ''}
            ${passados.length ? `<section class="cartao" style="margin-top:14px"><h2>Já aconteceram</h2><ul class="lista">${(verTodos ? passados : passados.slice(0, 1)).map(linhaEnc).join('')}</ul>${passados.length > 1 ? `<button class="mais-links" data-acao="verEncontros">${verTodos ? 'Mostrar só o último' : 'Ver os outros'}</button>` : ''}</section>` : ''}`;
        })() : '<p class="vazio">Crie o primeiro encontro com a data que quiser.</p>'}
      </section>
    </div>
    <div><section class="cartao"><h2>Próximos livros do clube</h2>
      ${proximos.length ? `<ul class="lista">${proximos.map((l, i) => `<li class="item"><span class="muted" style="width:18px">${i + 1}.</span><div class="principal" data-acao="irLivro" data-id="${l.id}"><b>${esc(l.nome)}</b><small>${esc(l.autor || '')}</small></div>
        <button class="icone" data-acao="moverProximo" data-id="${l.id}" data-d="-1" aria-label="Subir">↑</button><button class="icone" data-acao="moverProximo" data-id="${l.id}" data-d="1" aria-label="Descer">↓</button><button class="icone" data-acao="tirarProximo" data-id="${l.id}" aria-label="Tirar">✕</button></li>`).join('')}</ul>` : '<p class="vazio">Nenhum livro planejado.</p>'}
      <div class="linha" style="margin-top:12px"><input class="campo" type="search" list="lista-livros" data-add-proximo placeholder="🔍 Adicionar livro da estante…" style="flex:1" autocomplete="off">
      <datalist id="lista-livros">${s.livros.map((l) => `<option value="${esc(l.nome)}">${esc(l.autor || '')}</option>`).join('')}</datalist></div>
      <p class="dica">Livro que ainda não está na estante? Crie em Estante → + Livro.</p>
    </section></div>
  </div>`;
}
// ---------- Temas dos trechos ----------
let filtroTema = '';
const TODOS_TEMAS = () => L().temasTrechos || [];
function passaTema(t, filtro) {
  if (!filtro) return true;
  if (filtro === '_sem') return !(t.temas || []).length;
  return (t.temas || []).includes(filtro);
}
function chipsTemas(todos, filtro, acao) {
  const n = (id) => todos.filter((t) => passaTema(t, id)).length;
  return `<div class="chips" style="margin-bottom:14px">
    <button class="chip ${!filtro ? 'sel' : ''}" data-acao="${acao}" data-id="">Todos <span class="conta">${todos.length}</span></button>
    ${TODOS_TEMAS().map((x) => `<button class="chip ${filtro === x.id ? 'sel' : ''}" data-acao="${acao}" data-id="${x.id}">${esc(x.nome)} <span class="conta">${n(x.id)}</span></button>`).join('')}
    <button class="chip ${filtro === '_sem' ? 'sel' : ''}" data-acao="${acao}" data-id="_sem">Sem tema <span class="conta">${n('_sem')}</span></button>
  </div>`;
}
function temasHtml(t, livroId) {
  const nomes = (t.temas || []).map((id) => nomeDe(TODOS_TEMAS(), id)).filter(Boolean);
  return `${nomes.map((x) => `<span class="tag tag-tema">${esc(x)}</span>`).join(' ')} <button class="link-acao" style="font-weight:500" data-acao="temasTrecho" data-id="${livroId}" data-t="${t.id}">${nomes.length ? 'mudar temas' : '+ tema'}</button>`;
}
function janelaTemas(livroId, trechoId) {
  const l = st().livros.find((x) => x.id === livroId);
  const t = l && (l.trechos || []).find((x) => x.id === trechoId);
  if (!t) return;
  janela.innerHTML = `<div class="janela"><h2>Temas do trecho</h2>
    <div class="trecho" style="margin:0"><q>${esc(t.texto.length > 220 ? `${t.texto.slice(0, 220)}…` : t.texto)}</q><small>${esc(l.nome)}</small></div>
    <div class="chips">${TODOS_TEMAS().map((x) => `<button class="chip ${(t.temas || []).includes(x.id) ? 'sel' : ''}" data-acao="alternarTema" data-id="${livroId}" data-t="${trechoId}" data-tema="${x.id}">${esc(x.nome)}</button>`).join('')}</div>
    <form class="linha" data-form="novoTema" data-id="${livroId}" data-t="${trechoId}"><input class="campo" name="nome" placeholder="Novo tema…" style="flex:1"><button class="btn btn-2 btn-pequeno" type="submit">Criar</button></form>
    <div class="botoes"><span class="espaco"></span><button class="btn" data-acao="fecharTemas">Pronto</button></div></div>`;
  if (!janela.open) janela.showModal();
}
function telaTrechos() {
  const todos = [];
  st().livros.forEach((l) => (l.trechos || []).forEach((t) => todos.push({ ...t, livro: l, })));
  const q = buscaTrecho.toLowerCase();
  const lista = todos.filter((t) => passaTema(t, filtroTema) && (!q || `${t.texto} ${t.livro.nome} ${t.livro.autor}`.toLowerCase().includes(q)));
  return `<div class="topo"><div><h1>Trechos</h1><p>${todos.length} guardados · ${todos.filter((t) => t.conteudo).length} para usar em conteúdo</p></div>
    <input class="busca" type="search" placeholder="Buscar em todos os livros…" value="${esc(buscaTrecho)}" data-busca="trechos"></div>
    ${chipsTemas(todos, filtroTema, 'filtroTema')}
    ${lista.length ? lista.map((t) => `<div class="trecho"><q>${esc(t.texto)}</q><small><a href="#/livro/${t.livro.id}">${esc(t.livro.nome)}</a>${t.livro.autor ? `, ${esc(t.livro.autor)}` : ''}${t.pagina ? ` · p. ${esc(t.pagina)}` : ''}${t.conteudo ? ' · <span class="tag">usar em conteúdo</span>' : ''} · ${temasHtml(t, t.livro.id)}</small></div>`).join('') : '<p class="vazio">Nenhum trecho encontrado.</p>'}
    <p class="dica">Os temas são editados em Ajustes → Temas dos trechos.</p>`;
}
// Campos de anotação de cada livro (título e dica).
const CAMPOS_LIVRO = [
  ['resumo', 'Resumo do livro', 'Em poucas linhas, com as suas palavras: do que o livro fala?'],
  ['aprendi', 'O que aprendi', 'O que ficou com você? O que mudou na sua forma de pensar?'],
  ['aplicar', 'Como aplicar', 'Na vida pessoal, no negócio e com as alunas.'],
  ['conteudoIdeias', 'Ideias de conteúdo', 'Posts, aulas ou histórias que podem nascer desta leitura.'],
];
function telaLivro(id) {
  const l = st().livros.find((x) => x.id === id);
  if (!l) return '<p class="vazio">Livro não encontrado. <a href="#/leituras">Voltar</a></p>';
  const opc = (lista, sel) => `<option value="">—</option>${lista.map((x) => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}`;
  return `<div class="editor-topo"><a class="btn-3" href="#/leituras">← Leituras</a><span class="espaco"></span><button class="btn btn-perigo btn-pequeno" data-acao="apagarLivro" data-id="${l.id}">Apagar livro</button></div>
  <div class="linha" style="align-items:flex-start;gap:26px">
    <div style="text-align:center"><label style="cursor:pointer" title="Trocar capa">${capa(l, true)}<input type="file" accept="image/*" data-capa="${l.id}" hidden></label>
      <p class="dica">Clique ou arraste uma imagem para a capa</p>${l.capa ? `<button class="btn-3" data-acao="tirarCapa" data-id="${l.id}">Tirar capa</button>` : ''}</div>
    <div class="espaco" style="min-width:280px">
      <textarea class="titulo-editor" rows="1" data-campo-livro="nome" placeholder="Nome do livro">${esc(l.nome)}</textarea>
      <div class="campos">
        <label>Autor<input class="campo" data-campo-livro="autor" value="${esc(l.autor || '')}"></label>
        <label>Situação<select class="campo" data-campo-livro="situacao">${L().situacoesLivro.map((x) => `<option value="${x.id}" ${x.id === l.situacao ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></label>
        <label>Páginas<input type="number" class="campo" data-campo-livro="paginas" value="${esc(l.paginas || '')}" style="width:100px"></label>
        <label>Página atual<input type="number" class="campo" data-campo-livro="paginaAtual" value="${esc(l.paginaAtual || '')}" style="width:100px"></label>
        <label>Formato<select class="campo" data-campo-livro="formato">${opc(L().formatosLivro, l.formato)}</select></label>
        <label>Objetivo<select class="campo" data-campo-livro="objetivo">${opc(L().objetivos, l.objetivo)}</select></label>
        <label>Começou<input type="date" class="campo" data-campo-livro="inicio" value="${esc(l.inicio || '')}"></label>
        <label>Terminou<input type="date" class="campo" data-campo-livro="fim" value="${esc(l.fim || '')}"></label>
      </div>
      <div class="chips" style="margin-bottom:6px">${L().generos.map((g) => `<button class="chip ${(l.generos || []).includes(g.id) ? 'sel' : ''}" data-acao="generoLivro" data-id="${l.id}" data-g="${g.id}">${esc(g.nome)}</button>`).join('')}</div>
      ${l.paginas ? `<div class="barra" style="max-width:380px"><i style="width:${R.progressoLivro(l)}%"></i></div><span class="muted" style="font-size:13px">${R.progressoLivro(l)}%</span>` : ''}
    </div>
  </div>
  ${(() => {
    const encs = st().clube.encontros.filter((e) => e.livroId === l.id).sort((a, b) => (a.data || '9').localeCompare(b.data || '9'));
    if (!encs.length) return '';
    return `<section class="cartao" style="margin:18px 0"><h2>Encontros do clube</h2><ul class="lista">${encs.map((e) => `<li class="item"><div class="principal" data-acao="irEncontro" data-id="${e.id}"><b>${e.data ? esc(R.dataPorExtenso(e.data)) : 'Encontro sem data'}${e.data && e.data.slice(0, 4) !== hoje().slice(0, 4) ? ` de ${e.data.slice(0, 4)}` : ''}</b><small>${esc([e.atePagina && `até a pág. ${e.atePagina}`, e.obs].filter(Boolean).join(' · '))}</small></div>${e.data && e.data < hoje() ? '<span class="tag v">Feito</span>' : ''}<span class="seta-item" aria-hidden="true">›</span></li>`).join('')}</ul></section>`;
  })()}
  <div class="grade-campos-livro">
    ${CAMPOS_LIVRO.map(([c, titulo, dica]) => `<section class="cartao"><h2>${titulo}</h2><textarea class="campo cresce" data-campo-livro="${c}" rows="4" placeholder="${dica}">${esc(l[c] || '')}</textarea></section>`).join('')}
  </div>
  <div class="grade-2" style="margin-top:18px">
    <section class="cartao"><h2>Trechos</h2>
      <form data-form="trecho" data-id="${l.id}" style="display:grid;gap:8px;margin-bottom:14px">
        <textarea class="campo" name="texto" rows="3" placeholder="Copie aqui o trecho…" required></textarea>
        <div class="linha"><input class="campo" name="pagina" placeholder="Página" style="width:100px"><label class="linha" style="gap:6px;font-size:14px"><input type="checkbox" name="conteudo"> Usar em conteúdo</label><span class="espaco"></span><button class="btn btn-pequeno" type="submit">Guardar trecho</button></div>
      </form>
      ${(l.trechos || []).length ? [...l.trechos].reverse().map((t) => `<div class="trecho"><q>${esc(t.texto)}</q><small>${t.pagina ? `p. ${esc(t.pagina)} · ` : ''}<button class="link-acao" style="font-weight:500" data-acao="trechoConteudo" data-id="${l.id}" data-t="${t.id}">${t.conteudo ? '✓ usar em conteúdo' : 'marcar para conteúdo'}</button> · ${temasHtml(t, l.id)} · <button class="link-acao" style="color:var(--texto-2);font-weight:500" data-acao="apagarTrecho" data-id="${l.id}" data-t="${t.id}">apagar</button></small></div>`).join('') : '<p class="vazio">Nenhum trecho ainda.</p>'}
    </section>
    <section class="cartao"><h2>Outras anotações</h2><textarea class="campo cresce" data-campo-livro="anotacoes" rows="8" placeholder="Qualquer outra coisa sobre o livro…">${esc(l.anotacoes || '')}</textarea></section>
  </div>`;
}
function reduzirImagem(arquivo) {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => {
      const larg = Math.min(CAPA_LARGURA, img.width); const esc2 = larg / img.width;
      const c = document.createElement('canvas'); c.width = larg; c.height = Math.round(img.height * esc2);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      ok(c.toDataURL('image/jpeg', 0.8)); URL.revokeObjectURL(img.src);
    };
    img.onerror = erro;
    img.src = URL.createObjectURL(arquivo);
  });
}
// Capas mais leves (mesma aparência): as grandes são redesenhadas com até 320 px de largura,
// o dobro do tamanho em que aparecem (fica nítido em tela de alta resolução).
// Antes de trocar, a capa original fica guardada no IndexedDB deste aparelho ("capas-originais").
const CAPA_LARGURA = 320;
function capaMenor(dataUrl) {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= CAPA_LARGURA) { ok(null); return; }
      const c = document.createElement('canvas');
      c.width = CAPA_LARGURA; c.height = Math.round(img.height * (CAPA_LARGURA / img.width));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const nova = c.toDataURL('image/jpeg', 0.82);
      ok(nova.length < dataUrl.length * 0.9 ? nova : null);
    };
    img.onerror = () => ok(null);
    img.src = dataUrl;
  });
}
function guardarCapasOriginais(capas) {
  return new Promise((ok) => {
    try {
      const r = indexedDB.open('meu-painel-capas', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('originais');
      r.onsuccess = () => {
        const tx = r.result.transaction('originais', 'readwrite');
        const st2 = tx.objectStore('originais');
        capas.forEach(([id, capa]) => st2.put(capa, id));
        tx.oncomplete = () => { r.result.close(); ok(true); };
        tx.onerror = () => { r.result.close(); ok(false); };
      };
      r.onerror = () => ok(false);
    } catch { ok(false); }
  });
}
async function deixarCapasLeves() {
  const grandes = st().livros.filter((l) => l.capa && l.capa.startsWith('data:image') && l.capa.length > 30000);
  if (!grandes.length) return;
  const trocas = [];
  for (const l of grandes) { const nova = await capaMenor(l.capa); if (nova) trocas.push([l.id, l.capa, nova]); }
  if (!trocas.length) return;
  if (!(await guardarCapasOriginais(trocas.map(([id, antiga]) => [id, antiga])))) return; // sem cópia de segurança, não troca
  S.mudar((s) => { trocas.forEach(([id, antiga, nova]) => { const l = s.livros.find((x) => x.id === id); if (l && l.capa === antiga) l.capa = nova; }); });
  if (['leituras', 'livro', 'hoje'].includes(rota().nome)) redesenharQuandoLivre();
}

async function trocarCapa(id, arquivo) {
  if (!arquivo || !arquivo.type.startsWith('image/')) return;
  const url = await reduzirImagem(arquivo);
  S.mudar((s) => { s.livros.find((l) => l.id === id).capa = url; });
  redesenhar();
}

// ======================================================================
// LINKS
// ======================================================================
let buscaLink = '';
const linksAbertos = new Set();
function telaLinks() {
  const s = st();
  const q = buscaLink.toLowerCase();
  const links = s.links.filter((l) => !q || `${l.nome} ${l.url} ${l.mensagem}`.toLowerCase().includes(q));
  const top = R.maisUsados(s.links);
  const linha = (l) => `<li class="item link-item"><div class="principal" data-acao="abrirLink" data-id="${l.id}"><b>${esc(l.nome)}</b><small>${esc(l.url)}</small></div>
    <div class="acoes"><button class="btn btn-2 btn-pequeno" data-acao="copiarLink" data-id="${l.id}">Copiar link</button>${l.mensagem ? `<button class="btn btn-pequeno" data-acao="copiarMensagem" data-id="${l.id}">Copiar mensagem</button>` : ''}
    <button class="icone" data-acao="moverLink" data-id="${l.id}" data-d="-1" aria-label="Subir">↑</button><button class="icone" data-acao="moverLink" data-id="${l.id}" data-d="1" aria-label="Descer">↓</button><button class="icone" data-acao="editarLink" data-id="${l.id}" aria-label="Editar">✎</button></div></li>`;
  const grupos = [...L().gruposLinks.map((g) => ({ id: g.id, nome: g.nome })), { id: '', nome: 'Sem grupo' }]
    .map((g) => ({ ...g, itens: links.filter((l) => (g.id ? l.grupo === g.id : !L().gruposLinks.some((x) => x.id === l.grupo))) }))
    .filter((g) => g.itens.length || g.id);
  return `<div class="topo"><div><h1>Links</h1></div><div class="linha"><input class="busca" type="search" placeholder="Buscar…" value="${esc(buscaLink)}" data-busca="links"><button class="btn" data-acao="novoLink">+ Link</button></div></div>
  ${top.length && !q ? `<section class="secao" style="margin-top:0;margin-bottom:22px"><div class="grupo-dia" style="margin-top:0">Mais usados</div><div class="mais-usados">${top.map((l) => `<button class="chip" data-acao="copiarLink" data-id="${l.id}" title="Copiar link">${esc(l.nome)}</button>`).join('')}</div></section>` : ''}
  <div class="grade-links">${grupos.map((g) => {
    const itens = g.itens.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    const chave = g.id || 'sem';
    const varios = itens.length > 1;
    const aberto = !!q || linksAbertos.has(chave);
    const mostrar = aberto ? itens : itens.slice(0, 1);
    return `<section class="cartao grupo-links ${varios ? 'com-mais' : ''} ${aberto ? 'aberto' : ''}" style="margin:0"><div class="secao-titulo">${varios && !q ? `<button class="grupo-topo" data-acao="abrirLinks" data-id="${chave}" aria-expanded="${aberto}"><h2>${esc(g.nome)}</h2><span class="seta" aria-hidden="true">›</span></button>` : `<h2>${esc(g.nome)}</h2>`}${g.id ? `<button class="btn-3 btn-pequeno" data-acao="novoLink" data-grupo="${g.id}">+ Link</button>` : ''}</div>
      ${itens.length ? `<ul class="lista">${mostrar.map(linha).join('')}</ul>${varios && !q ? `<button class="mais-links" data-acao="abrirLinks" data-id="${chave}">${aberto ? 'Mostrar só o primeiro' : 'Ver os outros links'}</button>` : ''}` : '<p class="vazio">Nenhum link.</p>'}</section>`;
  }).join('')}</div>
  <p class="dica" style="margin-top:16px">Na mensagem pronta, escreva {link} onde o link deve aparecer. Sem {link}, ele vai no fim. Os grupos são editados em Ajustes.</p>`;
}
function abrirLinkForm(id, grupo, projeto) {
  const l = id ? st().links.find((x) => x.id === id) : { nome: '', url: '', mensagem: '', grupo: grupo || '', projeto: projeto || '' };
  janela.innerHTML = `<form class="janela" data-form="link" data-id="${id || ''}" method="dialog"><h2>${id ? 'Link' : 'Novo link'}</h2>
    <label>Nome<input class="campo" name="nome" value="${esc(l.nome)}" required placeholder="Ex.: Grupo do WhatsApp da Formação"></label>
    <label>Endereço<input class="campo" name="url" value="${esc(l.url)}" required placeholder="https://…"></label>
    <label>Grupo<select class="campo" name="grupo"><option value="">Sem grupo</option>${L().gruposLinks.map((g) => `<option value="${g.id}" ${g.id === l.grupo ? 'selected' : ''}>${esc(g.nome)}</option>`).join('')}</select></label>
    <label>Projeto (opcional)<select class="campo" name="projeto">${opcProjetos(l.projeto)}</select></label>
    <label>Mensagem pronta (opcional)<textarea class="campo" name="mensagem" rows="4" placeholder="Oi! Aqui está o link do grupo: {link}">${esc(l.mensagem || '')}</textarea></label>
    <div class="botoes">${id ? `<button type="button" class="btn btn-perigo" data-acao="apagarLink" data-id="${id}">Apagar</button>` : ''}<span class="espaco"></span><button type="button" class="btn btn-3" data-acao="fecharJanela">Cancelar</button><button class="btn" type="submit">Salvar</button></div></form>`;
  janela.showModal();
}
async function copiar(texto, msg = 'Copiado') {
  try { await navigator.clipboard.writeText(texto); aviso(msg); } catch {
    const t = document.createElement('textarea'); t.value = texto; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); aviso(msg);
  }
}
function usarLink(id) { S.mudar((s) => { const l = s.links.find((x) => x.id === id); if (l) l.usos = (l.usos || 0) + 1; }); }

// ======================================================================
// PATRIMÔNIO
// ======================================================================
const din = (v) => (st().ajustes.ocultarValores ? 'R$ •••••' : R.reais(v));
function grafico(contas, meses) {
  const ms = R.mesesFechados(meses).slice(-24);
  if (ms.length < 2) return '<p class="vazio">O gráfico aparece depois do segundo mês fechado.</p>';
  const vals = ms.map((m) => R.totalMes(contas, meses[m]));
  const min = Math.min(...vals); const max = Math.max(...vals);
  const W = 640; const H = 180; const p = 24;
  const x = (i) => p + (i * (W - 2 * p)) / (ms.length - 1);
  const y = (v) => (max === min ? H / 2 : H - p - ((v - min) / (max - min)) * (H - 2 * p));
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return `<svg class="grafico" viewBox="0 0 ${W} ${H + 18}" preserveAspectRatio="none" role="img" aria-label="Evolução do patrimônio">
    <polyline points="${p},${H - p + 4} ${pts} ${x(ms.length - 1)},${H - p + 4}" fill="#DFE4D5" stroke="none" opacity=".7"/>
    <polyline points="${pts}" fill="none" stroke="#5C6854" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="#5C6854"><title>${esc(R.nomeMes(ms[i]))}/${ms[i].slice(0, 4)}: ${esc(din(v))}</title></circle>`).join('')}
    ${ms.map((m, i) => (ms.length <= 12 || i % 3 === 0 ? `<text x="${x(i)}" y="${H + 12}" font-size="11" text-anchor="middle" fill="#7A716C" font-family="Inter">${esc(R.nomeMes(m).slice(0, 3))}</text>` : '')).join('')}
  </svg>`;
}
function telaPatrimonio() {
  const s = st();
  const d = hoje();
  const ms = R.mesesFechados(s.meses);
  const ult = ms[ms.length - 1];
  const total = ult ? R.totalMes(s.contas, s.meses[ult]) : null;
  const cresc = ult ? R.crescimento(s.contas, s.meses, ult) : null;
  const ymAtual = R.mesDe(d);
  return `<div class="topo"><div><h1>Patrimônio</h1><p>Preenchido no fim de cada mês.</p></div>
    <div class="linha"><button class="btn btn-3" data-acao="olho">${s.ajustes.ocultarValores ? '👁 Mostrar valores' : '👁 Esconder valores'}</button>
    ${s.contas.length ? `<a class="btn" href="#/fechar/${ymAtual}">${s.meses[ymAtual] ? 'Editar' : 'Fechar'} ${esc(R.nomeMes(ymAtual))}</a>` : ''}</div></div>
  ${!s.contas.length ? `<div class="cartao"><h2>Comece pelas contas</h2><p class="muted">Cadastre uma vez onde está o seu dinheiro: conta corrente, reserva, Tesouro, previdência… Dívidas também entram (e são descontadas).</p><button class="btn" data-acao="novaConta">+ Conta</button></div>` : `
  <div class="grade-2">
    <div>
      <section class="cartao">${total !== null ? `<span class="muted" style="font-size:13px">Patrimônio em ${esc(R.nomeMes(ult))} de ${ult.slice(0, 4)}</span><div class="numero-grande">${esc(din(total))}</div>
        ${cresc ? `<p style="margin:6px 0 0" class="${cresc.dif >= 0 ? 'sobe' : 'desce'}">${cresc.dif >= 0 ? '▲' : '▼'} ${esc(din(Math.abs(cresc.dif)))}${cresc.pct !== null && !s.ajustes.ocultarValores ? ` (${cresc.pct.toFixed(1).replace('.', ',')}%)` : ''} <span class="muted" style="font-weight:400">desde ${esc(R.nomeMes(cresc.desde))}</span></p>` : '<p class="muted" style="margin:6px 0 0">A comparação aparece no próximo mês.</p>'}` : '<p class="muted">Nenhum mês fechado ainda.</p>'}
        <div style="margin-top:14px">${grafico(s.contas, s.meses)}</div></section>
      <section class="cartao"><div class="secao-titulo"><h2>Meses</h2><button class="btn-3 btn-pequeno" data-acao="fecharOutroMes">Fechar outro mês</button></div>
        ${ms.length ? `<table class="tabela"><tr><th>Mês</th><th class="num">Total</th><th></th></tr>${[...ms].reverse().map((m) => `<tr><td>${esc(R.nomeMes(m))} ${m.slice(0, 4)}</td><td class="num">${esc(din(R.totalMes(s.contas, s.meses[m])))}</td><td style="text-align:right"><a class="link-acao" href="#/fechar/${m}">Editar</a></td></tr>`).join('')}</table>` : '<p class="vazio">Nenhum mês ainda.</p>'}</section>
    </div>
    <div>
      <section class="cartao"><div class="secao-titulo"><h2>Metas</h2><button class="btn-3 btn-pequeno" data-acao="novaMeta">+ Meta</button></div>
        ${s.metas.map((m) => `<div class="meta-item"><div class="linha"><b class="espaco" style="cursor:pointer" data-acao="editarMeta" data-id="${m.id}">${esc(m.nome)}</b><span class="muted" style="font-size:13px">${esc(din(R.valorMeta(m, s.meses)))} de ${esc(din(m.alvo))}</span></div><div class="barra"><i style="width:${R.pctMeta(m, s.meses)}%"></i></div><span class="muted" style="font-size:12px">${R.pctMeta(m, s.meses)}%${m.contaId ? ` · ligada a ${esc(nomeDe(s.contas, m.contaId))}` : ''}</span></div>`).join('') || '<p class="vazio">Nenhuma meta.</p>'}</section>
      <section class="cartao"><div class="secao-titulo"><h2>Contas</h2><button class="btn-3 btn-pequeno" data-acao="novaConta">+ Conta</button></div>
        <ul class="lista">${s.contas.map((c) => `<li class="item"><div class="principal" data-acao="editarConta" data-id="${c.id}"><b>${esc(c.nome)}</b><small>${c.tipo === 'divida' ? 'Dívida (descontada do total)' : 'Dinheiro / investimento'}</small></div><button class="icone" data-acao="editarConta" data-id="${c.id}">✎</button></li>`).join('')}</ul></section>
    </div>
  </div>`}`;
}
function telaFechar(ym) {
  const s = st();
  if (!/^\d{4}-\d{2}$/.test(ym || '')) ym = R.mesDe(hoje());
  const vals = R.valoresIniciais(s.contas, s.meses, ym);
  const semConta = s.metas.filter((m) => !m.contaId);
  const ultGuardado = (m) => { const g = m.guardado || {}; if (g[ym] !== undefined) return g[ym]; const ks = Object.keys(g).filter((k) => k < ym).sort(); return ks.length ? g[ks[ks.length - 1]] : ''; };
  return `<div class="editor-topo"><a class="btn-3" href="#/patrimonio">← Patrimônio</a></div>
  <div class="topo"><div><h1>Fechar ${esc(R.nomeMes(ym))} de ${ym.slice(0, 4)}</h1><p>O valor do mês anterior já vem preenchido. Corrija só o que mudou.</p></div></div>
  <form class="cartao" data-form="fechar" data-ym="${ym}" style="max-width:620px">
    ${s.contas.map((c) => `<div class="linha" style="padding:8px 0;border-bottom:1px solid #F1EAE4"><span class="espaco">${esc(c.nome)} ${c.tipo === 'divida' ? '<span class="tag r">dívida</span>' : ''}</span><input class="campo" name="c_${c.id}" inputmode="decimal" value="${esc(vals[c.id] ?? '')}" placeholder="R$" style="width:170px;text-align:right"></div>`).join('')}
    ${semConta.length ? `<h3 style="margin:20px 0 6px">Guardado para as metas</h3>${semConta.map((m) => `<div class="linha" style="padding:8px 0;border-bottom:1px solid #F1EAE4"><span class="espaco">${esc(m.nome)}</span><input class="campo" name="m_${m.id}" inputmode="decimal" value="${esc(ultGuardado(m))}" placeholder="R$" style="width:170px;text-align:right"></div>`).join('')}` : ''}
    <div class="linha" style="margin-top:18px"><button class="btn" type="submit">Salvar ${esc(R.nomeMes(ym))}</button>${s.meses[ym] ? `<span class="espaco"></span><button type="button" class="btn btn-perigo" data-acao="apagarMes" data-ym="${ym}">Apagar este mês</button>` : ''}</div>
  </form>`;
}
function janelaConta(id) {
  const c = id ? st().contas.find((x) => x.id === id) : { nome: '', tipo: 'ativo' };
  janela.innerHTML = `<form class="janela" data-form="conta" data-id="${id || ''}" method="dialog"><h2>${id ? 'Conta' : 'Nova conta'}</h2>
    <label>Nome<input class="campo" name="nome" value="${esc(c.nome)}" required placeholder="Ex.: Reserva, Tesouro, Sofá"></label>
    <label>Tipo<select class="campo" name="tipo"><option value="ativo" ${c.tipo !== 'divida' ? 'selected' : ''}>Dinheiro / investimento</option><option value="divida" ${c.tipo === 'divida' ? 'selected' : ''}>Dívida (desconta do total)</option></select></label>
    <div class="botoes">${id ? `<button type="button" class="btn btn-perigo" data-acao="apagarConta" data-id="${id}">Apagar</button>` : ''}<span class="espaco"></span><button type="button" class="btn btn-3" data-acao="fecharJanela">Cancelar</button><button class="btn" type="submit">Salvar</button></div></form>`;
  janela.showModal();
}
function janelaMeta(id) {
  const m = id ? st().metas.find((x) => x.id === id) : { nome: '', alvo: '', contaId: '' };
  janela.innerHTML = `<form class="janela" data-form="meta" data-id="${id || ''}" method="dialog"><h2>${id ? 'Meta' : 'Nova meta'}</h2>
    <label>Nome<input class="campo" name="nome" value="${esc(m.nome)}" required></label>
    <label>Quanto quer juntar (R$)<input class="campo" name="alvo" inputmode="decimal" value="${esc(m.alvo)}" required></label>
    <label>Ligar a uma conta (opcional)<select class="campo" name="contaId"><option value="">Não ligar: informo no fechamento do mês</option>${st().contas.filter((c) => c.tipo !== 'divida').map((c) => `<option value="${c.id}" ${c.id === m.contaId ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
    <div class="botoes">${id ? `<button type="button" class="btn btn-perigo" data-acao="apagarMeta" data-id="${id}">Apagar</button>` : ''}<span class="espaco"></span><button type="button" class="btn btn-3" data-acao="fecharJanela">Cancelar</button><button class="btn" type="submit">Salvar</button></div></form>`;
  janela.showModal();
}

// ======================================================================
// AJUSTES e MAIS
// ======================================================================
const LISTAS_EDITAVEIS = [
  ['categorias', 'Categorias das tarefas'], ['prioridades', 'Prioridades', 'A primeira é a urgente (fica em vermelho quando atrasa).'],
  ['tempos', 'Tempos', 'Do menor para o maior. O menor é o "rápido"; os dois maiores pedem primeiro passo.'],
  ['produtos', 'Produtos (aulas)'], ['etapasAula', 'Etapas das aulas', 'Na ordem em que acontecem.'],
  ['formatos', 'Formatos de post'], ['funcoes', 'Funções de post'], ['situacoesPost', 'Situações dos posts', 'Só os nomes podem mudar.', true],
  ['gruposLinks', 'Grupos de links'], ['temasTrechos', 'Temas dos trechos'], ['generos', 'Gêneros de livro'], ['objetivos', 'Objetivos de leitura'],
  ['formatosLivro', 'Formatos de livro'], ['situacoesLivro', 'Situações dos livros', 'Só os nomes podem mudar.', true],
];
// ---------- Sincronizar (Mac e celular) ----------
function cartaoNuvem() {
  if (!N.configurada()) return '';
  if (!N.conectada()) {
    return `<section class="cartao" id="nuvem"><h2>Sincronizar com o celular</h2>
      <p class="muted" style="margin-top:-4px">Entre na sua conta para o Mac e o celular mostrarem as mesmas coisas. Nada do que está aqui se perde: os dados dos dois aparelhos se juntam.</p>
      <form class="campos" data-form="entrarNuvem" style="max-width:420px">
        <label>E-mail<input class="campo" type="email" name="email" autocomplete="username" required></label>
        <label>Senha<input class="campo" type="password" name="senha" autocomplete="current-password" required></label>
        <div class="linha"><button class="btn" type="submit">Entrar</button></div>
      </form>
      ${N.estado.erro ? `<p style="color:var(--urgente)">${esc(N.estado.erro)}</p>` : ''}</section>`;
  }
  const e = N.estado;
  const hora = e.ultima ? new Date(e.ultima).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  const txt = { ok: `Sincronizado às ${hora}`, sincronizando: 'Sincronizando…', 'sem-internet': 'Sem internet agora. Tudo fica guardado aqui e vai para a nuvem quando a internet voltar.', erro: `Não deu para sincronizar: ${e.erro}`, parada: 'Ainda não sincronizou.' }[e.situacao];
  return `<section class="cartao" id="nuvem"><h2>Sincronizar com o celular</h2>
    <p class="muted" style="margin-top:-4px">Conectada como ${esc(N.email())}.</p>
    <p ${e.situacao === 'erro' ? 'style="color:var(--urgente)"' : ''}>${esc(txt)}</p>
    <div class="linha"><button class="btn btn-2 btn-pequeno" data-acao="sincronizarAgora">Sincronizar agora</button><button class="btn-3" data-acao="sairNuvem">Sair desta conta</button></div></section>`;
}
let redesenhoPendente = false;
function redesenharQuandoLivre() {
  const ocupada = document.activeElement && document.activeElement.closest('input, textarea, select, [contenteditable]');
  if (ocupada || janela.open) { if (!redesenhoPendente) { redesenhoPendente = true; setTimeout(() => { redesenhoPendente = false; redesenharQuandoLivre(); }, 2000); } return; }
  redesenhar();
}

function telaAjustes() {
  const s = st();
  const a = s.ajustes;
  const listaEd = ([chave, titulo, dica, fixa]) => `<section class="cartao" style="margin:0"><h3 style="margin-bottom:6px">${esc(titulo)}</h3>${dica ? `<p class="dica" style="margin:0 0 8px">${esc(dica)}</p>` : ''}
    ${L()[chave].map((x, i) => `<div class="editavel"><input type="text" class="campo" data-lista="${chave}" data-id="${x.id}" value="${esc(x.nome)}">${fixa ? '' : `<button class="icone" data-acao="moverItem" data-lista="${chave}" data-i="${i}" data-d="-1" aria-label="Subir">↑</button><button class="icone" data-acao="moverItem" data-lista="${chave}" data-i="${i}" data-d="1" aria-label="Descer">↓</button><button class="icone" data-acao="tirarItem" data-lista="${chave}" data-i="${i}" aria-label="Apagar">✕</button>`}</div>`).join('')}
    ${fixa ? '' : `<form class="linha" data-form="addItem" data-lista="${chave}" style="margin-top:6px"><input class="campo" name="nome" placeholder="Novo…" style="flex:1"><button class="btn btn-2 btn-pequeno" type="submit">Adicionar</button></form>`}</section>`;
  return `<div class="topo"><div><h1>Ajustes</h1><p>Tudo aqui pode ser mudado quando você quiser.</p></div></div>
  ${cartaoNuvem()}
  <section class="cartao"><h2>Cópia dos dados</h2><p class="muted" style="margin-top:-4px">${N.conectada() ? 'Seus dados ficam neste aparelho e na nuvem. Uma cópia em arquivo, de vez em quando, é uma segurança a mais.' : 'Seus dados ficam só neste aparelho. Salve uma cópia de vez em quando e use Restaurar para passar para outro aparelho.'}</p>
    <div class="linha"><button class="btn" data-acao="salvarCopia">Salvar cópia</button><label class="btn btn-2">Restaurar ou importar<input type="file" accept=".json,application/json" data-restaurar hidden></label>
    <span class="muted" style="font-size:13px">${a.ultimoBackup ? `Última cópia: ${esc(R.ddmm(a.ultimoBackup.slice(0, 10)))}` : 'Nenhuma cópia ainda.'}</span></div>
    ${S.salvouComErro() ? '<p style="color:var(--urgente)">Atenção: o aparelho está sem espaço e a última mudança não foi salva. Tire algumas capas de livro ou salve uma cópia.</p>' : ''}</section>

  <section class="cartao"><h2>Frase-âncora</h2><textarea class="campo" data-ajuste="frase" rows="2">${esc(a.frase)}</textarea></section>

  <section class="cartao"><h2>Começar pequeno</h2>
    <h3 style="margin:4px 0 6px">Aquecimentos</h3>
    ${s.aquecimentos.map((x, i) => `<div class="editavel"><input type="text" class="campo" data-aquec="${i}" value="${esc(x)}"><button class="icone" data-acao="tirarAquec" data-i="${i}" aria-label="Apagar">✕</button></div>`).join('')}
    <form class="linha" data-form="addAquec" style="margin-top:6px"><input class="campo" name="nome" placeholder="Novo aquecimento…" style="flex:1" required><button class="btn btn-2 btn-pequeno" type="submit">Adicionar</button></form>
    <div class="campos" style="margin-top:16px">
      <label>Aviso "Ficou coisa para amanhã?" a partir de<input type="time" class="campo" data-ajuste="horarioAviso" value="${esc(a.horarioAviso)}"></label>
      <label>Foco (min)<input type="number" class="campo" data-pomo="foco" value="${a.pomodoro.foco}" style="width:80px"></label>
      <label>Pausa (min)<input type="number" class="campo" data-pomo="pausa" value="${a.pomodoro.pausa}" style="width:80px"></label>
      <label>Pausa longa (min)<input type="number" class="campo" data-pomo="longa" value="${a.pomodoro.longa}" style="width:80px"></label>
      <label>Pausa longa a cada<input type="number" class="campo" data-pomo="ciclos" value="${a.pomodoro.ciclos}" style="width:80px"></label>
    </div>
  </section>
  <section class="cartao"><h2>O que aparece no Hoje</h2>
    <p class="muted" style="margin-top:0">Desmarque o que não quer ver na tela Hoje. As tarefas de hoje aparecem sempre.</p>
    ${[['ideiaDoDia', 'Sugestão do dia (ideia ou roteiro para gravar)'], ['hojeSemana', 'Na semana (próximas tarefas para adiantar)'], ['hojeAulas', 'Aulas da semana'], ['hojeLeitura', 'Meta de leitura do clube'], ['hojeResumo', 'Resumo da semana, no domingo'], ['hojeCalendario', 'Calendário']]
      .map(([k, nome]) => `<label class="linha" style="gap:8px;margin-top:8px"><input type="checkbox" data-ajuste-bool="${k}" ${a[k] !== false ? 'checked' : ''}> ${nome}</label>`).join('')}
  </section>

  <h2 style="margin:30px 0 12px">Listas</h2>
  <div class="grade-ajustes">${LISTAS_EDITAVEIS.map(listaEd).join('')}</div>
  <p class="dica" style="margin-top:20px">Meu Painel · uso pessoal · os dados nunca saem deste aparelho.</p>`;
}
function telaMais() {
  const item = (href, nome, desc) => `<li class="item"><a class="principal" href="${href}" style="text-decoration:none;color:inherit"><b>${nome}</b><small>${desc}</small></a><span class="muted">›</span></li>`;
  return `<div class="topo"><h1>Mais</h1></div><div class="cartao"><ul class="lista">
    ${item('#/leituras', 'Leituras', 'Estante, Clube do Livro e trechos')}${item('#/links', 'Links', 'Links que você sempre usa')}
    ${item('#/patrimonio', 'Patrimônio', 'Fechamento do mês e metas')}${item('#/ajustes', 'Ajustes', 'Listas e cópia dos dados')}</ul></div>`;
}

// ======================================================================
// PROJETOS
// ======================================================================
let verArquivados = false;
const projetosAtivos = () => (st().projetos || []).filter((p) => !p.arquivado);
const nomeProjeto = (id) => (id ? ((st().projetos || []).find((p) => p.id === id) || {}).nome || '' : '');
function opcProjetos(sel) {
  const lista = (st().projetos || []).filter((p) => !p.arquivado || p.id === sel);
  return `<option value="">Nenhum</option>${lista.map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}`;
}
function resumoProjeto(p, d) {
  const s = st();
  const etapas = L().etapasAula;
  const linhas = [];
  const abertas = s.tarefas.filter((t) => t.projeto === p.id && R.aberta(t));
  const hojeN = abertas.filter((t) => t.classificada && R.vencimento(t) && R.vencimento(t) <= d).length;
  linhas.push(abertas.length ? `${abertas.length} ${abertas.length === 1 ? 'tarefa aberta' : 'tarefas abertas'}${hojeN ? ` · ${hojeN} para hoje` : ''}` : 'Nenhuma tarefa aberta');
  if (p.produto) {
    const ra = R.resumoAulas(s.aulas.filter((a) => a.produto === p.produto), etapas, d);
    if (ra.total) linhas.push(`Aulas da semana: ${ra.prontas} de ${ra.total} prontas`);
  }
  if (p.clube) {
    const prox = R.proximoEncontro(s.clube.encontros, d);
    linhas.push(prox ? `Próximo encontro: ${R.quando(prox.data, d)}` : 'Nenhum encontro marcado');
  }
  const posts = s.posts.filter((x) => x.projeto === p.id && x.situacao !== 'postado').length;
  if (posts) linhas.push(`${posts} ${posts === 1 ? 'post em andamento' : 'posts em andamento'}`);
  return linhas;
}
function telaProjetos() {
  const s = st();
  const d = hoje();
  const ativos = projetosAtivos();
  const arquivados = s.projetos.filter((p) => p.arquivado);
  return `<div class="topo"><div><h1>Projetos</h1><p>O que está acontecendo agora.</p></div><button class="btn" data-acao="novoProjeto">+ Projeto</button></div>
  ${ativos.length ? `<div class="grade-projetos">${ativos.map((p) => `<button class="cartao projeto-card" data-acao="irProjeto" data-id="${p.id}" ${estiloCor(corProjeto(p))}><h2><i class="bolinha"></i>${esc(p.nome)}</h2>${resumoProjeto(p, d).map((l) => `<span>${esc(l)}</span>`).join('')}<span class="abrir">Abrir →</span></button>`).join('')}</div>` : '<p class="vazio">Nenhum projeto ativo.</p>'}
  ${arquivados.length ? `<section class="secao"><button class="btn-3" data-acao="verArquivados">${verArquivados ? 'Esconder arquivados' : `Ver arquivados (${arquivados.length})`}</button>
    ${verArquivados ? `<ul class="lista">${arquivados.map((p) => `<li class="item"><div class="principal" data-acao="irProjeto" data-id="${p.id}"><b>${esc(p.nome)}</b></div><button class="btn btn-2 btn-pequeno" data-acao="arquivarProjeto" data-id="${p.id}">Trazer de volta</button></li>`).join('')}</ul>` : ''}</section>` : ''}`;
}
function telaProjeto(id) {
  const s = st();
  const p = s.projetos.find((x) => x.id === id);
  if (!p) return '<p class="vazio">Projeto não encontrado. <a href="#/projetos">Voltar</a></p>';
  const d = hoje();
  const etapas = L().etapasAula;
  const tarefas = s.tarefas.filter((t) => t.projeto === id && R.aberta(t))
    .sort((a, b) => (R.vencimento(a) || '9999').localeCompare(R.vencimento(b) || '9999'));
  const aulas = p.produto ? s.aulas.filter((a) => a.produto === p.produto) : [];
  const seg = R.segunda(d);
  const aulasSemana = aulas.filter((a) => a.semana === seg || (a.semana && a.semana < seg && !R.pronta(a, etapas)));
  const outras = aulas.filter((a) => !aulasSemana.includes(a) && !R.pronta(a, etapas));
  const prontas = aulas.filter((a) => R.pronta(a, etapas)).length;
  const posts = s.posts.filter((x) => x.projeto === id && x.situacao !== 'postado');
  const links = s.links.filter((l) => l.projeto === id);
  const livro = s.livros.find((l) => l.id === s.clube.livroAtual);
  const prox = R.proximoEncontro(s.clube.encontros, d);
  const ritmo = R.ritmoClube(livro, prox, d);
  return `<div class="editor-topo"><a class="btn-3" href="#/projetos">← Projetos</a><span class="espaco"></span>
    <button class="btn btn-2 btn-pequeno" data-acao="arquivarProjeto" data-id="${p.id}">${p.arquivado ? 'Trazer de volta' : 'Arquivar'}</button><button class="btn btn-perigo btn-pequeno" data-acao="apagarProjeto" data-id="${p.id}">Apagar</button></div>
  <div class="titulo-projeto" ${estiloCor(corProjeto(p))}><i class="bolinha"></i><textarea class="titulo-editor" rows="1" data-campo-projeto="nome">${esc(p.nome)}</textarea></div>
  <div class="grade-2" style="margin-top:14px">
    <div>
      <section class="cartao"><h2>Tarefas</h2>
        <form class="anotar" data-form="tarefaProjeto" data-id="${p.id}" style="margin-bottom:6px"><input name="texto" placeholder="Nova tarefa deste projeto…" autocomplete="off"><button class="btn" type="submit">Criar</button></form>
        ${tarefas.length ? `<ul class="tarefas">${tarefas.map((t) => itemTarefa(t, d)).join('')}</ul>` : '<p class="vazio">Nenhuma tarefa aberta.</p>'}
      </section>
      ${p.produto ? `<section class="cartao"><div class="secao-titulo"><h2>Aulas</h2><button class="btn-3 btn-pequeno" data-acao="novaAula" data-produto="${p.produto}">+ Aula</button></div>
        ${aulasSemana.length ? `<div class="grupo-dia" style="margin-top:0">Esta semana</div>${aulasSemana.map((a) => cartaoAula(a, d, false)).join('')}` : '<p class="vazio">Nenhuma aula para esta semana.</p>'}
        ${outras.length ? `<div class="grupo-dia">Próximas</div>${outras.map((a) => cartaoAula(a, d, false)).join('')}` : ''}
        ${prontas ? `<p class="dica">${prontas} ${prontas === 1 ? 'aula pronta' : 'aulas prontas'}.</p>` : ''}</section>` : ''}
      <section class="cartao"><div class="secao-titulo"><h2>Posts</h2><button class="btn-3 btn-pequeno" data-acao="novoPost" data-projeto="${p.id}">+ Post</button></div>
        ${posts.length ? `<ul class="lista">${posts.map((x) => `<li class="item"><div class="principal" data-acao="irPost" data-id="${x.id}"><b>${esc(x.titulo || 'Sem título')}</b><small>${esc(nomeDe(L().situacoesPost, x.situacao))}${x.data ? ` · ${esc(R.quando(x.data, d))}` : ''}</small></div>${x.formato ? `<span class="tag">${esc(nomeDe(L().formatos, x.formato))}</span>` : ''}</li>`).join('')}</ul>` : '<p class="vazio">Nenhum post ligado a este projeto.</p>'}
      </section>
    </div>
    <div>
      ${p.clube ? `<section class="cartao"><div class="secao-titulo"><h2>Clube do Livro</h2><a class="btn-3 btn-pequeno" href="#/leituras/clube">Abrir</a></div>
        ${livro ? `<p style="margin:0"><b>${esc(livro.nome)}</b> <span class="muted">${esc(livro.autor || '')}</span></p>` : '<p class="vazio">Escolha o livro atual na aba Leituras.</p>'}
        ${prox ? `<p style="margin:6px 0 0">Próximo encontro: ${esc(R.dataPorExtenso(prox.data))}</p>${ritmo ? `<p class="muted" style="margin:2px 0 0">${ritmo.faltam ? `faltam ${ritmo.faltam} páginas · ${ritmo.porDia} por dia` : 'Leitura em dia'}</p>` : ''}<a class="link-acao" href="#/leituras/clube/${prox.id}" style="display:inline-block;margin-top:8px">Ver pauta</a>` : '<p class="muted" style="margin:6px 0 0">Nenhum encontro marcado.</p>'}
      </section>` : ''}
      <section class="cartao"><div class="secao-titulo"><h2>Links</h2><button class="btn-3 btn-pequeno" data-acao="novoLink" data-projeto="${p.id}">+ Link</button></div>
        ${links.length ? `<ul class="lista">${links.map((l) => `<li class="item"><div class="principal" data-acao="abrirLink" data-id="${l.id}"><b>${esc(l.nome)}</b><small>${esc(l.url)}</small></div><button class="btn btn-2 btn-pequeno" data-acao="copiarLink" data-id="${l.id}">Copiar</button>${l.mensagem ? `<button class="btn btn-pequeno" data-acao="copiarMensagem" data-id="${l.id}">Mensagem</button>` : ''}</li>`).join('')}</ul>` : '<p class="vazio">Nenhum link ligado a este projeto.</p>'}
      </section>
      <section class="cartao"><h2>Anotações e próximos passos</h2><textarea class="campo" data-campo-projeto="notas" rows="10" placeholder="Ideias, decisões, próximos passos…">${esc(p.notas || '')}</textarea></section>
      <section class="cartao"><h3 style="margin-bottom:8px">Ajustes do projeto</h3>
        <label class="muted" style="font-size:13px;display:grid;gap:4px">Aulas deste projeto vêm do produto<select class="campo" data-campo-projeto="produto"><option value="">Este projeto não tem aulas</option>${L().produtos.map((x) => `<option value="${x.id}" ${x.id === p.produto ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></label>
        <label class="linha" style="gap:8px;margin-top:10px;font-size:14px"><input type="checkbox" data-campo-projeto="clube" ${p.clube ? 'checked' : ''}> Mostrar o Clube do Livro aqui</label>
        <div class="muted" style="font-size:13px;margin-top:14px">Cor do projeto</div>
        <div class="cores">${CORES.map((c) => `<button class="cor ${corProjeto(p).id === c.id ? 'sel' : ''}" style="--cor:${c.forte};--cor-claro:${c.claro}" data-acao="corProjeto" data-id="${p.id}" data-cor="${c.id}" title="${esc(c.nome)}" aria-label="${esc(c.nome)}"></button>`).join('')}</div>
      </section>
    </div>
  </div>`;
}

// ======================================================================
// Novos itens
// ======================================================================
function novaAula(el) {
  const id = S.uid();
  const produto = (el && el.dataset && el.dataset.produto) || '';
  S.mudar((s) => { s.aulas.push({ id, titulo: '', produto, modulo: '', semana: R.segunda(hoje()), etapas: {}, pdf: '', texto: '', criadaEm: S.agora() }); });
  location.hash = `#/aula/${id}`;
}
function novoPost(el) {
  const id = S.uid();
  const projeto = (el && el.dataset && el.dataset.projeto) || '';
  S.mudar((s) => { s.posts.push({ id, titulo: '', formato: '', funcao: '', serie: '', data: '', situacao: 'ideia', texto: '', link: '', projeto, criadaEm: S.agora() }); });
  location.hash = `#/post/${id}`;
}
function novoLivro() {
  const id = S.uid();
  S.mudar((s) => { s.livros.push({ id, nome: 'Novo livro', autor: '', paginas: '', paginaAtual: '', formato: '', generos: [], objetivo: '', situacao: 'proximo', capa: '', inicio: '', fim: '', trechos: [], anotacoes: '', criadoEm: S.agora() }); });
  location.hash = `#/livro/${id}`;
  setTimeout(() => { const t = $('[data-campo-livro=nome]'); if (t) { t.focus(); t.select(); } }, 50);
}

function baixarCopia() {
  const blob = new Blob([S.textoCopia()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `meu-painel-copia-${hoje()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  S.marcarBackup();
  aviso('Cópia salva');
}
async function lerRestauracao(arquivo) {
  try {
    const r = S.lerArquivo(await arquivo.text());
    if (r.tipo === 'importacao') {
      const np = r.posts.length ? S.importarPosts(r.posts) : 0;
      const nl = r.livros.length ? S.importarLivros(r.livros) : 0;
      const partes = [np ? `${np} posts` : '', nl ? `${nl} livros` : ''].filter(Boolean);
      aviso(partes.length ? `${partes.join(' e ')} importados` : 'Isso já estava no app', { desfazer: !!partes.length });
    } else {
      if (!confirm('Restaurar substitui tudo o que está neste aparelho pelos dados da cópia. Continuar?')) return;
      S.restaurar(r.dados);
      aviso('Dados restaurados', { desfazer: true });
    }
    redesenhar();
  } catch {
    aviso('Esse arquivo não é uma cópia do Meu Painel');
  }
}

// ======================================================================
// Ações (cliques)
// ======================================================================
const acoes = {
  novoProjeto() {
    const nome = (prompt('Nome do projeto') || '').trim();
    if (!nome) return;
    const id = S.uid();
    S.mudar((s) => { s.projetos.push({ id, nome, clube: false, produto: '', notas: '', arquivado: false }); });
    location.hash = `#/projeto/${id}`;
  },
  corProjeto(el) { S.mudar((s) => { s.projetos.find((x) => x.id === el.dataset.id).cor = el.dataset.cor; }); redesenhar(); },
  irProjeto(el) { location.hash = `#/projeto/${el.dataset.id}`; },
  arquivarProjeto(el) {
    S.mudar((s) => { const p = s.projetos.find((x) => x.id === el.dataset.id); p.arquivado = !p.arquivado; });
    aviso(st().projetos.find((x) => x.id === el.dataset.id).arquivado ? 'Projeto arquivado' : 'Projeto de volta');
    redesenhar();
  },
  apagarProjeto(el) {
    S.mudar((s) => {
      s.projetos = s.projetos.filter((x) => x.id !== el.dataset.id);
      ['tarefas', 'posts', 'links'].forEach((k) => s[k].forEach((x) => { if (x.projeto === el.dataset.id) x.projeto = ''; }));
    }, { desfazivel: true });
    location.hash = '#/projetos'; aviso('Projeto apagado', { desfazer: true });
  },
  verArquivados() { verArquivados = !verArquivados; redesenhar(); },
  diaCal(el) { diaCal = el.dataset.dia; if (diaCal.slice(0, 7) !== (mesCal || R.mesDe(hoje()))) mesCal = diaCal.slice(0, 7); redesenhar(); },
  mesCal(el) {
    const n = Number(el.dataset.d);
    if (!n) { mesCal = ''; diaCal = ''; redesenhar(); return; }
    const [a, m] = (mesCal || R.mesDe(hoje())).split('-').map(Number);
    const dt = new Date(a, m - 1 + n, 1);
    mesCal = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    redesenhar();
  },
  irEncontro(el) { location.hash = `#/leituras/clube/${el.dataset.id}`; },
  tarefaNoDia(el) {
    const texto = (prompt(`Tarefa para ${R.dataPorExtenso(el.dataset.dia)}`) || '').trim();
    if (!texto) return;
    S.mudar((s) => { s.tarefas.push({ id: S.uid(), texto, classificada: true, quando: 'data', data: el.dataset.dia, criadaEm: S.agora() }); });
    redesenhar();
  },
  filtroTema(el) { filtroTema = el.dataset.id; redesenhar(); },
  temaJanela(el) { temaJanela = el.dataset.id; janelaTrechos(); },
  temasTrecho(el) { janelaTemas(el.dataset.id, el.dataset.t); },
  alternarTema(el) {
    S.mudar((s) => {
      const t = s.livros.find((x) => x.id === el.dataset.id).trechos.find((x) => x.id === el.dataset.t);
      t.temas = t.temas || [];
      const i = t.temas.indexOf(el.dataset.tema);
      if (i >= 0) t.temas.splice(i, 1); else t.temas.push(el.dataset.tema);
    });
    el.classList.toggle('sel');
  },
  fecharTemas() { janela.close(); redesenhar(); },
  desfazer() { if (S.desfazer()) { $('#toast').classList.remove('on'); redesenhar(); } },
  fecharJanela() { janela.close(); },
  concluir(el) {
    const id = el.dataset.id;
    S.mudar((s) => { const i = s.tarefas.findIndex((t) => t.id === id); s.tarefas[i] = R.concluir(s.tarefas[i], hoje()); logar('tarefas'); etapaFeitaPelaTarefa(s, s.tarefas[i]); }, { desfazivel: true });
    aviso('Feito', { desfazer: true });
    redesenhar();
  },
  sincronizarAgora() { N.sincronizar(); redesenhar(); },
  sairNuvem() {
    if (!confirm('Sair da conta neste aparelho? Os dados continuam aqui, mas param de sincronizar.')) return;
    N.sair(); redesenhar();
  },
  outraSemana(el) { idxSemana += Number(el.dataset.d); redesenhar(); },
  adiantarHoje(el) {
    S.mudar((s) => { const t = s.tarefas.find((x) => x.id === el.dataset.id); t.quando = 'data'; t.data = hoje(); t.semanaFim = null; }, { desfazivel: true });
    aviso('Foi para hoje', { desfazer: true }); redesenhar();
  },
  reabrir(el) {
    S.mudar((s) => {
      const t = s.tarefas.find((x) => x.id === el.dataset.id);
      if (t.repetir) { t.data = t.ultimaVez || hoje(); delete t.ultimaVez; } else delete t.feitaEm;
      logar('tarefas', -1);
    });
    redesenhar();
  },
  abrirTarefa(el) { abrirTarefa(el.dataset.id); },
  novaTarefa() { abrirTarefa(''); },
  apagarTarefa(el) {
    S.mudar((s) => { s.tarefas = s.tarefas.filter((t) => t.id !== el.dataset.id); }, { desfazivel: true });
    janela.close(); aviso('Tarefa apagada', { desfazer: true }); redesenhar();
  },
  filtroCat(el) { filtroCat = el.dataset.id; redesenhar(); },
  verFeitas() { verFeitas = !verFeitas; redesenhar(); },
  passarAmanha() { S.mudar((s) => { s.tarefas = R.passarParaAmanha(s.tarefas, hoje()); s.avisos.fimDoDia = hoje(); }, { desfazivel: true }); aviso('Passadas para amanhã', { desfazer: true }); redesenhar(); },
  dispensarFimDoDia() { S.mudar((s) => { s.avisos.fimDoDia = hoje(); }); redesenhar(); },
  dispensarCopia() { S.mudar((s) => { s.avisos.backup = hoje(); }); redesenhar(); },
  salvarCopia() { baixarCopia(); redesenhar(); },
  habito(el) {
    const d = hoje();
    S.mudar((s) => {
      const arr = s.habitosFeitos[d] = s.habitosFeitos[d] || [];
      const i = arr.indexOf(el.dataset.id);
      if (i >= 0) arr.splice(i, 1); else arr.push(el.dataset.id);
    });
    redesenhar();
  },
  mesHab(el) {
    const ym = mesHabitos || R.mesDe(hoje());
    const [a, m] = ym.split('-').map(Number);
    const dt = new Date(a, m - 1 + Number(el.dataset.d), 1);
    mesHabitos = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    redesenhar();
  },
  // Classificar
  escolher(el) {
    const g = el.dataset.grupo;
    escolha[g] = escolha[g] === el.dataset.id && g !== 'quando' ? '' : el.dataset.id;
    $$(`[data-grupo="${g}"]`).forEach((b) => b.classList.toggle('sel', b.dataset.id === escolha[g]));
    if (g === 'quando') { const dt = $('#cl-data'); dt.hidden = escolha.quando !== 'data'; $('#cl-hora-rot').hidden = !['hoje', 'amanha', 'data'].includes(escolha.quando); if (!dt.hidden) dt.focus(); }
    if (g === 'tempo') $('#cl-passo-grupo').hidden = !R.ehLonga(L(), escolha.tempo);
  },
  classificarPronto() {
    const texto = $('#cl-texto').value.trim();
    const dataEsc = $('#cl-data').value || hoje();
    const horaEsc = ['hoje', 'amanha', 'data'].includes(escolha.quando) ? ($('#cl-hora').value || '') : '';
    const passo = ($('#cl-passo') || {}).value || '';
    S.mudar((s) => {
      const i = s.tarefas.findIndex((t) => t.id === escolha.id);
      const t = R.aplicarQuando({ ...s.tarefas[i], texto: texto || s.tarefas[i].texto }, escolha.quando || 'sem', hoje(), dataEsc);
      Object.assign(t, { hora: horaEsc, projeto: escolha.projeto, prioridade: escolha.prioridade, categoria: escolha.categoria, tempo: escolha.tempo, primeiroPasso: R.ehLonga(L(), escolha.tempo) ? passo.trim() : (t.primeiroPasso || '') });
      s.tarefas[i] = t;
    });
    escolha = {};
    redesenhar();
  },
  classificarPular() { pulados.add(escolha.id); escolha = {}; redesenhar(); },
  classificarApagar() {
    S.mudar((s) => { s.tarefas = s.tarefas.filter((t) => t.id !== escolha.id); }, { desfazivel: true });
    escolha = {}; aviso('Tarefa apagada', { desfazer: true }); redesenhar();
  },
  // Começar pequeno / foco
  comecar() { comecarPequeno(); },
  fazerAgora(el) { fazerAgora(el.dataset.id); },
  abrirAno(el) { const a = el.dataset.ano; if (anosAbertos.has(a)) anosAbertos.delete(a); else anosAbertos.add(a); redesenhar(); },
  parteHoje(el) {
    S.mudar((s) => { const t = s.tarefas.find((x) => x.id === el.dataset.id); if (t) { t.parteFeita = hoje(); logar('tarefas'); } }, { desfazivel: true });
    aviso('Parte de hoje feita. Amanhã ela volta.', { desfazer: true }); redesenhar();
  },
  abrirLinks(el) { const id = el.dataset.id; if (linksAbertos.has(id)) linksAbertos.delete(id); else linksAbertos.add(id); redesenhar(); },
  outraOpcao() { opcaoIdx++; mostrarOpcao(); },
  comecarFoco() { const o = opcoes[opcaoIdx % opcoes.length]; janela.close(); iniciarFoco(o.texto, o.tarefaId); },
  focoPomodoro() { iniciarPomodoro(); },
  focoContinuar() { S.mudar((s) => { s.foco = { ...s.foco, modo: 'livre', acabou: false }; }); desenharFoco(); },
  focoConclui() {
    const f = st().foco;
    S.mudar((s) => {
      if (f.tarefaId) { const i = s.tarefas.findIndex((t) => t.id === f.tarefaId); if (i >= 0 && R.aberta(s.tarefas[i])) { s.tarefas[i] = R.concluir(s.tarefas[i], hoje()); logar('tarefas'); etapaFeitaPelaTarefa(s, s.tarefas[i]); } }
      s.foco = null;
    });
    desenharFoco(); aviso('Muito bem.'); redesenhar();
  },
  focoParar() { S.mudar((s) => { s.foco = null; }); desenharFoco(); if (st().foco === null) aviso('Você começou. Isso já conta.'); redesenhar(); },
  focoMini() { S.mudar((s) => { s.foco.mini = true; }); desenharFoco(); },
  focoAbrir() { S.mudar((s) => { s.foco.mini = false; }); desenharFoco(); },
  // Ideia do dia
  ideiaOutra() {
    const s = st(); const d = hoje();
    const cands = R.candidatosIdeia(s.posts, s.livros, d, s.ideia.recentes);
    S.mudar((x) => {
      if (cands.length) { x.ideia.id = cands[0].id; x.ideia.data = d; x.ideia.recentes[cands[0].id] = d; } else x.ideia.hojeNao = d;
    });
    redesenhar();
  },
  fecharResumo() { S.mudar((s) => { s.avisos.resumo = hoje(); }); redesenhar(); },
  ideiaHojeNao() { S.mudar((s) => { s.ideia.hojeNao = hoje(); }); redesenhar(); },
  ideiaFazer() {
    const c = candidatoAtual();
    if (!c) return;
    const texto = c.tipo === 'ideia' ? `Escrever roteiro: ${c.tema}` : c.tipo === 'gravar' ? `Gravar: ${c.tema}` : `Stories: trecho de ${c.livro}`;
    S.mudar((s) => {
      s.tarefas.push({ id: S.uid(), texto, classificada: true, quando: 'data', data: hoje(), categoria: (s.listas.categorias[0] || {}).id || '', criadaEm: S.agora() });
      s.ideia.hojeNao = hoje();
    });
    location.hash = c.tipo === 'ideia' && c.postId ? `#/estudio/${c.postId}` : c.postId ? `#/post/${c.postId}` : `#/livro/${c.livroId}`;
  },
  // Estúdio de Roteiro
  estudioPasso(el) { verMoldeId = ''; mudarEstudio((e) => { e.passo = el.dataset.passo; }); window.scrollTo(0, 0); },
  estudioEscolha(el) { const { campo: c, valor: v } = el.dataset; mudarEstudio((e) => { e[c] = e[c] === v ? '' : v; }); },
  verTodosMoldes() { verTodosMoldes = !verTodosMoldes; verMoldeId = ''; redesenhar(); },
  estudioFavorito(el) {
    const id = el.dataset.id;
    const atual = [...idsFavoritos()];
    if (atual.includes(id)) atual.splice(atual.indexOf(id), 1);
    else if (atual.length >= E.MAX_FAVORITOS) { aviso(`Já tem ${E.MAX_FAVORITOS} moldes. Tire um antes de pôr outro.`); return; }
    else atual.push(id);
    S.mudar((s) => { s.ajustes.moldesFavoritos = atual; });
    redesenhar();
  },
  estudioApagarImg(el) {
    const id = el.dataset.id;
    const p = st().posts.find((x) => x.id === rota().args[0]);
    const im = E.estudioDe(p).imagens.find((x) => x.id === id);
    if (!im || !confirm('Apagar esta imagem do post?')) return;
    mudarEstudio((e) => { e.imagens = e.imagens.filter((x) => x.id !== id); });
    N.apagarImagem(im.caminho);
  },
  verMolde(el) { verMoldeId = el.dataset.id; redesenhar(); if (verMoldeId) window.scrollTo({ top: 0, behavior: 'smooth' }); },
  estudioMolde(el) { mudarEstudio((e) => { e.molde = el.dataset.id; }); aviso(el.dataset.id ? 'Molde escolhido' : 'Molde tirado'); },
  estudioMaisParte() { mudarEstudio((e) => { e.meio.push(''); e.cenas.push(''); }); },
  estudioGancho(el) { mudarEstudio((e) => { e.gancho = Number(el.dataset.i); }); },
  postCheck(el) { mudarEstudio((e) => { e.check[el.dataset.id] = !e.check[el.dataset.id]; }, false); const y = window.scrollY; render(); window.scrollTo(0, y); },
  estudioTrecho() { janela._destinoPauta = null; janela._destinoEstudio = true; janelaTrechos(); },
  estudioClaude() {
    const p = st().posts.find((x) => x.id === rota().args[0]);
    const e = E.estudioDe(p);
    const k = (p.texto || '').indexOf('<hr data-estudio');
    const anot = textoPuro(k >= 0 ? p.texto.slice(p.texto.indexOf('>', k) + 1) : p.texto).replace(/\s+/g, ' ').trim().slice(0, 800);
    copiar(E.pedidoClaude(p, e, moldePorId(e.molde), anot), 'Pedido copiado. Cole na conversa com o Claude.');
  },
  estudioMontar() {
    const id = rota().args[0];
    S.mudar((s) => {
      const p = s.posts.find((x) => x.id === id);
      const e = E.estudioDe(p);
      p.texto = E.juntarTexto(E.montarHTML(e, moldePorId(e.molde), esc), p.texto);
      if (p.situacao === 'ideia') { p.situacao = 'roteiro'; postMudouSituacao(s, p, 'ideia'); }
    }, { desfazivel: true });
    location.hash = `#/post/${id}`;
    aviso('Roteiro montado no post', { desfazer: true });
  },
  // Roteiros
  novaAula, novoPost,
  irAula(el) { location.hash = `#/aula/${el.dataset.id}`; },
  irPost(el) { location.hash = `#/post/${el.dataset.id}`; },
  etapa(el) {
    const { id, etapa } = el.dataset;
    S.mudar((s) => {
      const a = s.aulas.find((x) => x.id === id);
      a.etapas = a.etapas || {};
      const t = s.tarefas.find((x) => x.aulaId === id && x.etapa === etapa);
      if (a.etapas[etapa]) { delete a.etapas[etapa]; logar('etapas', -1); if (t && t.feitaEm) delete t.feitaEm; } else { a.etapas[etapa] = hoje(); logar('etapas'); if (t && !t.feitaEm) t.feitaEm = hoje(); }
    });
    redesenhar();
  },
  verPostados() { verPostados = !verPostados; redesenhar(); },
  abrirGrupo(el) { const { tipo, id } = el.dataset; const g = grupoAberto[tipo]; if (g.has(id)) g.delete(id); else g.add(id); redesenhar(); },
  verTodasIdeias() { verTodasIdeias = true; redesenhar(); },
  copiarTexto() {
    const titulo = ($('.titulo-editor') || {}).value || '';
    copiar(`${titulo}\n\n${$('.editor').innerText}`.trim(), 'Texto copiado');
  },
  imprimir() { window.print(); },
  duplicar(el) {
    const lista = el.dataset.tipo === 'aula' ? 'aulas' : 'posts';
    const id = S.uid();
    S.mudar((s) => {
      const o = s[lista].find((x) => x.id === el.dataset.id);
      s[lista].push({ ...structuredClone(o), id, titulo: `${o.titulo} (cópia)`, criadaEm: S.agora(), origem: '', ...(lista === 'aulas' ? { etapas: {} } : { situacao: 'ideia', data: '' }) });
    });
    location.hash = `#/${el.dataset.tipo}/${id}`;
    aviso('Cópia criada');
  },
  apagarRoteiro(el) {
    const lista = el.dataset.tipo === 'aula' ? 'aulas' : 'posts';
    S.mudar((s) => { s[lista] = s[lista].filter((x) => x.id !== el.dataset.id); }, { desfazivel: true });
    location.hash = el.dataset.tipo === 'aula' ? '#/roteiros/aulas' : '#/roteiros/posts';
    aviso('Roteiro apagado', { desfazer: true });
  },
  inserirTrecho() { janela._destinoEstudio = false; janela._destinoPauta = null; guardarSelecao(); janelaTrechos(); },
  usarTrecho(el) {
    const t = janela._trechos[Number(el.dataset.i)];
    const textoTrecho = `“${t.texto}” — ${t.livro}${t.autor ? `, ${t.autor}` : ''}${t.pagina ? ` (p. ${t.pagina})` : ''}`;
    janela.close();
    if (janela._destinoEstudio) {
      janela._destinoEstudio = false;
      mudarEstudio((e) => { const n = e.meio.findIndex((m) => !m.trim()); if (n >= 0) e.meio[n] = textoTrecho; else e.meio.push(textoTrecho); });
      return;
    }
    if (janela._destinoPauta) {
      const id = janela._destinoPauta; janela._destinoPauta = null;
      S.mudar((s) => { const e = s.clube.encontros.find((x) => x.id === id); e.pauta = `${e.pauta ? `${e.pauta}\n\n` : ''}${textoTrecho}`; });
      redesenhar(); return;
    }
    const ed = $('.editor');
    ed.focus();
    if (ultimaSelecao) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(ultimaSelecao); }
    document.execCommand('insertHTML', false, `<blockquote>${esc(textoTrecho)}</blockquote><p><br></p>`);
    salvarEditor(ed);
  },
  // Leituras
  novoLivro,
  irLivro(el) { location.hash = `#/livro/${el.dataset.id}`; },
  metaLivros() {
    const ano = new Date().getFullYear();
    const v = prompt(`Quantos livros quer ler em ${ano}?`, st().ajustes.metaLivros[ano] || '');
    if (v === null) return;
    S.mudar((s) => { s.ajustes.metaLivros[ano] = Math.max(0, Number(v) || 0); });
    redesenhar();
  },
  generoLivro(el) {
    S.mudar((s) => { const l = s.livros.find((x) => x.id === el.dataset.id); l.generos = l.generos || []; const i = l.generos.indexOf(el.dataset.g); if (i >= 0) l.generos.splice(i, 1); else l.generos.push(el.dataset.g); });
    redesenhar();
  },
  tirarCapa(el) { S.mudar((s) => { s.livros.find((x) => x.id === el.dataset.id).capa = ''; }); redesenhar(); },
  apagarLivro(el) {
    S.mudar((s) => { s.livros = s.livros.filter((x) => x.id !== el.dataset.id); s.clube.proximos = s.clube.proximos.filter((x) => x !== el.dataset.id); }, { desfazivel: true });
    location.hash = '#/leituras'; aviso('Livro apagado', { desfazer: true });
  },
  trechoConteudo(el) { S.mudar((s) => { const t = s.livros.find((x) => x.id === el.dataset.id).trechos.find((x) => x.id === el.dataset.t); t.conteudo = !t.conteudo; }); redesenhar(); },
  apagarTrecho(el) { S.mudar((s) => { const l = s.livros.find((x) => x.id === el.dataset.id); l.trechos = l.trechos.filter((x) => x.id !== el.dataset.t); }, { desfazivel: true }); aviso('Trecho apagado', { desfazer: true }); redesenhar(); },
  novoEncontro() {
    const id = S.uid();
    S.mudar((s) => { s.clube.encontros.push({ id, data: '', atePagina: '', obs: '', pauta: '', comoFoi: '', livroId: s.clube.livroAtual || '' }); });
    location.hash = `#/leituras/clube/${id}`;
    setTimeout(() => { const i = $(`[data-encontro="${id}"][data-campo=data]`); if (i) i.focus(); }, 60);
  },
  apagarEncontro(el) {
    S.mudar((s) => { s.clube.encontros = s.clube.encontros.filter((x) => x.id !== el.dataset.id); }, { desfazivel: true });
    aviso('Encontro apagado', { desfazer: true });
    if (location.hash !== '#/leituras/clube') location.hash = '#/leituras/clube'; else redesenhar();
  },
  verEncontros() { encontrosAbertos = !encontrosAbertos; redesenhar(); },
  puxarTrecho(el) { janela._destinoEstudio = false; janela._destinoPauta = el.dataset.id; janelaTrechos(); },
  moverProximo(el) {
    S.mudar((s) => { const a = s.clube.proximos; const i = a.indexOf(el.dataset.id); const j = i + Number(el.dataset.d); if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; });
    redesenhar();
  },
  tirarProximo(el) { S.mudar((s) => { s.clube.proximos = s.clube.proximos.filter((x) => x !== el.dataset.id); }); redesenhar(); },
  // Links
  novoLink(el) { abrirLinkForm('', el.dataset.grupo, el.dataset.projeto); },
  editarLink(el) { abrirLinkForm(el.dataset.id); },
  abrirLink(el) { const l = st().links.find((x) => x.id === el.dataset.id); usarLink(l.id); window.open(l.url, '_blank', 'noopener'); },
  copiarLink(el) { const l = st().links.find((x) => x.id === el.dataset.id); usarLink(l.id); copiar(l.url, 'Link copiado'); redesenhar(); },
  copiarMensagem(el) { const l = st().links.find((x) => x.id === el.dataset.id); usarLink(l.id); copiar(R.mensagemComLink(l), 'Mensagem copiada'); redesenhar(); },
  moverLink(el) {
    S.mudar((s) => {
      const l = s.links.find((x) => x.id === el.dataset.id);
      const grupo = s.links.filter((x) => x.grupo === l.grupo).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
      grupo.forEach((x, i) => { x.ordem = i; });
      const i = grupo.indexOf(l); const j = i + Number(el.dataset.d);
      if (j < 0 || j >= grupo.length) return;
      [grupo[i].ordem, grupo[j].ordem] = [grupo[j].ordem, grupo[i].ordem];
    });
    redesenhar();
  },
  apagarLink(el) { S.mudar((s) => { s.links = s.links.filter((x) => x.id !== el.dataset.id); }, { desfazivel: true }); janela.close(); aviso('Link apagado', { desfazer: true }); redesenhar(); },
  // Patrimônio
  olho() { S.mudar((s) => { s.ajustes.ocultarValores = !s.ajustes.ocultarValores; }); redesenhar(); },
  novaConta() { janelaConta(''); },
  editarConta(el) { janelaConta(el.dataset.id); },
  apagarConta(el) {
    S.mudar((s) => { s.contas = s.contas.filter((x) => x.id !== el.dataset.id); s.metas.forEach((m) => { if (m.contaId === el.dataset.id) m.contaId = ''; }); }, { desfazivel: true });
    janela.close(); aviso('Conta apagada', { desfazer: true }); redesenhar();
  },
  novaMeta() { janelaMeta(''); },
  editarMeta(el) { janelaMeta(el.dataset.id); },
  apagarMeta(el) { S.mudar((s) => { s.metas = s.metas.filter((x) => x.id !== el.dataset.id); }, { desfazivel: true }); janela.close(); aviso('Meta apagada', { desfazer: true }); redesenhar(); },
  fecharOutroMes() {
    const v = prompt('Qual mês? (ex.: 10/2026)', `${R.mesAnterior(R.mesDe(hoje())).slice(5)}/${R.mesAnterior(R.mesDe(hoje())).slice(0, 4)}`);
    const m = (v || '').match(/^(\d{1,2})\/(\d{4})$/);
    if (m) location.hash = `#/fechar/${m[2]}-${m[1].padStart(2, '0')}`;
  },
  apagarMes(el) { S.mudar((s) => { delete s.meses[el.dataset.ym]; }, { desfazivel: true }); location.hash = '#/patrimonio'; aviso('Mês apagado', { desfazer: true }); },
  // Ajustes
  moverItem(el) {
    S.mudar((s) => { const a = s.listas[el.dataset.lista]; const i = Number(el.dataset.i); const j = i + Number(el.dataset.d); if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; });
    redesenhar();
  },
  tirarItem(el) { S.mudar((s) => { s.listas[el.dataset.lista].splice(Number(el.dataset.i), 1); }, { desfazivel: true }); aviso('Item apagado', { desfazer: true }); redesenhar(); },
  tirarHabito(el) { S.mudar((s) => { s.habitos = s.habitos.filter((h) => h.id !== el.dataset.id); }, { desfazivel: true }); aviso('Hábito apagado', { desfazer: true }); redesenhar(); },
  tirarAquec(el) { S.mudar((s) => { s.aquecimentos.splice(Number(el.dataset.i), 1); }); redesenhar(); },
};

document.addEventListener('click', (e) => {
  const cmd = e.target.closest('[data-cmd]');
  if (cmd) { e.preventDefault(); comando(cmd.dataset.cmd); return; }
  const el = e.target.closest('[data-acao]');
  if (!el || !acoes[el.dataset.acao]) return;
  e.preventDefault();
  acoes[el.dataset.acao](el);
});
// Botões da barra do editor não tiram o foco do texto.
document.addEventListener('mousedown', (e) => { if (e.target.closest('.ferramentas button')) { guardarSelecao(); e.preventDefault(); } });
janela.addEventListener('click', (e) => { if (e.target === janela) janela.close(); });

// ---------- Formulários ----------
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  const tipo = f.dataset.form;
  const fd = new FormData(f);
  if (tipo === 'anotar') {
    const texto = String(fd.get('texto') || '').trim();
    if (!texto) return;
    S.mudar((s) => { s.tarefas.push({ id: S.uid(), texto, classificada: false, quando: 'sem', criadaEm: S.agora() }); });
    f.reset(); aviso('Na Caixa do Depois');
    redesenhar();
    const inp = $('.anotar input'); if (inp) inp.focus();
  }
  if (tipo === 'tarefa') salvarTarefa(f);
  if (tipo === 'entrarNuvem') {
    const b = f.querySelector('button[type=submit]');
    b.disabled = true; b.textContent = 'Entrando…';
    N.entrar(String(fd.get('email')).trim(), String(fd.get('senha')))
      .then(() => { aviso(N.estado.situacao === 'ok' ? 'Pronto, sincronizado' : 'Entrou, mas não sincronizou ainda'); render(); })
      .catch((err) => { N.estado.erro = /invalid/i.test(err.message) ? 'E-mail ou senha não conferem.' : err.message; render(); });
  }
  if (tipo === 'novoTema') {
    const nome = String(fd.get('nome') || '').trim();
    if (!nome) return;
    S.mudar((s) => {
      const novo = { id: S.uid(), nome };
      s.listas.temasTrechos = s.listas.temasTrechos || [];
      s.listas.temasTrechos.push(novo);
      const t = s.livros.find((x) => x.id === f.dataset.id).trechos.find((x) => x.id === f.dataset.t);
      t.temas = [...(t.temas || []), novo.id];
    });
    janelaTemas(f.dataset.id, f.dataset.t);
  }
  if (tipo === 'tarefaProjeto') {
    const texto = String(fd.get('texto') || '').trim();
    if (!texto) return;
    S.mudar((s) => { s.tarefas.push({ id: S.uid(), texto, classificada: true, quando: 'sem', projeto: f.dataset.id, criadaEm: S.agora() }); });
    aviso('Tarefa criada'); redesenhar();
    const i = $('[data-form=tarefaProjeto] input'); if (i) i.focus();
  }
  if (tipo === 'pagina') {
    const p = Number(fd.get('pagina'));
    if (!fd.get('pagina')) return;
    S.mudar((s) => { const l = s.livros.find((x) => x.id === f.dataset.id); if (p > (l.paginaAtual || 0)) logar('paginas', p - (l.paginaAtual || 0)); l.paginaAtual = p; if (l.paginas && p >= l.paginas) { l.situacao = 'lido'; l.fim = l.fim || hoje(); } });
    const l = st().livros.find((x) => x.id === f.dataset.id);
    aviso(l.situacao === 'lido' ? 'Livro terminado!' : 'Página atualizada');
    redesenhar();
  }
  if (tipo === 'trecho') {
    S.mudar((s) => { const l = s.livros.find((x) => x.id === f.dataset.id); (l.trechos = l.trechos || []).push({ id: S.uid(), texto: String(fd.get('texto')).trim(), pagina: String(fd.get('pagina') || '').trim(), conteudo: !!fd.get('conteudo'), criadoEm: S.agora() }); });
    aviso('Trecho guardado'); redesenhar();
  }
  if (tipo === 'link') {
    const dados = { nome: String(fd.get('nome')).trim(), url: String(fd.get('url')).trim(), grupo: fd.get('grupo'), mensagem: String(fd.get('mensagem') || ''), projeto: fd.get('projeto') || '' };
    if (!/^[a-z]+:/i.test(dados.url)) dados.url = `https://${dados.url}`;
    S.mudar((s) => { const id = f.dataset.id; if (id) Object.assign(s.links.find((x) => x.id === id), dados); else s.links.push({ id: S.uid(), usos: 0, ordem: s.links.length, ...dados }); });
    janela.close(); redesenhar();
  }
  if (tipo === 'conta') {
    const dados = { nome: String(fd.get('nome')).trim(), tipo: fd.get('tipo') };
    S.mudar((s) => { const id = f.dataset.id; if (id) Object.assign(s.contas.find((x) => x.id === id), dados); else s.contas.push({ id: S.uid(), ...dados }); });
    janela.close(); redesenhar();
  }
  if (tipo === 'meta') {
    const dados = { nome: String(fd.get('nome')).trim(), alvo: R.numeroDigitado(fd.get('alvo')), contaId: fd.get('contaId') };
    S.mudar((s) => { const id = f.dataset.id; if (id) Object.assign(s.metas.find((x) => x.id === id), dados); else s.metas.push({ id: S.uid(), guardado: {}, ...dados }); });
    janela.close(); redesenhar();
  }
  if (tipo === 'fechar') {
    const ym = f.dataset.ym;
    S.mudar((s) => {
      s.meses[ym] = Object.fromEntries(s.contas.map((c) => [c.id, R.numeroDigitado(fd.get(`c_${c.id}`))]));
      s.metas.filter((m) => !m.contaId).forEach((m) => { const v = fd.get(`m_${m.id}`); if (v !== null && v !== '') { m.guardado = m.guardado || {}; m.guardado[ym] = R.numeroDigitado(v); } });
    });
    aviso(`${R.nomeMes(ym)} fechado`);
    location.hash = '#/patrimonio';
  }
  if (tipo === 'addItem') {
    const nome = String(fd.get('nome') || '').trim(); if (!nome) return;
    S.mudar((s) => { s.listas[f.dataset.lista].push({ id: S.uid(), nome }); }); redesenhar();
  }
  if (tipo === 'addHabito') {
    S.mudar((s) => { s.habitos.push({ id: S.uid(), nome: String(fd.get('nome')).trim(), emoji: String(fd.get('emoji') || '').trim(), dias: [0, 1, 2, 3, 4, 5, 6] }); }); redesenhar();
  }
  if (tipo === 'addAquec') { S.mudar((s) => { s.aquecimentos.push(String(fd.get('nome')).trim()); }); redesenhar(); }
});

// ---------- Campos que salvam sozinhos ----------
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.matches('[data-editor]')) { salvarEditor(el); return; }
  if (el.dataset.estudio) {
    ajustarAltura(el);
    const { estudio: c, i } = el.dataset;
    mudarEstudio((e) => { if (i !== undefined) e[c][Number(i)] = el.value; else e[c] = el.value; }, false);
    return;
  }
  // Escolheu um livro da lista: confirma na hora (sem precisar sair do campo).
  if (el.matches('[data-clube-livro], [data-add-proximo], [data-encontro-livro]') && livroPeloNome(el.value) && (!e.inputType || e.inputType === 'insertReplacementText')) { escolherLivroClube(el); return; }
  if (el.dataset.imgNota) {
    const id = el.dataset.imgNota;
    mudarEstudio((e) => { const im = e.imagens.find((x) => x.id === id); if (im) im.nota = el.value; }, false);
    return;
  }
  if (el.matches('textarea.titulo-editor, textarea.cresce')) ajustarAltura(el);
  if (el.matches('[data-busca]')) {
    const v = el.value;
    if (el.dataset.busca === 'roteiros') buscaRot = v;
    if (el.dataset.busca === 'trechos') buscaTrecho = v;
    if (el.dataset.busca === 'links') buscaLink = v;
    if (el.dataset.busca === 'moldes') buscaMolde = v;
    if (el.dataset.busca === 'livros') buscaLivro = v;
    clearTimeout(el._t); el._t = setTimeout(() => { redesenhar(); const n = $(`[data-busca="${el.dataset.busca}"]`); if (n) { n.focus(); n.setSelectionRange(v.length, v.length); } }, 250);
  }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  const set = (fn, re = false) => { S.mudar(fn); if (re) (el.type === 'date' ? redesenharQuandoLivre() : redesenhar()); }; // datas: não fecha o calendário no meio da escolha
  if (el.dataset.campoProjeto) {
    const c = el.dataset.campoProjeto;
    set((s) => { const p = s.projetos.find((x) => x.id === rota().args[0]); p[c] = el.type === 'checkbox' ? el.checked : (c === 'nome' ? el.value.trim() || p.nome : el.value); }, c !== 'notas');
  } else if (el.dataset.prazoEtapa) {
    const aulaId = rota().args[0];
    S.mudar((s) => {
      const a = s.aulas.find((x) => x.id === aulaId);
      const etapa = s.listas.etapasAula.find((x) => x.id === el.dataset.prazoEtapa);
      if (!a || !etapa) return;
      const proj = s.projetos.find((p) => a.produto && p.produto === a.produto && !p.arquivado);
      s.tarefas = R.definirPrazo(s.tarefas, a, etapa, el.value, { id: S.uid(), criadaEm: S.agora(), categoria: (s.listas.categorias[0] || {}).id || '', projeto: proj ? proj.id : '' });
    });
    redesenharQuandoLivre(); // espera ela sair do campo: redesenhar fecharia o calendário
  } else if (el.dataset.campoAula) {
    const c = el.dataset.campoAula;
    let v = el.value;
    if (c === 'semana' && v) v = R.segunda(v);
    if (c === 'pdf' && v && !/^[a-z]+:/i.test(v)) v = `https://${v}`;
    set((s) => {
      const a = s.aulas.find((x) => x.id === rota().args[0]);
      a[c] = v;
      if (c === 'titulo') s.tarefas.forEach((t) => { if (t.aulaId === a.id && !t.feitaEm) { const e = s.listas.etapasAula.find((x) => x.id === t.etapa); if (e) t.texto = R.textoPrazo(a, e); } });
    }, c === 'semana' || c === 'pdf');
  } else if (el.dataset.prazoPost) {
    const postId = rota().args[0];
    S.mudar((s) => {
      const p = s.posts.find((x) => x.id === postId);
      const etapa = R.ETAPAS_POST.find((x) => x.id === el.dataset.prazoPost);
      if (!p || !etapa) return;
      s.tarefas = R.definirPrazoPost(s.tarefas, p, etapa, el.value, { id: S.uid(), criadaEm: S.agora(), categoria: (s.listas.categorias[0] || {}).id || '', projeto: p.projeto || '' });
    });
    redesenharQuandoLivre();
  } else if (el.dataset.campoPost) {
    const c = el.dataset.campoPost;
    set((s) => {
      const p = s.posts.find((x) => x.id === rota().args[0]);
      const antes = p.situacao;
      p[c] = el.value;
      if (c === 'situacao') postMudouSituacao(s, p, antes);
      if (c === 'titulo') s.tarefas.forEach((t) => { if (t.postId === p.id && !t.feitaEm) { const e = R.ETAPAS_POST.find((x) => x.id === t.etapaPost); if (e) t.texto = R.textoPrazoPost(p, e); } });
    }, c === 'situacao');
  } else if (el.dataset.campoLivro) {
    const c = el.dataset.campoLivro;
    let v = el.value;
    if (['paginas', 'paginaAtual'].includes(c)) v = v === '' ? '' : Number(v);
    set((s) => {
      const l = s.livros.find((x) => x.id === rota().args[0]);
      l[c] = v;
      if (c === 'situacao' && v === 'lendo' && !l.inicio) l.inicio = hoje();
      if (c === 'situacao' && v === 'lido' && !l.fim) l.fim = hoje();
    }, ['situacao', 'paginas', 'paginaAtual'].includes(c));
  } else if (el.dataset.encontro) {
    const c = el.dataset.campo;
    set((s) => { s.clube.encontros.find((x) => x.id === el.dataset.encontro)[c] = c === 'atePagina' ? (el.value === '' ? '' : Number(el.value)) : el.value; }, c === 'data' || c === 'atePagina');
  } else if (el.matches('[data-clube-livro], [data-add-proximo], [data-encontro-livro]')) {
    escolherLivroClube(el);
  } else if (el.matches('[data-img-post]')) {
    adicionarImagens(el.files); el.value = '';
  } else if (el.matches('[data-capa]')) {
    trocarCapa(el.dataset.capa, el.files[0]);
  } else if (el.matches('[data-restaurar]')) {
    if (el.files[0]) lerRestauracao(el.files[0]);
    el.value = '';
  } else if (el.matches('[data-filtro-post]')) {
    filtroPost[el.dataset.filtroPost] = el.value; redesenhar();
  } else if (el.dataset.lista) {
    set((s) => { const x = s.listas[el.dataset.lista].find((y) => y.id === el.dataset.id); if (x && el.value.trim()) x.nome = el.value.trim(); });
  } else if (el.dataset.habito) {
    set((s) => { s.habitos.find((h) => h.id === el.dataset.habito)[el.dataset.campo] = el.value.trim(); });
  } else if (el.dataset.habitoDia) {
    set((s) => { const h = s.habitos.find((x) => x.id === el.dataset.habitoDia); const n = Number(el.value); h.dias = el.checked ? [...new Set([...(h.dias || []), n])].sort() : (h.dias || []).filter((x) => x !== n); });
  } else if (el.dataset.aquec !== undefined) {
    set((s) => { s.aquecimentos[Number(el.dataset.aquec)] = el.value.trim(); });
  } else if (el.dataset.ajuste) {
    set((s) => { s.ajustes[el.dataset.ajuste] = el.value.trim(); });
  } else if (el.dataset.ajusteBool) {
    set((s) => { s.ajustes[el.dataset.ajusteBool] = el.checked; });
  } else if (el.dataset.pomo) {
    set((s) => { s.ajustes.pomodoro[el.dataset.pomo] = Math.max(1, Number(el.value) || 1); });
  } else if (el.dataset.muda) {
    const form = el.closest('form');
    if (el.dataset.muda === 'quando') {
      $('[data-mostra="quando-data"]', form).hidden = !['data', 'ate'].includes(el.value);
      $('[data-mostra="quando-hora"]', form).hidden = el.value === 'ate';
      $$('[data-mostra="quando-ate"], [data-mostra="quando-ate-dica"]', form).forEach((x) => { x.hidden = el.value !== 'ate'; });
    }
    if (el.dataset.muda === 'repetir') ['semana', 'mes', 'ano'].forEach((k) => { $(`[data-mostra="rep-${k}"]`, form).hidden = el.value !== k; });
  }
});
// Ao sair de um campo de data, mostra a mudança na hora (enquanto escolhe, a tela não se mexe).
document.addEventListener('focusout', (e) => { if (e.target.matches && e.target.matches('input[type="date"]')) setTimeout(redesenharQuandoLivre, 60); });
// Colar no editor: só texto, sem formatação estranha.
document.addEventListener('paste', (e) => {
  const imgs = [...((e.clipboardData && e.clipboardData.files) || [])].filter((f) => f.type.startsWith('image/'));
  if (imgs.length && rota().nome === 'estudio' && $('[data-zona-imagens]')) { e.preventDefault(); adicionarImagens(imgs); return; }
  if (!e.target.closest('.editor')) return;
  e.preventDefault();
  const texto = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, texto);
});
// Arrastar imagem para a capa.
document.addEventListener('dragover', (e) => { if (e.target.closest('.capa, [data-zona-imagens]')) e.preventDefault(); });
document.addEventListener('drop', (e) => {
  if (e.target.closest('[data-zona-imagens]')) { e.preventDefault(); adicionarImagens(e.dataTransfer.files); return; }
  const c = e.target.closest('.capa');
  const id = rota().nome === 'livro' ? rota().args[0] : null;
  if (!c || !id) return;
  e.preventDefault();
  trocarCapa(id, e.dataTransfer.files[0]);
});
// Atalho: "n" abre o campo Anotar.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('textarea.titulo-editor')) { e.preventDefault(); e.target.blur(); return; }
  if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.target.closest('input, textarea, select, [contenteditable]') && !janela.open) {
    const i = $('.anotar input'); if (i) { e.preventDefault(); i.focus(); }
  }
});

// Campo de texto cresce com o conteúdo (até 60% da tela; depois disso, rola por dentro).
function ajustarAltura(t) {
  t.style.height = 'auto';
  const borda = t.offsetHeight - t.clientHeight;
  const max = t.classList.contains('cresce') ? Math.round(window.innerHeight * 0.6) : Infinity;
  const alvo = t.scrollHeight + borda;
  t.style.height = `${Math.min(alvo, max)}px`;
  t.style.overflowY = alvo > max ? 'auto' : 'hidden';
}
// Cada cartão ganha uma cor da paleta, na ordem em que aparece (como na aba Projetos).
const TOQUES = ['#5C6854', '#5F7488', '#9C6F47', '#806A7C', '#4C5A6E', '#A27A62'];
function colorirCartoes() {
  $$('main .cartao').filter((c) => !c.matches('.projeto-card, .ideia-dia, .calendario, .cartao-habitos, .aviso-gentil'))
    .forEach((c, i) => c.style.setProperty('--toque', TOQUES[i % TOQUES.length]));
}
function depoisDeRender(nome) {
  colorirCartoes();
  const ajustarTodos = () => $$('textarea.titulo-editor, textarea.cresce').forEach(ajustarAltura);
  ajustarTodos();
  requestAnimationFrame(ajustarTodos); // de novo depois que a tela termina de montar
  if (document.fonts) document.fonts.ready.then(ajustarTodos);
  if (nome === 'aula' || nome === 'post') {
    const t = $('.titulo-editor');
    if (t && !t.value) t.focus();
  }
}

// Atualiza o Hoje com o passar do tempo (virada do dia, aviso do fim da tarde).
let diaVisto = hoje();
setInterval(() => {
  const mudouDia = diaVisto !== hoje();
  diaVisto = hoje();
  const ocupada = document.activeElement && document.activeElement.closest('input, textarea, select, [contenteditable]');
  if ((rota().nome === 'hoje' && !ocupada && !janela.open) || mudouDia) redesenhar();
  else atualizarSelo();
}, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { avancarFoco(); desenharFoco(); if (rota().nome === 'hoje' && !janela.open) redesenhar(); } });

// ---------- Início ----------
S.carregar();
S.observar((erro) => { if (erro) aviso('Sem espaço para salvar. Veja Ajustes.'); });
S.depoisDeSalvar(N.avisarMudanca);
N.ligar({
  pegar: () => S.get(),
  aplicar: (d) => { S.aplicarDaNuvem(d); redesenharQuandoLivre(); },
  mudou: () => { if (rota().nome === 'ajustes') redesenharQuandoLivre(); },
});
render();
N.comecar();
setTimeout(deixarCapasLeves, 4000); // depois de abrir e sincronizar; só mexe nas capas grandes
avancarFoco();
desenharFoco();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
