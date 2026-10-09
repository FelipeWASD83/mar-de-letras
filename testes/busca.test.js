import test from 'node:test';
import assert from 'node:assert/strict';
import { TOTAL, trecho, codigos } from '../js/gerador.js';
import { varrer } from '../js/busca.js';

// Busca ingênua sobre o texto lido por fora do código da busca.
function ingenuo(inicio, tamanho, palavra) {
  const texto = trecho(inicio, tamanho + palavra.length - 1);
  const pos = [];
  for (let i = 0; i < tamanho; i++) {
    if (i + palavra.length <= texto.length && texto.startsWith(palavra, i)) pos.push(inicio + BigInt(i));
  }
  return pos;
}

const buf = new Uint8Array(1 << 16);

test('acha o mesmo que a busca ingênua (trecho qualquer, várias palavras)', () => {
  const inicio = 99999999999999n;
  const tam = 20000;
  const texto = trecho(inicio, tam);
  for (const palavra of ['A', 'QZ', 'ABC', texto.slice(777, 781), texto.slice(15000, 15006)]) {
    const r = varrer(inicio, tam, codigos(palavra), buf);
    const esp = ingenuo(inicio, tam, palavra);
    assert.equal(r.contagem, esp.length, palavra);
    assert.deepEqual(r.posicoes, esp.slice(0, 500), palavra); // devolve no máx. 500 posições por pedaço
  }
});

test('acerto que atravessa a divisa entre dois pedaços conta uma vez só', () => {
  const inicio = 4000n;
  const palavra = trecho(inicio + 95n, 10); // começa no pedaço 1 (95) e entra no 2
  const p = codigos(palavra);
  const a = varrer(inicio, 100, p, buf);
  const b = varrer(inicio + 100n, 100, p, buf);
  const junto = varrer(inicio, 200, p, buf);
  assert.ok(a.posicoes.includes(inicio + 95n));
  assert.equal(a.contagem + b.contagem, junto.contagem);
  assert.deepEqual([...a.posicoes, ...b.posicoes], junto.posicoes);
});

test('pedaços seguidos somam o mesmo que um pedaço grande, com padrão de 1 e 2 letras', () => {
  for (const palavra of ['E', 'EL']) {
    const p = codigos(palavra);
    let soma = 0;
    for (let k = 0; k < 10; k++) soma += varrer(1234567n + BigInt(k * 3000), 3000, p, buf).contagem;
    assert.equal(soma, varrer(1234567n, 30000, p, buf).contagem, palavra);
  }
});

test('no fim do texto não acha nada que passe do último caractere', () => {
  const inicio = TOTAL - 50n;
  const fim = trecho(inicio, 50);
  const ult = fim.slice(-6);
  const r = varrer(inicio, 200, codigos(ult), buf);
  assert.deepEqual(r.posicoes, ingenuo(inicio, 50, ult));
  assert.ok(r.posicoes.includes(TOTAL - 6n));
  assert.ok(r.posicoes.every((x) => x + 6n <= TOTAL));
  const r2 = varrer(TOTAL - 3n, 200, codigos('ABCDE'), buf);
  assert.equal(r2.contagem, 0);
});

test('a contagem bate com a estatística (palavra de 3 letras em 5 milhões)', () => {
  const grande = new Uint8Array((1 << 23) + 64);
  const r = varrer(0n, 5_000_000, codigos('ZOO'), grande);
  const esp = 5_000_000 / 26 ** 3;
  assert.ok(Math.abs(r.contagem - esp) < 6 * Math.sqrt(esp), `${r.contagem} vs ${esp.toFixed(0)}`);
});
