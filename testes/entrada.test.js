import test from 'node:test';
import assert from 'node:assert/strict';
import { TOTAL } from '../js/gerador.js';
import { interpretarPosicao, interpretarZoom, zoomDeFs, fsDeZoom, formatarZoom } from '../js/entrada.js';

test('posição exata, com pontos, espaços e sublinhado', () => {
  assert.equal(interpretarPosicao('184.846.550'), 184846550n);
  assert.equal(interpretarPosicao('1 000'), 1000n);
  assert.equal(interpretarPosicao('0'), 0n);
  assert.equal(interpretarPosicao('999.999.999.999.999.999'), TOTAL - 1n);
  assert.equal(interpretarPosicao('1.000.000.000.000.000.000'), null);
  assert.equal(interpretarPosicao('12345678901234567890'), null);
});

test('porcentagem do texto, sem perder dígito', () => {
  assert.equal(interpretarPosicao('50%'), TOTAL / 2n);
  assert.equal(interpretarPosicao('12,5 %'), 125000000000000000n);
  assert.equal(interpretarPosicao('0%'), 0n);
  assert.equal(interpretarPosicao('100%'), TOTAL - 1n);
  assert.equal(interpretarPosicao('100,5%'), null);
});

test('sufixos k, M, G, T e P', () => {
  assert.equal(interpretarPosicao('300k'), 300000n);
  assert.equal(interpretarPosicao('2,5G'), 2500000000n);
  assert.equal(interpretarPosicao('100T'), 100000000000000n);
  assert.equal(interpretarPosicao('1,5p'), 1500000000000000n);
  assert.equal(interpretarPosicao('999P'), 999000000000000000n);
  assert.equal(interpretarPosicao('1000P'), null);
});

test('notação científica', () => {
  assert.equal(interpretarPosicao('1e15'), 10n ** 15n);
  assert.equal(interpretarPosicao('2,5e17'), 250000000000000000n);
  assert.equal(interpretarPosicao('1e18'), null);
  assert.equal(interpretarPosicao('7e0'), 7n);
});

test('lixo vira null', () => {
  for (const x of ['', '   ', 'abc', '12x', '%', '-5', '1..2e', null, undefined]) {
    assert.equal(interpretarPosicao(x), null, String(x));
  }
});

test('zoom: 16 px = 100 %, digitar % ou vírgula', () => {
  assert.equal(zoomDeFs(16), 100);
  assert.equal(fsDeZoom(50), 8);
  assert.equal(interpretarZoom('35'), 35);
  assert.equal(interpretarZoom('12,5 %'), 12.5);
  assert.equal(interpretarZoom('0'), null);
  assert.equal(interpretarZoom('abc'), null);
  assert.equal(formatarZoom(100), '100');
  assert.equal(formatarZoom(7), '7');
  assert.equal(formatarZoom(0.35), '0,35');
});
