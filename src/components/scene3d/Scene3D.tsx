import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Code2, Mail, Maximize2, Sparkles } from "lucide-react";
import jonasPhoto from "@/assets/jonas-hero-photo.jpeg";
import { GitHubIcon } from "@/components/icons/GitHubIcon";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { PortfolioPanel } from "@/components/shared/PortfolioPanel";
import { SectionDialog } from "@/components/shared/SectionDialog";
import { EMAIL_DISPLAY, GITHUB_URL, LINKEDIN_URL, MAILTO_URL, WHATSAPP_URL } from "@/data/contact";
import { aboutParagraphs, stats } from "@/data/formations";
import { projects } from "@/data/projects";
import { SECTIONS, sectionById, type SectionId } from "@/data/sections";
import { techStack } from "@/data/techStack";
import { timeline } from "@/data/timeline";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { CHAPTER_COUNT, ParticleStage } from "./ParticleStage";

/** Chapter 0 is the intro; chapters 1..5 map to the portfolio sections in order. */
const sectionOf = (chapter: number): SectionId | null => (chapter === 0 ? null : SECTIONS[chapter - 1].id);

/** Only projects with a screenshot go on the 3D carousel; the dialog lists all of them. */
const showcase = projects.filter((p) => p.image);

/** A morph takes ~1.7 s; navigation is ignored until it is nearly done. */
const MORPH_LOCK_MS = 1150;

const pad = (n: number) => String(n).padStart(2, "0");

const Chapter = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    exit={{ opacity: 0, y: -18, filter: "blur(8px)" }}
    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

const Eyebrow = ({ chapter }: { chapter: number }) => {
  const meta = sectionById(sectionOf(chapter)!);
  return (
    <p className="label-sm flex items-center gap-3 mb-3 md:mb-4" style={{ color: meta.color }}>
      <span className="tabular-nums">{pad(chapter)}</span>
      <span className="h-px w-8 bg-current opacity-60" aria-hidden />
      {meta.name}
    </p>
  );
};

// Type scales with the smaller of width and height, so a phone held sideways still fits a chapter on screen.
const headingClass =
  "font-display font-semibold tracking-tight leading-[1.02] text-[clamp(1.35rem,min(4.4vw,7.2vh),3.6rem)] mb-[clamp(0.5rem,2vh,1.25rem)]";
const bodyClass = "text-[clamp(0.8rem,min(1.6vw,2.6vh),1rem)] text-foreground/75 leading-relaxed";

export const Scene3D = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<ParticleStage | null>(null);
  const reduced = usePrefersReducedMotion();

  const [chapter, setChapter] = useState(0);
  const [project, setProject] = useState(0);
  const [panel, setPanel] = useState<SectionId | null>(null);
  const [failed, setFailed] = useState(false);
  // "side": text on the left, sculpture on the right (landscape). "stack": sculpture above the text (portrait).
  const [mode, setMode] = useState<"side" | "stack">("side");

  const chapterRef = useRef(0);
  const panelRef = useRef<SectionId | null>(null);
  const lockedUntil = useRef(0);
  chapterRef.current = chapter;
  panelRef.current = panel;

  const goTo = useCallback((next: number) => {
    const target = Math.max(0, Math.min(CHAPTER_COUNT - 1, next));
    if (target === chapterRef.current || performance.now() < lockedUntil.current) return;
    lockedUntil.current = performance.now() + MORPH_LOCK_MS;
    setChapter(target);
  }, []);

  const stepProject = useCallback((direction: number) => {
    setProject((current) => (current + direction + showcase.length) % showcase.length);
  }, []);

  // ---- WebGL stage ------------------------------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const small = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    let stage: ParticleStage;
    try {
      stage = new ParticleStage(mount, {
        count: small ? 22000 : 46000,
        reducedMotion: reduced,
        photoUrl: jonasPhoto,
        projectImages: showcase.map((p) => p.image!),
      });
    } catch {
      setFailed(true);
      return;
    }
    stageRef.current = stage;
    stage.setChapter(chapterRef.current);

    const onResize = () => stage.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      stage.dispose();
      stageRef.current = null;
    };
  }, [reduced]);

  useEffect(() => stageRef.current?.setChapter(chapter), [chapter]);
  useEffect(() => stageRef.current?.setProject(project), [project]);

  useEffect(() => {
    const update = () => {
      const { innerWidth: w, innerHeight: h } = window;
      setMode(w >= 640 && w / h > 1.15 ? "side" : "stack");
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Keep the sculpture clear of the text: beside it in "side" mode, above it in "stack" mode.
  useEffect(() => {
    const place = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const aspect = window.innerWidth / window.innerHeight;
      if (chapter === 0) {
        stage.setLayout({ x: 0, y: 0, scale: mode === "side" ? 1.45 : Math.max(0.75, Math.min(1.2, aspect * 1.5)) });
      } else if (mode === "side") {
        stage.setLayout({ x: Math.min(2.7, aspect * 1.22), y: 0, scale: 0.9 });
      } else {
        stage.setLayout({ x: 0, y: 1.9, scale: Math.max(0.42, Math.min(0.74, aspect * 1.05)) });
      }
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [chapter, mode]);

  // ---- Navigation: wheel, keys, swipe ----------------------------------
  useEffect(() => {
    let wheel = 0;
    let wheelTimer = 0;
    const onWheel = (e: WheelEvent) => {
      if (panelRef.current) return;
      wheel += e.deltaY;
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => (wheel = 0), 180);
      if (Math.abs(wheel) < 50) return;
      goTo(chapterRef.current + Math.sign(wheel));
      wheel = 0;
    };

    const onKey = (e: KeyboardEvent) => {
      if (panelRef.current) return;
      const onProjects = sectionOf(chapterRef.current) === "projects";
      switch (e.key) {
        case " ":
          // Space on a focused button or link must keep activating that control.
          if (e.target instanceof Element && e.target.closest("button, a")) return;
          goTo(chapterRef.current + 1);
          break;
        case "ArrowDown":
        case "PageDown":
          goTo(chapterRef.current + 1);
          break;
        case "ArrowUp":
        case "PageUp":
          goTo(chapterRef.current - 1);
          break;
        case "Home":
          goTo(0);
          break;
        case "End":
          goTo(CHAPTER_COUNT - 1);
          break;
        case "ArrowRight":
          if (onProjects) stepProject(1);
          else goTo(chapterRef.current + 1);
          break;
        case "ArrowLeft":
          if (onProjects) stepProject(-1);
          else goTo(chapterRef.current - 1);
          break;
        default:
          if (/^[1-5]$/.test(e.key)) goTo(Number(e.key));
          return;
      }
      e.preventDefault();
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(wheelTimer);
    };
  }, [goTo, stepProject]);

  // Pointer: repels particles, a tap sends a shockwave, a drag swipes chapters or projects.
  const drag = useRef<{ x: number; y: number } | null>(null);
  const toNdc = (clientX: number, clientY: number) => {
    const rect = mountRef.current!.getBoundingClientRect();
    return [((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1)] as const;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const [x, y] = toNdc(e.clientX, e.clientY);
    stageRef.current?.setPointer(x, y);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    onPointerMove(e);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = drag.current;
    drag.current = null;
    if (e.pointerType !== "mouse") stageRef.current?.setPointer(null);
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return stageRef.current?.burst();
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 45) goTo(chapterRef.current + (dy < 0 ? 1 : -1));
    else if (Math.abs(dx) > 45 && sectionOf(chapterRef.current) === "projects") stepProject(dx < 0 ? 1 : -1);
  };

  if (failed) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center text-center px-6">
        <h1 className="display-lg mb-3">O 3D não pôde ser carregado</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Seu navegador ou dispositivo não tem WebGL disponível no momento. O mesmo conteúdo está nas outras
          duas experiências.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/landing" className="px-6 py-3 bg-foreground text-background text-sm font-medium">
            Abrir a landing page
          </Link>
          <Link to="/2d" className="px-6 py-3 border border-border text-sm font-medium">
            Jogar a versão 2D
          </Link>
        </div>
      </div>
    );
  }

  const section = sectionOf(chapter);
  const accent = section ? sectionById(section).color : "#6e63f0";
  const current = showcase[project];
  const detailsButton = section && (
    <button
      onClick={() => setPanel(section)}
      className="inline-flex items-center gap-2 mt-[clamp(0.75rem,3vh,1.75rem)] px-5 py-2.5 border text-sm text-foreground bg-background/40 backdrop-blur-sm hover:bg-background/70 transition-colors"
      style={{ borderColor: accent }}
    >
      <Maximize2 className="w-3.5 h-3.5" />
      Ver tudo
    </button>
  );

  return (
    <div className="fixed inset-0 bg-[#05060f] overflow-hidden select-none text-foreground">
      <div
        ref={mountRef}
        className="absolute inset-0 touch-none"
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={() => stageRef.current?.setPointer(null)}
        aria-hidden
      />
      {/* Legibility: darkens the side (or bottom) where the text sits, tinted by the chapter. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            chapter === 0
              ? "radial-gradient(ellipse 78% 44% at center, #05060fe6 0%, #05060f99 58%, transparent 100%)"
              : `linear-gradient(${mode === "side" ? "90deg" : "0deg"}, #05060ff2 0%, #05060fb3 34%, transparent 62%), radial-gradient(ellipse at 80% 20%, ${accent}1f, transparent 55%)`,
        }}
      />

      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 md:px-8 h-14 md:h-20">
        <Link
          to="/"
          className="label-sm flex items-center gap-2 px-3 py-2 border border-border/70 bg-background/40 backdrop-blur-md hover:border-primary/60 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Início
        </Link>
        <span className="label-sm text-muted-foreground tabular-nums">
          {pad(chapter)} / {pad(CHAPTER_COUNT - 1)}
        </span>
      </header>

      {/* Chapter navigation */}
      <nav
        aria-label="Capítulos"
        className="absolute z-20 right-3 md:right-7 top-1/2 -translate-y-1/2 flex flex-col items-end gap-1"
      >
        {Array.from({ length: CHAPTER_COUNT }).map((_, i) => {
          const id = sectionOf(i);
          const label = id ? sectionById(id).short : "Abertura";
          const active = i === chapter;
          return (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={label}
              aria-current={active ? "step" : undefined}
              className="group flex items-center gap-3 py-2 pl-4"
            >
              <span
                className={`label-sm hidden md:block transition-opacity ${
                  active ? "opacity-100 text-foreground" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 text-muted-foreground"
                }`}
              >
                {label}
              </span>
              <span
                className="block h-px transition-all duration-500"
                style={{ width: active ? 30 : 14, backgroundColor: active ? accent : "hsl(var(--muted-foreground) / 0.6)" }}
              />
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main
        className={`absolute z-10 pointer-events-none flex ${
          chapter === 0
            ? "inset-0 items-center justify-center text-center px-6"
            : mode === "side"
              ? "left-0 top-14 bottom-12 md:top-20 md:bottom-16 w-[min(48vw,640px)] pl-[clamp(1.25rem,5vw,5rem)] pr-2"
              : "inset-x-0 bottom-14 max-h-[58svh] px-5 pr-12 sm:px-10 sm:pr-16 justify-center"
        }`}
        aria-live="polite"
      >
        <div
          className={`pointer-events-auto w-full ${
            chapter === 0 ? "max-w-3xl" : `overflow-y-auto no-scrollbar max-h-full ${mode === "side" ? "my-auto" : "max-w-xl mt-auto"}`
          }`}
        >
          <AnimatePresence mode="wait">
            {chapter === 0 && (
              <Chapter key="intro">
                <p className="label-sm text-primary-glow mb-4 flex items-center justify-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> Portfólio em partículas
                </p>
                <h1 className="font-display font-semibold tracking-tight leading-[0.9] text-[clamp(2.6rem,min(13vw,24vh),10rem)]">
                  JONAS
                  <br />
                  <span className="text-primary">ESTEVES</span>
                </h1>
                <p className="text-foreground/75 max-w-md mx-auto mt-[clamp(0.75rem,3vh,1.5rem)] text-sm md:text-base">
                  Milhares de pontos de luz que se reorganizam para contar quem eu sou. Toque neles, e role para viajar.
                </p>
                <button
                  onClick={() => goTo(1)}
                  autoFocus
                  className="group inline-flex items-center gap-3 mt-[clamp(1rem,4vh,2rem)] px-7 py-3.5 bg-foreground text-background text-sm font-medium"
                >
                  Começar
                  <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-1" />
                </button>
              </Chapter>
            )}

            {section === "about" && (
              <Chapter key="about">
                <Eyebrow chapter={chapter} />
                <h2 className={headingClass}>Tecnologia com propósito.</h2>
                <p className={bodyClass}>{aboutParagraphs.estudante}</p>
                <dl className="grid grid-cols-3 gap-3 mt-[clamp(0.75rem,3vh,1.75rem)] max-w-md">
                  {stats.map((s) => (
                    <div key={s.label} className="flex flex-col-reverse border-t border-border/70 pt-2.5">
                      <dt className="text-[11px] text-muted-foreground leading-snug mt-1">{s.label}</dt>
                      <dd className="font-display text-[clamp(1.1rem,min(2.6vw,4.4vh),1.9rem)] font-semibold whitespace-nowrap">{s.value}</dd>
                    </div>
                  ))}
                </dl>
                {detailsButton}
              </Chapter>
            )}

            {section === "forma" && (
              <Chapter key="forma">
                <Eyebrow chapter={chapter} />
                <h2 className={headingClass}>Uma trajetória em espiral.</h2>
                <ol className="space-y-[clamp(0.3rem,1.4vh,0.9rem)]">
                  {timeline.map((event) => (
                    <li key={`${event.year}-${event.title}`} className="grid grid-cols-[3.2rem_1fr] gap-2 items-baseline">
                      <span className="font-display text-sm tabular-nums" style={{ color: accent }}>
                        {event.year}
                      </span>
                      <span>
                        <span className="block text-[clamp(0.8rem,min(1.6vw,2.6vh),1rem)] font-medium text-foreground leading-snug">{event.title}</span>
                        <span className="block text-xs text-muted-foreground">{event.place}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                {detailsButton}
              </Chapter>
            )}

            {section === "skills" && (
              <Chapter key="skills">
                <Eyebrow chapter={chapter} />
                <h2 className={headingClass}>Ferramentas que uso de verdade.</h2>
                <ul className="flex flex-wrap gap-2">
                  {techStack.map((skill) => (
                    <li
                      key={skill.name}
                      className="flex items-center gap-2 px-3 py-2 border border-border/80 bg-background/40 backdrop-blur-sm text-xs md:text-sm"
                    >
                      {skill.src ? (
                        <img src={skill.src} alt="" width={16} height={16} loading="lazy" className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-primary" />
                      )}
                      {skill.name}
                    </li>
                  ))}
                </ul>
                {detailsButton}
              </Chapter>
            )}

            {section === "projects" && current && (
              <Chapter key="projects">
                <Eyebrow chapter={chapter} />
                <div className="flex items-center gap-3 mb-3">
                  <span className="label-sm text-muted-foreground tabular-nums">
                    {pad(project + 1)} / {pad(showcase.length)}
                  </span>
                  <button
                    onClick={() => stepProject(-1)}
                    aria-label="Projeto anterior"
                    className="w-10 h-10 flex items-center justify-center border border-border/80 bg-background/40 hover:border-primary/60 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => stepProject(1)}
                    aria-label="Próximo projeto"
                    className="w-10 h-10 flex items-center justify-center border border-border/80 bg-background/40 hover:border-primary/60 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.title}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h2 className={headingClass}>{current.title}</h2>
                    <p className={`${bodyClass} line-clamp-3 md:line-clamp-4`}>{current.description}</p>
                    <ul className="flex flex-wrap gap-1.5 mt-3 md:mt-4" aria-label="Tecnologias">
                      {current.tags.slice(0, 5).map((tag) => (
                        <li key={tag} className="text-[11px] px-2.5 py-1 border border-border/80 text-muted-foreground">
                          {tag}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2.5 mt-4 md:mt-6">
                      {current.liveUrl && (
                        <a
                          href={current.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-sm font-medium"
                        >
                          {current.liveLabel ?? "Ver projeto"} <ArrowUpRight className="w-4 h-4" />
                        </a>
                      )}
                      <a
                        href={current.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 border border-border/80 bg-background/40 text-sm"
                      >
                        <Code2 className="w-4 h-4" /> Código
                      </a>
                      <button
                        onClick={() => setPanel("projects")}
                        className="inline-flex items-center gap-2 px-5 py-2.5 border text-sm bg-background/40"
                        style={{ borderColor: accent }}
                      >
                        Todos os {projects.length}
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </Chapter>
            )}

            {section === "contact" && (
              <Chapter key="contact">
                <Eyebrow chapter={chapter} />
                <h2 className={headingClass}>Vamos construir algo.</h2>
                <p className={bodyClass}>
                  Aberto para estágios, oportunidades em tecnologia e colaborações em projetos, com disponibilidade
                  para início imediato.
                </p>
                <a
                  href={MAILTO_URL}
                  className="inline-flex items-center gap-3 mt-5 md:mt-7 px-5 py-3.5 bg-foreground text-background text-sm md:text-base font-medium break-all"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  {EMAIL_DISPLAY}
                </a>
                <div className="flex flex-wrap gap-2.5 mt-3">
                  {[
                    { icon: WhatsAppIcon, label: "WhatsApp", href: WHATSAPP_URL },
                    { icon: LinkedInIcon, label: "LinkedIn", href: LINKEDIN_URL },
                    { icon: GitHubIcon, label: "GitHub", href: GITHUB_URL },
                  ].map(({ icon: Icon, label, href }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 border border-border/80 bg-background/40 backdrop-blur-sm text-sm hover:border-primary/60 transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </a>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6 label-sm text-muted-foreground">
                  <Link to="/landing" className="hover:text-foreground transition-colors">
                    Ver a landing page →
                  </Link>
                  <Link to="/2d" className="hover:text-foreground transition-colors">
                    Jogar a versão 2D →
                  </Link>
                </div>
              </Chapter>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer hint / next */}
      <div className="absolute z-20 bottom-4 md:bottom-7 inset-x-0 flex items-center justify-center pointer-events-none">
        {chapter === 0 ? null : chapter < CHAPTER_COUNT - 1 ? (
          <button
            onClick={() => goTo(chapter + 1)}
            className="pointer-events-auto label-sm flex items-center gap-2 px-4 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="hidden md:inline">Role, deslize ou use ↓</span>
            <span className="md:hidden">Deslize para cima</span>
            <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
          </button>
        ) : (
          <button
            onClick={() => goTo(0)}
            className="pointer-events-auto label-sm px-4 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            Voltar ao começo ↑
          </button>
        )}
      </div>

      {panel && (
        <SectionDialog title={sectionById(panel).name} accent={sectionById(panel).color} onClose={() => setPanel(null)}>
          <PortfolioPanel id={panel} />
        </SectionDialog>
      )}
    </div>
  );
};

export default Scene3D;
