// Regras do Meu Painel: contas de datas, listas do dia, sugestões e números.
// Tudo aqui é "puro" (não mexe na tela nem no armazenamento), para poder ser testado.

// ---------- Datas (sempre no formato AAAA-MM-DD, horário local) ----------
export function iso(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export const hojeISO = () => iso(new Date());
export function data(s) { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); }
export function somaDias(s, n) { const d = data(s); d.setDate(d.getDate() + n); return iso(d); }
export function diasEntre(a, b) { return Math.round((data(b) - data(a)) / 86400000); }
export const diaSemana = (s) => data(s).getDay(); // 0 = domingo
export function segunda(s) { const dow = diaSemana(s); return somaDias(s, dow === 0 ? -6 : 1 - dow); }
export const domingo = (s) => somaDias(segunda(s), 6);
export const ultimoDiaMes = (ano, mes) => new Date(ano, mes, 0).getDate(); // mes 1-12
export const mesDe = (s) => s.slice(0, 7);
export function mesAnterior(ym) { const [a, m] = ym.split('-').map(Number); return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`; }

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_LONGO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const nomeMes = (ym) => MESES[Number(ym.slice(5, 7)) - 1];
export const ddmm = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
export function quando(s, hoje) {
  const n = diasEntre(hoje, s);
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  if (n === -1) return 'Ontem';
  return `${DIAS[diaSemana(s)]} ${ddmm(s)}`;
}
export function dataPorExtenso(s) {
  const d = data(s);
  return `${DIAS_LONGO[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

// ---------- Tarefas ----------
// tarefa: { id, texto, classificada, quando: 'data'|'semana'|'sem', data, semanaFim,
//           prioridade, categoria, tempo, primeiroPasso, repetir, feitaEm, criadaEm }
// repetir: null | { tipo: 'dia' } | { tipo: 'semana', dias: [0..6] } | { tipo: 'mes', dia: 1..31 } | { tipo: 'ano', mes: 1..12, dia }

export function repeteEm(rep, s) {
  if (!rep) return false;
  const d = data(s);
  if (rep.tipo === 'dia') return true;
  if (rep.tipo === 'semana') return (rep.dias || []).includes(d.getDay());
  if (rep.tipo === 'mes') return d.getDate() === Math.min(rep.dia, ultimoDiaMes(d.getFullYear(), d.getMonth() + 1));
  if (rep.tipo === 'ano') return d.getMonth() + 1 === rep.mes && d.getDate() === Math.min(rep.dia, ultimoDiaMes(d.getFullYear(), rep.mes));
  return false;
}
// Próximo dia (depois de "depois") em que a tarefa se repete.
export function proximaRepeticao(rep, depois) {
  for (let i = 1; i <= 800; i++) { const s = somaDias(depois, i); if (repeteEm(rep, s)) return s; }
  return null;
}
// Primeiro dia (a partir de "desde", incluindo) em que a tarefa se repete.
export function primeiraRepeticao(rep, desde) { return repeteEm(rep, desde) ? desde : proximaRepeticao(rep, desde); }

export const aberta = (t) => !t.feitaEm;
export const naCaixa = (t) => aberta(t) && !t.classificada;

// Data em que a tarefa "vence" (para Hoje e para atrasos). Sem data = null.
export function vencimento(t) {
  if (t.quando === 'data' && t.data) return t.data;
  if (t.quando === 'semana' && t.semanaFim) return t.semanaFim;
  return null;
}

// Para hoje: com data de hoje, atrasadas e "esta semana" no domingo (ou vencidas).
export function paraHoje(tarefas, hoje, listas) {
  const pri = (t) => (listas ? ordemPrioridade(listas, t.prioridade) : 0);
  // Compromissos com horário de hoje vêm primeiro, na ordem do relógio; depois as outras, por prioridade.
  const hora = (t) => (t.hora && vencimento(t) === hoje ? t.hora : '');
  return tarefas.filter((t) => aberta(t) && t.classificada && vencimento(t) && vencimento(t) <= hoje)
    .sort((a, b) => {
      const ha = hora(a); const hb = hora(b);
      if (ha && hb) return ha.localeCompare(hb);
      if (ha || hb) return ha ? -1 : 1;
      return pri(a) - pri(b) || vencimento(a).localeCompare(vencimento(b));
    });
}
export const atrasada = (t, hoje) => !!vencimento(t) && vencimento(t) < hoje;
// Urgente = a primeira prioridade da lista (Alta).
export const urgente = (t, listas) => t.prioridade && listas.prioridades[0] && t.prioridade === listas.prioridades[0].id;

export function semData(tarefas) { return tarefas.filter((t) => aberta(t) && t.classificada && !vencimento(t)); }
export function estaSemana(tarefas, hoje) {
  return tarefas.filter((t) => aberta(t) && t.classificada && t.quando === 'semana' && t.semanaFim && t.semanaFim > hoje);
}
export function proximosDias(tarefas, hoje) {
  return tarefas.filter((t) => aberta(t) && t.classificada && t.quando === 'data' && t.data && t.data > hoje)
    .sort((a, b) => a.data.localeCompare(b.data));
}
// Próximas da semana: o que vence depois de hoje e até domingo (para adiantar quando sobrar tempo).
export function proximasDaSemana(tarefas, hoje, listas) {
  const dom = somaDias(segunda(hoje), 6);
  const pri = (t) => (listas ? ordemPrioridade(listas, t.prioridade) : 0);
  return tarefas.filter((t) => aberta(t) && t.classificada && vencimento(t) && vencimento(t) > hoje && vencimento(t) <= dom)
    .sort((a, b) => vencimento(a).localeCompare(vencimento(b)) || pri(a) - pri(b));
}
export function ordemPrioridade(listas, id) { const i = listas.prioridades.findIndex((p) => p.id === id); return i < 0 ? 99 : i; }
export function ordemTempo(listas, id) { const i = listas.tempos.findIndex((p) => p.id === id); return i < 0 ? -1 : i; }
// As tarefas dos dois maiores tempos pedem "primeiro passo".
export function ehLonga(listas, tempoId) { const i = ordemTempo(listas, tempoId); return i >= 0 && i >= listas.tempos.length - 2; }
export function ehRapida(listas, tempoId) { return !!listas.tempos[0] && tempoId === listas.tempos[0].id; }

// Aplica a escolha "Quando" da classificação.
export function aplicarQuando(t, escolha, hoje, dataEscolhida) {
  const r = { ...t, classificada: true };
  if (escolha === 'hoje') Object.assign(r, { quando: 'data', data: hoje, semanaFim: null });
  else if (escolha === 'amanha') Object.assign(r, { quando: 'data', data: somaDias(hoje, 1), semanaFim: null });
  else if (escolha === 'semana') Object.assign(r, { quando: 'semana', data: null, semanaFim: domingo(hoje) });
  else if (escolha === 'data') Object.assign(r, { quando: 'data', data: dataEscolhida, semanaFim: null });
  else Object.assign(r, { quando: 'sem', data: null, semanaFim: null });
  return r;
}

// Concluir: tarefa que se repete ganha a próxima data; as outras ficam feitas.
export function concluir(t, hoje) {
  if (t.repetir) {
    const base = t.data && t.data > hoje ? t.data : hoje;
    return { ...t, quando: 'data', data: proximaRepeticao(t.repetir, base), ultimaVez: hoje };
  }
  return { ...t, feitaEm: hoje };
}

// "Passar para amanhã": move as de hoje/atrasadas que não se repetem.
export function passarParaAmanha(tarefas, hoje) {
  const amanha = somaDias(hoje, 1);
  return tarefas.map((t) => (aberta(t) && t.classificada && !t.repetir && vencimento(t) && vencimento(t) <= hoje)
    ? { ...t, quando: 'data', data: amanha, semanaFim: null } : t);
}

// ---------- Calendário ----------
// O que acontece num dia: tarefas com data (e as que se repetem), posts para postar e encontros do clube.
export function eventosDoDia(estado, dia, hoje) {
  const r = [];
  (estado.tarefas || []).forEach((t) => {
    if (!aberta(t) || !t.classificada) return;
    const naData = t.quando === 'data' && t.data === dia;
    const repete = t.repetir && dia > (t.data || hoje) && repeteEm(t.repetir, dia);
    if (naData || repete) r.push({ tipo: 'tarefa', id: t.id, texto: t.texto, hora: t.hora || '' });
  });
  (estado.posts || []).forEach((p) => { if (p.data === dia) r.push({ tipo: 'post', id: p.id, texto: p.titulo || 'Post sem título', feito: p.situacao === 'postado' }); });
  ((estado.clube || {}).encontros || []).forEach((e) => { if (e.data === dia) r.push({ tipo: 'clube', id: e.id, texto: 'Encontro do Clube do Livro', hora: e.hora || '' }); });
  return r.sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
}
export function semanasDoMes(ym) {
  const primeiro = `${ym}-01`;
  const [a, m] = ym.split('-').map(Number);
  const ultimo = `${ym}-${String(ultimoDiaMes(a, m)).padStart(2, '0')}`;
  const semanas = [];
  for (let ini = segunda(primeiro); ini <= ultimo; ini = somaDias(ini, 7)) semanas.push(Array.from({ length: 7 }, (_, i) => somaDias(ini, i)));
  return semanas;
}

// ---------- Hábitos ----------
export const habitosDoDia = (habitos, s) => habitos.filter((h) => (h.dias || []).includes(diaSemana(s)));
// Sequência: dias seguidos (para trás) em que o hábito previsto foi marcado. Dias não previstos não quebram.
// Hoje ainda sem marcar não quebra a sequência.
export function sequencia(habito, feitos, hoje) {
  let n = 0;
  for (let i = 0; i < 1000; i++) {
    const s = somaDias(hoje, -i);
    if (!(habito.dias || []).includes(diaSemana(s))) continue;
    const marcado = (feitos[s] || []).includes(habito.id);
    if (marcado) n++;
    else if (i === 0) continue;
    else break;
  }
  return n;
}

// ---------- Começar pequeno ----------
// Lista de opções, na ordem: primeiros passos das tarefas de hoje, tarefas rápidas, aquecimentos.
export function opcoesComecar(tarefas, listas, aquecimentos, hoje) {
  const r = [];
  const hojeLista = paraHoje(tarefas, hoje);
  hojeLista.filter((t) => t.primeiroPasso).forEach((t) => r.push({ tipo: 'passo', texto: t.primeiroPasso, de: t.texto, tarefaId: t.id }));
  const rapidas = tarefas.filter((t) => aberta(t) && t.classificada && ehRapida(listas, t.tempo));
  rapidas.sort((a, b) => (hojeLista.includes(b) ? 1 : 0) - (hojeLista.includes(a) ? 1 : 0));
  rapidas.forEach((t) => r.push({ tipo: 'tarefa', texto: t.texto, tarefaId: t.id }));
  (aquecimentos || []).forEach((a) => r.push({ tipo: 'aquecimento', texto: a }));
  return r;
}

// Aviso do fim do dia: depois do horário, se sobrou tarefa de hoje.
export function mostrarAvisoFimDoDia(tarefas, hoje, horaAtual, horario, dispensadoEm) {
  if (dispensadoEm === hoje) return false;
  if (horaAtual < horario) return false;
  return paraHoje(tarefas, hoje).length > 0;
}

// ---------- Aulas ----------
// aula: { id, titulo, produto, modulo, semana (segunda-feira), etapas: { etapaId: dataFeita } }
export const etapasFeitas = (aula, etapas) => etapas.filter((e) => aula.etapas && aula.etapas[e.id]).length;
export const pronta = (aula, etapas) => etapas.length > 0 && etapasFeitas(aula, etapas) === etapas.length;
export const proximaEtapa = (aula, etapas) => etapas.find((e) => !(aula.etapas && aula.etapas[e.id])) || null;
// Em que ponto a aula está: 0 = só a ideia; n = as n primeiras etapas feitas; etapas.length = pronta.
export function pontoDaAula(aula, etapas) {
  const p = proximaEtapa(aula, etapas);
  return p ? etapas.indexOf(p) : etapas.length;
}
export function gruposAulas(aulas, etapas) {
  const nomes = ['Só a ideia', ...etapas.slice(0, -1).map((e) => e.nome), 'Prontas'];
  return nomes.map((nome, i) => ({ id: String(i), nome, itens: aulas.filter((a) => pontoDaAula(a, etapas) === i) }));
}
export function aulasDaSemana(aulas, hoje) { const seg = segunda(hoje); return aulas.filter((a) => a.semana === seg); }
export function aulasAtrasadas(aulas, etapas, hoje) { const seg = segunda(hoje); return aulas.filter((a) => a.semana && a.semana < seg && !pronta(a, etapas)); }
export function resumoAulas(aulas, etapas, hoje) {
  const semana = aulasDaSemana(aulas, hoje);
  return { total: semana.length, prontas: semana.filter((a) => pronta(a, etapas)).length };
}
const GRAVA = /^grav/i;
export function temGravacaoNaSemana(aulas, etapas, hoje) {
  return aulasDaSemana(aulas, hoje).some((a) => { const p = proximaEtapa(a, etapas); return p && GRAVA.test(p.nome); });
}

// ---------- Posts e Ideia do dia ----------
// Situações fixas (nomes editáveis): ideia, roteiro, gravado, postado.
export const postsDeHoje = (posts, hoje) => posts.filter((p) => p.data === hoje && p.situacao !== 'postado');
export const postAtrasado = (p, hoje) => !!p.data && p.data < hoje && p.situacao !== 'postado';

export function candidatosIdeia(posts, livros, hoje, recentes = {}) {
  const recente = (id) => recentes[id] && diasEntre(recentes[id], hoje) < 7;
  const ordenar = (a, b) => (a.criadaEm || '').localeCompare(b.criadaEm || '') || (a.ordem ?? 0) - (b.ordem ?? 0);
  const ideias = posts.filter((p) => p.situacao === 'ideia' && !recente(p.id)).sort(ordenar)
    .map((p) => ({ id: p.id, tipo: 'ideia', postId: p.id, tema: p.titulo, formato: p.formato }));
  const roteiros = posts.filter((p) => p.situacao === 'roteiro' && !recente(p.id)).sort(ordenar)
    .map((p) => ({ id: p.id, tipo: 'gravar', postId: p.id, tema: p.titulo, formato: p.formato }));
  const trechos = [];
  livros.forEach((l) => (l.trechos || []).filter((t) => t.conteudo && !recente(t.id))
    .forEach((t) => trechos.push({ id: t.id, tipo: 'trecho', livroId: l.id, trechoId: t.id, tema: t.texto, livro: l.nome, autor: l.autor })));
  // Roteiro pronto vem primeiro (incentivo para gravar); depois intercala ideia, roteiro, ideia, trecho.
  const r = [];
  const filas = [roteiros, ideias, roteiros, ideias, trechos];
  let k = 0;
  while (ideias.length || roteiros.length || trechos.length) {
    const f = filas[k++ % filas.length];
    if (f.length) r.push(f.shift());
  }
  return r;
}
export function mostrarIdeiaDoDia({ ligada, posts, aulas, etapas, hoje, hojeNao }) {
  if (!ligada || hojeNao === hoje) return false;
  if (postsDeHoje(posts, hoje).length) return false;
  if (temGravacaoNaSemana(aulas, etapas, hoje)) return false;
  return true;
}
export function frasesIdeia(c, nomeFormato) {
  const onde = nomeFormato || 'Stories';
  if (c.tipo === 'ideia') return { frase: `Que tal escrever o roteiro de “${c.tema}”?`, extra: `Para ${onde}.` };
  if (c.tipo === 'gravar') return { frase: `Que tal gravar “${c.tema}” hoje?`, extra: 'O roteiro já está pronto, esperando você.' };
  return { frase: `Que tal comentar nos Stories este trecho de ${c.livro}?`, extra: `“${c.tema}”` };
}

// ---------- Leituras ----------
export function progressoLivro(l) {
  if (!l.paginas) return 0;
  return Math.max(0, Math.min(100, Math.round(((l.paginaAtual || 0) / l.paginas) * 100)));
}
// Lidos: os terminados mais recentemente primeiro; sem data de término, no fim.
export const lidosRecentesPrimeiro = (livros) => [...livros].sort((a, b) => (b.fim || '').localeCompare(a.fim || ''));
export function lidosNoAno(livros, ano) { return livros.filter((l) => l.situacao === 'lido' && l.fim && l.fim.startsWith(String(ano))).length; }
export function proximoEncontro(encontros, hoje) {
  return [...(encontros || [])].filter((e) => e.data && e.data >= hoje).sort((a, b) => a.data.localeCompare(b.data))[0] || null;
}
export function ritmoClube(livro, encontro, hoje) {
  if (!livro || !encontro || !encontro.atePagina) return null;
  const faltam = Math.max(0, encontro.atePagina - (livro.paginaAtual || 0));
  const dias = Math.max(1, diasEntre(hoje, encontro.data));
  return { faltam, porDia: faltam ? Math.ceil(faltam / dias) : 0, dias: diasEntre(hoje, encontro.data) };
}
export function avisoClube(encontros, hoje) {
  if ((encontros || []).some((e) => e.data === hoje)) return 'hoje';
  if ((encontros || []).some((e) => e.data === somaDias(hoje, 1))) return 'amanha';
  return null;
}

// ---------- Links ----------
export const maisUsados = (links, n = 5) => links.filter((l) => (l.usos || 0) > 0).sort((a, b) => b.usos - a.usos).slice(0, n);
export function mensagemComLink(l) {
  const msg = (l.mensagem || '').trim();
  if (!msg) return l.url;
  return msg.includes('{link}') ? msg.replaceAll('{link}', l.url) : `${msg}\n${l.url}`;
}

// ---------- Patrimônio ----------
// meses: { 'AAAA-MM': { contaId: valor } }; contas: [{ id, nome, tipo: 'ativo'|'divida' }]
export function totalMes(contas, valores) {
  if (!valores) return null;
  return contas.reduce((s, c) => {
    const v = Number(valores[c.id]) || 0;
    return s + (c.tipo === 'divida' ? -Math.abs(v) : v);
  }, 0);
}
export function mesesFechados(meses) { return Object.keys(meses || {}).sort(); }
export function valoresIniciais(contas, meses, ym) {
  if (meses[ym]) return { ...meses[ym] };
  const anteriores = mesesFechados(meses).filter((m) => m < ym);
  const ult = anteriores[anteriores.length - 1];
  const base = ult ? meses[ult] : {};
  return Object.fromEntries(contas.map((c) => [c.id, base[c.id] ?? '']));
}
export function crescimento(contas, meses, ym) {
  const atual = totalMes(contas, meses[ym]);
  const ant = mesesFechados(meses).filter((m) => m < ym).pop();
  if (atual === null || !ant) return null;
  const antes = totalMes(contas, meses[ant]);
  const dif = atual - antes;
  return { dif, pct: antes ? (dif / Math.abs(antes)) * 100 : null, desde: ant };
}
export function mostrarFecharMes(meses, hoje) { return Number(hoje.slice(8, 10)) >= 25 && !(meses || {})[mesDe(hoje)]; }
export function valorMeta(meta, meses) {
  const fechados = mesesFechados(meses);
  if (meta.contaId) {
    for (let i = fechados.length - 1; i >= 0; i--) { const v = meses[fechados[i]][meta.contaId]; if (v !== undefined && v !== '') return Number(v) || 0; }
    return 0;
  }
  const g = meta.guardado || {};
  const ks = Object.keys(g).sort();
  return ks.length ? Number(g[ks[ks.length - 1]]) || 0 : 0;
}
export const pctMeta = (meta, meses) => (meta.alvo ? Math.max(0, Math.min(100, Math.round((valorMeta(meta, meses) / meta.alvo) * 100))) : 0);

// ---------- Números ----------
export function reais(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
export function numeroDigitado(s) {
  if (typeof s === 'number') return s;
  const limpo = String(s || '').replace(/[^\d,.-]/g, '');
  if (!limpo) return 0;
  // "1.234,56" → 1234.56 ; "1234.56" → 1234.56
  if (limpo.includes(',')) return Number(limpo.replace(/\./g, '').replace(',', '.')) || 0;
  if ((limpo.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(limpo)) return Number(limpo.replace(/\./g, '')) || 0;
  return Number(limpo) || 0;
}

// ---------- Pequenas vitórias ----------
export function vitorias(estado, hoje) {
  const log = (estado.log || {})[hoje] || {};
  const habitos = ((estado.habitosFeitos || {})[hoje] || []).length;
  return (log.tarefas || 0) + habitos + (log.inicios || 0) + (log.pomodoros || 0) + (log.etapas || 0);
}

// ---------- Prazos das etapas das aulas ----------
// Cada prazo vira uma tarefa com data (aparece no Hoje), ligada à aula pela etapa.
const VERBOS_ETAPA = { roteiro: 'Escrever o roteiro', pdf: 'Fazer o PDF', gravada: 'Gravar', gravar: 'Gravar', editada: 'Editar', editar: 'Editar', postada: 'Postar', postar: 'Postar' };
export function textoPrazo(aula, etapa) {
  const chave = String(etapa.nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const verbo = VERBOS_ETAPA[chave] || etapa.nome;
  return `${verbo}: ${aula.titulo || 'aula sem título'}`;
}
export const tarefaDaEtapa = (tarefas, aulaId, etapaId) => tarefas.find((t) => t.aulaId === aulaId && t.etapa === etapaId) || null;

// Põe, muda ou tira o prazo de uma etapa. Devolve a lista de tarefas nova.
export function definirPrazo(tarefas, aula, etapa, data, extra = {}) {
  const atual = tarefaDaEtapa(tarefas, aula.id, etapa.id);
  if (!data) return atual && !atual.feitaEm ? tarefas.filter((t) => t !== atual) : tarefas;
  if (atual) return tarefas.map((t) => (t === atual ? { ...t, texto: textoPrazo(aula, etapa), quando: 'data', data, semanaFim: null } : t));
  return [...tarefas, { texto: textoPrazo(aula, etapa), classificada: true, quando: 'data', data, aulaId: aula.id, etapa: etapa.id, ...extra }];
}

// ---------- Prazos dos posts ----------
// Prazo para escrever o roteiro e para gravar viram tarefas com data (a data de postar já aparece no Hoje).
export const ORDEM_POST = ['ideia', 'roteiro', 'gravado', 'postado'];
export const ETAPAS_POST = [
  { id: 'roteiro', nome: 'Roteiro', verbo: 'Escrever o roteiro', situacao: 'roteiro' },
  { id: 'gravar', nome: 'Gravar', verbo: 'Gravar', situacao: 'gravado' },
];
const nivelPost = (sit) => Math.max(0, ORDEM_POST.indexOf(sit));
export const textoPrazoPost = (post, etapa) => `${etapa.verbo}: ${post.titulo || 'post sem título'}`;
export const tarefaDoPost = (tarefas, postId, etapaId) => tarefas.find((t) => t.postId === postId && t.etapaPost === etapaId) || null;
export function definirPrazoPost(tarefas, post, etapa, data, extra = {}) {
  const atual = tarefaDoPost(tarefas, post.id, etapa.id);
  if (!data) return atual && !atual.feitaEm ? tarefas.filter((t) => t !== atual) : tarefas;
  if (atual) return tarefas.map((t) => (t === atual ? { ...t, texto: textoPrazoPost(post, etapa), quando: 'data', data, semanaFim: null } : t));
  return [...tarefas, { texto: textoPrazoPost(post, etapa), classificada: true, quando: 'data', data, postId: post.id, etapaPost: etapa.id, ...extra }];
}
// A situação do post mudou: tarefas das etapas alcançadas ficam feitas; se voltou, reabrem.
export function tarefasConformeSituacao(tarefas, post, hoje) {
  const nivel = nivelPost(post.situacao);
  return tarefas.map((t) => {
    if (t.postId !== post.id || !t.etapaPost) return t;
    const e = ETAPAS_POST.find((x) => x.id === t.etapaPost);
    if (!e) return t;
    const alcancou = nivel >= nivelPost(e.situacao);
    if (alcancou && !t.feitaEm) return { ...t, feitaEm: hoje };
    if (!alcancou && t.feitaEm) { const { feitaEm, ...resto } = t; return resto; }
    return t;
  });
}
// Tarefa de prazo feita: o post avança até a situação daquela etapa (nunca volta).
export function situacaoPelaTarefa(post, tarefa) {
  const e = ETAPAS_POST.find((x) => x.id === tarefa.etapaPost);
  if (!e || nivelPost(post.situacao) >= nivelPost(e.situacao)) return post.situacao;
  return e.situacao;
}

// ---------- Resumo da semana ----------
// Soma o que foi registrado de segunda até o dia de hoje.
export function resumoSemana(log, hoje) {
  const seg = segunda(hoje);
  const r = { tarefas: 0, etapas: 0, pomodoros: 0, postsGravados: 0, postsPostados: 0, paginas: 0 };
  for (let i = 0; i < 7; i++) {
    const dia = somaDias(seg, i);
    if (dia > hoje) break;
    const x = (log || {})[dia] || {};
    Object.keys(r).forEach((k) => { r[k] += x[k] || 0; });
  }
  return r;
}
