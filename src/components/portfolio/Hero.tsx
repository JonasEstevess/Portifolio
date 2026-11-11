import { motion, useMotionValue, useScroll, useTransform } from "framer-motion";
import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Download } from "lucide-react";
import { GitHubIcon as Github } from "@/components/icons/GitHubIcon";
import { LinkedInIcon as Linkedin } from "@/components/icons/LinkedInIcon";
import jonasPhoto from "@/assets/jonas-hero-photo.jpeg";
import { FloatingTech } from "./FloatingTech";
import { HeroPhoto } from "./HeroPhoto";
import { Magnetic } from "./Reveal";
import { Typewriter, TypedName } from "./Typewriter";
import { GITHUB_URL, LINKEDIN_URL } from "@/data/contact";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

const TAGLINE =
  "Estudante de Engenharia de Software na FIAP, construindo produtos digitais com atenção a detalhe e experiência.";

type Stage = "greeting" | "name" | "tagline" | "rest";

const saoPauloTime = () =>
  new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(
    new Date()
  );

/** Current time in São Paulo, refreshed twice a minute. */
const useLocalTime = () => {
  const [time, setTime] = useState(saoPauloTime);
  useEffect(() => {
    const timer = setInterval(() => setTime(saoPauloTime()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return time;
};

export const Hero = () => {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glowX = useTransform(mouseX, (v) => v * 70);
  const glowY = useTransform(mouseY, (v) => v * 70);

  // Scroll parallax: text and portrait drift apart and fade as the hero leaves.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -90]);
  const photoY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 70]);
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  const [stage, setStage] = useState<Stage>(reduced ? "rest" : "greeting");
  const time = useLocalTime();

  useEffect(() => {
    if (reduced) setStage("rest");
  }, [reduced]);

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left - rect.width / 2) / rect.width);
    mouseY.set((e.clientY - rect.top - rect.height / 2) / rect.height);
  };

  const skipTyping = reduced || stage === "rest";
  const showRest = stage === "rest";

  return (
    <section
      id="home"
      ref={ref}
      onMouseMove={handleMouseMove}
      // A click anywhere finishes the typing animation for visitors in a hurry.
      onClick={() => setStage("rest")}
      className="relative min-h-[100svh] flex flex-col overflow-hidden pt-28"
    >
      <motion.div
        className="absolute top-1/3 left-1/4 -translate-x-1/2 w-[560px] h-[560px] rounded-full bg-primary/20 blur-[120px]"
        style={{ x: glowX, y: glowY }}
        aria-hidden
      />

      <FloatingTech mouseX={mouseX} mouseY={mouseY} />

      <motion.div className="container relative z-10 flex-1 flex items-center" style={{ opacity: fade }}>
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-12 lg:gap-16 items-center w-full">
          <motion.div className="text-left" style={{ y: textY }}>
            <span className="font-mono block text-lg md:text-2xl text-muted-foreground mb-5 tracking-tight">
              {skipTyping ? (
                "Olá, sou"
              ) : (
                <Typewriter text="Olá, sou" speed={48} active={stage === "greeting"} onComplete={() => setStage("name")} />
              )}
            </span>

            <h1 className="display-huge mb-7" aria-label="Jonas Esteves">
              {skipTyping ? (
                <>
                  <span className="block">JONAS</span>
                  <span className="block text-primary">ESTEVES</span>
                </>
              ) : (
                <TypedName active={stage === "name"} onComplete={() => setStage("tagline")} />
              )}
            </h1>

            <p className="font-mono text-muted-foreground text-sm md:text-base mb-10 max-w-md min-h-[4.5em] md:min-h-[3.5em] leading-relaxed">
              {skipTyping ? (
                TAGLINE
              ) : (
                <Typewriter text={TAGLINE} speed={13} active={stage === "tagline"} onComplete={() => setStage("rest")} />
              )}
            </p>

            <motion.div
              initial={false}
              animate={showRest ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.6 }}
              className="flex flex-wrap items-center gap-3 mb-8"
              style={{ pointerEvents: showRest ? "auto" : "none" }}
            >
              <Magnetic>
                <a
                  href="#projects"
                  data-cursor="VER"
                  className="group inline-flex items-center gap-2 px-7 py-3.5 bg-foreground text-background text-sm font-medium tracking-wide transition-all hover:gap-3"
                >
                  Ver projetos
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </Magnetic>
              <a
                href="#about"
                className="px-7 py-3.5 border border-border text-sm font-medium tracking-wide text-foreground hover:border-primary/50 transition-all"
              >
                Sobre mim
              </a>
              <a
                href="/curriculo-jonas-esteves.pdf"
                download
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-border text-sm font-medium tracking-wide text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
              >
                <Download className="w-4 h-4" />
                Baixar CV
              </a>
            </motion.div>

            <motion.div
              initial={false}
              animate={{ opacity: showRest ? 1 : 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="flex items-center gap-2"
              style={{ pointerEvents: showRest ? "auto" : "none" }}
            >
              {[
                { icon: Github, href: GITHUB_URL, label: "GitHub" },
                { icon: Linkedin, href: LINKEDIN_URL, label: "LinkedIn" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </motion.div>
          </motion.div>

          <motion.div style={{ y: photoY }}>
            <HeroPhoto src={jonasPhoto} alt="Retrato de Jonas Esteves" />
          </motion.div>
        </div>
      </motion.div>

      {/* Status bar pinned to the bottom of the first screen */}
      <motion.div
        initial={false}
        animate={{ opacity: showRest ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="relative z-10 border-t border-border/60 mt-12"
      >
        <div className="container py-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 label-sm text-muted-foreground">
          <span className="flex items-center gap-2.5 text-foreground">
            <span className="relative flex w-2 h-2" aria-hidden>
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
            </span>
            Disponível para estágio
          </span>
          <span className="hidden sm:inline">São Paulo, BR — {time}</span>
          <a href="#about" className="hidden md:flex items-center gap-2 hover:text-foreground transition-colors">
            Role para explorar
            <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
          </a>
        </div>
      </motion.div>
    </section>
  );
};
