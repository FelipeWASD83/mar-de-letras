// A tela de leitura: mede, pede as linhas à janela.js, pinta, e trata roda e
// toque. Não conhece botão, busca nem régua: quem usa recebe o que mudou em `aoMudar`.
import {
  colunasPara, limitarTopo, rolar, paginar, topoParaPosicao, maiorTopo, montarTela,
} from './janela.js';

const SONDA_LETRAS = 100;

export function criarLeitor({ area, pre, sonda, aoMudar }) {
  const e = {
    topo: 0n, cols: 80, linhas: 30, lh: 24, charW: 10,
    grupos: false, padrao: null, atual: null, buf: null,
    letras: 0, pinturaMs: 0, sujo: true,
  };
  let pendente = false;

  function medir() {
    const cs = getComputedStyle(area);
    const largura = area.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const altura = area.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const charW = sonda.getBoundingClientRect().width / SONDA_LETRAS;
    const lh = parseFloat(getComputedStyle(pre).lineHeight);
    if (!(largura > 0) || !(altura > 0) || !(charW > 0) || !(lh > 0)) return;
    e.charW = charW;
    e.lh = lh;
    e.cols = colunasPara(largura / charW, e.grupos);
    // o navegador guarda a altura da linha em múltiplos de 1/64 px (1,68 vira
    // 1,6875): com letra minúscula e centenas de linhas isso soma vários px
    e.linhas = Math.max(1, Math.floor(altura / (Math.ceil(lh * 64) / 64)));
    e.sujo = false;
  }

  function desenhar() {
    pendente = false;
    if (e.sujo) medir();
    e.topo = limitarTopo(e.topo, e.cols, e.linhas);
    const t0 = performance.now();
    const tela = montarTela({
      topo: e.topo, cols: e.cols, linhas: e.linhas,
      padrao: e.padrao, atual: e.atual, grupos: e.grupos, buf: e.buf,
    });
    e.buf = tela.buf;
    e.letras = tela.letras;
    const frag = document.createDocumentFragment();
    tela.linhas.forEach((segmentos, i) => {
      for (const s of segmentos) {
        if (s.marca === 0) {
          frag.append(s.texto);
        } else {
          const m = document.createElement('mark');
          if (s.marca === 2) m.className = 'atual';
          m.textContent = s.texto;
          frag.append(m);
        }
      }
      if (i < tela.linhas.length - 1) frag.append('\n');
    });
    pre.replaceChildren(frag);
    void pre.offsetHeight; // força o layout, para a medida de pintura valer
    e.pinturaMs = performance.now() - t0;
    aoMudar(api.info());
  }

  // aba escondida não roda requestAnimationFrame: o timeout garante a pintura
  function pedir() {
    if (pendente) return;
    pendente = true;
    const rodar = () => {
      if (pendente) desenhar();
    };
    requestAnimationFrame(rodar);
    setTimeout(rodar, 60);
  }

  const api = {
    info: () => ({
      topo: e.topo, cols: e.cols, linhas: e.linhas, letras: e.letras,
      pinturaMs: e.pinturaMs, grupos: e.grupos, lh: e.lh,
    }),
    medirDeNovo() {
      e.sujo = true;
      pedir();
    },
    desenharAgora() {
      desenhar();
    },
    rolar(n) {
      e.topo = rolar(e.topo, Math.trunc(n), e.cols, e.linhas);
      pedir();
    },
    pagina(sentido) {
      e.topo = paginar(e.topo, sentido, e.cols, e.linhas);
      pedir();
    },
    irPara(posicao) {
      e.topo = topoParaPosicao(posicao, e.cols, e.linhas);
      pedir();
    },
    definirTopo(topo) {
      e.topo = limitarTopo(topo, e.cols, e.linhas);
      pedir();
    },
    inicio() {
      e.topo = 0n;
      pedir();
    },
    fim() {
      e.topo = maiorTopo(e.cols, e.linhas);
      pedir();
    },
    definirGrupos(ligado) {
      e.grupos = ligado;
      e.sujo = true;
      pedir();
    },
    definirBusca(padrao, atual) {
      e.padrao = padrao;
      e.atual = atual;
      pedir();
    },
    /** As letras da tela, sem o espaço dos grupos, uma linha por linha. */
    textoDaTela() {
      const t = montarTela({ topo: e.topo, cols: e.cols, linhas: e.linhas });
      return t.linhas.map((l) => l.map((s) => s.texto).join('')).join('\n');
    },
  };

  // ---------- entrada: roda do mouse e toque ----------

  let acumulado = 0;
  area.addEventListener(
    'wheel',
    (ev) => {
      if (ev.ctrlKey || ev.metaKey) return; // Ctrl + roda é zoom: leitor-main.js
      ev.preventDefault();
      const dy = ev.shiftKey && Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
      let linhas = ev.deltaMode === 1 ? dy : ev.deltaMode === 2 ? dy * e.linhas : dy / e.lh;
      if (ev.altKey) linhas *= 200;
      else if (ev.shiftKey) linhas *= 20;
      acumulado += linhas;
      const inteiro = Math.trunc(acumulado);
      if (inteiro) {
        acumulado -= inteiro;
        api.rolar(inteiro);
      }
    },
    { passive: false },
  );

  let toque = null;
  area.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'mouse') return;
    toque = { y: ev.clientY, acc: 0 };
    try {
      area.setPointerCapture(ev.pointerId);
    } catch {
      /* sem captura, o arrasto só acompanha dentro da área do texto */
    }
  });
  area.addEventListener('pointermove', (ev) => {
    if (!toque) return;
    toque.acc += (toque.y - ev.clientY) / e.lh;
    toque.y = ev.clientY;
    const inteiro = Math.trunc(toque.acc);
    if (inteiro) {
      toque.acc -= inteiro;
      api.rolar(inteiro);
    }
  });
  const largarToque = () => {
    toque = null;
  };
  area.addEventListener('pointerup', largarToque);
  area.addEventListener('pointercancel', largarToque);

  new ResizeObserver(() => api.medirDeNovo()).observe(area);
  window.addEventListener('resize', () => api.medirDeNovo());

  return api;
}
