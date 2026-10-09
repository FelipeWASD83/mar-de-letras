// A janela de leitura: onde a tela começa, como rola e como as linhas são montadas.
// Sem DOM. Toda linha tem exatamente `cols` letras (o texto não tem quebra de
// linha própria), então rolar uma linha é sempre exato e subir desfaz descer.
import { TOTAL, gerar, limitar as cortarNoFim } from './gerador.js';

/** Colunas que cabem em `largura` letras. Com grupos, só linhas de grupos inteiros de 10. */
export function colunasPara(largura, grupos) {
  const w = Math.floor(largura);
  if (!grupos) return Math.max(1, w);
  // cada grupo ocupa 10 letras + 1 espaço, e o último não leva espaço
  return Math.max(1, Math.floor((w + 1) / 11)) * 10;
}

export const alinhar = (topo, cols) => topo - (topo % BigInt(cols));

export function maiorTopo(cols, linhas) {
  const c = BigInt(cols);
  const ultimaLinha = ((TOTAL - 1n) / c) * c;
  const m = ultimaLinha - BigInt(linhas - 1) * c;
  return m < 0n ? 0n : m;
}

export function limitarTopo(topo, cols, linhas) {
  const t = alinhar(topo < 0n ? 0n : topo, cols);
  const max = maiorTopo(cols, linhas);
  return t > max ? max : t;
}

export const rolar = (topo, linhasParaRolar, cols, linhas) =>
  limitarTopo(topo + BigInt(linhasParaRolar) * BigInt(cols), cols, linhas);

export const paginar = (topo, sentido, cols, linhas) =>
  rolar(topo, sentido * Math.max(1, linhas - 1), cols, linhas);

/** Topo que deixa `posicao` a um terço da altura da tela. */
export const topoParaPosicao = (posicao, cols, linhas) =>
  limitarTopo(posicao - BigInt(Math.floor(linhas / 3)) * BigInt(cols), cols, linhas);

/** O inverso: a posição que fica a um terço da altura (é a que vai na URL). */
export const posicaoDoTerco = (topo, cols, linhas) =>
  topo + BigInt(Math.floor(linhas / 3)) * BigInt(cols);

const ASCII = new TextDecoder('latin1');

// Texto de um trecho de linha; com grupos, um espaço a cada 10 letras da linha.
function pedaco(sub, deslocamento, grupos) {
  const s = ASCII.decode(sub);
  if (!grupos) return s;
  let saida = deslocamento > 0 && deslocamento % 10 === 0 ? ' ' : '';
  let i = 0;
  while (i < s.length) {
    const fim = Math.min(s.length, i + 10 - ((deslocamento + i) % 10));
    saida += s.slice(i, fim);
    i = fim;
    if (i < s.length) saida += ' ';
  }
  return saida;
}

/**
 * Monta as linhas da tela. Cada linha é uma lista de { texto, marca }, com
 * marca 0 = letra comum, 1 = parte de um acerto, 2 = o acerto escolhido.
 * `padrao` são os códigos 0..25 da busca (ou null); `atual` é a posição do
 * acerto escolhido; `buf` é reaproveitado entre chamadas.
 */
export function montarTela({ topo, cols, linhas, padrao = null, atual = null, grupos = false, buf = null }) {
  const n = cortarNoFim(topo, cols * linhas);
  const m = padrao ? padrao.length : 0;
  const folga = m > 1 ? m - 1 : 0;
  const antes = folga && topo < BigInt(folga) ? Number(topo) : folga;
  const total = cortarNoFim(topo - BigInt(antes), antes + n + folga);
  if (!buf || buf.length < total + 24) buf = new Uint8Array(total + 24 + (total >> 3));
  const desl = gerar(topo - BigInt(antes), total, buf);
  for (let i = desl; i < desl + total; i++) buf[i] += 65;
  const texto = buf.subarray(desl, desl + total);

  // acertos em coordenadas da tela, juntando os que se encostam
  const acertos = [];
  if (m > 0 && n > 0) {
    const alvo = Array.from(padrao, (c) => c + 65);
    const primeira = alvo[0];
    let i = texto.indexOf(primeira);
    while (i !== -1 && i + m <= total) {
      let k = 1;
      while (k < m && texto[i + k] === alvo[k]) k++;
      if (k === m) {
        const ini = i - antes;
        const fim = ini + m;
        const eAtual = atual !== null && topo + BigInt(ini) === atual;
        if (fim > 0 && ini < n) {
          const ult = acertos[acertos.length - 1];
          if (ult && ini <= ult.fim) {
            ult.fim = Math.max(ult.fim, fim);
            if (eAtual) ult.marca = 2;
          } else {
            acertos.push({ ini, fim, marca: eAtual ? 2 : 1 });
          }
        }
      }
      i = texto.indexOf(primeira, i + 1);
    }
  }

  const saida = [];
  let a = 0; // índice do primeiro acerto que ainda pode tocar a linha
  for (let ini = 0; ini < n; ini += cols) {
    const fimLinha = Math.min(ini + cols, n);
    const segmentos = [];
    let cursor = ini;
    while (a < acertos.length && acertos[a].fim <= ini) a++;
    for (let j = a; j < acertos.length && acertos[j].ini < fimLinha; j++) {
      const s = Math.max(acertos[j].ini, ini);
      const e = Math.min(acertos[j].fim, fimLinha);
      if (s > cursor) segmentos.push({ texto: pedaco(texto.subarray(antes + cursor, antes + s), cursor - ini, grupos), marca: 0 });
      segmentos.push({ texto: pedaco(texto.subarray(antes + s, antes + e), s - ini, grupos), marca: acertos[j].marca });
      cursor = e;
    }
    if (cursor < fimLinha) segmentos.push({ texto: pedaco(texto.subarray(antes + cursor, antes + fimLinha), cursor - ini, grupos), marca: 0 });
    saida.push(segmentos);
  }
  return { linhas: saida, letras: n, buf };
}
