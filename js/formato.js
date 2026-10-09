import { TOTAL } from './gerador.js';

const NOMES = [
  [1e18, 'quintilhão', 'quintilhões'],
  [1e15, 'quatrilhão', 'quatrilhões'],
  [1e12, 'trilhão', 'trilhões'],
  [1e9, 'bilhão', 'bilhões'],
  [1e6, 'milhão', 'milhões'],
  [1e3, 'mil', 'mil'],
];

const nf = (casas) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: casas });

// Tira acento, deixa só A-Z maiúsculo. `ignorados` diz se algo foi descartado.
export function normalizar(texto) {
  const limpo = texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const padrao = limpo.replace(/[^A-Z]/g, '');
  return { padrao, ignorados: padrao.length !== limpo.length };
}

// 1234567 -> "1,2 milhão"; 3e12 -> "3 trilhões"
export function curto(n) {
  if (!Number.isFinite(n)) return '∞';
  if (n > 0 && n < 1) return new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 2 }).format(n);
  if (n < 1000) return nf(n < 10 ? 2 : 0).format(n);
  for (const [base, singular, plural] of NOMES) {
    if (n >= base) {
      const v = n / base;
      const t = nf(v < 10 ? 1 : 0).format(v);
      return base === 1e3 ? `${t} mil` : `${t} ${v >= 1.95 ? plural : singular}`;
    }
  }
  return nf(0).format(n);
}

export function inteiro(bigint) {
  return bigint.toLocaleString('pt-BR');
}

// Aceita "1.234.567", "1 234 567" ou "1234567". null se não for número válido.
export function lerPosicao(texto) {
  const so = texto.replace(/[\s.,_]/g, '');
  if (!/^\d{1,19}$/.test(so)) return null;
  const n = BigInt(so);
  return n < TOTAL ? n : null;
}

// Quantas vezes um padrão de m letras deveria aparecer no texto inteiro.
export function esperado(m) {
  return Number(TOTAL) / Math.pow(26, m);
}

// "cerca de 4,8 milhões de vezes", "cerca de 10 vezes", "menos de 1 vez"
export function vezes(n) {
  if (n < 1) return 'menos de 1 vez';
  if (n < 1.5) return 'cerca de 1 vez';
  if (n >= 1e6) return `cerca de ${curto(n)} de vezes`;
  return `cerca de ${curto(n)} vezes`;
}

// Chance de existir ao menos uma vez (Poisson), de 0 a 1.
export function chanceDeExistir(m) {
  return 1 - Math.exp(-esperado(m));
}

// Segundos até achar o primeiro, na velocidade dada (letras/s).
export function segundosAtePrimeiro(m, velocidade) {
  if (!(velocidade > 0)) return NaN;
  const ate = Math.min(Math.pow(26, m), Number(TOTAL));
  return ate / velocidade;
}

export function duracao(segundos) {
  if (!Number.isFinite(segundos)) return '—';
  if (segundos < 1) return 'menos de 1 s';
  if (segundos < 90) return `${Math.round(segundos)} s`;
  const min = segundos / 60;
  if (min < 90) return `${Math.round(min)} min`;
  const h = min / 60;
  if (h < 48) return `${Math.round(h)} h`;
  const d = h / 24;
  if (d < 90) return `${Math.round(d)} dias`;
  const a = d / 365.25;
  if (a < 1.5) return `${nf(1).format(a)} ano`;
  return `${curto(a)} anos`;
}

// 75 -> "1:15", 3725 -> "1:02:05", 12 -> "12 s"
export function relogio(segundos) {
  const s = Math.floor(segundos);
  if (s < 60) return `${s} s`;
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return s < 3600 ? `${Math.floor(s / 60)}:${ss}` : `${Math.floor(s / 3600)}:${mm}:${ss}`;
}

export function porcento(p) {
  if (p >= 1) return '100 %';
  if (p >= 0.9999) return 'quase 100 %';
  if (p >= 0.01) return `${nf(p >= 0.1 ? 0 : 1).format(p * 100)} %`;
  if (p >= 1e-9) return `${nf(p >= 1e-4 ? 3 : 7).format(p * 100)} %`;
  return 'quase 0 %';
}
