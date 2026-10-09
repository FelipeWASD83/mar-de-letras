import test from 'node:test';
import assert from 'node:assert/strict';
import { TOTAL, trecho, letra, gerar, escreverBloco, limitar } from '../js/gerador.js';

test('o texto tem 1 quintilhão de letras', () => {
  assert.equal(TOTAL, 1000000000000000000n);
});

test('a mesma posição dá sempre a mesma letra', () => {
  const p = 482113907554221003n;
  assert.equal(trecho(p, 40), trecho(p, 40));
  assert.equal(letra(p), trecho(p, 40)[0]);
});

test('começar em posição que não é múltiplo de 8 dá o mesmo texto', () => {
  const base = 123456789012345678n;
  const longo = trecho(base, 100);
  for (let d = 0; d < 20; d++) {
    assert.equal(trecho(base + BigInt(d), 60), longo.slice(d, d + 60), `deslocamento ${d}`);
  }
});

test('atravessar a divisa de 32 bits do número do bloco funciona', () => {
  const divisa = (1n << 32n) * 8n; // primeiro bloco com hi = 1
  const t = trecho(divisa - 20n, 40);
  assert.equal(t.length, 40);
  assert.equal(t.slice(20), trecho(divisa, 20));
  assert.equal(t.slice(0, 20), trecho(divisa - 20n, 20));
});

test('perto do fim do texto, corta sem passar', () => {
  assert.equal(trecho(TOTAL - 5n, 100).length, 5);
  assert.equal(trecho(TOTAL, 10), '');
  assert.equal(limitar(TOTAL - 3n, 50), 3);
  assert.equal(limitar(0n, 50), 50);
});

test('só aparecem as 26 letras A-Z', () => {
  assert.match(trecho(987654321n, 5000), /^[A-Z]{5000}$/);
});

test('as letras são bem distribuídas (qui-quadrado, 1 milhão de letras)', () => {
  const N = 1_000_000;
  const buf = new Uint8Array(N + 16);
  const desl = gerar(777000000000000000n, N, buf);
  const cont = new Array(26).fill(0);
  for (let i = 0; i < N; i++) cont[buf[desl + i]]++;
  const esp = N / 26;
  const chi = cont.reduce((s, c) => s + (c - esp) ** 2 / esp, 0);
  // 25 graus de liberdade: 99,9 % dos casos ficam abaixo de 52,6
  assert.ok(chi < 52.6, `qui-quadrado ${chi.toFixed(1)}`);
});

test('pares de letras também são uniformes (676 combinações)', () => {
  const N = 4_000_000;
  const buf = new Uint8Array(N + 16);
  const desl = gerar(31415926535897932n, N, buf);
  const cont = new Array(676).fill(0);
  for (let i = 0; i + 1 < N; i++) cont[buf[desl + i] * 26 + buf[desl + i + 1]]++;
  const esp = (N - 1) / 676;
  const chi = cont.reduce((s, c) => s + (c - esp) ** 2 / esp, 0);
  // 675 graus de liberdade: 99,9 % abaixo de ~775
  assert.ok(chi < 775, `qui-quadrado ${chi.toFixed(1)}`);
});

test('letras 4 posições distantes não se repetem mais que o acaso (dentro e entre blocos)', () => {
  const N = 2_000_000;
  const buf = new Uint8Array(N + 16);
  const desl = gerar(5n, N, buf);
  for (const passo of [1, 2, 3, 4, 7, 8, 9, 16]) {
    let iguais = 0;
    for (let i = 0; i + passo < N; i++) if (buf[desl + i] === buf[desl + i + passo]) iguais++;
    const frac = iguais / (N - passo);
    assert.ok(Math.abs(frac - 1 / 26) < 0.0012, `passo ${passo}: ${frac}`);
  }
});

test('blocos vizinhos não se parecem (efeito avalanche no número do bloco)', () => {
  const a = new Uint8Array(8), b = new Uint8Array(8);
  let iguais = 0, total = 0;
  for (let i = 0; i < 20000; i++) {
    const lo = (Math.imul(i, 2654435761) >>> 0) | 0;
    escreverBloco(lo, 7, a, 0);
    escreverBloco(lo ^ (1 << (i % 32)), 7, b, 0); // vira um bit só
    for (let k = 0; k < 8; k++) { total++; if (a[k] === b[k]) iguais++; }
  }
  assert.ok(Math.abs(iguais / total - 1 / 26) < 0.004, `iguais ${iguais / total}`);
});
