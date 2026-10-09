// "Próximo" e "anterior" do leitor: acha UM acerto a partir de um ponto, andando
// para a frente ou para trás, com os mesmos workers da busca com contagem.
import { quantosNucleos } from './buscador.js';
import { geometria, Resolvedor } from './procura-ordem.js';

const FILA = 2; // pedaços já entregues a cada worker

export class Procurador {
  constructor({ aoAndar } = {}) {
    this.aoAndar = aoAndar;
    this.nucleos = quantosNucleos();
    this.workers = [];
    this.id = 0;
    this.atual = null;
    for (let i = 0; i < this.nucleos; i++) {
      const w = new Worker(new URL('./busca-worker.js', import.meta.url), { type: 'module' });
      w.onmessage = (e) => this.#receber(w, e.data);
      w.onerror = (e) => console.error('worker da busca', e.message);
      this.workers.push(w);
    }
  }

  get procurando() {
    return this.atual !== null;
  }

  /**
   * sentido +1: primeiro acerto que começa em `ponto` ou depois.
   * sentido -1: último acerto que começa antes de `ponto`.
   * Resolve com { achou, posicao, letras, segundos } ou { cancelado: true, ... }.
   */
  achar(padrao, sentido, ponto) {
    this.parar();
    const g = geometria(sentido, ponto);
    if (g.total === 0) return Promise.resolve({ achou: false, posicao: null, letras: 0, segundos: 0 });
    const e = {
      id: ++this.id,
      padrao,
      g,
      resolvedor: new Resolvedor(sentido, g.total),
      proximo: 0,
      letras: 0,
      comeco: performance.now(),
      amostras: [],
      ultimoAviso: 0,
      resolver: null,
    };
    e.amostras.push({ t: e.comeco, letras: 0 });
    this.atual = e;
    return new Promise((resolver) => {
      e.resolver = resolver;
      for (let i = 0; i < FILA; i++) for (const w of this.workers) this.#dar(w);
    });
  }

  parar() {
    const e = this.atual;
    if (!e) return;
    this.atual = null;
    e.resolver({ cancelado: true, letras: e.letras, segundos: (performance.now() - e.comeco) / 1000 });
  }

  #dar(w) {
    const e = this.atual;
    if (!e || e.proximo >= e.g.total) return;
    const { inicio, tamanho } = e.g.pedaco(e.proximo);
    w.postMessage({ tipo: 'varrer', busca: e.id, pedaco: e.proximo, inicio, tamanho, padrao: e.padrao });
    e.proximo++;
  }

  #receber(w, msg) {
    const e = this.atual;
    if (msg.tipo !== 'resultado' || !e || msg.busca !== e.id) return;
    e.letras += msg.letras;
    const agora = performance.now();
    e.amostras.push({ t: agora, letras: e.letras });
    while (e.amostras.length > 2 && agora - e.amostras[0].t > 3000) e.amostras.shift();
    const r = e.resolvedor.receber(msg.pedaco, { primeira: msg.primeira, ultima: msg.ultima });
    if (r) {
      this.atual = null;
      e.resolver({ ...r, letras: e.letras, segundos: (agora - e.comeco) / 1000 });
      return;
    }
    this.#dar(w);
    if (agora - e.ultimoAviso > 150) {
      e.ultimoAviso = agora;
      const a = e.amostras[0];
      const b = e.amostras[e.amostras.length - 1];
      const dt = (b.t - a.t) / 1000;
      this.aoAndar?.({
        letras: e.letras,
        velocidade: dt > 0.2 ? (b.letras - a.letras) / dt : 0,
        segundos: (agora - e.comeco) / 1000,
      });
    }
  }
}
