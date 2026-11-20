// Sincronização com a nuvem (Supabase), para o Mac e o celular verem os mesmos dados.
// Os dados continuam guardados no aparelho (funciona sem internet); a nuvem é o ponto de encontro.
// Só a dona da conta lê e grava a própria linha (regra RLS no Supabase).
import { NUVEM } from './nuvem-config.js';
import { juntar, SEM } from './juntar.js';

const CH_SESSAO = 'meu-painel:sessao';
const CH_BASE = 'meu-painel:base';

export const configurada = () => !!(NUVEM.url && NUVEM.chave);

let sessao = null;
try { sessao = JSON.parse(localStorage.getItem(CH_SESSAO) || 'null'); } catch { sessao = null; }
const guardarSessao = (s) => { sessao = s; if (s) localStorage.setItem(CH_SESSAO, JSON.stringify(s)); else localStorage.removeItem(CH_SESSAO); };

export const conectada = () => !!sessao;
export const email = () => (sessao && sessao.email) || '';

// Situação, para mostrar na tela.
export const estado = { situacao: 'parada', ultima: '', erro: '' };

let ganchos = { pegar: () => null, aplicar: () => {}, mudou: () => {} };
export function ligar(g) { ganchos = { ...ganchos, ...g }; }

async function pedir(caminho, { metodo = 'GET', corpo, token, extra = {} } = {}) {
  const h = { apikey: NUVEM.chave, 'Content-Type': 'application/json', ...extra };
  if (token) h.Authorization = `Bearer ${token}`;
  const res = await fetch(NUVEM.url.replace(/\/$/, '') + caminho, { method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  const texto = await res.text();
  let j = null;
  try { j = texto ? JSON.parse(texto) : null; } catch { j = null; }
  if (!res.ok) {
    const e = new Error((j && (j.msg || j.message || j.error_description || j.error)) || `Erro ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return j;
}

function sessaoDe(r) {
  return { token: r.access_token, renovar: r.refresh_token, expira: Date.now() + (r.expires_in || 3600) * 1000, email: r.user && r.user.email };
}

export async function entrar(mail, senha) {
  const r = await pedir('/auth/v1/token?grant_type=password', { metodo: 'POST', corpo: { email: mail, password: senha } });
  guardarSessao(sessaoDe(r));
  localStorage.removeItem(CH_BASE); // primeira vez neste aparelho com esta conta: junta sem apagar nada
  return sincronizar();
}

export async function sair() {
  const s = sessao;
  guardarSessao(null);
  localStorage.removeItem(CH_BASE);
  estado.situacao = 'parada';
  ganchos.mudou();
  if (s) pedir('/auth/v1/logout', { metodo: 'POST', token: s.token }).catch(() => {});
}

async function token() {
  if (!sessao) throw new Error('Não conectada');
  if (Date.now() < sessao.expira - 60000) return sessao.token;
  try {
    const r = await pedir('/auth/v1/token?grant_type=refresh_token', { metodo: 'POST', corpo: { refresh_token: sessao.renovar } });
    guardarSessao({ ...sessaoDe(r), email: sessao.email });
    return sessao.token;
  } catch (e) {
    if (e.status === 400 || e.status === 401) { guardarSessao(null); throw new Error('Entre de novo na sua conta'); }
    throw e;
  }
}

function lerBase() {
  try { const b = JSON.parse(localStorage.getItem(CH_BASE) || 'null'); return b && b.dados ? b : null; } catch { return null; }
}
function gravarBase(dados, versao) {
  try { localStorage.setItem(CH_BASE, JSON.stringify({ versao, dados })); } catch { localStorage.removeItem(CH_BASE); }
}

// Aparelho novo, sem nada anotado: fica com os dados da nuvem.
const vazio = (d) => !['tarefas', 'posts', 'aulas', 'livros', 'links', 'contas'].some((k) => (d[k] || []).length);
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let rodando = false;
let deNovo = false;
export async function sincronizar() {
  if (!configurada() || !sessao) return;
  if (rodando) { deNovo = true; return; }
  rodando = true;
  estado.situacao = 'sincronizando';
  try {
    const tk = await token();
    const linhas = await pedir('/rest/v1/painel?select=dados,versao', { token: tk });
    const nuvem = linhas && linhas[0];
    const local = ganchos.pegar();
    const fotoLocal = JSON.stringify(local);
    const base = lerBase();
    if (!nuvem) {
      await pedir('/rest/v1/painel', { metodo: 'POST', token: tk, corpo: { dados: local, versao: 1 }, extra: { Prefer: 'return=minimal' } });
      gravarBase(local, 1);
    } else {
      let resultado;
      if (!base) {
        // Primeira vez neste aparelho: guarda como estava antes, por segurança.
        try { localStorage.setItem('meu-painel:antes-da-nuvem', JSON.stringify({ salvoEm: new Date().toISOString(), dados: local })); } catch { /* sem espaço: segue */ }
        resultado = vazio(local) ? nuvem.dados : juntar(SEM, local, nuvem.dados);
      }
      else if (base.versao === nuvem.versao) resultado = local;
      else resultado = juntar(base.dados, local, nuvem.dados);
      // Se ela mexeu em algo enquanto a internet respondia, começa de novo para não perder.
      if (JSON.stringify(ganchos.pegar()) !== fotoLocal) { deNovo = true; return; }
      if (!igual(resultado, local)) ganchos.aplicar(resultado);
      const final = ganchos.pegar();
      if (!igual(final, nuvem.dados)) {
        const r = await pedir(`/rest/v1/painel?versao=eq.${nuvem.versao}`, {
          metodo: 'PATCH', token: tk, corpo: { dados: final, versao: nuvem.versao + 1, atualizado_em: new Date().toISOString() },
          extra: { Prefer: 'return=representation' },
        });
        if (!r || !r.length) { deNovo = true; return; } // o outro aparelho gravou antes: junta de novo
        gravarBase(final, nuvem.versao + 1);
      } else gravarBase(final, nuvem.versao);
    }
    estado.situacao = 'ok';
    estado.ultima = new Date().toISOString();
    estado.erro = '';
  } catch (e) {
    estado.situacao = navigator.onLine === false || e instanceof TypeError ? 'sem-internet' : 'erro';
    estado.erro = e.message || String(e);
  } finally {
    rodando = false;
    ganchos.mudou();
    if (deNovo) { deNovo = false; setTimeout(sincronizar, 300); }
  }
}

// Depois de cada mudança, espera um pouquinho e manda para a nuvem.
let espera = null;
export function avisarMudanca() {
  if (!configurada() || !sessao) return;
  clearTimeout(espera);
  espera = setTimeout(sincronizar, 1500);
}

// Ao abrir, ao voltar para o app e de minuto em minuto (com o app na frente).
export function comecar() {
  if (!configurada()) return;
  sincronizar();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizar(); });
  window.addEventListener('online', sincronizar);
  setInterval(() => { if (document.visibilityState === 'visible') sincronizar(); }, 60000);
}
