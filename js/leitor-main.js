// Liga a tela de leitura aos botões, à régua, à busca de próximo/anterior, ao
// teclado e ao zoom. As contas ficam nos módulos sem DOM.
import { TOTAL, codigos } from './gerador.js';
import { criarLeitor } from './leitor-tela.js';
import { criarRegua } from './ui-regua.js';
import { Procurador } from './procurador.js';
import { interpretarPosicao, interpretarZoom, zoomDeFs, fsDeZoom, formatarZoom } from './entrada.js';
import { posicaoDaFracao, fracaoDaPosicao } from './regua.js';
import { posicaoDoTerco } from './janela.js';
import { normalizar, curto, inteiro, porcento, duracao } from './formato.js';

const $ = (id) => document.getElementById(id);
const el = {
  texto: $('texto'), pre: $('pre'), sonda: $('sonda'),
  busca: $('busca'), formBusca: $('form-busca'), ant: $('busca-ant'), prox: $('busca-prox'),
  parar: $('busca-parar'), resultado: $('busca-resultado'),
  formIr: $('form-ir'), ir: $('ir'),
  menos: $('fonte-menos'), mais: $('fonte-mais'), zoom: $('zoom'),
  agrupar: $('agrupar'), sortear: $('sortear'), copiar: $('copiar'),
  regua: $('regua'), reguaTela: $('regua-tela'), dica: $('regua-dica'),
  pos: $('pos'), meio: $('meio'), aviso: $('aviso'),
};

// O mesmo limite do leitor gigante, que o Felipe mediu e fixou em 7 %: abaixo
// disso a tela passa de milhões de letras e a página começa a lagar.
const ZOOM_MINIMO = 7;
const ZOOM_MAXIMO = 400;
const PASSO_ZOOM = 1.1;
// Letra menor que isto não é lembrada ao recarregar, para uma página travada
// não abrir travada para sempre.
const FS_MINIMO_LEMBRADO = 10;

const CHAVE = 'mar-de-letras:leitor';
const prefs = { zoom: 100, grupos: false };
try {
  const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? '{}');
  if (Number.isFinite(salvo.zoom) && salvo.zoom >= ZOOM_MINIMO && salvo.zoom <= ZOOM_MAXIMO) prefs.zoom = salvo.zoom;
  prefs.grupos = salvo.grupos === true;
} catch { /* sem armazenamento: abre no padrão */ }

function salvarPrefs() {
  try { localStorage.setItem(CHAVE, JSON.stringify(prefs)); } catch { /* tudo bem */ }
}

const letrasPorExtenso = (n) => (n >= 1e6 ? `${curto(n)} de letras` : `${curto(n)} letras`);
const percentual = (frac) => (frac === 0 ? '0 %' : porcento(frac));

let consulta = ''; // sequência buscada (A-Z)
let codigosConsulta = null;
let atualAcerto = null; // posição do acerto em que parei
let procurador = null;
let zoom = 100;
let atraso = 0;

// ---------- aviso ----------

let sumirAviso = 0;
function avisar(texto, ms = 3500) {
  el.aviso.textContent = texto;
  el.aviso.hidden = false;
  clearTimeout(sumirAviso);
  sumirAviso = setTimeout(() => { el.aviso.hidden = true; }, ms);
}

// ---------- régua ----------

const regua = criarRegua({
  elemento: el.regua,
  tela: el.reguaTela,
  dica: el.dica,
  aoMover: (frac) => leitor.definirTopo(posicaoDaFracao(frac)),
  textoDaDica: (frac) => `${inteiro(posicaoDaFracao(frac))} · ${percentual(frac)}`,
});

// ---------- leitura ----------

function aoMudar(i) {
  regua.atualizar({ topo: fracaoDaPosicao(i.topo), ext: i.letras / Number(TOTAL) });
  el.pos.textContent = `Posição ${inteiro(i.topo)} · ${percentual(fracaoDaPosicao(i.topo))}`;
  el.meio.textContent = `${i.linhas} linhas × ${i.cols} colunas · ${letrasPorExtenso(i.letras)} na tela · pintura ${i.pinturaMs < 10 ? i.pinturaMs.toFixed(1) : Math.round(i.pinturaMs)} ms`;
  clearTimeout(atraso);
  atraso = setTimeout(() => salvarHash(i), 250);
}

function salvarHash(i = leitor.info()) {
  const p = new URLSearchParams();
  if (consulta) p.set('q', consulta);
  p.set('p', posicaoDoTerco(i.topo, i.cols, i.linhas).toString());
  try { history.replaceState(null, '', '#' + p.toString()); } catch { /* sem histórico: tudo bem */ }
}

const leitor = criarLeitor({ area: el.texto, pre: el.pre, sonda: el.sonda, aoMudar });

// ---------- zoom ----------

function definirZoom(z) {
  if (!(z > 0)) return;
  let novo = z;
  if (novo < ZOOM_MINIMO) { novo = ZOOM_MINIMO; avisar(`Limite de afastar: ${ZOOM_MINIMO} %.`); }
  if (novo > ZOOM_MAXIMO) { novo = ZOOM_MAXIMO; avisar(`Limite de aproximar: ${ZOOM_MAXIMO} %.`); }
  zoom = novo;
  const fs = fsDeZoom(zoom);
  document.documentElement.style.setProperty('--fs', `${fs}px`);
  el.zoom.value = formatarZoom(zoom);
  if (fs >= FS_MINIMO_LEMBRADO) { prefs.zoom = zoom; salvarPrefs(); }
  leitor.medirDeNovo();
}

el.menos.addEventListener('click', () => definirZoom(zoom / PASSO_ZOOM));
el.mais.addEventListener('click', () => definirZoom(zoom * PASSO_ZOOM));
el.zoom.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter') return;
  ev.preventDefault();
  const v = interpretarZoom(el.zoom.value);
  if (v === null) { el.zoom.value = formatarZoom(zoom); avisar('Digite o zoom em %, por exemplo 50.'); return; }
  definirZoom(v);
  el.texto.focus({ preventScroll: true });
});
el.zoom.addEventListener('blur', () => { el.zoom.value = formatarZoom(zoom); });

// Ctrl + roda do mouse (ou pinça no touchpad) afasta e aproxima
el.texto.addEventListener(
  'wheel',
  (ev) => {
    if (!(ev.ctrlKey || ev.metaKey)) return;
    ev.preventDefault();
    const dy = ev.deltaMode === 1 ? ev.deltaY * 33 : ev.deltaY;
    definirZoom(zoom * Math.pow(PASSO_ZOOM, -Math.max(-3, Math.min(3, dy / 100))));
  },
  { passive: false },
);

// ---------- grupos, sortear, copiar, ir para ----------

function pintarGrupos() {
  el.agrupar.setAttribute('aria-pressed', String(prefs.grupos));
  leitor.definirGrupos(prefs.grupos);
}
el.agrupar.addEventListener('click', () => {
  prefs.grupos = !prefs.grupos;
  salvarPrefs();
  pintarGrupos();
});

function sortearPosicao() {
  const a = new Uint32Array(2);
  crypto.getRandomValues(a);
  return ((BigInt(a[0]) << 32n) | BigInt(a[1])) % TOTAL;
}
el.sortear.addEventListener('click', () => {
  const p = sortearPosicao();
  leitor.irPara(p);
  avisar(`Sorteado: posição ${inteiro(p)}`);
});

el.copiar.addEventListener('click', async () => {
  const t = leitor.textoDaTela();
  try {
    await navigator.clipboard.writeText(t);
    avisar(`Copiadas ${letrasPorExtenso(t.replace(/\n/g, '').length)} da tela.`);
  } catch {
    avisar('O navegador não deixou copiar. Selecione o texto e use Ctrl+C.');
  }
});

el.formIr.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const p = interpretarPosicao(el.ir.value);
  if (p === null) {
    avisar(`Não entendi. Tente uma posição (até ${inteiro(TOTAL - 1n)}), 50 %, 100T, 2,5G ou 1e15.`, 5000);
    return;
  }
  leitor.irPara(p);
  el.ir.blur();
  el.texto.focus({ preventScroll: true });
});

// ---------- busca: próximo e anterior ----------

function setProcurando(sim) {
  el.parar.hidden = !sim;
  el.prox.disabled = sim;
  el.ant.disabled = sim;
}

function limparBusca() {
  procurador?.parar();
  consulta = '';
  codigosConsulta = null;
  atualAcerto = null;
  el.resultado.textContent = '';
  leitor.definirBusca(null, null);
  salvarHash();
}

function criarProcurador() {
  if (procurador) return procurador;
  procurador = new Procurador({
    aoAndar: (a) => {
      el.resultado.textContent = `Procurando… ${letrasPorExtenso(a.letras)} varridas${a.velocidade > 0 ? ` (${curto(a.velocidade)}/s)` : ''}`;
    },
  });
  return procurador;
}

async function buscar(sentido) {
  const { padrao } = normalizar(el.busca.value);
  if (!padrao) {
    limparBusca();
    avisar('Digite letras de A a Z para buscar.');
    return;
  }
  if (padrao !== consulta) {
    consulta = padrao;
    codigosConsulta = codigos(padrao);
    atualAcerto = null;
    leitor.definirBusca(codigosConsulta, null);
  }
  const i = leitor.info();
  const visivel = atualAcerto !== null && atualAcerto >= i.topo && atualAcerto < i.topo + BigInt(i.letras);
  let ponto;
  if (sentido > 0) {
    ponto = visivel ? atualAcerto + 1n : i.topo;
    if (ponto >= TOTAL) { avisar('Chegou ao fim do texto.'); return; }
  } else {
    ponto = visivel ? atualAcerto : i.topo;
    if (ponto <= 0n) { avisar('Chegou ao começo do texto.'); return; }
  }

  let p;
  try {
    p = criarProcurador();
  } catch (err) {
    console.error(err);
    avisar('Este navegador não deixou criar os processos da busca (workers).', 6000);
    return;
  }
  setProcurando(true);
  el.resultado.textContent = 'Procurando…';
  const r = await p.achar(codigosConsulta, sentido, ponto);
  if (r.cancelado) {
    // outra busca já pode ter assumido: só limpa o aviso se ninguém está procurando
    if (!p.procurando) { setProcurando(false); el.resultado.textContent = `Parada depois de ${letrasPorExtenso(r.letras)}.`; }
    return;
  }
  setProcurando(false);
  const gasto = `${letrasPorExtenso(r.letras)} varridas em ${duracao(r.segundos)}`;
  if (!r.achou) {
    el.resultado.textContent = `Nada ${sentido > 0 ? 'até o fim do texto' : 'até o começo do texto'} (${gasto}).`;
    avisar(`"${consulta}" não aparece ${sentido > 0 ? 'daqui até o fim' : 'daqui até o começo'}.`);
    return;
  }
  atualAcerto = r.posicao;
  leitor.definirBusca(codigosConsulta, atualAcerto);
  leitor.irPara(atualAcerto);
  el.resultado.textContent = `Acerto na posição ${inteiro(r.posicao)} (${gasto}).`;
  salvarHash();
}

el.formBusca.addEventListener('submit', (ev) => {
  ev.preventDefault();
  buscar(1);
});
el.ant.addEventListener('click', () => buscar(-1));
el.parar.addEventListener('click', () => procurador?.parar());
el.busca.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.shiftKey) {
    ev.preventDefault();
    buscar(-1);
  } else if (ev.key === 'Escape') {
    el.busca.value = '';
    limparBusca();
    el.texto.focus({ preventScroll: true });
  }
});
el.busca.addEventListener('input', () => {
  if (!el.busca.value) limparBusca();
});

// ---------- teclado ----------

window.addEventListener('keydown', (ev) => {
  const digitando = ev.target instanceof HTMLInputElement;
  const ctrl = ev.ctrlKey || ev.metaKey;
  if (ev.key === 'Escape' && procurador?.procurando) {
    procurador.parar();
    return;
  }
  if (ctrl && ev.key.toLowerCase() === 'f') {
    ev.preventDefault();
    el.busca.focus();
    el.busca.select();
    return;
  }
  if (ctrl && ev.key.toLowerCase() === 'g') {
    ev.preventDefault();
    el.ir.focus();
    el.ir.select();
    return;
  }
  if (ctrl && ev.key === '0') {
    ev.preventDefault();
    definirZoom(100);
    return;
  }
  if (ev.key === 'F3' && consulta) {
    ev.preventDefault();
    buscar(ev.shiftKey ? -1 : 1);
    return;
  }
  if (digitando || ev.altKey || ctrl) return;
  const acoes = {
    ArrowDown: () => leitor.rolar(1),
    ArrowUp: () => leitor.rolar(-1),
    PageDown: () => leitor.pagina(1),
    PageUp: () => leitor.pagina(-1),
    ' ': () => leitor.pagina(ev.shiftKey ? -1 : 1),
    Home: () => leitor.inicio(),
    End: () => leitor.fim(),
  };
  const acao = acoes[ev.key];
  if (acao) {
    ev.preventDefault();
    acao();
  }
});

// ---------- começo ----------

function comecar() {
  const h = new URLSearchParams(location.hash.slice(1));
  const q = normalizar(h.get('q') ?? '').padrao;
  const p = h.get('p') ? interpretarPosicao(h.get('p')) : null;
  document.documentElement.style.setProperty('--fs', `${fsDeZoom(prefs.zoom)}px`);
  zoom = prefs.zoom;
  el.zoom.value = formatarZoom(zoom);
  el.agrupar.setAttribute('aria-pressed', String(prefs.grupos));
  leitor.definirGrupos(prefs.grupos);
  leitor.desenharAgora(); // mede a tela antes de ir para a posição da URL
  if (q) {
    consulta = q;
    codigosConsulta = codigos(q);
    el.busca.value = q;
    leitor.definirBusca(codigosConsulta, null);
  }
  if (p !== null) leitor.irPara(p);
  el.texto.focus({ preventScroll: true });
  // A primeira medida pode sair uma linha a mais (o cabeçalho ainda está
  // assentando). O ResizeObserver conserta em aba visível; estas duas cobrem aba escondida.
  window.addEventListener('load', () => leitor.medirDeNovo(), { once: true });
  setTimeout(() => leitor.medirDeNovo(), 250);
}

// gancho para teste e para quem quiser mexer pelo console
window.leitorMar = { leitor, buscar, definirZoom, get zoom() { return zoom; }, get consulta() { return consulta; } };

comecar();
