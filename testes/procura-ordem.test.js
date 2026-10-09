import test from 'node:test';
import assert from 'node:assert/strict';
import { TOTAL, trecho, codigos } from '../js/gerador.js';
import { varrer } from '../js/busca.js';
import { geometria, Resolvedor } from '../js/procura-ordem.js';

const buf = new Uint8Array(1 << 14);

test('para frente: pedaços seguidos cobrem do ponto até o fim, sem furo', () => {
  const g = geometria(1, TOTAL - 250n, 100);
  assert.equal(g.total, 3);
  assert.deepEqual(g.pedaco(0), { inicio: TOTAL - 250n, tamanho: 100 });
  assert.deepEqual(g.pedaco(2), { inicio: TOTAL - 50n, tamanho: 50 });
  assert.equal(geometria(1, TOTAL, 100).total, 0);
});

test('para trás: pedaços descem do ponto até o 0, o último é curto', () => {
  const g = geometria(-1, 250n, 100);
  assert.equal(g.total, 3);
  assert.deepEqual(g.pedaco(0), { inicio: 150n, tamanho: 100 });
  assert.deepEqual(g.pedaco(1), { inicio: 50n, tamanho: 100 });
  assert.deepEqual(g.pedaco(2), { inicio: 0n, tamanho: 50 });
  assert.equal(geometria(-1, 0n, 100).total, 0);
});

test('o resolvedor espera os pedaços anteriores, mesmo respondendo fora de ordem', () => {
  const r = new Resolvedor(1, 5);
  assert.equal(r.receber(3, { primeira: 900n, ultima: 900n }), null); // 0, 1 e 2 ainda não responderam
  assert.equal(r.receber(1, { primeira: null, ultima: null }), null);
  assert.equal(r.receber(0, { primeira: null, ultima: null }), null); // falta o 2
  assert.deepEqual(r.receber(2, { primeira: 500n, ultima: 520n }), { achou: true, posicao: 500n });
});

test('para trás vale o último acerto do primeiro pedaço que tem algum', () => {
  const r = new Resolvedor(-1, 3);
  assert.equal(r.receber(1, { primeira: 10n, ultima: 40n }), null);
  assert.deepEqual(r.receber(0, { primeira: 100n, ultima: 190n }), { achou: true, posicao: 190n });
});

test('sem nenhum acerto: acaba dizendo que não achou', () => {
  const r = new Resolvedor(1, 2);
  assert.equal(r.receber(1, { primeira: null, ultima: null }), null);
  assert.deepEqual(r.receber(0, { primeira: null, ultima: null }), { achou: false, posicao: null });
});

// Roda a busca "de verdade" (varrer em cada pedaço, respostas embaralhadas) e
// compara com uma busca ingênua num trecho pequeno.
function achar(sentido, ponto, palavra, pedaco) {
  const g = geometria(sentido, ponto, pedaco);
  const r = new Resolvedor(sentido, g.total);
  const p = codigos(palavra);
  const ordem = [...Array(Math.min(g.total, 80)).keys()].sort((a, b) => ((a * 7919) % 13) - ((b * 7919) % 13));
  for (const k of ordem) {
    const { inicio, tamanho } = g.pedaco(k);
    const v = varrer(inicio, tamanho, p, buf);
    const res = r.receber(k, { primeira: v.primeira, ultima: v.ultima });
    if (res) return res;
  }
  return null;
}

test('próximo e anterior batem com a busca ingênua', () => {
  const base = 77777777777n;
  const N = 6000;
  const texto = trecho(base, N + 4);
  const palavra = 'AB';
  const todos = [];
  for (let i = 0; i < N; i++) if (texto.startsWith(palavra, i)) todos.push(base + BigInt(i));
  assert.ok(todos.length > 5);
  for (const idx of [0, 1, 2, todos.length - 2]) {
    const aqui = todos[idx];
    const prox = achar(1, aqui + 1n, palavra, 256);
    assert.equal(prox.posicao, todos[idx + 1], 'próximo');
    const ant = achar(-1, aqui, palavra, 256);
    assert.equal(ant.posicao, idx > 0 ? todos[idx - 1] : ant.posicao, 'anterior');
  }
  // um acerto na divisa de dois pedaços: tamanho 128 e acerto cruzando o múltiplo
  const cruza = todos.find((p) => Number((p - base) % 128n) === 127);
  if (cruza) assert.equal(achar(1, cruza - 100n, palavra, 128).posicao <= cruza, true);
});

test('chegar ao começo ou ao fim sem acerto devolve "não achou"', () => {
  assert.equal(achar(-1, 40n, 'QQQQQQQQQQ', 16).achou, false);
  assert.equal(achar(1, TOTAL - 60n, 'QQQQQQQQQQ', 16).achou, false);
});
