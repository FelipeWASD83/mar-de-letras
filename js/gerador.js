// O texto inteiro: 1 quintilhão de letras (10^18), nenhuma guardada.
// Cada bloco de 8 letras sai de uma conta sobre o número do bloco, então
// qualquer posição pode ser lida na hora e o texto é sempre o mesmo.

export const TOTAL = 10n ** 18n;
export const LETRAS_POR_BLOCO = 8;
export const BLOCOS_TOTAL = TOTAL / 8n;

const SEMENTE_A = 0x6d2b79f5;
const SEMENTE_B = 0x1b873593;
const QUATRO_LETRAS = 26 * 26 * 26 * 26; // 456976
const DOIS_32 = 4294967296;

// Embaralhador de 32 bits (lowbias32): cada bit de entrada vira ~metade dos de saída.
function embaralhar(x) {
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) | 0;
}

// Escreve as 8 letras (códigos 0..25) do bloco (hi,lo) em saida[de..de+7].
export function escreverBloco(lo, hi, saida, de) {
  let a = embaralhar(lo ^ SEMENTE_A);
  let b = embaralhar(hi ^ SEMENTE_B ^ a);
  a = embaralhar(a ^ b ^ 0x2545f491);
  b = embaralhar(b ^ Math.imul(a, 0x9e3779b1) ^ lo);
  a = embaralhar(a ^ b);
  b = embaralhar(b ^ a ^ hi);
  let v = Math.floor(((a >>> 0) * QUATRO_LETRAS) / DOIS_32);
  saida[de] = v % 26; v = (v / 26) | 0;
  saida[de + 1] = v % 26; v = (v / 26) | 0;
  saida[de + 2] = v % 26; v = (v / 26) | 0;
  saida[de + 3] = v;
  v = Math.floor(((b >>> 0) * QUATRO_LETRAS) / DOIS_32);
  saida[de + 4] = v % 26; v = (v / 26) | 0;
  saida[de + 5] = v % 26; v = (v / 26) | 0;
  saida[de + 6] = v % 26; v = (v / 26) | 0;
  saida[de + 7] = v;
}

// Preenche saida[0..n) com as letras das posições [inicio, inicio+n).
// Devolve quantas letras valem (corta no fim do texto). `saida` precisa ter
// n + 7 + (inicio % 8) de folga; devolve o deslocamento onde a primeira letra está.
export function gerar(inicio, n, saida) {
  const deslocamento = Number(inicio & 7n);
  const bloco = inicio >> 3n;
  let lo = Number(bloco & 0xffffffffn) | 0;
  let hi = Number(bloco >> 32n) | 0;
  const blocos = Math.ceil((n + deslocamento) / 8);
  let de = 0;
  for (let i = 0; i < blocos; i++) {
    escreverBloco(lo, hi, saida, de);
    de += 8;
    lo = (lo + 1) | 0;
    if (lo === 0) hi = (hi + 1) | 0;
  }
  return deslocamento;
}

// Quantas letras de [inicio, inicio+n) cabem antes do fim do texto.
export function limitar(inicio, n) {
  const resta = TOTAL - inicio;
  if (resta <= 0n) return 0;
  return resta < BigInt(n) ? Number(resta) : n;
}

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Texto das posições [inicio, inicio+n) como string (só para a tela e os testes).
export function trecho(inicio, n) {
  n = limitar(inicio, n);
  if (n <= 0) return '';
  const buf = new Uint8Array(n + 16);
  const desl = gerar(inicio, n, buf);
  let s = '';
  for (let i = 0; i < n; i++) s += ALFABETO[buf[desl + i]];
  return s;
}

export function letra(posicao) {
  return trecho(posicao, 1);
}

export function codigos(texto) {
  const out = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) out[i] = texto.charCodeAt(i) - 65;
  return out;
}
