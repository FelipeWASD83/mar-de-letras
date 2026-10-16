# Mar de letras

Um texto de **1 quintilhão de letras aleatórias** (1.000.000.000.000.000.000) e
uma busca para ver se uma sequência existe nele.

O texto não ocupa espaço: nenhuma letra fica guardada. Cada letra é calculada na
hora a partir da posição dela, então o texto é sempre o mesmo, em qualquer
computador.

## Como usar

1. Dê dois cliques no `abrir.bat`. Ele sobe um servidorzinho e abre o navegador.
   Deixe a janela preta aberta enquanto usa e feche quando terminar.
2. Digite uma sequência (de A a Z; acento e espaço são ignorados) e clique em
   **Buscar**. Os botões de exemplo já fazem a busca sozinhos.
3. A busca anda a partir do começo do texto (ou da posição que você colocar em
   "Começar na posição"). Clique em **Parar** quando quiser.
4. Clique numa posição da lista **Onde apareceu** para ver o trecho, com a
   sequência marcada. Dá para pular para qualquer posição ("Ir para") e sortear
   um lugar.

A página mostra, antes de buscar, quantas vezes a sequência deveria aparecer, a
chance de ela existir e quanto tempo leva achar a primeira. Em resumo: até 8 ou 9
letras é rápido; com 12 já são só umas 10 ocorrências no texto todo; de 13 para
cima pode nem existir.

## Leitor em tela cheia

O link **Ler em tela cheia** (ou `leitor.html`) abre o texto como um leitor de
documento: a roda do mouse rola linha a linha (Shift acelera, Alt voa), a régua
da direita salta para qualquer ponto dos 10^18, e dá para ir a uma posição
(`50 %`, `100T`, `2,5G`, `1e15` ou o número exato). A busca de lá é de **próximo**
(Enter) e **anterior** (Shift+Enter) a partir de onde você está. Tem zoom (A−, A+,
Ctrl+roda), "Grupos de 10", "Copiar tela" e "Sortear". A posição e a busca vão na
URL, então dá para voltar ao mesmo lugar depois.

## Para quem for mexer

Ver o `CLAUDE.md`. Testes: `node --test "testes/*.test.js"`. Porta 4343.

## Licença

Código sob a licença MIT (arquivo `LICENSE`).
