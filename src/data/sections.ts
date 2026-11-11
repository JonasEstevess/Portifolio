/**
 * The five portfolio sections every experience (landing, 3D world, 2D game)
 * exposes. Keeping ids, names and colours here means the three experiences
 * always agree on what exists and how it is labelled.
 */
export type SectionId = "about" | "forma" | "skills" | "projects" | "contact";

export type SectionMeta = {
  id: SectionId;
  name: string;
  /** Short label used where space is tight (HUDs, minimaps). */
  short: string;
  /** Accent colour as a CSS hex string. */
  color: string;
};

export const SECTIONS: SectionMeta[] = [
  { id: "about", name: "Sobre Mim", short: "Sobre", color: "#6e63f0" },
  { id: "forma", name: "Formação & Certificações", short: "Formação", color: "#8b7cf6" },
  { id: "skills", name: "Skills", short: "Skills", color: "#46c2e3" },
  { id: "projects", name: "Projetos", short: "Projetos", color: "#f5a742" },
  { id: "contact", name: "Contato", short: "Contato", color: "#f2568c" },
];

export const sectionById = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;

export const hexToNumber = (hex: string) => parseInt(hex.replace("#", ""), 16);
