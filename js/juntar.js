// Junta duas versões dos dados (deste aparelho e da nuvem) sem perder nada.
// "base" é como os dados estavam na última vez que os dois aparelhos combinaram.
// - O que só um lado mudou: fica a mudança.
// - Listas com id (tarefas, livros…): soma os itens novos dos dois lados; apagado de um lado
//   só some se o outro lado não mexeu nele.
// - Mesma coisa mudada nos dois lados: fica a deste aparelho.
// Sem base (primeira vez), nada é apagado: soma tudo.
export const SEM = Symbol('sem base');

const json = (x) => JSON.stringify(x);
const igual = (a, b) => json(a) === json(b);
const ehObjeto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const ehListaComId = (x) => Array.isArray(x) && x.every((i) => ehObjeto(i) && i.id !== undefined);

export function juntar(base, local, remoto) {
  if (igual(local, remoto)) return local;
  if (base !== SEM) {
    if (igual(base, local)) return remoto;
    if (igual(base, remoto)) return local;
  }
  if (ehObjeto(local) && ehObjeto(remoto)) return juntarObjetos(ehObjeto(base) ? base : SEM, local, remoto);
  if (ehListaComId(local) && ehListaComId(remoto) && (local.length || remoto.length)) {
    return juntarListas(ehListaComId(base) ? base : SEM, local, remoto);
  }
  return local;
}

function juntarObjetos(base, local, remoto) {
  const r = {};
  const chaves = new Set([...Object.keys(local), ...Object.keys(remoto)]);
  for (const k of chaves) {
    const b = base !== SEM && k in base ? base[k] : SEM;
    const temL = k in local;
    const temR = k in remoto;
    if (temL && temR) r[k] = juntar(b, local[k], remoto[k]);
    else if (temL) { if (b === SEM || !igual(b, local[k])) r[k] = local[k]; } // remoto apagou: some só se aqui não mudou
    else if (b === SEM || !igual(b, remoto[k])) r[k] = remoto[k];
  }
  return r;
}

function juntarListas(base, local, remoto) {
  const porId = (arr) => new Map(arr.map((i) => [String(i.id), i]));
  const B = base === SEM ? null : porId(base);
  const L = porId(local);
  const R = porId(remoto);
  const fica = (id) => {
    const l = L.get(id); const rr = R.get(id); const b = B ? B.get(id) : undefined;
    if (l && rr) return juntar(b === undefined ? SEM : b, l, rr);
    const so = l || rr;
    if (b === undefined) return so; // novo de um lado só
    return igual(b, so) ? null : so; // o outro lado apagou; só fica se este lado mexeu
  };
  const r = [];
  const vistos = new Set();
  local.forEach((i) => { const id = String(i.id); vistos.add(id); const v = fica(id); if (v) r.push(v); });
  // Itens que só a nuvem tem entram logo depois do item que vinha antes deles lá.
  let anterior = null;
  remoto.forEach((i) => {
    const id = String(i.id);
    if (!vistos.has(id)) {
      const v = fica(id);
      if (v) {
        const pos = anterior === null ? 0 : r.findIndex((x) => String(x.id) === anterior) + 1;
        r.splice(pos, 0, v);
      }
    }
    if (r.some((x) => String(x.id) === id)) anterior = id;
  });
  return r;
}
