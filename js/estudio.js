// Estúdio de Roteiro: regras puras (sem tela), para poder testar.
// Método: primeiro o final, depois o molde, o meio e, por último, o gancho.

export const PASSOS = [
  { id: 'final', nome: 'O final' },
  { id: 'molde', nome: 'O molde' },
  { id: 'meio', nome: 'O meio' },
  { id: 'gancho', nome: 'O gancho' },
  { id: 'checagem', nome: 'Checagem' },
];

export const ACOES = ['Salvar', 'Comentar', 'Mandar para alguém', 'Seguir', 'Comentar uma palavra', 'Só a frase final'];

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
  { id: 'naoEntrega', texto: 'O gancho abre uma pergunta que só o final responde, sem entregar a resposta cedo?' },
  { id: 'semVolta', texto: 'Cada parte do meio leva até o final? Corte o que dá volta.' },
  { id: 'prova', texto: 'Tem prova: um número, um caso, uma cena ou um trecho de livro?' },
  { id: 'ctaFacil', texto: 'O pedido do fim é fácil de fazer e combina com o vídeo?' },
];

export const MARCA = '<hr data-estudio>';

export function novoEstudio() {
  return { passo: 'final', final: '', acao: '', cta: '', molde: '', meio: ['', '', ''], ganchos: ['', '', ''], gancho: 0, check: {} };
}

// Completa um estúdio salvo com o que faltar.
export function estudioDe(post) {
  const e = { ...novoEstudio(), ...(post.estudio || {}) };
  e.meio = Array.isArray(e.meio) && e.meio.length ? e.meio : ['', '', ''];
  e.ganchos = Array.isArray(e.ganchos) && e.ganchos.length ? e.ganchos : ['', '', ''];
  e.check = e.check || {};
  return e;
}

export const preenchidos = (lista) => (lista || []).map((x) => String(x || '').trim()).filter(Boolean);
export const ganchoEscolhido = (e) => String(e.ganchos[e.gancho] || '').trim() || preenchidos(e.ganchos)[0] || '';

// Quantos passos já têm algo escrito (para mostrar o progresso).
export function passosFeitos(e) {
  return {
    final: !!e.final.trim(),
    molde: !!e.molde,
    meio: preenchidos(e.meio).length > 0,
    gancho: !!ganchoEscolhido(e),
    checagem: CHECAGEM.every((c) => e.check[c.id]),
  };
}

function ctaTexto(e) {
  if (e.cta.trim()) return e.cta.trim();
  if (!e.acao || e.acao === 'Só a frase final') return '';
  return `[Pedir para: ${e.acao.toLowerCase()}]`;
}

// Monta o roteiro em HTML para o editor de posts.
export function montarHTML(e, molde, esc) {
  const p = (t) => `<p>${esc(t).replace(/\n/g, '<br>')}</p>`;
  const partes = [];
  const g = ganchoEscolhido(e);
  if (g) partes.push('<h3>Gancho</h3>', p(g));
  const meio = preenchidos(e.meio);
  if (meio.length) partes.push('<h3>Meio</h3>', ...meio.map(p));
  if (e.final.trim()) partes.push('<h3>Final</h3>', p(e.final.trim()));
  const cta = ctaTexto(e);
  if (cta) partes.push('<h3>CTA</h3>', p(cta));
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
  linhas.push('', `Frase final (o que precisa ficar): ${e.final.trim() || '(ainda não escrevi)'}`);
  if (e.acao || e.cta.trim()) linhas.push(`No fim, a pessoa deve: ${[e.acao, e.cta.trim()].filter(Boolean).join(' — ')}`);
  if (molde) linhas.push('', `Molde escolhido: ${molde.criador} — ${molde.formato} (gancho original: "${molde.gancho}")`, molde.molde);
  const meio = preenchidos(e.meio);
  if (meio.length) linhas.push('', 'O meio que eu já pensei:', ...meio.map((m) => `- ${m}`));
  const ganchos = preenchidos(e.ganchos);
  if (ganchos.length) linhas.push('', 'Ganchos que eu já pensei:', ...ganchos.map((m) => `- ${m}`));
  linhas.push('', 'Quero: 3 opções de gancho, o roteiro completo com os tempos aproximados, a frase final e o CTA. Comece pelo final.');
  return linhas.join('\n');
}

// Busca simples nos moldes (criador, tema, formato, gancho, etiquetas).
export function filtrarMoldes(moldes, busca) {
  const tira = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = tira(busca).trim();
  if (!q) return moldes;
  return moldes.filter((m) => tira([m.criador, m.tema, m.formato, m.gancho, (m.etiquetas || []).join(' '), m.conceito].join(' ')).includes(q));
}
