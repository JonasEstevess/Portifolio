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
