import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, Box, Gamepad2, Layout, type LucideIcon } from "lucide-react";
import { BackgroundGlow } from "@/components/portfolio/BackgroundGlow";
import { CustomCursor } from "@/components/portfolio/CustomCursor";
import { GITHUB_URL, LINKEDIN_URL } from "@/data/contact";
import jonasPhoto from "@/assets/jonas-hero-photo.jpeg";

type Experience = {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge: string;
  meta: string;
};

const experiences: Experience[] = [
  {
    key: "landing",
    title: "Landing Page",
    description:
      "A experiência clássica: role a página e conheça minha trajetória, skills, projetos e contato num formato direto.",
    icon: Layout,
    href: "/landing",
    badge: "Recomendado",
    meta: "~2 min · qualquer dispositivo",
  },
  {
    key: "3d",
    title: "Mundo 3D",
    description:
      "Um jogo em primeira pessoa: caminhe por ilhas flutuando no espaço, salte entre pontes e desperte monumentos de luz.",
    icon: Box,
    href: "/3d",
    badge: "Imersivo",
    meta: "~4 min · teclado e mouse ou toque",
  },
  {
    key: "2d",
    title: "Jogo 2D",
    description:
      "Um jogo de plataforma em pixel art: colete commits, corrija bugs e abra os terminais para descobrir o portfólio.",
    icon: Gamepad2,
    href: "/2d",
    badge: "Jogável",
    meta: "~3 min · teclado ou toque",
  },
];

const EASE = [0.16, 1, 0.3, 1] as const;

const Hub = () => (
  <main className="relative min-h-[100svh] overflow-hidden flex flex-col">
    <BackgroundGlow />
    <div className="grain fixed inset-0 pointer-events-none" aria-hidden />
    <CustomCursor />

    <header className="relative z-10 container flex items-center justify-between h-16 md:h-20">
      <span className="font-display font-semibold text-base tracking-tight uppercase">
        Jonas<span className="text-primary">.</span>
      </span>
      <nav aria-label="Redes" className="flex items-center gap-6">
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="label-sm text-muted-foreground hover:text-foreground transition-colors">
          GitHub
        </a>
        <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="label-sm text-muted-foreground hover:text-foreground transition-colors">
          LinkedIn
        </a>
      </nav>
    </header>

    <div className="relative z-10 container flex-1 flex flex-col justify-center py-10 md:py-14">
      <div className="flex items-center gap-4 mb-7">
        <motion.img
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          src={jonasPhoto}
          alt="Jonas Esteves"
          width={56}
          height={56}
          className="w-14 h-14 rounded-full object-cover object-top border border-primary/50"
        />
        <motion.p
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="label-sm text-muted-foreground leading-relaxed"
        >
          Jonas Esteves
          <br />
          <span className="text-foreground">Engenharia de Software · FIAP</span>
        </motion.p>
      </div>

      <h1 className="font-display font-semibold tracking-tight leading-[0.95] text-[clamp(2.5rem,7.6vw,7rem)] mb-5" aria-label="Como você quer conhecer meu trabalho?">
        {["Como você quer", "conhecer meu *trabalho?*"].map((line, i) => (
          <span key={line} className="block overflow-hidden pb-[0.1em] -mb-[0.1em]" aria-hidden>
            <motion.span
              className="block"
              initial={{ y: "105%" }}
              animate={{ y: 0 }}
              transition={{ duration: 1, delay: 0.15 + i * 0.1, ease: EASE }}
            >
              {line.split(/(\*[^*]+\*)/).map((part) =>
                part.startsWith("*") ? (
                  <span key={part} className="text-primary">
                    {part.replace(/\*/g, "")}
                  </span>
                ) : (
                  part
                )
              )}
            </motion.span>
          </span>
        ))}
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45 }}
        className="text-muted-foreground max-w-xl mb-10 md:mb-12 text-base md:text-lg"
      >
        O mesmo portfólio em três formatos. Escolha um agora — dá para trocar a qualquer momento.
      </motion.p>

      <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {experiences.map((exp, i) => (
          <motion.li
            key={exp.key}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 + i * 0.1, ease: EASE }}
          >
            <Link
              to={exp.href}
              data-cursor="→"
              className="group relative flex flex-col h-full p-6 md:p-7 border border-border hover:border-primary/60 bg-card/40 backdrop-blur-sm text-left overflow-hidden transition-colors duration-300"
            >
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              />
              <div className="relative flex items-start justify-between mb-10 md:mb-16">
                <span className="font-display text-5xl md:text-6xl font-semibold text-outline tabular-nums leading-none" aria-hidden>
                  0{i + 1}
                </span>
                <span className="label-sm text-primary-glow px-2.5 py-1 border border-primary/40">{exp.badge}</span>
              </div>
              <div className="relative flex items-center gap-3 mb-3">
                <exp.icon className="w-5 h-5 text-primary" aria-hidden />
                <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">{exp.title}</h2>
              </div>
              <p className="relative text-sm text-muted-foreground leading-relaxed mb-8">{exp.description}</p>
              <div className="relative flex items-center justify-between mt-auto pt-4 border-t border-border/70">
                <span className="text-xs text-muted-foreground">{exp.meta}</span>
                <span className="w-9 h-9 flex items-center justify-center bg-foreground text-background transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </motion.li>
        ))}
      </ul>
    </div>
  </main>
);

export default Hub;
