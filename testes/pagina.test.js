import test from 'node:test';
import assert from 'node:assert/strict';
import { TOTAL, trecho } from '../js/gerador.js';
import { alinharInicio, montarPagina } from '../js/pagina.js';

const juntar = (linhas) => linhas.map((l) => l.segmentos.map((s) => s.texto).join('')).join('');

test('a página tem o mesmo texto do gerador, linha a linha', () => {
  const inicio = 500000000000000000n;
  const linhas = montarPagina({ inicio, cols: 50, linhas: 10 });
  assert.equal(linhas.length, 10);
  assert.equal(juntar(linhas), trecho(inicio, 500));
  assert.equal(linhas[3].pos, inicio + 150n);
});

test('marca os acertos, inclusive o que começa antes da janela', () => {
  const inicio = 7000000n;
  const palavra = trecho(inicio - 3n, 6); // começa 3 letras antes da janela
  const linhas = montarPagina({ inicio, cols: 40, linhas: 4, padrao: palavra });
  const marcados = linhas.flatMap((l) => l.segmentos).filter((s) => s.marca === 1).map((s) => s.texto);
  assert.equal(marcados[0], palavra.slice(3));
});

test('o acerto escolhido recebe marca 2 e os outros marca 1', () => {
  const inicio = 123456789n;
  const texto = trecho(inicio, 800);
  const palavra = texto.slice(100, 102);
  const primeiro = inicio + BigInt(texto.indexOf(palavra));
  const linhas = montarPagina({ inicio, cols: 80, linhas: 10, padrao: palavra, selecionada: primeiro });
  const segs = linhas.flatMap((l) => l.segmentos);
  assert.equal(segs.filter((s) => s.marca === 2).map((s) => s.texto).join(''), palavra);
  assert.ok(segs.some((s) => s.marca === 1) || texto.split(palavra).length === 2);
});

test('alinharInicio mantém múltiplo de cols e respeita os limites', () => {
  assert.equal(alinharInicio(5n, 40, 20), 0n);
  const meio = alinharInicio(1000000000000n, 37, 24);
  assert.equal(meio % 37n, 0n);
  assert.ok(meio <= 1000000000000n && 1000000000000n < meio + 37n * 24n);
  const fim = alinharInicio(TOTAL - 1n, 50, 20);
  assert.ok(fim + 50n * 20n >= TOTAL - 49n && fim + 50n * 20n <= TOTAL + 50n);
});

test('perto do fim do texto, a última linha sai curta, sem passar', () => {
  const inicio = TOTAL - 130n;
  const linhas = montarPagina({ inicio, cols: 50, linhas: 5 });
  assert.equal(juntar(linhas).length, 130);
});
