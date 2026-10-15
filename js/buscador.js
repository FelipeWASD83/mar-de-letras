// Reparte a busca entre vários workers e junta o que eles acham.
import { TOTAL } from './gerador.js';
import { PEDACO } from './busca.js';

export const NUCLEOS_MAX = 16;
const MAX_LISTA = 500;
const FILA = 2; // pedaços já entregues a cada worker, para ele não esperar a thread principal

export function quantosNucleos() {
  return NUCLEOS_MAX;
}

export class Buscador {
  constructor({ aoMedir, aoAndar, aoTerminar }) {
    this.aoMedir = aoMedir;
    this.aoAndar = aoAndar;
    this.aoTerminar = aoTerminar;
    this.nucleos = quantosNucleos();
    this.workers = [];
    this.velocidadeMedida = 0;
    this.busca = 0;
    this.rodando = false;
    for (let i = 0; i < this.nucleos; i++) {
      const w = new Worker(new URL('./busca-worker.js', import.meta.url), { type: 'module' });
      w.onmessage = (e) => this.#receber(w, e.data);
      w.onerror = (e) => console.error('worker da busca', e.message);
      this.workers.push(w);
    }
  }

  medir() {
    this.medidas = [];
    for (const w of this.workers) w.postMessage({ tipo: 'medir' });
  }

  iniciar(padrao, inicio) {
    this.parar(true);
    this.busca++;
    this.padrao = padrao;
    this.base = inicio;
    this.proximo = 0; // índice do próximo pedaço a entregar
    this.letras = 0;
    this.contagem = 0;
    this.lista = [];
    this.comecou = performance.now();
    this.amostras = [{ t: this.comecou, letras: 0 }];
    this.rodando = true;
    this.acabou = false;
    this.emAndamento = 0;
    for (let i = 0; i < FILA; i++) for (const w of this.workers) this.#dar(w);
    this.#avisar();
  }

  parar(silencioso = false) {
    if (!this.rodando) return;
    this.rodando = false;
    this.busca++; // o que ainda voltar de uma busca velha é ignorado
    if (!silencioso) this.aoTerminar?.({ ...this.#estado(), motivo: 'parada' });
  }

  #dar(w) {
    const inicio = this.base + BigInt(this.proximo) * BigInt(PEDACO);
    if (inicio >= TOTAL) return false;
    const resta = TOTAL - inicio;
    const tamanho = resta < BigInt(PEDACO) ? Number(resta) : PEDACO;
    this.emAndamento++;
    w.postMessage({
      tipo: 'varrer',
      busca: this.busca,
      pedaco: this.proximo,
      inicio,
      tamanho,
      padrao: this.padrao,
    });
    this.proximo++;
    return true;
  }

  #receber(w, msg) {
    if (msg.tipo === 'medida') {
      this.medidas.push(msg.velocidade);
      if (this.medidas.length === this.workers.length) {
        this.velocidadeMedida = this.medidas.reduce((a, b) => a + b, 0);
        this.aoMedir?.(this.velocidadeMedida);
      }
      return;
    }
    if (msg.tipo !== 'resultado' || msg.busca !== this.busca || !this.rodando) return;
    this.emAndamento--;
    this.letras += msg.letras;
    this.contagem += msg.contagem;
    if (msg.posicoes.length) {
      this.lista = this.lista.concat(msg.posicoes).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      if (this.lista.length > MAX_LISTA) this.lista.length = MAX_LISTA;
    }
    const agora = performance.now();
    this.amostras.push({ t: agora, letras: this.letras });
    while (this.amostras.length > 2 && agora - this.amostras[0].t > 3000) this.amostras.shift();
    if (!this.#dar(w) && this.emAndamento === 0) {
      this.rodando = false;
      this.acabou = true;
      this.aoTerminar?.({ ...this.#estado(), motivo: 'fim' });
      return;
    }
    this.#avisar();
  }

  #estado() {
    const a = this.amostras[0];
    const b = this.amostras[this.amostras.length - 1];
    const dt = (b.t - a.t) / 1000;
    const velocidade = dt > 0.2 ? (b.letras - a.letras) / dt : 0;
    return {
      letras: this.letras,
      contagem: this.contagem,
      lista: this.lista,
      velocidade,
      segundos: (performance.now() - this.comecou) / 1000,
      rodando: this.rodando,
    };
  }

  #avisar() {
    const agora = performance.now();
    if (this.ultimoAviso && agora - this.ultimoAviso < 120) return; // a tela não precisa de mais que ~8 quadros por s
    this.ultimoAviso = agora;
    this.aoAndar?.(this.#estado());
  }
}
