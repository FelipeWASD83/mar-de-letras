import { TOTAL, trecho, limitar } from './gerador.js';

// Começo da janela de leitura que deixa `foco` visível, um terço abaixo do topo,
// com as linhas alinhadas ao múltiplo de `cols` (uma linha nunca muda de conteúdo
// ao rolar uma linha para cima ou para baixo).
export function alinharInicio(foco, cols, linhas) {
  const c = BigInt(cols);
  let inicio = foco - (foco % c) - BigInt(Math.floor(linhas / 3)) * c;
  const ultimaLinha = ((TOTAL - 1n) / c) * c;
  const maximo = ultimaLinha - BigInt(linhas - 1) * c;
  if (inicio > maximo) inicio = maximo;
  if (inicio < 0n) inicio = 0n;
  return inicio;
}

// Monta as linhas da página. Cada linha: { pos, segmentos: [{ texto, marca }] },
// com marca 0 = letra comum, 1 = faz parte de um acerto, 2 = o acerto escolhido.
export function montarPagina({ inicio, cols, linhas, padrao = '', selecionada = null }) {
  const n = limitar(inicio, cols * linhas);
  const m = padrao.length;
  const antes = m > 1 ? Math.min(m - 1, Number(inicio)) : 0; // acerto que começa antes da janela e entra nela
  const depois = m > 1 ? m - 1 : 0;
  const texto = trecho(inicio - BigInt(antes), antes + n + depois);
  const marcas = new Uint8Array(n);
  if (m > 0) {
    let i = texto.indexOf(padrao);
    while (i !== -1) {
      for (let k = 0; k < m; k++) {
        const j = i + k - antes;
        if (j >= 0 && j < n) marcas[j] = 1;
      }
      i = texto.indexOf(padrao, i + 1);
    }
    if (selecionada !== null) {
      const d = Number(selecionada - inicio);
      for (let k = 0; k < m; k++) {
        const j = d + k;
        if (j >= 0 && j < n) marcas[j] = 2;
      }
    }
  }
  const janela = texto.slice(antes, antes + n);
  const saida = [];
  for (let ini = 0; ini < n; ini += cols) {
    const fim = Math.min(ini + cols, n);
    const segmentos = [];
    let a = ini;
    while (a < fim) {
      let b = a + 1;
      while (b < fim && marcas[b] === marcas[a]) b++;
      segmentos.push({ texto: janela.slice(a, b), marca: marcas[a] });
      a = b;
    }
    saida.push({ pos: inicio + BigInt(ini), segmentos });
  }
  return saida;
}
