import { projects } from "./projects";

const devicon = (name: string, variant = "original") =>
  `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${name}/${name}-${variant}.svg`;

export type TechItem = {
  name: string;
  category: string;
  /** icon URL; absent for the one item rendered with a lucide icon instead (see isAiTool) */
  src?: string;
  /** true for the single entry that renders a Sparkles icon instead of a devicon image */
  isAiTool?: boolean;
  /** exact tag strings (as used in projects.ts) that count as this tech */
  matchTags: string[];
};

export const techStack: TechItem[] = [
  { name: "JavaScript", category: "Linguagem", src: devicon("javascript"), matchTags: ["JavaScript"] },
  { name: "Python", category: "Linguagem", src: devicon("python"), matchTags: ["Python"] },
  { name: "Uso e Manipulação de IA", category: "Ferramenta", isAiTool: true, matchTags: [] },
  { name: "React", category: "Biblioteca Front-end", src: devicon("react"), matchTags: ["React"] },
  { name: "Java", category: "Linguagem", src: devicon("java"), matchTags: ["Java"] },
  { name: ".NET", category: "Framework", src: devicon("dot-net"), matchTags: [] },
  { name: "HTML", category: "Marcação", src: devicon("html5"), matchTags: ["HTML", "HTML/CSS"] },
  { name: "CSS", category: "Estilização", src: devicon("css3"), matchTags: ["CSS", "HTML/CSS"] },
  { name: "Git", category: "Versionamento", src: devicon("git"), matchTags: [] },
  { name: "Tailwind", category: "Estilização", src: devicon("tailwindcss"), matchTags: ["Tailwind"] },
  { name: "C++", category: "Linguagem", src: devicon("cplusplus"), matchTags: ["C++"] },
  { name: "Modelagem 3D", category: "Ferramenta", src: devicon("blender"), matchTags: [] },
];

/** Projects that reference this tech, derived from the real project tags — never hand-typed. */
export const relatedProjectsFor = (skill: TechItem) => {
  if (skill.matchTags.length === 0) return [];
  return projects
    .filter((p) => p.tags.some((tag) => skill.matchTags.includes(tag)))
    .map((p) => p.title);
};

export const softSkills = [
  "Comunicação",
  "Solução de problemas",
  "Trabalho em equipe",
  "Aprendizado contínuo",
  "Organização",
  "Resiliência",
  "Proatividade",
  "Gestão de tempo",
];
