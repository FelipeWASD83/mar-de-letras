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
- Núcleos: 75 % dos lógicos, no máximo 16 (`NUCLEOS_MAX`).
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

## 4. Testes

```powershell
node --test "testes/*.test.js"
```

27 testes: o gerador (reprodutível, uniforme em letras e pares, avalanche, divisas
de 32 bits e fim do texto), a busca contra uma busca ingênua (inclusive na
divisa de pedaços), a montagem da página e a formatação. O que **não** é
testado em automático: workers e tela; foram conferidos no preview em
3440×1440, 1080×1920 e celular.

## 5. Para rodar

`abrir.bat` (porta **4343**, só em 127.0.0.1) ou o preview `mar-de-letras` do
`.claude/launch.json`. Não abre por `file://` (módulos ES e workers).
