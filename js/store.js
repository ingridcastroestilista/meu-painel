// Dados guardados neste aparelho (localStorage), com cópia em arquivo e, se ligada, sincronização (nuvem.js).
const CHAVE = 'meu-painel:v1';
const VERSAO = 1;

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const agora = () => new Date().toISOString();

const itens = (nomes) => nomes.map((nome) => ({ id: uid(), nome }));

export const SITUACOES_POST = [
  { id: 'ideia', nome: 'Ideia' }, { id: 'roteiro', nome: 'Roteiro' }, { id: 'gravado', nome: 'Gravado' }, { id: 'postado', nome: 'Postado' },
];
export const SITUACOES_LIVRO = [
  { id: 'lendo', nome: 'Lendo agora' }, { id: 'proximo', nome: 'Próximo' }, { id: 'naoiniciado', nome: 'Na estante (não iniciado)' }, { id: 'quero', nome: 'Quero comprar' },
  { id: 'lido', nome: 'Lido' }, { id: 'abandonado', nome: 'Abandonado' },
];

export function listasPadrao() {
  return {
    categorias: itens(['Trabalho', 'Saúde e Vitalidade', 'Tarefas Domésticas', 'Espiritualidade', 'Relacionamentos', 'Lazer e Inspiração']),
    prioridades: itens(['Alta', 'Média', 'Baixa']),
    tempos: itens(['5 a 10 min', '20 a 30 min', '1 a 2 horas', '1 dia ou mais']),
    produtos: itens(['Formação Empresária de Moda', 'Comunidade Visionárias', 'Destrave em 15 dias', 'Mentoria Essência', 'Manual da Moda Festa', 'Consultorias']),
    etapasAula: itens(['Roteiro', 'PDF', 'Gravada', 'Editada', 'Postada', 'Cópia no HD']),
    formatos: itens(['Reels', 'Carrossel', 'Feed', 'Stories', 'Live', 'YouTube', 'Anúncios']),
    funcoes: itens(['Autoridade', 'Inspiração', 'Pertencimento', 'Vendas', 'Visitas ao Perfil', 'Engajamento']),
    situacoesPost: structuredClone(SITUACOES_POST),
    situacoesLivro: structuredClone(SITUACOES_LIVRO),
    generos: itens(['Mentalidade', 'Filosofia', 'Psicologia', 'Romance', 'Clássico', 'Estratégia', 'Marketing', 'Vendas', 'Finanças', 'Moda', 'História', 'Criatividade', 'Produtividade', 'Poesia', 'Teologia']),
    objetivos: itens(['Desenvolvimento Pessoal', 'Lazer', 'Repertório Cultural', 'Clube do Livro', 'Entender o Mundo', 'Criatividade', 'Trabalho']),
    formatosLivro: itens(['Físico', 'Digital']),
    gruposLinks: itens(['Formação', 'Visionárias', 'Pagamentos', 'Pessoal']),
    temasTrechos: itens(['Medo e coragem', 'Dinheiro e valor', 'Vendas', 'Disciplina e hábitos', 'Foco e produtividade', 'Criatividade', 'Amor e relações', 'Propósito', 'Mente e pensamentos']),
  };
}

export function projetosPadrao(listas) {
  const prod = (n) => (listas.produtos.find((p) => p.nome === n) || {}).id || '';
  return [
    { id: uid(), nome: 'Clube do Livro', cor: 'malva', clube: true, produto: '', notas: '', arquivado: false },
    { id: uid(), nome: 'Formação Empresária de Moda', cor: 'azul', clube: false, produto: prod('Formação Empresária de Moda'), notas: '', arquivado: false },
    { id: uid(), nome: 'Manual da Moda Festa', cor: 'caramelo', clube: false, produto: prod('Manual da Moda Festa'), notas: '', arquivado: false },
  ];
}

function inicial() {
  const listas = listasPadrao();
  return {
    versao: VERSAO,
    criadoEm: agora(),
    ajustes: {
      frase: 'Como sustentar quem eu estou me tornando, sem me abandonar no processo?',
      horarioAviso: '17:00',
      pomodoro: { foco: 25, pausa: 5, longa: 15, ciclos: 4 },
      ideiaDoDia: true,
      ocultarValores: false,
      metaLivros: {},
      ultimoBackup: null,
    },
    listas,
    projetos: projetosPadrao(listas),
    aquecimentos: ['Arrumar a mesa por 2 minutos', 'Abrir o roteiro e ler o primeiro parágrafo', 'Responder 1 mensagem', 'Beber um copo de água e respirar fundo 3 vezes'],
    tarefas: [],
    habitos: [],
    habitosFeitos: {},
    log: {},
    aulas: [],
    posts: [],
    livros: [],
    clube: { livroAtual: '', proximos: [], encontros: [] },
    links: [],
    contas: [],
    meses: {},
    metas: [
      { id: uid(), nome: 'Viagem para Itália', alvo: 30000, contaId: '', guardado: {} },
      { id: uid(), nome: 'Móveis da Casa', alvo: 15000, contaId: '', guardado: {} },
      { id: uid(), nome: 'Reserva da Paz', alvo: 100000, contaId: '', guardado: {} },
    ],
    ideia: { data: '', id: '', hojeNao: '', recentes: {} },
    avisos: { fimDoDia: '', backup: '' },
    foco: null,
    importados: [],
  };
}

// Completa dados antigos ou vindos de outro aparelho com o que faltar.
function completar(d) {
  const base = inicial();
  const r = { ...base, ...d };
  r.ajustes = { ...base.ajustes, ...(d.ajustes || {}) };
  r.ajustes.pomodoro = { ...base.ajustes.pomodoro, ...((d.ajustes || {}).pomodoro || {}) };
  r.listas = { ...base.listas, ...(d.listas || {}) };
  r.clube = { ...base.clube, ...(d.clube || {}) };
  // Encontros criados antes de guardar o livro: ficam com o livro do clube daquela época (o atual).
  if (r.clube.livroAtual) r.clube.encontros = (r.clube.encontros || []).map((e) => (e.livroId ? e : { ...e, livroId: r.clube.livroAtual }));
  r.ideia = { ...base.ideia, ...(d.ideia || {}) };
  r.avisos = { ...base.avisos, ...(d.avisos || {}) };
  if (!Array.isArray(d.projetos)) r.projetos = projetosPadrao(r.listas);
  // Situações fixas novas (ex.: "Na estante") entram nas listas já salvas.
  SITUACOES_LIVRO.forEach((x, i) => { if (!r.listas.situacoesLivro.some((y) => y.id === x.id)) r.listas.situacoesLivro.splice(i, 0, { ...x }); });
  return r;
}

let estado = null;
let aoMudar = () => {};
export function observar(fn) { aoMudar = fn; }

export function carregar() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    const lido = bruto ? JSON.parse(bruto) : null;
    estado = lido ? completar(lido) : inicial();
    // Dados de uma versão anterior: grava já com o que foi acrescentado (ex.: projetos).
    if (lido && !Array.isArray(lido.projetos)) localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch {
    estado = inicial();
  }
  // Pede ao navegador para não apagar os dados sozinho.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  return estado;
}
export const get = () => estado;

let falhou = false;
export function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
    falhou = false;
  } catch {
    falhou = true;
  }
  aoMudar(falhou);
  aoSalvar();
}
export const salvouComErro = () => falhou;
// Avisado a cada mudança (a sincronização usa para mandar para a nuvem).
let aoSalvar = () => {};
export function depoisDeSalvar(fn) { aoSalvar = fn; }

// Dados que chegaram da nuvem: substituem os deste aparelho (já juntados) sem avisar de volta.
export function aplicarDaNuvem(dados) {
  estado = completar(dados);
  anterior = null;
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); falhou = false; } catch { falhou = true; }
}

// Altera o estado e salva. Guarda a versão anterior para o "Desfazer".
let anterior = null;
export function mudar(fn, { desfazivel = false } = {}) {
  if (desfazivel) anterior = JSON.stringify(estado);
  fn(estado);
  salvar();
}
export function desfazer() {
  if (!anterior) return false;
  estado = completar(JSON.parse(anterior));
  anterior = null;
  salvar();
  return true;
}

// ---------- Cópia (backup) ----------
export function textoCopia() {
  return JSON.stringify({ app: 'meu-painel', versao: VERSAO, salvoEm: agora(), dados: estado });
}
export function marcarBackup() { mudar((s) => { s.ajustes.ultimoBackup = agora(); }); }

// Lê um arquivo: cópia completa (substitui tudo) ou importação do Notion (soma os posts).
export function lerArquivo(texto) {
  const j = JSON.parse(texto);
  if (j && j.app === 'meu-painel' && j.dados) return { tipo: 'copia', dados: j.dados };
  if (j && j.app === 'meu-painel-importacao' && (Array.isArray(j.posts) || Array.isArray(j.livros))) return { tipo: 'importacao', posts: j.posts || [], livros: j.livros || [], origem: j.origem || 'notion' };
  throw new Error('Arquivo não reconhecido');
}
export function restaurar(dados) {
  anterior = JSON.stringify(estado);
  estado = completar(dados);
  salvar();
}
// Soma posts importados, sem repetir os que já vieram antes (pelo campo "origem").
export function importarPosts(posts) {
  let n = 0;
  mudar((s) => {
    const ja = new Set(s.posts.map((p) => p.origem).filter(Boolean));
    posts.forEach((p, i) => {
      if (p.origem && ja.has(p.origem)) return;
      s.posts.push({
        id: uid(), titulo: p.titulo || 'Sem título', formato: idPorNome(s.listas.formatos, p.formato),
        funcao: idPorNome(s.listas.funcoes, p.funcao), serie: p.serie || '', data: '',
        situacao: ['ideia', 'roteiro', 'gravado', 'postado'].includes(p.situacao) ? p.situacao : 'ideia',
        texto: p.texto || '', link: '', criadaEm: p.criadaEm || agora(), ordem: i, origem: p.origem || '',
      });
      n++;
    });
  }, { desfazivel: true });
  return n;
}
// Soma livros importados (sem repetir), criando gêneros e objetivos que ainda não existem.
export function importarLivros(livros) {
  let n = 0;
  mudar((s) => {
    const ja = new Set(s.livros.map((l) => l.origem).filter(Boolean));
    const garantir = (lista, nome) => {
      if (!nome) return '';
      const id = idPorNome(lista, nome);
      if (id) return id;
      const novo = { id: uid(), nome };
      lista.push(novo);
      return novo.id;
    };
    livros.forEach((l) => {
      if (l.origem && ja.has(l.origem)) return;
      s.livros.push({
        id: uid(), nome: l.nome || 'Sem título', autor: l.autor || '', paginas: l.paginas || '', paginaAtual: l.paginaAtual || '',
        formato: idPorNome(s.listas.formatosLivro, l.formato), generos: (l.generos || []).map((g) => garantir(s.listas.generos, g)),
        objetivo: garantir(s.listas.objetivos, l.objetivo), situacao: l.situacao || 'naoiniciado', capa: '',
        inicio: l.inicio || '', fim: l.fim || '', anotacoes: l.anotacoes || '',
        resumo: l.resumo || '', aprendi: l.aprendi || '', aplicar: l.aplicar || '', conteudoIdeias: l.conteudoIdeias || '',
        trechos: (l.trechos || []).map((t) => ({ id: uid(), texto: t.texto, pagina: t.pagina || '', conteudo: !!t.conteudo, temas: [], criadoEm: agora() })),
        origem: l.origem || '', criadoEm: agora(),
      });
      n++;
    });
  }, { desfazivel: true });
  return n;
}

function idPorNome(lista, nome) {
  if (!nome) return '';
  const achado = lista.find((x) => x.nome.toLowerCase() === String(nome).toLowerCase());
  return achado ? achado.id : '';
}
