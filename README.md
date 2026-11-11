# Portfólio — Jonas Esteves

O mesmo portfólio em três formatos. O visitante escolhe como quer conhecer o trabalho:

| Rota       | Experiência      | O que é                                                                                   |
| ---------- | ---------------- | ----------------------------------------------------------------------------------------- |
| `/`        | **Hub**          | Tela de escolha entre as três experiências.                                               |
| `/landing` | **Landing page** | Página de rolagem com tipografia grande, galeria horizontal de projetos e índice completo. |
| `/3d`      | **Mundo 3D**     | Parque em primeira pessoa com cinco pavilhões, um por seção do portfólio.                  |
| `/2d`      | **Jogo 2D**      | Plataforma em pixel art: colete commits, corrija bugs e abra os terminais.                 |

No ar em **https://portifolio-jonas-seven.vercel.app**

## Tecnologias

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** para estilos e **Framer Motion** para animações
- **Three.js** no mundo 3D (carregado só em `/3d`)
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
| `npm test`          | Testes (motor do jogo, fase e dados)    |

## Estrutura

```
src/
├── data/                  Conteúdo: projetos, formação, skills, contato, seções
├── pages/                 Uma página por rota (Hub, Index, Scene3DPage, Game2DPage)
├── components/
│   ├── portfolio/         Seções e efeitos da landing page
│   ├── scene3d/           Mundo 3D: world.ts monta a cena, Scene3D.tsx é o motor e o HUD
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

## Mundo 3D

`W A S D` para andar, `Shift` para correr, `Espaço` para pular, `E` para abrir o pavilhão e
`1`–`5` para ir direto a um deles. `Esc` pausa. Em celulares há direcional na tela e a câmera
gira arrastando o dedo.

## Documentação

- [Auditoria](docs/AUDITORIA.md): o que foi encontrado e corrigido na versão 2.0
- [Plano de ação](docs/PLANO-DE-ACAO.md): o que foi entregue em cada branch e os próximos passos

## Autor

[Jonas Esteves](https://github.com/JonasEstevess) — estudante de Engenharia de Software na FIAP.
