# AGENTS.md: mar-de-letras

As regras deste projeto estão em **`CLAUDE.md`**, nesta mesma pasta. Ler antes
de mexer em qualquer coisa.

Resumo do que não pode ser esquecido:

- **O texto (1 quintilhão de letras) é procedural: nada é guardado.** Cada bloco
  de 8 letras vem de uma conta sobre o número do bloco (`js/gerador.js`). Não
  trocar o gerador nem as sementes: muda o texto inteiro e invalida toda
  posição já anotada.
- Posições são `BigInt`. O texto só tem A-Z.
- Sem `fetch`, sem servidor, sem analytics: a CSP tem `connect-src 'none'`.
- A conta fica nos módulos sem DOM (`gerador.js`, `busca.js`, `pagina.js`,
  `formato.js`, `janela.js`, `entrada.js`, `regua.js`, `procura-ordem.js`), com
  teste: `node --test "testes/*.test.js"`.
- Há duas páginas: `index.html` (busca com contagem) e `leitor.html` (leitor em
  tela cheia, no estilo do projeto `leitor-gigante`, mas independente dele). No
  leitor, a linha tem sempre `cols` letras, a régua só salta (1 px = ~10^15
  letras), o zoom vai de 7 % a 400 % e a busca é "próximo/anterior".
- Módulos ES e workers: abrir só pelo servidor (porta 4343, entrada
  `mar-de-letras` no `.claude/launch.json` da raiz), nunca por `file://`.
- Faixas alternam escuro, claro, escuro, claro; uma cor de ação só (o
  marca-texto).
