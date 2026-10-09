// O que a pessoa digita no "ir para" e no zoom. Sem DOM.
import { TOTAL } from './gerador.js';

/** O zoom é a letra em relação a 16 px (o tamanho de partida): 16 px = 100 %. */
export const FS_PADRAO = 16;
export const zoomDeFs = (fs) => (fs / FS_PADRAO) * 100;
export const fsDeZoom = (zoom) => (zoom / 100) * FS_PADRAO;

/** Zoom como aparece no contador: inteiro quando dá, senão até 2 casas (0,35 %). */
export function formatarZoom(zoom) {
  const casas = zoom >= 10 ? 0 : zoom >= 1 ? 1 : 2;
  return zoom.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
}

/** "35", "35%", "12,5 %" viram o número (em %); qualquer outra coisa vira null. */
export function interpretarZoom(entrada) {
  const m = String(entrada ?? '')
    .trim()
    .match(/^(\d+(?:[.,]\d+)?)\s*%?$/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  return v > 0 ? v : null;
}

const MULTIPLICADOR = {
  k: 10n ** 3n,
  m: 10n ** 6n,
  g: 10n ** 9n,
  t: 10n ** 12n,
  p: 10n ** 15n,
};

// "2,5" x 1000 = 2500, tudo em BigInt (a posição passa de 2^53).
function decimalVezes(texto, multiplicador) {
  const [inteira, fracao = ''] = texto.replace(',', '.').split('.');
  return (BigInt(inteira + fracao) * multiplicador) / 10n ** BigInt(fracao.length);
}

const ultima = TOTAL - 1n;

/**
 * Lê o que a pessoa digita no "ir para" e devolve a posição (começando em 0),
 * ou null se não for nada que dê para entender.
 *   "50%"  "12,5 %"                 porcentagem do texto
 *   "184.846.550"  "1 000"          posição exata
 *   "100T"  "2,5G"  "300k"          com sufixo: k mil, M milhão, G bilhão,
 *                                   T trilhão, P quatrilhão
 *   "1e15"  "2,5e17"                notação científica
 */
export function interpretarPosicao(entrada) {
  const t = String(entrada ?? '').trim().toLowerCase();
  if (!t) return null;

  let m = t.match(/^(\d+(?:[.,]\d+)?)\s*%$/);
  if (m) {
    const v = decimalVezes(m[1], TOTAL) / 100n;
    if (v > TOTAL) return null;
    return v > ultima ? ultima : v;
  }

  m = t.match(/^(\d+(?:[.,]\d+)?)\s*([kmgtp])$/);
  if (m) {
    const v = decimalVezes(m[1], MULTIPLICADOR[m[2]]);
    return v > ultima ? null : v;
  }

  m = t.match(/^(\d+)(?:[.,](\d+))?\s*e\s*(\d{1,2})$/);
  if (m) {
    const fracao = m[2] ?? '';
    const expoente = Number(m[3]) - fracao.length;
    const base = BigInt(m[1] + fracao);
    const v = expoente >= 0 ? base * 10n ** BigInt(expoente) : base / 10n ** BigInt(-expoente);
    return v > ultima ? null : v;
  }

  m = t.match(/^\d[\d.,_ ]*$/);
  if (m) {
    const digitos = t.replace(/[.,_ ]/g, '');
    if (digitos.length > 19) return null;
    const v = BigInt(digitos);
    return v > ultima ? null : v;
  }
  return null;
}
