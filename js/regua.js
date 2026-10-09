// Contas da régua lateral. Sem DOM.
import { TOTAL } from './gerador.js';

const NF1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const TOTAL_NUM = Number(TOTAL);

/** 950, 12 mil, 369,7 M, 1,2 G, 100 P, 1 E: curto o bastante para caber ao lado da régua. */
export function compacto(n) {
  if (n < 1000) return String(Math.round(n));
  const faixas = [
    [1e18, 'E'],
    [1e15, 'P'],
    [1e12, 'T'],
    [1e9, 'G'],
    [1e6, 'M'],
    [1e3, 'mil'],
  ];
  for (const [f, rotulo] of faixas) {
    if (n >= f) {
      const v = n / f;
      return `${v >= 100 ? Math.round(v) : NF1.format(v)} ${rotulo}`;
    }
  }
  return String(Math.round(n));
}

/**
 * Marcas da régua: uma grande a cada 10 % (com rótulo) e uma pequena a cada
 * 1 % quando há espaço (a cada 5 % se estiver apertado).
 * `altura` é a altura útil da régua em pixels.
 */
export function gerarMarcas(altura) {
  const marcas = [];
  const passoPequeno = altura / 100 >= 5 ? 1 : 5;
  for (let p = 0; p <= 100; p += passoPequeno) {
    const grande = p % 10 === 0;
    marcas.push({
      frac: p / 100,
      nivel: grande ? 2 : 1,
      rotulo: grande ? compacto((TOTAL_NUM * p) / 100) : '',
    });
  }
  return marcas;
}

export const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

/** Posição vertical (0 a 1) a partir de um y em pixels dentro da área útil. */
export const fracaoDeY = (y, topo, altura) => limitar((y - topo) / altura, 0, 1);

/** Fração (0 a 1) da régua vira posição no texto, sem perder dígito. */
export function posicaoDaFracao(frac) {
  const f = BigInt(Math.round(limitar(frac, 0, 1) * 1e9));
  const p = (f * TOTAL) / 1_000_000_000n;
  return p >= TOTAL ? TOTAL - 1n : p;
}

export const fracaoDaPosicao = (posicao) => Number(posicao) / TOTAL_NUM;
