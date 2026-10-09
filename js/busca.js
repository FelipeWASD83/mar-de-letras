import { TOTAL, gerar, limitar } from './gerador.js';

export const PEDACO = 1 << 23; // 8.388.608 letras por tarefa de um worker
const MAX_POSICOES = 500;

// Procura `padrao` (códigos 0..25) entre as posições [inicio, inicio+tamanho).
// Só conta quem COMEÇA nesse intervalo; quem atravessa o fim é lido da folga,
// então dois pedaços vizinhos nunca contam o mesmo acerto duas vezes.
// `buf` é reaproveitado entre chamadas (tamanho >= PEDACO + padrao.length + 24).
export function varrer(inicio, tamanho, padrao, buf) {
  const m = padrao.length;
  const total = limitar(inicio, tamanho + m - 1);
  const ate = Math.min(tamanho, total); // posições de começo válidas: [0, ate)
  if (total < m) return { contagem: 0, posicoes: [], primeira: null, ultima: null };
  const desl = gerar(inicio, total, buf);
  const texto = buf.subarray(desl, desl + total);
  const ultimo = total - m; // maior começo que ainda cabe
  const limite = Math.min(ate - 1, ultimo);
  const p0 = padrao[0];
  let contagem = 0;
  let ultimoIndice = -1;
  const posicoes = [];
  let i = texto.indexOf(p0, 0);
  while (i !== -1 && i <= limite) {
    let k = 1;
    while (k < m && texto[i + k] === padrao[k]) k++;
    if (k === m) {
      contagem++;
      ultimoIndice = i;
      if (posicoes.length < MAX_POSICOES) posicoes.push(inicio + BigInt(i));
    }
    i = texto.indexOf(p0, i + 1);
  }
  // primeira e ultima servem à busca de "próximo" e "anterior" no leitor
  return {
    contagem,
    posicoes,
    primeira: posicoes.length ? posicoes[0] : null,
    ultima: ultimoIndice >= 0 ? inicio + BigInt(ultimoIndice) : null,
  };
}

export function tamanhoBuffer(m) {
  return PEDACO + m + 32;
}

export { TOTAL };
