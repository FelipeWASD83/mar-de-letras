import test from 'node:test';
import assert from 'node:assert/strict';
import { TOTAL } from '../js/gerador.js';
import { compacto, gerarMarcas, posicaoDaFracao, fracaoDaPosicao, fracaoDeY } from '../js/regua.js';

test('rótulos curtos até o quintilhão', () => {
  assert.equal(compacto(950), '950');
  assert.equal(compacto(12000), '12 mil');
  assert.equal(compacto(3.5e9), '3,5 G');
  assert.equal(compacto(2e12), '2 T');
  assert.equal(compacto(1e17), '100 P');
  assert.equal(compacto(5e17), '500 P');
  assert.equal(compacto(1e18), '1 E');
});

test('marcas: de 0 a 100 %, rótulo só a cada 10 %', () => {
  const m = gerarMarcas(900);
  assert.equal(m[0].frac, 0);
  assert.equal(m[m.length - 1].frac, 1);
  assert.equal(m.filter((x) => x.rotulo).length, 11);
  assert.equal(m.find((x) => x.frac === 0.5).rotulo, '500 P');
  assert.equal(gerarMarcas(300).length, 21); // apertado: uma pequena a cada 5 %
});

test('fração da régua vira posição e volta', () => {
  assert.equal(posicaoDaFracao(0), 0n);
  assert.equal(posicaoDaFracao(0.5), TOTAL / 2n);
  assert.equal(posicaoDaFracao(1), TOTAL - 1n);
  assert.equal(posicaoDaFracao(2), TOTAL - 1n);
  assert.equal(posicaoDaFracao(-1), 0n);
  for (const f of [0.1, 0.25, 0.731, 0.9999]) {
    assert.ok(Math.abs(fracaoDaPosicao(posicaoDaFracao(f)) - f) < 1e-9, String(f));
  }
});

test('fracaoDeY prende nas pontas', () => {
  assert.equal(fracaoDeY(-20, 10, 100), 0);
  assert.equal(fracaoDeY(60, 10, 100), 0.5);
  assert.equal(fracaoDeY(900, 10, 100), 1);
});
