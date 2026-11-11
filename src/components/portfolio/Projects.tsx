import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowDown, ArrowUpRight, Code2, Plus } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent } from "react";
import { projects, type Project } from "@/data/projects";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { ProjectImage } from "./ProjectImage";
import { FadeUp, RevealWords, SectionLabel } from "./Reveal";

/** The first projects in the data file get the big gallery treatment. */
const FEATURED_COUNT = 6;
const featured = projects.slice(0, FEATURED_COUNT);

const pad = (n: number) => String(n).padStart(2, "0");

const ProjectLinks = ({ project, size = "md" }: { project: Project; size?: "sm" | "md" }) => {
  const box = size === "md" ? "px-5 py-2.5 text-sm" : "px-4 py-2 text-xs";
  return (
    <div className="flex flex-wrap items-center gap-3">
      {project.liveUrl && (
        <a
          href={project.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-cursor="ABRIR"
          className={`group inline-flex items-center gap-2 bg-foreground text-background font-medium ${box}`}
        >
          {project.liveLabel ?? "Ver projeto"}
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      )}
      <a
        href={project.repoUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Código-fonte de ${project.title}`}
        data-cursor="CODE"
        className={`inline-flex items-center gap-2 border border-border font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all ${box}`}
      >
        <Code2 className="w-4 h-4" />
        Código
      </a>
    </div>
  );
};

const FeaturedCard = ({ project, index }: { project: Project; index: number }) => (
  <article
    data-card
    className="group shrink-0 snap-start w-[86vw] sm:w-[70vw] lg:w-[min(46vw,calc((100vh_-_25rem)*1.78))] lg:min-w-[420px] max-w-[920px] flex flex-col"
    aria-label={project.title}
  >
    <div className="relative overflow-hidden border border-border">
      <ProjectImage
        project={project}
        eager={index === 0}
        className="aspect-[16/9] w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      />
      {project.badge && (
        <span className="absolute top-3 left-3 label-sm px-3 py-1.5 bg-background/85 backdrop-blur-sm border border-primary/40 text-foreground">
          {project.badge}
        </span>
      )}
    </div>
    <div className="grid grid-cols-[auto_1fr] gap-x-5 md:gap-x-8 mt-5">
      <span className="font-display text-5xl md:text-7xl font-semibold text-outline tabular-nums leading-none" aria-hidden>
        {pad(index + 1)}
      </span>
      <div>
        <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mb-2">{project.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 max-w-xl mb-4">
          {project.description}
        </p>
        <ul className="flex flex-wrap gap-1.5 mb-5" aria-label="Tecnologias">
          {project.tags.slice(0, 5).map((tag) => (
            <li key={tag} className="text-[11px] px-2.5 py-1 border border-border text-muted-foreground">
              {tag}
            </li>
          ))}
        </ul>
        <ProjectLinks project={project} />
      </div>
    </div>
  </article>
);

/**
 * Horizontal gallery. On desktop the section pins to the screen and vertical
 * scrolling drives the cards sideways; on touch devices, small screens and
 * with reduced motion it is a normal swipeable, snapping carousel.
 */
const FeaturedGallery = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [pinned, setPinned] = useState(false);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const update = () => setPinned(mq.matches && !reduced);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, [reduced]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!pinned || !track) return;
    const measure = () => setDistance(Math.max(0, track.scrollWidth - window.innerWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pinned]);

  // Progress is measured by hand: the section's height depends on `distance`, which is only
  // known after layout, so a scroll range captured at mount would be stale.
  const progress = useMotionValue(0);
  useEffect(() => {
    if (!pinned) return;
    const update = () => {
      const section = sectionRef.current;
      if (!section || distance <= 0) return progress.set(0);
      progress.set(Math.min(1, Math.max(0, -section.getBoundingClientRect().top / distance)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pinned, distance, progress]);
  const x = useTransform(progress, (v) => -v * distance);
  const barScale = useTransform(progress, [0, 1], [0.04, 1]);

  // Tabbing into an off-screen card would otherwise make the browser scroll the
  // clipped container sideways. Instead, move the page to where that card is centred.
  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    if (!pinned || !sectionRef.current || !viewportRef.current) return;
    viewportRef.current.scrollLeft = 0;
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-card]");
    if (!card) return;
    const top = sectionRef.current.getBoundingClientRect().top + window.scrollY;
    const offset = Math.min(distance, Math.max(0, card.offsetLeft - 48));
    window.scrollTo({ top: top + offset });
  };

  const cards = (
    <>
      {featured.map((project, i) => (
        <FeaturedCard key={project.title} project={project} index={i} />
      ))}
      <a
        href="#project-index"
        data-card
        data-cursor="↓"
        className="group shrink-0 snap-start w-[70vw] sm:w-[40vw] lg:w-[30vw] max-w-[420px] aspect-[4/5] lg:aspect-auto lg:self-stretch border border-border hover:border-primary/60 transition-colors flex flex-col justify-between p-7"
      >
        <span className="label-sm text-muted-foreground">Tem mais</span>
        <span>
          <span className="font-display text-6xl md:text-8xl font-semibold block leading-none">
            +{projects.length - FEATURED_COUNT}
          </span>
          <span className="flex items-center gap-2 mt-4 text-sm text-foreground">
            Ver o índice completo
            <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-1" />
          </span>
        </span>
      </a>
    </>
  );

  if (!pinned) {
    return (
      <div
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory no-scrollbar px-6 scroll-px-6 pb-2"
        role="region"
        aria-label="Projetos em destaque"
        tabIndex={0}
      >
        {cards}
      </div>
    );
  }

  return (
    <div ref={sectionRef} style={{ height: `calc(100vh + ${distance}px)` }}>
      <div ref={viewportRef} onFocus={onFocus} className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center pt-20">
        <motion.div ref={trackRef} style={{ x }} className="flex gap-8 w-max px-[max(1.5rem,calc((100vw-1280px)/2+1.5rem))] will-change-transform">
          {cards}
        </motion.div>
        <div className="container mt-8" aria-hidden>
          <div className="h-px w-full bg-border">
            <motion.div className="h-px bg-primary origin-left" style={{ scaleX: barScale }} />
          </div>
        </div>
      </div>
    </div>
  );
};

/** Screenshot that trails the cursor while a row of the index is hovered. */
const HoverPreview = ({ project, x, y }: { project: Project | null; x: ReturnType<typeof useSpring>; y: ReturnType<typeof useSpring> }) => (
  <motion.div
    aria-hidden
    className="pointer-events-none fixed top-0 left-0 z-40 hidden lg:block"
    style={{ x, y, translateX: "24px", translateY: "-50%" }}
  >
    <AnimatePresence>
      {project && (
        <motion.div
          key={project.title}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.25 }}
          className="absolute w-[340px] border border-border shadow-elegant"
        >
          <ProjectImage project={project} className="aspect-[16/10] w-full" />
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

const ProjectIndex = () => {
  const [open, setOpen] = useState<string | null>(null);
  const [hovered, setHovered] = useState<Project | null>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 28 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 28 });

  const onMove = (e: MouseEvent) => {
    x.set(e.clientX);
    y.set(e.clientY);
  };

  return (
    <div id="project-index" className="container max-w-6xl mt-28 scroll-mt-28" onMouseMove={onMove}>
      <FadeUp className="flex items-end justify-between mb-6">
        <h3 className="font-display text-2xl md:text-3xl font-semibold">Índice completo</h3>
        <span className="label-sm text-muted-foreground tabular-nums">{pad(projects.length)} projetos</span>
      </FadeUp>

      <ul className="border-t border-border" onMouseLeave={() => setHovered(null)}>
        {projects.map((project, i) => {
          const isOpen = open === project.title;
          const panelId = `project-panel-${i}`;
          return (
            <li key={project.title} className="border-b border-border">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : project.title)}
                onMouseEnter={() => setHovered(isOpen ? null : project)}
                data-cursor={isOpen ? "–" : "+"}
                className="group w-full grid grid-cols-[2.5rem_1fr_auto] md:grid-cols-[4rem_1.4fr_1fr_auto] items-center gap-3 md:gap-6 py-5 md:py-6 text-left"
              >
                <span className="label-sm text-muted-foreground tabular-nums">{pad(i + 1)}</span>
                <span className="font-display text-xl md:text-3xl font-semibold tracking-tight transition-all duration-300 group-hover:text-primary group-hover:translate-x-2">
                  {project.title}
                </span>
                <span className="hidden md:block text-sm text-muted-foreground truncate">
                  {project.tags.slice(0, 3).join(" · ")}
                </span>
                <Plus
                  className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-45 text-primary" : ""}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={panelId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6 md:gap-10 pb-8 md:pl-[5.5rem]">
                      <ProjectImage project={project} className="aspect-[16/10] w-full border border-border" />
                      <div>
                        {project.badge && (
                          <span className="label-sm inline-block px-3 py-1 border border-primary/40 text-primary mb-4">
                            {project.badge}
                          </span>
                        )}
                        {project.period && <p className="text-xs text-muted-foreground font-mono mb-3">{project.period}</p>}
                        <p className="text-muted-foreground leading-relaxed mb-3">{project.description}</p>
                        {project.extra && <p className="text-muted-foreground leading-relaxed mb-3">{project.extra}</p>}
                        <ul className="flex flex-wrap gap-1.5 my-5" aria-label="Tecnologias">
                          {project.tags.map((tag) => (
                            <li key={tag} className="text-xs px-3 py-1 border border-border text-muted-foreground">
                              {tag}
                            </li>
                          ))}
                        </ul>
                        <ProjectLinks project={project} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>

      <HoverPreview project={hovered} x={x} y={y} />
    </div>
  );
};

export const Projects = () => (
  <section id="projects" className="relative pt-32 pb-32">
    <div className="container max-w-6xl mb-12 lg:mb-4">
      <SectionLabel index="02">Trabalhos selecionados</SectionLabel>
      <h2 className="display-lg">
        <RevealWords text="Projetos em *destaque.*" />
      </h2>
      <FadeUp delay={0.15}>
        <p className="text-muted-foreground max-w-md mt-5">
          {FEATURED_COUNT} trabalhos escolhidos a dedo, de um total de {projects.length}. Continue rolando para
          percorrer a galeria.
        </p>
      </FadeUp>
    </div>

    <FeaturedGallery />
    <ProjectIndex />
  </section>
);
