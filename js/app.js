import { TOTAL, trecho, codigos } from './gerador.js';
import { montarPagina, alinharInicio } from './pagina.js';
import { Buscador } from './buscador.js';
import {
  normalizar, curto, inteiro, lerPosicao, esperado, chanceDeExistir,
  segundosAtePrimeiro, duracao, porcento, vezes, relogio,
} from './formato.js';

const $ = (id) => document.getElementById(id);
const el = {
  consulta: $('consulta'), comeco: $('comeco'), buscar: $('buscar'), parar: $('parar'),
  formBusca: $('form-busca'), previa: $('previa'), exemplos: $('exemplos'),
  texto: $('texto'), gutter: $('gutter'), pagina: $('pagina'), medidor: $('medidor'),
  posicao: $('posicao'), anterior: $('anterior'), proxima: $('proxima'),
  formIr: $('form-ir'), irPos: $('ir-pos'), avisoIr: $('aviso-ir'), sortear: $('sortear'),
  lista: $('lista'), resumo: $('acertos-resumo'),
  varridas: $('m-varridas'), varridasSub: $('m-varridas-sub'),
  velocidade: $('m-velocidade'), velocidadeSub: $('m-velocidade-sub'),
  acertos: $('m-acertos'), acertosSub: $('m-acertos-sub'),
  tempo: $('m-tempo'), tempoSub: $('m-tempo-sub'),
  hudNucleos: $('hud-nucleos'), hudTotal: $('hud-total'),
  tabelaCorpo: $('tabela-corpo'), tabelaNota: $('tabela-nota'),
};

const MIN_LETRAS_TABELA = 3;
const MAX_LETRAS_TABELA = 16;

let cols = 60;
let linhas = 20;
let foco = 0n;
let selecionada = null; // posição do acerto escolhido na lista
let consulta = ''; // sequência destacada no texto (a da última busca)
let mAtual = 0; // tamanho do que está digitado, para marcar a linha da tabela
let buscador = null;
let rodando = false;
let velocidadeMedida = 0;
let velocidadeViva = 0;
let chaveLista = '';

const limitar = (n, a, b) => Math.max(a, Math.min(b, n));
const letrasPorExtenso = (n) => (n >= 1e6 ? `${curto(n)} de letras` : `${curto(n)} letras`);

// ---------- leitor ----------

function medirTela() {
  const largura = el.texto.clientWidth;
  const larguraLetra = el.medidor.getBoundingClientRect().width / 64;
  const alturaLinha = parseFloat(getComputedStyle(el.texto).lineHeight);
  if (!(largura > 0) || !(larguraLetra > 0) || !(alturaLinha > 0)) return false;
  const novasCols = limitar(Math.floor(largura / larguraLetra), 16, 160);
  const novasLinhas = limitar(Math.floor((window.innerHeight * 0.72) / alturaLinha), 10, 36);
  const mudou = novasCols !== cols || novasLinhas !== linhas;
  cols = novasCols;
  linhas = novasLinhas;
  return mudou;
}

function desenhar() {
  const inicio = alinharInicio(foco, cols, linhas);
  const pagina = montarPagina({ inicio, cols, linhas, padrao: consulta, selecionada });
  const frag = document.createDocumentFragment();
  const numeros = [];
  pagina.forEach((linha, i) => {
    for (const seg of linha.segmentos) {
      if (seg.marca === 0) {
        frag.append(seg.texto);
      } else {
        const m = document.createElement('mark');
        if (seg.marca === 2) m.className = 'atual';
        m.textContent = seg.texto;
        frag.append(m);
      }
    }
    if (i < pagina.length - 1) frag.append('\n');
    numeros.push(inteiro(linha.pos));
  });
  el.texto.replaceChildren(frag);
  el.gutter.textContent = numeros.join('\n');
  el.posicao.textContent = `Posição ${inteiro(foco)} de ${inteiro(TOTAL)}`;
  marcarItemAtual();
}

function salvarHash() {
  const p = new URLSearchParams();
  if (consulta) p.set('q', consulta);
  p.set('p', foco.toString());
  try { history.replaceState(null, '', '#' + p.toString()); } catch { /* sem histórico: tudo bem */ }
}

function irPara(pos, escolher = false) {
  foco = pos < 0n ? 0n : pos >= TOTAL ? TOTAL - 1n : pos;
  if (escolher) selecionada = foco;
  desenhar();
  salvarHash();
}

function andarLinhas(n) {
  irPara(foco + BigInt(n * cols));
}

function sortearPosicao() {
  const a = new Uint32Array(2);
  crypto.getRandomValues(a);
  return ((BigInt(a[0]) << 32n) | BigInt(a[1])) % TOTAL;
}

el.anterior.addEventListener('click', () => andarLinhas(-(linhas - 2)));
el.proxima.addEventListener('click', () => andarLinhas(linhas - 2));
el.sortear.addEventListener('click', () => { el.avisoIr.textContent = ''; irPara(sortearPosicao()); });

el.formIr.addEventListener('submit', (e) => {
  e.preventDefault();
  const p = lerPosicao(el.irPos.value);
  if (p === null) {
    el.avisoIr.textContent = `Digite um número de 0 a ${inteiro(TOTAL - 1n)}.`;
    return;
  }
  el.avisoIr.textContent = '';
  irPara(p);
});

el.pagina.addEventListener('keydown', (e) => {
  const passos = { PageDown: linhas - 2, PageUp: -(linhas - 2), ArrowDown: 1, ArrowUp: -1 };
  if (e.key in passos) { e.preventDefault(); andarLinhas(passos[e.key]); }
  else if (e.key === 'Home') { e.preventDefault(); irPara(0n); }
  else if (e.key === 'End') { e.preventDefault(); irPara(TOTAL - 1n); }
});

// ---------- prévia e tabela ----------

function velocidadeAtual() {
  return rodando && velocidadeViva > 0 ? velocidadeViva : velocidadeMedida;
}

function montarTabela() {
  const frag = document.createDocumentFragment();
  for (let m = MIN_LETRAS_TABELA; m <= MAX_LETRAS_TABELA; m++) {
    const tr = document.createElement('tr');
    tr.dataset.m = String(m);
    const vezesNoTexto = esperado(m);
    for (const t of [String(m), curto(vezesNoTexto), porcento(chanceDeExistir(m)), '…']) {
      const td = document.createElement('td');
      td.textContent = t;
      tr.append(td);
    }
    frag.append(tr);
  }
  el.tabelaCorpo.replaceChildren(frag);
  el.tabelaNota.textContent = 'A partir de 13 letras o texto inteiro é pequeno demais para garantir a sequência, e o tempo da última coluna é o de varrer tudo.';
}

function atualizarTabela() {
  const v = velocidadeAtual();
  for (const tr of el.tabelaCorpo.children) {
    const m = Number(tr.dataset.m);
    tr.children[3].textContent = v > 0 ? duracao(segundosAtePrimeiro(m, v)) : '…';
    tr.classList.toggle('ativa', m === mAtual);
  }
}

function atualizarPrevia() {
  const { padrao, ignorados } = normalizar(el.consulta.value);
  mAtual = padrao.length;
  atualizarTabela();
  if (!padrao) {
    el.previa.textContent = 'Digite letras de A a Z. Acento e espaço são ignorados.';
    return;
  }
  const m = padrao.length;
  const lambda = esperado(m);
  const v = velocidadeMedida;
  let t = `Procurando <b>${padrao}</b>${ignorados ? ' (ignorei o que não é letra)' : ''}. `;
  if (lambda >= 1) {
    t += `No texto inteiro ela deve aparecer ${vezes(lambda)}.`;
    if (v > 0) t += ` A primeira costuma sair depois de varrer ${letrasPorExtenso(Math.pow(26, m))}, o que leva <em>${duracao(segundosAtePrimeiro(m, v))}</em> neste computador.`;
  } else {
    t += `Chance de existir no texto: <em>${porcento(chanceDeExistir(m))}</em>.`;
    if (v > 0) t += ` Se existir, achar exige varrer tudo, o que levaria <em>${duracao(segundosAtePrimeiro(m, v))}</em> neste computador.`;
  }
  el.previa.innerHTML = t; // `padrao` só tem A-Z e o resto são números formatados aqui
}

el.consulta.addEventListener('input', atualizarPrevia);

// ---------- busca ----------

function setRodando(r) {
  rodando = r;
  el.buscar.hidden = r;
  el.parar.hidden = !r;
}

function atualizarMedidas(e) {
  el.varridas.textContent = curto(e.letras);
  el.varridasSub.textContent = e.letras > 0 ? `${porcento(e.letras / Number(TOTAL))} do texto` : 'começando…';
  velocidadeViva = e.velocidade;
  el.velocidade.textContent = e.velocidade > 0 ? `${curto(e.velocidade)}/s` : '…';
  el.velocidadeSub.textContent = `letras por segundo, ${buscador.nucleos} núcleos`;
  el.acertos.textContent = inteiro(BigInt(e.contagem));
  el.acertosSub.textContent = `esperado no texto todo: ${curto(esperado(consulta.length))}`;
  el.tempo.textContent = relogio(e.segundos);
  el.tempoSub.textContent = e.rodando ? 'de busca, rodando' : 'de busca';
}

function atualizarLista(e, final) {
  const { lista, contagem, letras } = e;
  let resumo;
  if (contagem === 0) {
    resumo = `Nenhum acerto em ${letrasPorExtenso(letras)} varridas${rodando ? ' até agora' : ''}.`;
  } else {
    resumo = `${inteiro(BigInt(contagem))} ${contagem === 1 ? 'acerto' : 'acertos'} em ${letrasPorExtenso(letras)} varridas.`;
    if (contagem > lista.length) resumo += ` Mostrando os ${lista.length} mais próximos do começo.`;
  }
  if (final === 'parada') resumo = `Busca parada. ${resumo}`;
  if (final === 'fim') resumo = `Varri o texto inteiro. ${resumo}`;
  el.resumo.textContent = resumo;

  const chave = `${lista.length}:${lista[0] ?? ''}:${lista[lista.length - 1] ?? ''}:${consulta}`;
  if (chave === chaveLista) return;
  chaveLista = chave;
  const m = consulta.length;
  const frag = document.createDocumentFragment();
  lista.forEach((p, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'item-acerto';
    b.dataset.pos = p.toString();
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = `#${i + 1}`;
    const pos = document.createElement('span');
    pos.className = 'p';
    pos.textContent = inteiro(p);
    const ctx = document.createElement('span');
    ctx.className = 'ctx';
    const antes = p > 6n ? 6 : Number(p);
    const marca = document.createElement('mark');
    marca.textContent = consulta;
    ctx.append(trecho(p - BigInt(antes), antes), marca, trecho(p + BigInt(m), 8));
    b.append(n, pos, ctx);
    li.append(b);
    frag.append(li);
  });
  el.lista.replaceChildren(frag);
  marcarItemAtual();
}

function marcarItemAtual() {
  for (const b of el.lista.querySelectorAll('.item-acerto')) {
    b.setAttribute('aria-current', selecionada !== null && b.dataset.pos === selecionada.toString() ? 'true' : 'false');
  }
}

el.lista.addEventListener('click', (ev) => {
  const b = ev.target.closest('.item-acerto');
  if (!b) return;
  irPara(BigInt(b.dataset.pos), true);
  el.pagina.scrollIntoView({ block: 'nearest' });
});

function iniciarBusca() {
  if (!buscador) {
    el.previa.textContent = 'Este navegador não deixou criar os processos da busca (workers).';
    return;
  }
  const { padrao } = normalizar(el.consulta.value);
  if (!padrao) { atualizarPrevia(); el.consulta.focus(); return; }
  let inicio = 0n;
  const txt = el.comeco.value.trim();
  if (txt) {
    const p = lerPosicao(txt);
    if (p === null) {
      el.previa.textContent = `A posição inicial precisa ser um número de 0 a ${inteiro(TOTAL - 1n)}.`;
      return;
    }
    inicio = p;
  }
  consulta = padrao;
  selecionada = null;
  chaveLista = '';
  setRodando(true);
  atualizarPrevia();
  buscador.iniciar(codigos(padrao), inicio);
  desenhar();
  salvarHash();
}

el.formBusca.addEventListener('submit', (e) => { e.preventDefault(); iniciarBusca(); });
el.parar.addEventListener('click', () => buscador?.parar());

el.exemplos.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  el.consulta.value = chip.textContent;
  iniciarBusca();
});

function criarBuscador() {
  try {
    buscador = new Buscador({
      aoMedir(v) {
        velocidadeMedida = v;
        if (!rodando) {
          el.velocidade.textContent = `${curto(v)}/s`;
          el.velocidadeSub.textContent = `capacidade do seu computador, ${buscador.nucleos} núcleos`;
        }
        atualizarPrevia();
      },
      aoAndar(e) {
        atualizarMedidas(e);
        atualizarLista(e, null);
        atualizarTabela();
      },
      aoTerminar(e) {
        setRodando(false);
        atualizarMedidas({ ...e, rodando: false });
        atualizarLista(e, e.motivo);
        velocidadeViva = 0;
        atualizarTabela();
      },
    });
    el.hudNucleos.textContent = `${buscador.nucleos} núcleos do processador na busca`;
    setTimeout(() => buscador.medir(), 250);
  } catch (err) {
    console.error(err);
    el.hudNucleos.textContent = 'busca indisponível neste navegador';
  }
}

// ---------- começo ----------

function lerHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const q = normalizar(p.get('q') ?? '').padrao;
  const pos = p.get('p') ? lerPosicao(p.get('p')) : null;
  return { q, pos };
}

function comecar() {
  el.hudTotal.textContent = `${inteiro(TOTAL)} letras`;
  montarTabela();
  medirTela();
  const { q, pos } = lerHash();
  if (q) { consulta = q; el.consulta.value = q; }
  foco = pos ?? sortearPosicao();
  desenhar();
  // A coluna das posições só ganha largura depois do primeiro desenho e tira
  // espaço do texto: medir de novo agora, senão a linha passa do cartão.
  if (medirTela()) desenhar();
  atualizarPrevia();
  criarBuscador();
}

// O ResizeObserver pega qualquer mudança de largura do texto (janela, rotação,
// gutter que aparece); o resize da janela cobre a altura, que muda as linhas.
let adiar = 0;
function remedir() {
  clearTimeout(adiar);
  adiar = setTimeout(() => { if (medirTela()) desenhar(); }, 60);
}
window.addEventListener('resize', remedir);
new ResizeObserver(remedir).observe(el.texto);

comecar();
