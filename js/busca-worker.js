import { varrer, tamanhoBuffer, PEDACO } from './busca.js';
import { codigos } from './gerador.js';

let buf = null;
let tamBuf = 0;

function garantir(m) {
  const precisa = tamanhoBuffer(m);
  if (!buf || tamBuf < precisa) {
    buf = new Uint8Array(precisa);
    tamBuf = precisa;
  }
}

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.tipo === 'medir') {
    garantir(8);
    const p = codigos('QZXJQZXJ');
    varrer(0n, PEDACO, p, buf); // aquece o JIT
    const t0 = performance.now();
    for (let i = 0; i < 3; i++) varrer(10n ** 15n + BigInt(i * PEDACO), PEDACO, p, buf);
    const s = (performance.now() - t0) / 1000;
    self.postMessage({ tipo: 'medida', velocidade: (3 * PEDACO) / s });
    return;
  }
  if (msg.tipo === 'varrer') {
    garantir(msg.padrao.length);
    const t0 = performance.now();
    const r = varrer(msg.inicio, msg.tamanho, msg.padrao, buf);
    self.postMessage({
      tipo: 'resultado',
      busca: msg.busca,
      pedaco: msg.pedaco,
      letras: msg.tamanho,
      contagem: r.contagem,
      posicoes: r.posicoes,
      primeira: r.primeira,
      ultima: r.ultima,
      ms: performance.now() - t0,
    });
  }
};
