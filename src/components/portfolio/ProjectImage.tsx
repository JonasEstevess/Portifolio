import { useEffect, useState } from "react";
import type { Project } from "@/data/projects";

const initialsOf = (title: string) =>
  title
    .split(" ")
    .filter((w) => !["—", "-", "de", "do", "da"].includes(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

/**
 * Project screenshot, or a typographic initials watermark when the project
 * has no `image` (or it fails to load). The path comes straight from the data
 * file, so the browser never probes for files that are not there.
 */
export const ProjectImage = ({
  project,
  className = "",
  eager = false,
}: {
  project: Project;
  className?: string;
  eager?: boolean;
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [project.image]);

  const showImage = project.image && !failed;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${project.accent} ${className}`}>
      <div className="absolute inset-0 grid-bg opacity-30" aria-hidden />
      {showImage ? (
        <img
          src={project.image}
          alt={`Tela do projeto ${project.title}`}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-left-top"
        />
      ) : (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center font-display font-semibold tracking-tight text-[5rem] md:text-[7rem] text-foreground/10 select-none"
        >
          {initialsOf(project.title)}
        </span>
      )}
    </div>
  );
};
