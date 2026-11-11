import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { projects, slugify } from "./projects";
import { SECTIONS, hexToNumber, sectionById } from "./sections";
import { relatedProjectsFor, techStack } from "./techStack";

describe("projects", () => {
  it("have unique titles and valid links", () => {
    const titles = projects.map((p) => p.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const p of projects) {
      expect(p.repoUrl).toMatch(/^https:\/\//);
      if (p.liveUrl) expect(p.liveUrl).toMatch(/^https:\/\//);
      expect(p.tags.length).toBeGreaterThan(0);
    }
  });

  it("only point at screenshots that exist, named after the title slug", () => {
    for (const p of projects) {
      if (!p.image) continue;
      expect(p.image).toBe(`/projects/${slugify(p.title)}.webp`);
      expect(existsSync(resolve(process.cwd(), "public", p.image.slice(1)))).toBe(true);
    }
  });

  it("slugifies accents, symbols and spaces", () => {
    expect(slugify("TCC — Cubo Multissensorial")).toBe("tcc-cubo-multissensorial");
    expect(slugify("Jogo do Número Secreto")).toBe("jogo-do-numero-secreto");
    expect(slugify("  Olá, Mundo!  ")).toBe("ola-mundo");
  });
});

describe("tech stack", () => {
  it("derives related projects from real project tags", () => {
    const react = techStack.find((t) => t.name === "React")!;
    const related = relatedProjectsFor(react);
    expect(related.length).toBeGreaterThan(0);
    for (const title of related) {
      expect(projects.find((p) => p.title === title)!.tags).toContain("React");
    }
  });

  it("returns nothing for skills without matching tags", () => {
    const git = techStack.find((t) => t.name === "Git")!;
    expect(relatedProjectsFor(git)).toEqual([]);
  });
});

describe("sections", () => {
  it("are unique and resolvable by id", () => {
    expect(new Set(SECTIONS.map((s) => s.id)).size).toBe(SECTIONS.length);
    for (const s of SECTIONS) {
      expect(sectionById(s.id)).toBe(s);
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("converts hex colours to numbers for three.js", () => {
    expect(hexToNumber("#6e63f0")).toBe(0x6e63f0);
  });
});
