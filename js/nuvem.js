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
  return { token: r.access_token, renovar: r.refresh_token, expira: Date.now() + (r.expires_in || 3600) * 1000, email: r.user && r.user.email, uid: r.user && r.user.id };
}

// Id da conta (pasta das imagens). Sessões antigas não guardavam: lê de dentro do token.
function uid() {
  if (sessao.uid) return sessao.uid;
  try { return JSON.parse(atob(sessao.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub; } catch { return ''; }
}

export async function entrar(mail, senha) {
  const r = await pedir('/auth/v1/token?grant_type=password', { metodo: 'POST', corpo: { email: mail, password: senha } });
  guardarSessao(sessaoDe(r));
  await apagarBase(); // primeira vez neste aparelho com esta conta: junta sem apagar nada
  return sincronizar();
}

export async function sair() {
  const s = sessao;
  guardarSessao(null);
  apagarBase();
  estado.situacao = 'parada';
  ganchos.mudou();
  if (s) pedir('/auth/v1/logout', { metodo: 'POST', token: s.token }).catch(() => {});
}

async function token() {
  if (!sessao) throw new Error('Não conectada');
  if (Date.now() < sessao.expira - 60000) return sessao.token;
  try {
    const r = await pedir('/auth/v1/token?grant_type=refresh_token', { metodo: 'POST', corpo: { refresh_token: sessao.renovar } });
    guardarSessao({ ...sessaoDe(r), email: sessao.email, uid: (r.user && r.user.id) || sessao.uid });
    return sessao.token;
  } catch (e) {
    if (e.status === 400 || e.status === 401) { guardarSessao(null); throw new Error('Entre de novo na sua conta'); }
    throw e;
  }
}

// A "base" (como os dados estavam na última vez que este aparelho e a nuvem combinaram) fica no IndexedDB:
// o localStorage tem só uns 5 MB e, com as capas dos livros, a cópia não cabia mais. Sem base, o que era apagado voltava.
function abrirBanco() {
  return new Promise((ok, erro) => {
    const r = indexedDB.open('meu-painel', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}
async function banco(modo, fn) {
  const db = await abrirBanco();
  return new Promise((ok, erro) => {
    const tx = db.transaction('kv', modo);
    const req = fn(tx.objectStore('kv'));
    tx.oncomplete = () => { db.close(); ok(req && req.result); };
    tx.onerror = () => { db.close(); erro(tx.error); };
  });
}
async function lerBase() {
  try {
    const b = await banco('readonly', (st) => st.get('base'));
    if (b && b.dados) return b;
  } catch { /* sem IndexedDB: tenta o jeito antigo */ }
  try { const b = JSON.parse(localStorage.getItem(CH_BASE) || 'null'); return b && b.dados ? b : null; } catch { return null; }
}
async function gravarBase(dados, versao) {
  try { await banco('readwrite', (st) => st.put({ versao, dados }, 'base')); localStorage.removeItem(CH_BASE); return; } catch { /* segue */ }
  try { localStorage.setItem(CH_BASE, JSON.stringify({ versao, dados })); } catch { localStorage.removeItem(CH_BASE); }
}
async function apagarBase() {
  localStorage.removeItem(CH_BASE);
  try { await banco('readwrite', (st) => st.delete('base')); } catch { /* segue */ }
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
    const base = await lerBase();
    if (!nuvem) {
      await pedir('/rest/v1/painel', { metodo: 'POST', token: tk, corpo: { dados: local, versao: 1 }, extra: { Prefer: 'return=minimal' } });
      await gravarBase(local, 1);
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
        await gravarBase(final, nuvem.versao + 1);
      } else await gravarBase(final, nuvem.versao);
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

// ---------- Imagens dos posts ----------
// Ficam numa pasta só da dona (regra no Supabase). Cada aparelho guarda uma cópia para ver sem internet.
const base = () => NUVEM.url.replace(/\/$/, '') + '/storage/v1/object';
const CACHE_IMG = 'painel-imagens'; // não começa com "mp-": o sw.js não apaga ao atualizar
const vistas = new Map();

export async function enviarImagem(blob, id) {
  if (!configurada() || !sessao) throw new Error('Entre na sua conta (Ajustes) para guardar imagens.');
  const tk = await token();
  const caminho = `${uid()}/${id}.jpg`;
  const res = await fetch(`${base()}/imagens/${caminho}`, { method: 'POST', headers: { apikey: NUVEM.chave, Authorization: `Bearer ${tk}`, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: blob });
  if (!res.ok) throw new Error(`Não consegui guardar a imagem (erro ${res.status}).`);
  try { (await caches.open(CACHE_IMG)).put(`/img/${caminho}`, new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } })); } catch { /* sem cache: segue */ }
  vistas.set(caminho, URL.createObjectURL(blob));
  return caminho;
}

// Endereço para mostrar a imagem (da cópia do aparelho ou baixada da nuvem).
export async function verImagem(caminho) {
  if (vistas.has(caminho)) return vistas.get(caminho);
  let blob = null;
  try { const c = await (await caches.open(CACHE_IMG)).match(`/img/${caminho}`); if (c) blob = await c.blob(); } catch { /* segue */ }
  if (!blob) {
    if (!sessao) return '';
    const tk = await token();
    const res = await fetch(`${base()}/authenticated/imagens/${caminho}`, { headers: { apikey: NUVEM.chave, Authorization: `Bearer ${tk}` } });
    if (!res.ok) return '';
    blob = await res.blob();
    try { (await caches.open(CACHE_IMG)).put(`/img/${caminho}`, new Response(blob.slice(0, blob.size, 'image/jpeg'))); } catch { /* segue */ }
  }
  const url = URL.createObjectURL(blob);
  vistas.set(caminho, url);
  return url;
}

export async function apagarImagem(caminho) {
  vistas.delete(caminho);
  try { (await caches.open(CACHE_IMG)).delete(`/img/${caminho}`); } catch { /* segue */ }
  if (!sessao) return;
  const tk = await token();
  await fetch(`${base()}/imagens/${caminho}`, { method: 'DELETE', headers: { apikey: NUVEM.chave, Authorization: `Bearer ${tk}` } }).catch(() => {});
}
