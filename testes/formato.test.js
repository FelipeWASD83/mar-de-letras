import test from 'node:test';
import assert from 'node:assert/strict';
import { TOTAL } from '../js/gerador.js';
import { normalizar, curto, lerPosicao, esperado, chanceDeExistir, duracao, porcento, vezes, relogio } from '../js/formato.js';

test('normalizar tira acento, espaço e símbolo', () => {
  assert.deepEqual(normalizar('Coração'), { padrao: 'CORACAO', ignorados: false });
  assert.deepEqual(normalizar('olá, mundo 2'), { padrao: 'OLAMUNDO', ignorados: true });
  assert.equal(normalizar('123').padrao, '');
});

test('curto escreve números grandes por extenso', () => {
  assert.equal(curto(5), '5');
  assert.equal(curto(1500), '1,5 mil');
  assert.equal(curto(1e6), '1 milhão');
  assert.equal(curto(2.5e9), '2,5 bilhões');
  assert.equal(curto(1e18), '1 quintilhão');
  assert.equal(curto(3e12), '3 trilhões');
});

test('lerPosicao aceita pontos e espaços e recusa o que passa do fim', () => {
  assert.equal(lerPosicao('1.234.567'), 1234567n);
  assert.equal(lerPosicao(' 42 '), 42n);
  assert.equal(lerPosicao('abc'), null);
  assert.equal(lerPosicao(String(TOTAL)), null);
  assert.equal(lerPosicao(String(TOTAL - 1n)), TOTAL - 1n);
});

test('esperado e chance seguem 10^18 / 26^m', () => {
  assert.ok(Math.abs(esperado(1) - 1e18 / 26) < 1e3);
  assert.ok(esperado(8) > 4.7e6 && esperado(8) < 4.9e6);
  assert.ok(esperado(12) > 10 && esperado(12) < 11);
  assert.ok(esperado(14) < 0.02);
  assert.ok(chanceDeExistir(3) > 0.999999);
  assert.ok(chanceDeExistir(12) > 0.9999);
  assert.ok(chanceDeExistir(20) < 1e-10);
});

test('vezes concorda número e "de"', () => {
  assert.equal(vezes(0.4), 'menos de 1 vez');
  assert.equal(vezes(10.2), 'cerca de 10 vezes');
  assert.equal(vezes(4.79e6), 'cerca de 4,8 milhões de vezes');
});

test('relogio mostra segundos, minutos e horas', () => {
  assert.equal(relogio(12.9), '12 s');
  assert.equal(relogio(75), '1:15');
  assert.equal(relogio(3725), '1:02:05');
});

test('duracao e porcento escolhem a unidade certa', () => {
  assert.equal(duracao(0.2), 'menos de 1 s');
  assert.equal(duracao(30), '30 s');
  assert.equal(duracao(600), '10 min');
  assert.equal(duracao(7200 * 24), '2 dias');
  assert.equal(porcento(1), '100 %');
  assert.equal(porcento(0.99997), 'quase 100 %');
  assert.equal(curto(0.0006), '0,0006');
  assert.equal(curto(0.4), '0,4');
  assert.equal(porcento(0), 'quase 0 %');
});
