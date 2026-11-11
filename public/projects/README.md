# Imagens dos projetos

Cada screenshot fica aqui em **WebP**, com no máximo 1280 px de largura, e é
referenciado pelo campo `image` do projeto em `src/data/projects.ts`:

```ts
{
  title: "Passa a Bola",
  image: "/projects/passa-a-bola.webp",
  // ...
}
```

Para adicionar a imagem de um projeto:

1. Exporte o print em WebP (qualidade ~80, até 1280 px de largura).
2. Salve nesta pasta usando o slug do título (`slugify` em `projects.ts`).
3. Preencha o campo `image` do projeto.

Projetos sem `image` mostram as iniciais do título como marca d'água.
Ainda sem screenshot: Screen Match Movies, GameStore e Auto Escola.
