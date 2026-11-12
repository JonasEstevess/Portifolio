# Plano de ação

Derivado da [auditoria](AUDITORIA.md). A primeira parte lista o que a versão 2.0 entregou e
em qual branch; a segunda, o que ainda vale fazer, em ordem de retorno.

## Entregue na versão 2.0

| # | Ação                                                                             | Branch                  |
| - | -------------------------------------------------------------------------------- | ----------------------- |
| 1 | Remoção dos componentes shadcn/ui e de 43 dependências sem uso                    | `feature/ui-components` |
| 2 | Seções e painéis compartilhados, hooks, primitivas de animação, rotas sob demanda, estilos globais e metadados do HTML | `feature/utilities` |
| 3 | Navbar em português com seção ativa, barra de progresso e menu mobile acessível   | `feature/navbar`        |
| 4 | Hero com parallax, barra de status e digitação que pode ser pulada                | `feature/hero`          |
| 5 | Sobre com abas acessíveis, frase animada pelo scroll e letreiro                   | `feature/about`         |
| 6 | Screenshots em WebP, galeria horizontal fixada e índice completo dos projetos     | `feature/projects`      |
| 7 | Skills com seleção por teclado e soft skills em letreiro                          | `feature/skills`        |
| 8 | Contato com `mailto`, botão de copiar e rodapé com as três experiências           | `feature/contact`       |
| 9 | Mundo 3D: pavilhões, sombras, montanhas, corrida, pulo, pausa, viagem rápida e minimapa | `feature/scene3d` |
| 10 | Jogo 2D completo: motor, fase, sprites, áudio, HUD, toque e testes               | `feature/game2d` (nova) |
| 11 | Hub com as três experiências e página 404                                        | `feature/hub-page`      |
| 12 | Rewrite de SPA no Vercel, sitemap, imagem de compartilhamento, testes de dados, identidade do pacote, auditoria, plano e README | `feature/final-setup` |

As branches são empilhadas nessa ordem: cada uma parte da anterior, então a última
(`feature/final-setup`) contém tudo e é a que vai no Pull Request para a `main`.
As branches `feature/contact-buttons`, `feature/hero-buttons` e `feature/navbar-logo` não
receberam commits: tudo o que caberia nelas já está coberto por `contact`, `hero` e `navbar`.

## Entregue na versão 2.1

| Ação                                                                                              | Branch            |
| ------------------------------------------------------------------------------------------------- | ----------------- |
| 3D refeito do zero: universo de partículas com shader, retrato em nuvem de pontos e carrossel 3D   | `feature/scene3d` |
| Jogo 2D responsivo: largura da cena adaptável, menus em tela cheia e botões de toque maiores       | `feature/game2d`  |
| Nome do rodapé dimensionado pela largura da tela (era cortado no celular)                          | `feature/contact` |

O parque em primeira pessoa da versão 2.0 foi substituído. Ele exigia teclado e mouse,
bloqueava o celular em pé e escondia o conteúdo atrás de uma caminhada; o novo formato
funciona com um dedo em qualquer tela.

## Entregue na versão 3.0

| Ação                                                                                                   | Branch              |
| ------------------------------------------------------------------------------------------------------ | ------------------- |
| 3D refeito como jogo em primeira pessoa: ilhas flutuantes, pontes com vãos, cristais, monumentos e portal | `feature/scene3d`   |
| Esculturas de partículas movidas para um módulo compartilhado                                             | `feature/scene3d`   |
| Fundo de partículas na landing, que muda de forma a cada seção                                            | `feature/about`     |
| Hub e rodapé descrevendo o novo mundo 3D                                                                  | `feature/hub-page`  |

A versão 2.1 (escultura de partículas em tela cheia, navegada por rolagem) durou um dia: o
pedido era um jogo em que se anda. As partículas ficaram, agora como monumentos dentro do
mundo e como fundo da landing.

## Próximos passos

### Prioridade alta

1. **Screenshots que faltam.** Screen Match Movies, GameStore e Auto Escola ainda mostram
   só as iniciais. Basta salvar o WebP em `public/projects/` e preencher `image`.
2. **Repositório do TCC.** O botão "Código" do Cubo Multissensorial aponta para o perfil do
   GitHub, não para um repositório.
3. **Integração contínua.** Um workflow do GitHub Actions rodando `npm run lint`,
   `npm test` e `npm run build` em cada Pull Request.
4. **Medir no ar.** Rodar o Lighthouse na URL de preview do Vercel (desktop e mobile) e
   registrar os números aqui; os valores da auditoria são de build local.

### Prioridade média

5. **Fontes hospedadas no próprio site** (`@fontsource`), para não depender do Google Fonts
   e eliminar a troca de fonte no carregamento.
6. **Foto do Hero em WebP/AVIF** com `srcset`; hoje é um JPEG único de 76 kB.
7. **Mais fases no jogo 2D.** A fase é montada a partir de blocos em ASCII em
   `src/game2d/level.ts`; plataformas móveis e um chefe "bug crítico" cabem no motor atual.
8. **Versão em inglês.** Os textos já estão centralizados em `src/data/`.
9. **Estudos de caso.** Uma página por projeto em destaque, com problema, decisão e resultado.

### Prioridade baixa

10. Trilha sonora opcional no jogo e no 3D (hoje só há efeitos sintetizados no jogo), e
    partículas reagindo ao som.
11. Controle por gamepad no jogo 2D.
12. Testes de ponta a ponta com Playwright cobrindo as três rotas.
13. Atualizar React Router para a v7 (as flags de compatibilidade já estão ligadas).
14. Apagar no GitHub as branches já incorporadas, depois do merge do Pull Request.

## Como verificar

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run build
```
