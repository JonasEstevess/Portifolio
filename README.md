# Portfólio — Jonas Esteves

O mesmo portfólio em três formatos. O visitante escolhe como quer conhecer o trabalho:

| Rota       | Experiência      | O que é                                                                                   |
| ---------- | ---------------- | ----------------------------------------------------------------------------------------- |
| `/`        | **Hub**          | Tela de escolha entre as três experiências.                                               |
| `/landing` | **Landing page** | Página de rolagem com tipografia grande, esculturas de partículas, galeria de projetos e índice completo. |
| `/3d`      | **Mundo 3D**     | Jogo em primeira pessoa: ilhas flutuantes, pontes com vãos, cristais e monumentos de luz.   |
| `/2d`      | **Jogo 2D**      | Plataforma em pixel art: colete commits, corrija bugs e abra os terminais.                 |

No ar em **https://portifolio-jonas-seven.vercel.app**

## Tecnologias

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** para estilos e **Framer Motion** para animações
- **Three.js** com shader de partículas próprio, no mundo 3D e no fundo da landing (carregado sob demanda)
- **Canvas 2D** no jogo, com motor próprio, sem bibliotecas e sem arquivos de imagem ou som
- **Vitest** para testes
- Deploy no **Vercel**

## Como rodar

Requer Node.js 18 ou superior.

```bash
npm install
```

```bash
npm run dev
```

O site abre em `http://localhost:8080`.

| Comando             | O que faz                               |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento             |
| `npm run build`     | Build de produção em `dist/`            |
| `npm run preview`   | Serve o build localmente                |
| `npm run lint`      | ESLint                                  |
| `npm run typecheck` | Checagem de tipos                       |
| `npm test`          | Testes (jogo 2D, mundo 3D, formas e dados) |

## Estrutura

```
src/
├── data/                  Conteúdo: projetos, formação, skills, contato, seções
├── pages/                 Uma página por rota (Hub, Index, Scene3DPage, Game2DPage)
├── components/
│   ├── portfolio/         Seções e efeitos da landing page
│   ├── particles/         Esculturas de partículas: formas, shader e o fundo animado da landing
│   ├── scene3d/           Mundo 3D: WorldRenderer.ts desenha, Scene3D.tsx cuida de controles, HUD e menus
│   ├── game2d/            Interface do jogo (canvas, HUD, menus, controles de toque)
│   └── shared/            Painéis e diálogo usados pelo 3D e pelo 2D
├── game2d/                Motor do jogo 2D, sem React: fase, física, simulação, render, áudio
├── game3d/                Regras do mundo 3D, sem three.js: mapa, movimento, pulo, coleta, portal
└── hooks/
```

Todo o conteúdo fica em `src/data/`. As três experiências leem dali, então editar um projeto
ou uma formação atualiza a landing, o 3D e o jogo de uma vez.

## Jogo 2D — Jornada do Dev

Cinco fases, uma por seção do portfólio. Cada terminal é um checkpoint e abre a seção
correspondente; o foguete no fim faz o "deploy".

| Ação           | Teclado               | Toque            |
| -------------- | --------------------- | ---------------- |
| Andar          | `A` `D` ou setas      | Botões ◀ ▶       |
| Pular          | `Espaço`, `W` ou `↑`  | Botão ▲          |
| Abrir terminal | `E` ou `Enter`        | Tocar no aviso   |
| Pausar         | `Esc` ou `P`          | Botão de pausa   |
| Som            | `M`                   | Botão de som     |

Não existe fim de jogo: perder as três vidas devolve o jogador ao último terminal. Quem não
quiser jogar pode abrir qualquer seção pelo menu de pausa.

A fase é escrita em ASCII em [`src/game2d/level.ts`](src/game2d/level.ts):

```
#  chão      B  tijolo     -  plataforma     ^  espinho
o  commit    e  bug        T  terminal       P  início     R  foguete
```

## Mundo 3D — Ilhas do Código

Um jogo de exploração em primeira pessoa. Você começa numa plataforma central flutuando no
espaço; cinco pontes levam a cinco ilhas, uma por seção do portfólio. Em cada ilha há um
monumento feito de partículas que se monta quando você se aproxima: seu retrato, uma dupla
hélice, um átomo, um palco de projetos e um avião de papel. Abra os cinco e o portal final
surge no centro.

| Ação             | Teclado e mouse       | Toque                          |
| ---------------- | --------------------- | ------------------------------ |
| Andar            | `W A S D` ou setas    | Polegar esquerdo (direcional)  |
| Olhar            | Mouse                 | Polegar direito (arrastar)     |
| Correr           | `Shift`               | Direcional até o fim           |
| Pular            | `Espaço`              | Botão ▲                        |
| Abrir monumento  | `E`                   | Tocar no aviso                 |
| Ir direto        | `1`–`5`               | Menu de pausa                  |
| Pausar           | `Esc` ou `P`          | Botão de pausa                 |

As pontes mais distantes têm vãos para saltar e cristais pendurados sobre eles. Cair no vazio
devolve você à última plataforma, sem punição. Quem não quiser jogar pode ir direto a um
monumento ou ler qualquer seção pelo menu de pausa.

As regras (mapa, movimento, pulo, coleta, portal) ficam em
[`src/game3d/`](src/game3d/) sem depender do three.js, e um teste percorre o mundo inteiro
com um robô para garantir que tudo é alcançável.

## Partículas

As esculturas são funções puras em
[`src/components/particles/shapes.ts`](src/components/particles/shapes.ts) e a transição
entre elas acontece inteira no vertex shader. Elas aparecem em dois lugares: como monumentos
no mundo 3D e como fundo da landing page, onde mudam de forma a cada seção (galáxia, hélice,
palco, átomo, avião de papel) e reagem ao cursor.

## Responsividade

As três experiências se adaptam a celular, tablet e desktop, em pé ou deitado:

- **Landing:** uma coluna no celular; a galeria de projetos vira um carrossel de deslizar.
- **Mundo 3D:** no celular, direcional e botões na tela, em pé ou deitado, com campo de visão
  mais aberto em telas altas; no desktop, mouse e teclado.
- **Jogo 2D:** a cena mostra de 16 a 25 blocos de largura conforme o formato da tela, então
  no celular em pé os pixels continuam grandes, com os botões numa faixa própria.

## Documentação

- [Auditoria](docs/AUDITORIA.md): o que foi encontrado e corrigido na versão 2.0
- [Plano de ação](docs/PLANO-DE-ACAO.md): o que foi entregue em cada branch e os próximos passos

## Autor

[Jonas Esteves](https://github.com/JonasEstevess) — estudante de Engenharia de Software na FIAP.
