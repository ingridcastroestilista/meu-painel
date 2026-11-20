// Estúdio de Roteiro: regras puras (sem tela), para poder testar.
// Ordem natural: a ideia, como vai ser gravado, as referências, o começo, o meio, o final,
// e a edição. No fim, o roteiro sai com a lista de gravação; a checagem fica na página do post.

export const PASSOS = [
  { id: 'ideia', nome: 'A ideia' },
  { id: 'gravacao', nome: 'A gravação' },
  { id: 'referencias', nome: 'Referências' },
  { id: 'gancho', nome: 'O começo' },
  { id: 'meio', nome: 'O meio' },
  { id: 'final', nome: 'O final' },
  { id: 'edicao', nome: 'Edição' },
];
// A checagem fica no fim da página do post, depois que o roteiro está escrito.

export const OBJETIVOS = ['Aprender algo', 'Se identificar', 'Mudar de ideia', 'Se inspirar', 'Conhecer meu trabalho'];

export const FORMATOS = [
  { id: 'camera', nome: 'Falando para a câmera', fala: 'O que você fala' },
  { id: 'narrado', nome: 'Narrado (voz por cima)', fala: 'O que a voz diz' },
  { id: 'semfala', nome: 'Sem falas (texto na tela)', fala: 'Texto na tela' },
  { id: 'tutorial', nome: 'Tutorial (mostrando as mãos)', fala: 'O que você explica' },
  { id: 'misto', nome: 'Misto', fala: 'O que você fala ou escreve' },
];

export const DURACOES = ['Até 30 s', '30 a 60 s', '60 a 90 s', 'Mais de 90 s'];

export const ACOES = ['Salvar', 'Comentar', 'Mandar para alguém', 'Seguir', 'Comentar uma palavra', 'Só a frase final'];

// Os 10 moldes que aparecem primeiro (o resto fica em "Ver todas as referências").
export const MOLDES_PADRAO = [
  'Dfm-AMrBVL1', // Textti: problema de costura → causa → solução
  'Df1v1O5hPle', // Gio Lazzarini: não é X
  'DfYDRQ7PCBX', // Letícia Vaz: lista numerada
  'DfPicVSxxO6', // Winnie: explicação com analogia
  'DdADowEMOmo', // Luiza Lins: resumo de livro em lista
  'DfiX2Akx7xJ', // Alessandra: crônica narrada
  'Db3ilXiRrk0', // Marina Friesen: reflexão confessional
  'DcwVZKNkz_D', // Helena Bezzan: frase curta
  'Dc00t3Guex6', // Roberth Resende: conversa com a câmera
  'De1orNXAg8N', // Caroline Zook: série
];
export const MAX_FAVORITOS = 10;

// Tipos de gancho que mais se repetem na coleção de reels, com um exemplo real de cada.
export const TIPOS_GANCHO = [
  { nome: 'Contrariar uma regra', ex: 'Os roteiros mais virais foram escritos de trás pra frente.', quem: 'Giovanna Garcia' },
  { nome: 'Não é X', ex: 'Isso aqui é bonito, feed organizado… mas não é posicionamento.', quem: 'Gio Lazzarini' },
  { nome: 'Mistério com número', ex: 'Faltaram 8 centímetros no seu vestido, e ninguém errou.', quem: 'Textti' },
  { nome: 'Lista com número', ex: 'Cinco conselhos sobre carreira que eu faria de tudo pra ter escutado mais nova.', quem: 'Letícia Vaz' },
  { nome: 'Pergunta “Sabe…?”', ex: 'Sabe o que está faltando na sua vida? Passar vergonha.', quem: 'Marina Friesen' },
  { nome: 'Confissão', ex: 'Eu não sou tão interessante, e gravar esses vídeos tem me mostrado isso.', quem: 'Marina Friesen' },
  { nome: 'Cena no meio da ação', ex: 'Você puxa para franzir e a linha arrebenta!', quem: 'Textti' },
  { nome: '“Se você…”', ex: 'Se você faz o seu conteúdo no mesmo dia em que posta, a gente precisa conversar.', quem: 'Hilary Zuckerman' },
];

export const CHECAGEM = [
  { id: 'umaFrase', texto: 'A frase final cabe numa frase só?' },
  { id: 'naoEntrega', texto: 'O começo abre uma pergunta que só o final responde, sem entregar a resposta cedo?' },
  { id: 'semVolta', texto: 'Cada parte do meio leva até o final? Corte o que dá volta.' },
  { id: 'prova', texto: 'Tem prova: um número, um caso, uma cena ou um trecho de livro?' },
  { id: 'semSom', texto: 'Dá para entender sem som?' },
  { id: 'visual', texto: 'Tem algo visual explicando a fala (animação, ilustração, imagem)?' },
  { id: 'ctaFacil', texto: 'O pedido do fim é fácil de fazer e combina com o vídeo?' },
];

export const MARCA = '<hr data-estudio>';

export function novoEstudio() {
  return {
    passo: 'ideia',
    publico: '', objetivo: '', final: '',
    formato: '', duracao: '', cenario: '', mostrar: '',
    molde: '', imagens: [],
    ganchos: ['', '', ''], gancho: 0, cenaGancho: '',
    meio: ['', '', ''], cenas: ['', '', ''],
    acao: '', cta: '', cenaFinal: '',
    visuais: '', capa: '', musica: '', legenda: '',
    check: {},
  };
}

const lista = (x, n = 3) => (Array.isArray(x) && x.length ? x : Array(n).fill(''));

// Completa um estúdio salvo com o que faltar (estúdios antigos continuam funcionando).
export function estudioDe(post) {
  const e = { ...novoEstudio(), ...(post.estudio || {}) };
  if (e.passo === 'checagem') e.passo = 'edicao';
  if (!PASSOS.some((p) => p.id === e.passo)) e.passo = 'ideia';
  e.meio = lista(e.meio);
  e.cenas = Array.isArray(e.cenas) ? e.cenas : [];
  while (e.cenas.length < e.meio.length) e.cenas.push('');
  e.ganchos = lista(e.ganchos);
  e.imagens = Array.isArray(e.imagens) ? e.imagens : [];
  e.check = e.check || {};
  return e;
}

export const formatoDe = (e) => FORMATOS.find((f) => f.id === e.formato) || null;
export const rotuloFala = (e) => (formatoDe(e) || { fala: 'O que você fala' }).fala;

export const preenchidos = (lista) => (lista || []).map((x) => String(x || '').trim()).filter(Boolean);
export const ganchoEscolhido = (e) => String(e.ganchos[e.gancho] || '').trim() || preenchidos(e.ganchos)[0] || '';
const t = (x) => String(x || '').trim();

// Quais passos já têm algo escrito (para mostrar o progresso).
export function passosFeitos(e) {
  return {
    ideia: !!(t(e.final) || t(e.publico) || e.objetivo),
    gravacao: !!e.formato,
    referencias: !!(e.molde || e.imagens.length),
    gancho: !!ganchoEscolhido(e),
    meio: preenchidos(e.meio).length > 0,
    final: !!(t(e.final) && e.acao),
    edicao: !!(t(e.visuais) || t(e.capa) || t(e.musica) || t(e.legenda)),
  };
}

function ctaTexto(e) {
  if (t(e.cta)) return t(e.cta);
  if (!e.acao || e.acao === 'Só a frase final') return '';
  return `[Pedir para: ${e.acao.toLowerCase()}]`;
}

// Os trechos do roteiro, na ordem do vídeo: [{ nome, fala, cena }].
export function trechos(e) {
  const r = [];
  const g = ganchoEscolhido(e);
  if (g || t(e.cenaGancho)) r.push({ nome: 'Começo', fala: g, cena: t(e.cenaGancho) });
  e.meio.forEach((m, i) => { if (t(m) || t(e.cenas[i])) r.push({ nome: `Parte ${r.length}`, fala: t(m), cena: t(e.cenas[i]) }); });
  r.forEach((x, i) => { if (i > 0) x.nome = `Parte ${i}`; });
  if (t(e.final) || t(e.cenaFinal)) r.push({ nome: 'Final', fala: t(e.final), cena: t(e.cenaFinal) });
  return r;
}

// Tudo o que precisa ser filmado, na ordem.
export function listaGravacao(e) {
  const itens = [];
  if (t(e.cenario)) itens.push(`Onde: ${t(e.cenario)}`);
  if (t(e.mostrar)) itens.push(`O que precisa estar à mão: ${t(e.mostrar)}`);
  trechos(e).forEach((x) => { if (x.cena) itens.push(`${x.nome}: ${x.cena}`); });
  return itens;
}

// Monta o roteiro em HTML para o editor de posts.
export function montarHTML(e, molde, esc) {
  const p = (x) => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`;
  const ul = (itens) => `<ul>${itens.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const partes = [];
  const f = formatoDe(e);
  const sobre = [f && f.nome, e.duracao].filter(Boolean).join(' · ');
  const para = [t(e.publico) && `Para: ${t(e.publico)}`, e.objetivo && `Objetivo: ${e.objetivo.toLowerCase()}`].filter(Boolean).join(' · ');
  if (sobre || para) partes.push(`<p><i>${[sobre, para].filter(Boolean).map(esc).join('<br>')}</i></p>`);
  const rot = rotuloFala(e);
  trechos(e).forEach((x) => {
    partes.push(`<h3>${esc(x.nome === 'Começo' ? 'Gancho' : x.nome)}</h3>`);
    if (x.fala) partes.push(e.formato ? `<p><b>${esc(rot)}:</b> ${esc(x.fala).replace(/\n/g, '<br>')}</p>` : p(x.fala));
    if (x.cena) partes.push(`<p><i>Na tela: ${esc(x.cena)}</i></p>`);
  });
  const cta = ctaTexto(e);
  if (cta) partes.push('<h3>CTA</h3>', p(cta));
  const grav = listaGravacao(e);
  if (grav.length) partes.push('<h3>Lista de gravação</h3>', ul(grav));
  const ed = [
    t(e.visuais) && `O visual que explica a fala: ${t(e.visuais)}`,
    t(e.capa) && `Texto da capa: ${t(e.capa)}`,
    t(e.musica) && `Música: ${t(e.musica)}`,
  ].filter(Boolean);
  if (ed.length) partes.push('<h3>Edição</h3>', ul(ed));
  if (t(e.legenda)) partes.push('<h3>Legenda do post</h3>', p(t(e.legenda)));
  const imgs = e.imagens.filter((i) => t(i.nota));
  if (imgs.length) partes.push('<h3>Imagens de referência</h3>', ul(imgs.map((i) => i.nota)));
  if (molde) partes.push(`<p><i>Molde: ${esc(molde.criador)} · ${esc(molde.formato)}</i></p>`);
  return partes.join('');
}

// Junta o roteiro montado ao texto que o post já tinha. Se já houve uma montagem antes, troca só ela.
export function juntarTexto(montado, textoAntigo) {
  const antigo = textoAntigo || '';
  const i = antigo.indexOf('<hr data-estudio');
  let resto = antigo;
  if (i >= 0) resto = antigo.slice(antigo.indexOf('>', i) + 1);
  else if (antigo.trim()) resto = `<h3>Anotações da ideia</h3>${antigo}`;
  return resto.trim() ? `${montado}${MARCA}${resto}` : montado;
}

// Pedido completo para colar no Claude e receber o roteiro escrito na voz da Ingrid.
export function pedidoClaude(post, e, molde, anotacao) {
  const linhas = [
    'Escreva o roteiro de um reel na minha voz. Use o meu documento de voz do Notion e os princípios de conteúdo.',
    '',
    `Ideia: ${post.titulo || '(sem título)'}`,
  ];
  if (anotacao) linhas.push(`Minhas anotações: ${anotacao}`);
  if (t(e.publico)) linhas.push(`Para quem: ${t(e.publico)}`);
  if (e.objetivo) linhas.push(`O que a pessoa vai levar: ${e.objetivo}`);
  linhas.push('', `Frase final (o que precisa ficar): ${t(e.final) || '(ainda não escrevi)'}`);
  if (e.acao || t(e.cta)) linhas.push(`No fim, a pessoa deve: ${[e.acao, t(e.cta)].filter(Boolean).join(' — ')}`);
  const f = formatoDe(e);
  if (f || e.duracao || t(e.cenario) || t(e.mostrar)) {
    linhas.push('', 'Como vai ser gravado:');
    if (f) linhas.push(`- Formato: ${f.nome}`);
    if (e.duracao) linhas.push(`- Duração: ${e.duracao}`);
    if (t(e.cenario)) linhas.push(`- Onde: ${t(e.cenario)}`);
    if (t(e.mostrar)) linhas.push(`- O que aparece: ${t(e.mostrar)}`);
  }
  if (molde) linhas.push('', `Molde escolhido: ${molde.criador} — ${molde.formato} (gancho original: "${molde.gancho}")`, molde.molde);
  const ganchos = preenchidos(e.ganchos);
  if (ganchos.length) linhas.push('', 'Começos que eu já pensei:', ...ganchos.map((m) => `- ${m}`));
  const tr = trechos(e).filter((x) => x.nome !== 'Começo');
  if (tr.length) linhas.push('', 'O que eu já pensei para cada parte:', ...tr.map((x) => `- ${x.nome}: ${x.fala || '…'}${x.cena ? ` (na tela: ${x.cena})` : ''}`));
  if (t(e.visuais)) linhas.push('', `Ideias de visual: ${t(e.visuais)}`);
  linhas.push('', 'Quero: 3 opções de gancho, o roteiro completo com os tempos aproximados e, para cada fala, o que aparece na tela (com ideias de animação ou ilustração que expliquem a fala), a frase final, o CTA, a lista de gravação, o texto da capa e a legenda.');
  return linhas.join('\n');
}

// Moldes favoritos (até 10), na ordem escolhida.
export function favoritos(moldes, ids) {
  const lista = Array.isArray(ids) ? ids : MOLDES_PADRAO;
  return lista.map((id) => moldes.find((m) => m.id === id)).filter(Boolean);
}

// Busca simples nos moldes (criador, tema, formato, gancho, etiquetas).
export function filtrarMoldes(moldes, busca) {
  const tira = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = tira(busca).trim();
  if (!q) return moldes;
  return moldes.filter((m) => tira([m.criador, m.tema, m.formato, m.gancho, (m.etiquetas || []).join(' '), m.conceito].join(' ')).includes(q));
}
