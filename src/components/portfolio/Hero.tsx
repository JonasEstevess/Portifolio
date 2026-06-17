import { motion, useMotionValue, useTransform } from "framer-motion";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { GitHubIcon as Github } from "@/components/icons/GitHubIcon";
import { LinkedInIcon as Linkedin } from "@/components/icons/LinkedInIcon";
import jonasPhoto from "@/assets/jonas-hero-photo.jpeg";
import { FloatingTech } from "./FloatingTech";
import { HeroPhoto } from "./HeroPhoto";
import { Typewriter, TypedName } from "./Typewriter";
import { GITHUB_URL, LINKEDIN_URL } from "@/data/contact";

const openExternalLink = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

const TAGLINE =
  "Estudante de Engenharia de Software na FIAP, construindo produtos digitais com atenção a detalhe e experiência.";

type Stage = "greeting" | "name" | "tagline" | "rest";

export const Hero = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glowX = useTransform(mouseX, (v) => v * 70);
  const glowY = useTransform(mouseY, (v) => v * 70);

  const [stage, setStage] = useState<Stage>("greeting");
  const [skipTyping, setSkipTyping] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setSkipTyping(true);
      setStage("rest");
    }
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left - rect.width / 2) / rect.width);
    mouseY.set((e.clientY - rect.top - rect.height / 2) / rect.height);
  };

  const showRest = stage === "rest";

  return (
    <section
      id="home"
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex items-center overflow-hidden pt-28 pb-16"
    >
      <motion.div
        className="absolute top-1/3 left-1/4 -translate-x-1/2 w-[560px] h-[560px] rounded-full bg-primary/20 blur-[120px]"
        style={{ x: glowX, y: glowY }}
        aria-hidden
      />

      <FloatingTech mouseX={mouseX} mouseY={mouseY} />

      <div className="container relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-center">
          <div className="text-left">
            <span className="font-mono block text-xl md:text-2xl text-muted-foreground mb-6 tracking-tight">
              {skipTyping ? (
                "Olá, sou"
              ) : (
                <Typewriter
                  text="Olá, sou"
                  speed={48}
                  active={stage === "greeting"}
                  onComplete={() => setStage("name")}
                />
              )}
            </span>

            <h1 className="display-huge mb-6">
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
                <Typewriter
                  text={TAGLINE}
                  speed={13}
                  active={stage === "tagline"}
                  onComplete={() => setStage("rest")}
                />
              )}
            </p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={showRest ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="flex flex-wrap items-center gap-3 mb-8"
              style={{ pointerEvents: showRest ? "auto" : "none" }}
            >
              <a
                href="#projects"
                data-cursor="VIEW"
                className="group inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background text-sm font-medium tracking-wide transition-all hover:gap-3"
              >
                Ver projetos
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <a
                href="#about"
                className="px-6 py-3 border border-border text-sm font-medium tracking-wide text-foreground hover:border-primary/50 transition-all"
              >
                Sobre mim
              </a>
              <a
                href="/curriculo-jonas-esteves.pdf"
                download
                className="px-6 py-3 border border-border text-sm font-medium tracking-wide text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
              >
                Baixar CV
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={showRest ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="flex items-center gap-4"
              style={{ pointerEvents: showRest ? "auto" : "none" }}
            >
              {[
                { icon: Github, href: GITHUB_URL, label: "GitHub" },
                { icon: Linkedin, href: LINKEDIN_URL, label: "LinkedIn" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                    event.preventDefault();
                    openExternalLink(href);
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </motion.div>
          </div>

          <HeroPhoto src={jonasPhoto} alt="Jonas Esteves" />
        </div>

        <motion.a
          href="#about"
          initial={{ opacity: 0 }}
          animate={showRest ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="hidden md:flex justify-center mt-16 text-muted-foreground"
          aria-label="Rolar para a próxima seção"
          style={{ pointerEvents: showRest ? "auto" : "none" }}
        >
          <ArrowDown className="w-5 h-5 animate-bounce" />
        </motion.a>
      </div>
    </section>
  );
};
