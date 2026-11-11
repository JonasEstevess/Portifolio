# Auditoria do portfólio

Auditoria feita em novembro de 2026 sobre a `main` no commit `08b33e8`, antes da versão 2.0.
Cada item traz a evidência encontrada e o que foi feito a respeito. O que ficou para depois
está em [PLANO-DE-ACAO.md](PLANO-DE-ACAO.md).

## Resumo

| Indicador                                  | Antes                         | Depois                                   |
| ------------------------------------------ | ----------------------------- | ---------------------------------------- |
| Experiências disponíveis                   | 2 (landing e 3D)              | 3 (landing, 3D e jogo 2D)                |
| JavaScript para abrir o site (gzip)        | 301 kB, um único arquivo      | ~105 kB; three.js só é baixado em `/3d`  |
| Screenshots de projetos                    | 10,0 MB em PNG                | 0,5 MB em WebP                           |
| Requisições 404 por screenshot             | 2 (tentava `.jpg` e `.jpeg`)  | 0                                        |
| Abrir `/landing` ou `/3d` direto no Vercel | 404                           | Funciona (rewrite de SPA)                |
| Dependências de produção                   | 52                            | 9                                        |
| ESLint                                     | 3 erros, 7 avisos             | 0 erros, 0 avisos                        |
| Testes                                     | 1 (placeholder)               | 27 (jogo, física, fase e dados)          |

## 1. Erros que afetavam o visitante

**1.1 Links diretos quebrados em produção.** `https://portifolio-jonas-seven.vercel.app/landing`
e `/3d` respondiam 404: sem `vercel.json`, o Vercel procurava um arquivo com esse nome em vez
de entregar o `index.html`. Qualquer link compartilhado para uma experiência, ou um simples
F5, caía em erro. Corrigido com um rewrite para o `index.html`.

**1.2 Visitante preso no 3D depois do Esc.** Sair do pointer lock não mostrava nada: a câmera
parava de responder e não havia indicação de que bastava clicar. Agora aparece uma tela de
pausa com "Clique para continuar" e atalhos para abrir cada seção.

**1.3 Notebooks com tela sensível ao toque tratados como celular.** O 3D usava
`navigator.maxTouchPoints > 0`, então um notebook touch perdia mouse e teclado e ainda via o
aviso de "gire seu aparelho". A detecção passou a usar apenas `(pointer: coarse)`.

**1.4 Minimapa girando ao contrário.** A seta do jogador usava `rotate(yaw)`; como o canvas
gira no sentido horário e a câmera no anti-horário, virar à esquerda fazia a seta virar à
direita. Corrigido, e o minimapa ganhou cone de visão, caminhos e pavilhões visitados.

**1.5 Textura dos caminhos compartilhada.** Os cinco caminhos do 3D dividiam uma única textura
e cada um sobrescrevia o `repeat` dela; todos ficavam com a repetição do último. Cada caminho
agora tem o próprio clone.

**1.6 Tela de carregamento obrigatória de 4 s.** Aparecia toda vez, em `/landing` e em `/3d`,
sem poder pular. Agora dura 3 s, aparece uma vez por sessão e qualquer tecla ou toque a pula.

## 2. Desempenho

**2.1 Um único bundle de 1,04 MB.** A landing baixava o three.js inteiro sem usar. As rotas
viraram chunks carregados sob demanda e as bibliotecas ficam em chunks estáveis (`react`,
`motion`, `three`), que continuam em cache quando o conteúdo muda.

**2.2 10 MB de screenshots.** Nove PNGs de até 2,2 MB cada. Convertidos para WebP com 1280 px
de largura (510 kB no total).

**2.3 Imagens procuradas por tentativa e erro.** `ProjectImage` tentava `.jpg`, `.jpeg`,
`.png` e `.webp` em sequência, gerando dois 404 antes de cada imagem. O caminho agora vem do
campo `image` em `src/data/projects.ts`.

**2.4 43 dependências sem uso.** O template trazia 49 componentes shadcn/ui, Radix,
react-query, recharts, zod e outros; nenhum era usado pelas páginas. Removidos junto com
`QueryClientProvider`, `Toaster` e `TooltipProvider`, que só envolviam o app.

**2.5 Fontes bloqueando a renderização.** O `@import` do Google Fonts dentro do CSS atrasava
a primeira pintura. Passou para `<link>` com `preconnect` no `index.html`.

**2.6 Vazamento de memória no 3D.** Ao sair da rota, só a foto era liberada; geometrias,
materiais e texturas ficavam na GPU. Agora a cena inteira é descartada e o contexto WebGL é
liberado.

**2.7 Uma malha por árvore.** 55 árvores geravam cerca de 200 draw calls. São 70 árvores em 4
malhas instanciadas.

## 3. Acessibilidade

- Menu em inglês (`Work`, `About`, `Stack`) num site em português; traduzido.
- Sem link "pular para o conteúdo", sem `<main>` identificado e sem estilo de foco visível.
- Abas de "Sobre" sem `role="tab"` nem navegação por setas.
- Painéis do 3D sem semântica de diálogo, sem foco inicial e sem prender o foco.
- Links externos do Hero e do Contato interceptavam o clique com `window.open`, quebrando
  Ctrl+clique e o botão do meio.
- Menu mobile aberto não travava a rolagem da página nem fechava com Esc.
- Animações agora respeitam `prefers-reduced-motion` também na galeria, no letreiro e no 3D
  (sem balanço de câmera).
- O conteúdo do 3D e do 2D dependia de habilidade: agora as duas experiências têm um menu
  de pausa que abre qualquer seção sem precisar andar ou jogar.

## 4. SEO e compartilhamento

- `canonical` apontava para `/`; sem `og:image`, `og:url` ou `theme-color`.
- Sem `sitemap.xml`; `robots.txt` com regras repetidas.
- Título da aba igual em todas as rotas.
- Sem dados estruturados. Adicionado `Person` em JSON-LD.

## 5. Código e manutenção

- `Scene3D.tsx` com 1.109 linhas misturando mundo, motor, HUD e conteúdo. Dividido em
  `world.ts` (cena), `Scene3D.tsx` (motor e HUD) e painéis compartilhados.
- O conteúdo das seções existia duas vezes (landing e 3D). Agora `PortfolioPanel` e
  `src/data/sections.ts` alimentam o 3D e o 2D.
- Página 404 em inglês, fora do visual do site e com `<a href>` recarregando a página.
- Ano do rodapé fixo no código.
- `package.json` ainda se chamava `vite_react_shadcn_ts`, versão `0.0.0`.
- README citava GitHub Pages; o deploy é no Vercel.
- A branch `feature/projects` tinha um commit antigo (`d4b36a4`) que nunca entrou na `main` e
  conflita com a versão atual de `Projects.tsx`. Ele foi incorporado ao histórico por um merge
  que mantém a versão nova do arquivo, para a branch poder avançar sem reescrever histórico.

## 6. O que estava bom e foi preservado

- Identidade visual (índigo sobre azul-noite, Space Grotesk + DM Sans).
- Dados centralizados em `src/data/`, que tornaram possível reaproveitar o conteúdo.
- Animação de digitação do nome, cursor personalizado e o easter egg do logo.
- Fluxo de branches por funcionalidade com commits convencionais.
