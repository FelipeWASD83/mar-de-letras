// Como a busca por "próximo" e "anterior" reparte o texto em pedaços e decide
// qual acerto vale quando os workers respondem fora de ordem. Sem DOM.
import { TOTAL } from './gerador.js';
import { PEDACO } from './busca.js';

/**
 * Geometria dos pedaços.
 *  sentido +1: do `ponto` até o fim do texto, pedaço 0 = o que começa em `ponto`.
 *  sentido -1: do começo até `ponto` (exclusive), pedaço 0 = o que termina em `ponto`.
 * Cada pedaço é { inicio, tamanho }: os acertos que valem são os que COMEÇAM nele.
 */
export function geometria(sentido, ponto, pedaco = PEDACO) {
  const P = BigInt(pedaco);
  if (sentido > 0) {
    const resta = TOTAL - ponto;
    const total = resta <= 0n ? 0 : Number((resta + P - 1n) / P);
    return {
      total,
      pedaco(k) {
        const inicio = ponto + BigInt(k) * P;
        const r = TOTAL - inicio;
        return { inicio, tamanho: Number(r < P ? r : P) };
      },
    };
  }
  const total = ponto <= 0n ? 0 : Number((ponto + P - 1n) / P);
  return {
    total,
    pedaco(k) {
      const fim = ponto - BigInt(k) * P;
      const inicio = fim - P < 0n ? 0n : fim - P;
      return { inicio, tamanho: Number(fim - inicio) };
    },
  };
}

/**
 * Junta as respostas. Os pedaços são numerados na ordem em que a busca anda;
 * o acerto que vale é o do primeiro pedaço (nessa ordem) que tem algum, e só
 * depois de todos os anteriores terem respondido "nada".
 */
export class Resolvedor {
  constructor(sentido, totalDePedacos) {
    this.sentido = sentido;
    this.total = totalDePedacos;
    this.feitos = new Map();
    this.fronteira = 0;
  }

  /** resultado = { primeira, ultima } (BigInt ou null). Devolve null enquanto não dá para decidir. */
  receber(indice, resultado) {
    this.feitos.set(indice, resultado);
    while (this.feitos.has(this.fronteira)) {
      const r = this.feitos.get(this.fronteira);
      const p = this.sentido > 0 ? r.primeira : r.ultima;
      if (p !== null) return { achou: true, posicao: p };
      this.fronteira++;
    }
    return this.fronteira >= this.total ? { achou: false, posicao: null } : null;
  }
}
