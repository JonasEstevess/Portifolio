import { useEffect, useState } from "react";
import { slugify, type Project } from "@/data/projects";

const initialsOf = (title: string) =>
  title
    .split(" ")
    .filter((w) => !["—", "-", "de", "do", "da"].includes(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

/**
 * Tries to load /projects/<slug>.{jpg,jpeg,png,webp}. Falls back to a
 * typographic initials watermark when no screenshot has been added yet.
 * Drop matching files into public/projects/ to light these up automatically.
 */
export const ProjectImage = ({ project, className = "" }: { project: Project; className?: string }) => {
  const slug = slugify(project.title);
  const extensions = ["jpg", "jpeg", "png", "webp"];
  const [extIndex, setExtIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setExtIndex(0);
    setFailed(false);
  }, [slug]);

  const handleError = () => {
    if (extIndex < extensions.length - 1) {
      setExtIndex((i) => i + 1);
    } else {
      setFailed(true);
    }
  };

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${project.accent} ${className}`}>
      <div className="absolute inset-0 grid-bg opacity-30" />
      {!failed && (
        <img
          key={extensions[extIndex]}
          src={`/projects/${slug}.${extensions[extIndex]}`}
          alt={project.title}
          loading="lazy"
          onError={handleError}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {failed && (
        <span className="absolute inset-0 flex items-center justify-center font-display font-semibold tracking-tight text-[6rem] md:text-[8rem] text-foreground/10 select-none">
          {initialsOf(project.title)}
        </span>
      )}
    </div>
  );
};
