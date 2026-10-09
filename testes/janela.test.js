import test from 'node:test';
import assert from 'node:assert/strict';
import { TOTAL, trecho, codigos } from '../js/gerador.js';
import {
  colunasPara, alinhar, maiorTopo, limitarTopo, rolar, paginar,
  topoParaPosicao, posicaoDoTerco, montarTela,
} from '../js/janela.js';

const juntar = (linhas) => linhas.map((l) => l.map((s) => s.texto).join('')).join('\n');
const so = (linhas) => linhas.map((l) => l.map((s) => s.texto).join('')).join('');

test('colunas: com grupos, só múltiplos de 10 que cabem com os espaços', () => {
  assert.equal(colunasPara(100.9, false), 100);
  assert.equal(colunasPara(0.3, false), 1);
  assert.equal(colunasPara(21, true), 20); // 10 + espaço + 10 = 21 caracteres
  assert.equal(colunasPara(20, true), 10);
  assert.equal(colunasPara(5, true), 10);
  assert.equal(colunasPara(131, true), 120);
});

test('o topo sempre fica alinhado e dentro do texto', () => {
  assert.equal(alinhar(1234567n, 100), 1234500n);
  assert.equal(limitarTopo(-50n, 80, 20), 0n);
  const max = maiorTopo(80, 20);
  assert.equal(max % 80n, 0n);
  assert.equal(limitarTopo(TOTAL * 2n, 80, 20), max);
  // a última página termina no fim do texto
  assert.ok(max + 80n * 20n >= TOTAL && max + 80n * 19n < TOTAL);
});

test('subir desfaz descer, em qualquer lugar do texto', () => {
  for (const topo0 of [5000n, 10n ** 12n + 77n, 10n ** 17n, TOTAL / 2n + 12345n]) {
    for (const cols of [10, 37, 120, 351]) {
      const linhas = 40;
      const t0 = limitarTopo(topo0, cols, linhas);
      for (const n of [1, 7, 137, 1000, 123456]) {
        const desce = rolar(t0, n, cols, linhas);
        assert.equal(desce, t0 + BigInt(n * cols));
        assert.equal(rolar(desce, -n, cols, linhas), t0, `${cols} cols, ${n} linhas`);
      }
    }
  }
});

test('nas pontas rolar não passa do começo nem do fim', () => {
  assert.equal(rolar(0n, -5, 60, 30), 0n);
  const max = maiorTopo(60, 30);
  assert.equal(rolar(max, 5, 60, 30), max);
  assert.equal(paginar(0n, 1, 60, 30), BigInt(29 * 60));
  assert.equal(paginar(BigInt(29 * 60), -1, 60, 30), 0n);
});

test('ir para uma posição a deixa a um terço da tela e volta a mesma posição', () => {
  const pos = 987654321987654321n;
  const topo = topoParaPosicao(pos, 90, 30);
  assert.equal(topo % 90n, 0n);
  const terco = posicaoDoTerco(topo, 90, 30);
  assert.equal(terco - (terco % 90n), pos - (pos % 90n));
  assert.equal(topoParaPosicao(terco, 90, 30), topo); // sem desvio ao recarregar
  assert.equal(topoParaPosicao(3n, 90, 30), 0n);
});

test('a tela tem o mesmo texto do gerador, linha a linha', () => {
  const topo = 400000000000000000n;
  const { linhas, letras } = montarTela({ topo, cols: 60, linhas: 12 });
  assert.equal(letras, 720);
  assert.equal(linhas.length, 12);
  assert.equal(so(linhas), trecho(topo, 720));
  assert.ok(linhas.every((l) => l.length === 1 && l[0].marca === 0));
});

test('grupos de 10 só mexem na tela: tirando os espaços sobra o mesmo texto', () => {
  const topo = 123456789000n;
  const { linhas } = montarTela({ topo, cols: 30, linhas: 5, grupos: true });
  for (const l of linhas) assert.match(l.map((s) => s.texto).join(''), /^[A-Z]{10} [A-Z]{10} [A-Z]{10}$/);
  assert.equal(so(linhas).replace(/ /g, ''), trecho(topo, 150));
});

test('marca os acertos, o que começa antes da tela e o que atravessa a linha', () => {
  const topo = 7000000n;
  const palavra = trecho(topo - 3n, 6); // 3 letras antes do topo
  const a = montarTela({ topo, cols: 40, linhas: 4, padrao: codigos(palavra) });
  const marcados = a.linhas.flat().filter((s) => s.marca === 1).map((s) => s.texto);
  assert.equal(marcados[0], palavra.slice(3));

  const texto = trecho(topo, 160);
  const atravessa = texto.slice(37, 43); // começa na linha 0 e entra na linha 1
  const b = montarTela({ topo, cols: 40, linhas: 4, padrao: codigos(atravessa) });
  const partes = b.linhas.flat().filter((s) => s.marca !== 0).map((s) => s.texto);
  assert.ok(partes.join('').includes(atravessa.slice(0, 3)) && partes.join('').includes(atravessa.slice(3)));
  assert.equal(so(b.linhas), texto);
});

test('o acerto escolhido recebe marca 2 e os outros marca 1; texto não muda', () => {
  const topo = 123456789n;
  const texto = trecho(topo, 800);
  const palavra = texto.slice(100, 102);
  const primeira = topo + BigInt(texto.indexOf(palavra));
  const { linhas } = montarTela({ topo, cols: 80, linhas: 10, padrao: codigos(palavra), atual: primeira });
  const segs = linhas.flat();
  assert.equal(segs.filter((s) => s.marca === 2).map((s) => s.texto).join(''), palavra);
  assert.equal(so(linhas), texto);
  const todos = texto.split(palavra).length - 1;
  assert.equal(segs.filter((s) => s.marca > 0).length >= todos - 1, true);
});

test('buffer é reaproveitado entre chamadas', () => {
  const a = montarTela({ topo: 1000n, cols: 50, linhas: 10 });
  const b = montarTela({ topo: 2000n, cols: 50, linhas: 10, buf: a.buf });
  assert.equal(b.buf, a.buf);
  assert.equal(so(b.linhas), trecho(2000n, 500));
});

test('no fim do texto a última linha sai curta, sem passar', () => {
  const topo = maiorTopo(50, 5);
  const { linhas, letras } = montarTela({ topo, cols: 50, linhas: 5 });
  assert.equal(letras, Number(TOTAL - topo));
  assert.equal(so(linhas), trecho(topo, 250));
  assert.ok(letras <= 250);
});
