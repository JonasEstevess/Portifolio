import { GraduationCap, Award, Languages, type LucideIcon } from "lucide-react";

export type Formation = {
  icon: LucideIcon;
  title: string;
  place: string;
  period: string;
  status: string;
};

export const formations: Formation[] = [
  {
    icon: GraduationCap,
    title: "Engenharia de Software",
    place: "FIAP — Paulista",
    period: "02/2025 – 11/2029",
    status: "Cursando 4º semestre",
  },
  {
    icon: Award,
    title: "Técnico em Informática",
    place: "UNASP — São Paulo",
    period: "01/2021 – 12/2024",
    status: "Concluído • TCC premiado",
  },
  {
    icon: Languages,
    title: "Inglês C1 — Avançado",
    place: "Wizard & IW",
    period: "Certificação",
    status: "Fluência profissional",
  },
];

export const stats = [
  { value: "4º", label: "Semestre de Engenharia" },
  { value: "2º lugar", label: "TCC entre 25+ projetos" },
  { value: "C1", label: "Inglês avançado" },
];

export const aboutParagraphs = {
  dev: "Já adquiri habilidades em Python, SQL, desenvolvimento de web, manipulação de Inteligência artificial, trabalho em equipe e metodologias ágeis. Tenho inglês avançado com certificações pela Wizard e IW.",
  estudante:
    "Me formei em Tecnologia da Informação integrado ao ensino médio pela UNASP em 2024, onde meu TCC ficou em 2º lugar entre mais de 25 projetos. Em 2025 passei na seletiva do curso de Engenharia de Software na FIAP e hoje estou no quarto semestre.",
  criador:
    "Busco oportunidades na área de tecnologia para desenvolver minhas aptidões — colocando em prática o que aprendo através de projetos reais e experimentações.",
};
