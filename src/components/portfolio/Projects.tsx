import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ArrowUpRight, ArrowLeft, ArrowRight, Code2, LayoutGrid, Rows3 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { projects } from "@/data/projects";
import { ProjectImage } from "./ProjectImage";

type ViewMode = "showcase" | "all";

export const Projects = () => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("showcase");
  const sectionRef = useRef<HTMLDivElement>(null);
  const project = projects[index];

  const goTo = useCallback(
    (next: number) => {
      setDirection(next > index ? 1 : -1);
      setIndex((next + projects.length) % projects.length);
    },
    [index]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  const openInShowcase = (i: number) => {
    setDirection(i > index ? 1 : -1);
    setIndex(i);
    setViewMode("showcase");
  };

  // Keyboard navigation, active only while the section is in view and in showcase mode.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let inView = false;
    const observer = new IntersectionObserver(([entry]) => (inView = entry.isIntersecting), {
      threshold: 0.4,
    });
    observer.observe(el);

    const onKey = (e: KeyboardEvent) => {
      if (!inView || viewMode !== "showcase") return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [next, prev, viewMode]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -80) next();
    else if (info.offset.x > 80) prev();
  };

  return (
    <section id="projects" ref={sectionRef} className="py-32 relative overflow-hidden">
      <div className="container max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14 flex items-end justify-between flex-wrap gap-4"
        >
          <div>
            <span className="label-sm text-muted-foreground">Trabalhos selecionados</span>
            <h2 className="display-lg mt-3">
              Projetos em <span className="text-primary">destaque</span>.
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {viewMode === "showcase" && (
              <div className="flex items-center gap-1.5">
                {projects.map((p, i) => (
                  <button
                    key={p.title}
                    onClick={() => openInShowcase(i)}
                    aria-label={`Ir para ${p.title}`}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === index ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground"
                    }`}
                  />
                ))}
              </div>
            )}
            <button
              onClick={() => setViewMode(viewMode === "showcase" ? "all" : "showcase")}
              data-cursor=""
              className="inline-flex items-center gap-2 px-4 py-2 border border-border text-xs font-medium tracking-wide text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              {viewMode === "showcase" ? (
                <>
                  <LayoutGrid className="w-3.5 h-3.5" /> Ver todos ({projects.length})
                </>
              ) : (
                <>
                  <Rows3 className="w-3.5 h-3.5" /> Voltar ao showcase
                </>
              )}
            </button>
          </div>
        </motion.div>

        {viewMode === "showcase" ? (
          <>
            <div className="relative min-h-[560px] md:min-h-[460px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.article
                  key={project.title}
                  custom={direction}
                  drag="x"
                  dragConstraints={{ left: -120, right: 120 }}
                  dragElastic={0.6}
                  onDragEnd={onDragEnd}
                  initial={{ opacity: 0, x: direction * 60, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: direction * -60, filter: "blur(10px)" }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  data-cursor="DRAG"
                  className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-8 md:gap-12 items-start cursor-grab active:cursor-grabbing touch-pan-y"
                >
                  <ProjectImage
                    project={project}
                    className="aspect-[4/3] md:aspect-square w-full border border-border"
                  />
                  <div className="relative">
                    <span className="absolute -top-9 left-0 label-sm text-muted-foreground tabular-nums md:hidden">
                      {String(index + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
                    </span>
                    {project.badge && (
                      <span className="label-sm inline-block px-3 py-1 border border-primary/30 text-primary mb-4">
                        {project.badge}
                      </span>
                    )}
                    <h3 className="font-display text-3xl md:text-4xl font-semibold mb-2">{project.title}</h3>
                    {project.period && (
                      <p className="text-xs text-muted-foreground/80 font-mono mb-4">{project.period}</p>
                    )}
                    <p className="text-muted-foreground mb-3 leading-relaxed">{project.description}</p>
                    {project.extra && (
                      <p className="text-muted-foreground mb-5 leading-relaxed">{project.extra}</p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-7">
                      {project.tags.map((tag) => (
                        <span key={tag} className="text-xs px-3 py-1 border border-border text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      {project.liveUrl && (
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-cursor="VIEW"
                          className="group inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-sm font-medium"
                        >
                          {project.liveLabel ?? "Ver projeto"}
                          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </a>
                      )}
                      <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Código fonte"
                        data-cursor="CODE"
                        className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                      >
                        <Code2 className="w-4 h-4" />
                        Código
                      </a>
                    </div>
                  </div>
                </motion.article>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
              <button
                onClick={prev}
                data-cursor=""
                className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Anterior
              </button>
              <span className="label-sm text-muted-foreground tabular-nums">
                {String(index + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
              </span>
              <button
                onClick={next}
                data-cursor=""
                className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Próximo
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {projects.map((p, i) => (
              <button
                key={p.title}
                onClick={() => openInShowcase(i)}
                data-cursor="VIEW"
                className="group text-left border border-border hover:border-primary/40 transition-all overflow-hidden"
              >
                <ProjectImage project={p} className="aspect-video w-full" />
                <div className="p-4">
                  <span className="label-sm text-muted-foreground tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-lg font-semibold mt-1 mb-2 group-hover:text-primary transition-colors">
                    {p.title}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {p.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 border border-border text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};
