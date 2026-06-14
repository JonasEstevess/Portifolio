export type Project = {
  title: string;
  period?: string;
  description: string;
  extra?: string;
  tags: string[];
  badge?: string;
  liveUrl?: string;
  liveLabel?: string;
  repoUrl: string;
  accent: string;
};

/**
 * Deterministic slug used to look up an optional screenshot at
 * `/public/projects/<slug>.jpg`. Drop a matching image in that folder and the
 * showcase picks it up automatically — no code changes needed.
 */
export const slugify = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const projects: Project[] = [
  {
    title: "Super Mario Galaxy",
    description:
      "Landing page inspirada no universo de Super Mario Galaxy, desenvolvida com foco em experiência visual imersiva, animações modernas e design responsivo. O projeto apresenta personagens icônicos, vídeos interativos e efeitos espaciais que recriam a atmosfera do jogo da Nintendo de forma dinâmica e envolvente.",
    extra:
      "Além da interface visual, o projeto conta com animações em scroll, transições suaves, organização profissional de código e otimização de performance, proporcionando uma navegação fluida tanto em desktop quanto em dispositivos móveis.",
    tags: ["HTML", "CSS", "JavaScript", "Responsividade", "UI/UX", "Animações", "Front-end"],
    badge: "Experiência visual inspirada em games",
    liveUrl: "https://super-mario-galaxymovie.vercel.app/",
    liveLabel: "Visualizar projeto",
    repoUrl: "https://github.com/JonasEstevess/SuperMarioGalaxy.git",
    accent: "from-blue-500/20 to-indigo-500/20",
  },
  {
    title: "TCC — Cubo Multissensorial",
    period: "jan 2024 – out 2024 • UNASP",
    description:
      "Trabalho de Conclusão de Curso desenvolvido no UNASP. O Cubo Multissensorial é um brinquedo comunicador em formato de cubo, criado para apoiar o desenvolvimento pessoal e auxiliar pessoas com transtornos mentais. O dispositivo utiliza Arduino e integra luzes, sons e interações táteis, proporcionando uma experiência sensorial com fins educativos e terapêuticos.",
    extra:
      "Além do hardware, foi desenvolvido um site de apresentação do projeto — com objetivos, impacto social e documentação técnica — incluindo integração com banco de dados e estruturação completa das páginas web.",
    tags: ["C++", "Arduino", "IoT", "Hardware", "React", "HTML/CSS", "Banco de Dados"],
    badge: "2º lugar entre 25+ projetos",
    liveUrl: "https://tcc-react-eosin.vercel.app/",
    liveLabel: "Site do projeto",
    repoUrl: "https://github.com/JonasEstevess",
    accent: "from-indigo-500/20 to-purple-500/20",
  },
  {
    title: "Passa a Bola",
    description:
      "Plataforma dedicada ao futebol feminino, com foco em divulgar atletas, times e conteúdos do universo da modalidade. Projeto desenvolvido em equipe com layout responsivo e navegação fluida.",
    tags: ["React", "JavaScript", "HTML/CSS", "Tailwind"],
    badge: "15º lugar entre 100+ projetos",
    liveUrl: "https://passa-a-bola-one.vercel.app/",
    liveLabel: "Ver site",
    repoUrl: "https://github.com/Augusto-Valerio/Passa-a-Bola",
    accent: "from-pink-500/20 to-rose-500/20",
  },
  {
    title: "Clone Airbnb",
    description:
      "Clone da interface do Airbnb desenvolvido como exercício de front-end, replicando layout, componentes e responsividade do site original.",
    tags: ["React", "JavaScript", "HTML/CSS"],
    liveUrl: "https://airbnb-clone-cp4.vercel.app/",
    liveLabel: "Ver site",
    repoUrl: "https://github.com/Augusto-Valerio/Airbnb-Clone",
    accent: "from-rose-500/20 to-red-500/20",
  },
  {
    title: "Jogo do Número Secreto",
    description:
      "Jogo interativo onde o usuário tenta adivinhar um número secreto sorteado pelo sistema. Projeto focado em lógica de programação e manipulação do DOM.",
    tags: ["JavaScript", "HTML", "CSS"],
    liveUrl: "https://secret-number.vercel.app/",
    liveLabel: "Ver site",
    repoUrl: "https://github.com/JonasEstevess/Jogo-do-n-secreto",
    accent: "from-fuchsia-500/20 to-pink-500/20",
  },
  {
    title: "CodeDaily — Desafios Diários",
    description:
      "Plataforma interativa para programadores em formação, com cadastro e login de usuários, perguntas diárias gerenciadas por administradores, sistema de pontuação por acertos e ranking competitivo. Promove o aprendizado contínuo através de desafios renovados todos os dias.",
    tags: ["Python", "JSON", "CLI", "Autenticação"],
    repoUrl: "https://github.com/JonasEstevess/Sistema-desafios",
    accent: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Screen Match Movies",
    description:
      "Aplicação Java focada em prática de fundamentos da linguagem através de um sistema simples de filmes: cadastro de informações, cálculo de média de avaliações, classificação por nota e leitura de dados pelo terminal usando estruturas condicionais e laços de repetição.",
    tags: ["Java", "POO", "IntelliJ IDEA"],
    repoUrl: "https://github.com/JonasEstevess/screen-match-movies",
    accent: "from-orange-500/20 to-red-500/20",
  },
  {
    title: "Cadastro de Jogadoras — CRUD",
    description:
      "Aplicação CRUD completa para cadastro, edição, listagem e remoção de jogadoras. Projeto focado em manipulação de dados no front-end e lógica de programação.",
    tags: ["JavaScript", "HTML", "CSS", "CRUD"],
    liveUrl: "https://augusto-valerio.github.io/Cadastro-jogadoras-CRUD/",
    liveLabel: "Ver site",
    repoUrl: "https://github.com/Augusto-Valerio/Cadastro-jogadoras-CRUD",
    accent: "from-emerald-500/20 to-teal-500/20",
  },
  {
    title: "GameStore — Catálogo de Produtos",
    description:
      "Catálogo de produtos no formato de loja de games, com layout moderno e organização por categorias. Projeto focado em estrutura HTML semântica e estilização avançada com CSS.",
    tags: ["HTML", "CSS", "JavaScript"],
    liveUrl: "https://augusto-valerio.github.io/GameStore-Catalogo-de-produtos/",
    liveLabel: "Ver site",
    repoUrl: "https://github.com/Augusto-Valerio/GameStore-Catalogo-de-produtos",
    accent: "from-violet-500/20 to-purple-500/20",
  },
  {
    title: "Auto Escola",
    description:
      "Sistema voltado à gestão de auto escola, com foco em organização de informações e interface intuitiva para usuários e administradores.",
    tags: ["JavaScript", "HTML", "CSS"],
    repoUrl: "https://github.com/Augusto-Valerio/projeto-AutoEscola",
    accent: "from-amber-500/20 to-orange-500/20",
  },
  {
    title: "Carros",
    description:
      "Projeto web de exibição e catálogo de carros, com foco em layout responsivo, organização de cards e prática de componentização.",
    tags: ["React", "JavaScript", "HTML/CSS"],
    liveUrl: "https://carros--jonasesteves31ati.vercel.app/",
    liveLabel: "Ver site",
    repoUrl: "https://github.com/JonasEstevess/carros",
    accent: "from-cyan-500/20 to-blue-500/20",
  },
  {
    title: "Photo Portfolio",
    description:
      "Portfólio fotográfico desenvolvido em equipe, com galeria responsiva e layout pensado para destacar as imagens com elegância e fluidez.",
    tags: ["HTML", "CSS", "JavaScript"],
    liveUrl: "https://marirsil.github.io/Photo_portfolio/",
    liveLabel: "Ver site",
    repoUrl: "https://github.com/Marirsil/Photo_portfolio",
    accent: "from-sky-500/20 to-blue-500/20",
  },
];
