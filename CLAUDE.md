# CLAUDE.md: mar-de-letras

Um texto de **1 quintilhão (10^18) de letras aleatórias**, gerado na hora, com
busca para ver se uma sequência existe nele. Criado em 09/10/2026 a pedido do
Felipe ("um site simples com um texto o mais grande possível, com letras
aleatórias, onde eu possa procurar combinações"). Tamanho escolhido por ele
("1 quintilhão, pode ir") depois de eu explicar que o texto tem que ser
procedural. Plano aprovado antes de codar.

O `CLAUDE.md` da raiz vale aqui também. Este arquivo só acrescenta o que é
deste projeto.

---

## 1. A ideia que não se desfaz

**O texto não existe em lugar nenhum.** Cada bloco de 8 letras sai de uma conta
sobre o número do bloco (`js/gerador.js`, `escreverBloco`), com uma semente
fixa. Mesma posição, mesma letra, em qualquer máquina e a qualquer hora.

- **Não trocar o gerador nem as sementes** (`SEMENTE_A`, `SEMENTE_B`,
  as constantes do embaralhador). Mudou qualquer uma, é outro texto: as
  posições que ele anotou, as URLs `#q=...&p=...` e qualquer acerto citado
  deixam de valer. Se for preciso mudar, é decisão dele.
- **Nada é guardado.** Não gerar o texto em arquivo, não cachear o texto
  inteiro, não mandar nada para servidor. A CSP do `index.html` tem
  `connect-src 'none'`: não existe `fetch` no projeto e não deve passar a existir.
- Posições são **`BigInt`** (10^18 passa de 2^53). Misturar `Number` com posição
  quebra em silêncio. Dentro de um pedaço, o deslocamento é `Number`.
- O texto só tem **A-Z**. Acento, espaço e número são descartados da busca
  (`normalizar` em `js/formato.js`) e a tela avisa quando descarta algo.

## 2. Como a busca anda

- O texto é cortado em **pedaços de 8.388.608 letras** (`PEDACO` em
  `js/busca.js`). Cada worker (`js/busca-worker.js`) gera o pedaço e procura
  com `Uint8Array.indexOf` na primeira letra.
- Um acerto **conta no pedaço onde começa**. O pedaço lê `m - 1` letras além do
  fim, então acerto na divisa não se perde nem conta duas vezes (tem teste).
- `js/buscador.js` reparte os pedaços, mantém 2 na fila de cada worker (para
  ele não esperar a thread principal) e junta: contagem, as 500 posições mais
  próximas do começo e a velocidade dos últimos 3 s.
- Núcleos: todos os lógicos que o navegador informar, no mínimo 16 e no máximo 20
  (`NUCLEOS_MIN`/`NUCLEOS_MAX`, pedido dele em 15/10/2026; antes era 75 % dos lógicos
  e ele via 10, depois 6), na busca com contagem e na
  do leitor (cada página cria o seu próprio conjunto de workers).
- **Velocidade:** ~3 bilhões de letras/s no PC dele com a aba visível (medido em
  09/10/2026); aba escondida cai para ~1 bilhão, porque o navegador estrangula.
  Varrer o quintilhão inteiro levaria uns 10 anos: a busca nunca "termina" na
  prática, o botão Parar é parte do uso. A tela mostra isso antes de buscar
  (`atualizarPrevia`) e na tabela "O que dá para achar".

## 3. O que ele vê

- Faixas **escuro, claro, escuro, claro** (topo, leitor, tabela, rodapé). Medido
  em 09/10/2026. Mexeu em faixa, remedir a luminância, rodapé incluído.
- Uma cor de ação só: o marca-texto `--marca` (`css/tokens.css`), nos acertos,
  no botão e nos números que importam. Tinta azul-noite e papel creme.
- O leitor mostra a janela em volta de uma posição; PageUp/PageDown e as setas
  andam com o cartão focado. **A roda do mouse não é sequestrada** (a página
  rola normal). A posição mora no hash da URL (`#q=AMOR&p=123`).
- Colunas e linhas do leitor são medidas (`medirTela`): a largura de uma letra
  vem do `#medidor`. Foram duas armadilhas, já corrigidas:
  1. as grades usam `minmax(0, 1fr)` em tudo, senão o texto (que não quebra
     linha) estica a coluna e o celular encolhe a página inteira;
  2. `.texto` e `.gutter` têm `grid-column` fixa, senão sem o gutter (celular) o
     texto cai na coluna `auto` e passa do cartão.
- Aba escondida não roda `requestAnimationFrame` nem `ResizeObserver`: por isso a
  remedição usa `setTimeout` e `comecar()` mede de novo depois do primeiro
  desenho.

## 4. O leitor em tela cheia (`leitor.html`)

Pedido dele em 09/10/2026 ("faz que nem o leitor gigante"): a mesma ideia do
projeto `leitor-gigante` (barra escura, leitura clara, régua em canvas, roda do
mouse, zoom), aplicada ao texto procedural. Os dois projetos são **separados**:
nada foi importado de lá, as contas de zoom e de "ir para" foram reescritas aqui
(`js/entrada.js`). Mexer num não obriga mexer no outro.

- **Linha = `cols` letras, sempre** (o texto não tem quebra de linha própria).
  Por isso rolar é exato e subir desfaz descer (`js/janela.js`, com teste em
  vários pontos do texto). O topo da tela é sempre múltiplo de `cols`.
- **A régua serve para saltar, não para andar.** 1 px dela vale ~10^15 letras.
  A roda, o teclado e o toque andam de verdade. **Não há faixas de acerto na
  régua**: cada pixel cobre quadrilhões de letras e o desenho não diria nada
  (decidido no plano, ele aprovou).
- **Roda:** linhas = delta / altura da linha; Shift ×20, Alt ×200, Ctrl = zoom.
  **Zoom de 7 % a 400 %** (`ZOOM_MINIMO`/`ZOOM_MAXIMO` em `js/leitor-main.js`),
  o mesmo limite que ele mediu e fixou no leitor gigante. Letra menor que 10 px
  não é lembrada ao recarregar (`FS_MINIMO_LEMBRADO`), para uma página travada
  não abrir travada. Medido em 3440×1440 a 7 %: 3,6 milhões de letras na tela,
  ~116 ms de pintura.
- **"Ir para"** (`interpretarPosicao`): posição exata, `50 %`, `100T`, `2,5G`,
  `300k`, `1e15`. Posições contam a partir de **0**, como o resto do site (o leitor
  gigante conta bytes a partir de 1). Tudo em `BigInt`.
- **Grupos de 10:** só na tela. As linhas passam a ter grupos inteiros de 10
  (`colunasPara`); "Copiar tela" copia as letras sem os espaços.
- **Busca "próximo/anterior"** (`js/procurador.js` + `js/procura-ordem.js`): acha
  UM acerto a partir da tela (ou depois/antes do acerto atual), com os mesmos
  workers e pedaços da busca com contagem. Os pedaços respondem fora de ordem; o
  `Resolvedor` só aceita um acerto quando todos os pedaços anteriores já disseram
  "nada" (tem teste com respostas embaralhadas). Não dá a volta ao chegar no
  fim ou no começo: varrer o resto levaria anos. Esc ou "Parar" cancela.
- **A posição na URL é a de um terço da tela** (`#q=AMOR&p=...`), a mesma que o
  `irPara` usa, para recarregar não deslocar o texto. O `index.html` passa a
  posição e a busca para o leitor pelos links "Ler em tela cheia" e "Abrir no leitor".

Armadilhas já pagas:
1. **Aba escondida não roda `requestAnimationFrame` nem `ResizeObserver`.** A
   pintura tem `setTimeout` de reserva (`pedir` em `leitor-tela.js`) e há
   remedição no `load` e aos 250 ms (`comecar`). A primeira medida pode sair uma
   linha a mais.
2. O navegador guarda a altura da linha em múltiplos de 1/64 px (1,68 vira
   1,6875): com 800 linhas isso são ~5 px. O número de linhas usa
   `ceil(lh * 64) / 64`.
3. `touch-action: none` no texto e na régua (o arrasto do dedo rola o texto, não a página).
4. No celular a barra tem três linhas, e as ferramentas rolam de lado dentro da
   própria barra (senão o cabeçalho passava de 240 px).

## 5. Testes

```powershell
node --test "testes/*.test.js"
```

55 testes: o gerador (reprodutível, uniforme em letras e pares, avalanche, divisas
de 32 bits e fim do texto), a busca contra uma busca ingênua (inclusive na
divisa de pedaços), a montagem da página e da tela do leitor (acertos, grupos,
fim do texto), "ir para" e zoom, a régua, a ordem dos pedaços da busca para
frente e para trás, e a formatação. O que **não** é testado em automático:
workers e tela; foram conferidos no preview em 3440×1440, 1080×1920 e celular.

## 6. Para rodar

`abrir.bat` (porta **4343**, só em 127.0.0.1) ou o preview `mar-de-letras` do
`.claude/launch.json`. Não abre por `file://` (módulos ES e workers). O leitor
fica em `http://127.0.0.1:4343/leitor.html`.
