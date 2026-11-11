# Portfólio — Jonas Esteves

O mesmo portfólio em três formatos. O visitante escolhe como quer conhecer o trabalho:

| Rota       | Experiência      | O que é                                                                                   |
| ---------- | ---------------- | ----------------------------------------------------------------------------------------- |
| `/`        | **Hub**          | Tela de escolha entre as três experiências.                                               |
| `/landing` | **Landing page** | Página de rolagem com tipografia grande, galeria horizontal de projetos e índice completo. |
| `/3d`      | **Universo 3D**  | Milhares de partículas que se reorganizam em uma escultura para cada seção do portfólio.   |
| `/2d`      | **Jogo 2D**      | Plataforma em pixel art: colete commits, corrija bugs e abra os terminais.                 |

No ar em **https://portifolio-jonas-seven.vercel.app**

## Tecnologias

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** para estilos e **Framer Motion** para animações
- **Three.js** com shader próprio no universo 3D (carregado só em `/3d`)
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
| `npm test`          | Testes (jogo, formas 3D e dados)        |

## Estrutura

```
src/
├── data/                  Conteúdo: projetos, formação, skills, contato, seções
├── pages/                 Uma página por rota (Hub, Index, Scene3DPage, Game2DPage)
├── components/
│   ├── portfolio/         Seções e efeitos da landing page
│   ├── scene3d/           Universo 3D: shapes.ts gera as formas, ParticleStage.ts é o WebGL, Scene3D.tsx a interface
│   ├── game2d/            Interface do jogo (canvas, HUD, menus, controles de toque)
│   └── shared/            Painéis e diálogo usados pelo 3D e pelo 2D
├── game2d/                Motor do jogo, sem React: fase, física, simulação, render, áudio
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

## Universo 3D

Um único sistema de partículas (46 mil pontos no desktop, 22 mil no celular) que se desfaz e
se recompõe a cada capítulo:

| Capítulo  | Forma                                                       |
| --------- | ----------------------------------------------------------- |
| Abertura  | Galáxia espiral                                             |
| Sobre     | Retrato em relevo, gerado a partir dos pixels da foto       |
| Formação  | Dupla hélice com um marco para cada etapa                   |
| Skills    | Átomo com três órbitas                                      |
| Projetos  | Palco com um carrossel 3D dos screenshots                   |
| Contato   | Avião de papel                                              |

Navegue com a roda do mouse, as setas, `1`–`5` ou deslizando o dedo. O cursor afasta as
partículas e um clique dispara uma onda. No capítulo de projetos, `←` `→` ou um arrasto
lateral giram o carrossel. As formas são funções puras em
[`src/components/scene3d/shapes.ts`](src/components/scene3d/shapes.ts) e a transição entre
elas acontece inteira no vertex shader.

## Responsividade

As três experiências se adaptam a celular, tablet e desktop, em pé ou deitado:

- **Landing:** uma coluna no celular; a galeria de projetos vira um carrossel de deslizar.
- **Universo 3D:** texto ao lado da escultura em telas largas e abaixo dela em telas altas;
  a tipografia escala pelo menor lado da tela.
- **Jogo 2D:** a cena mostra de 16 a 25 blocos de largura conforme o formato da tela, então
  no celular em pé os pixels continuam grandes, com os botões numa faixa própria.

## Documentação

- [Auditoria](docs/AUDITORIA.md): o que foi encontrado e corrigido na versão 2.0
- [Plano de ação](docs/PLANO-DE-ACAO.md): o que foi entregue em cada branch e os próximos passos

## Autor

[Jonas Esteves](https://github.com/JonasEstevess) — estudante de Engenharia de Software na FIAP.
