import { motion, AnimatePresence } from "framer-motion";
import { useState, type KeyboardEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { formations, stats, aboutParagraphs } from "@/data/formations";
import { FadeUp, RevealWords, SectionLabel } from "./Reveal";
import { Timeline } from "./Timeline";

type IdentityKey = "dev" | "estudante" | "criador";

const identities: { key: IdentityKey; label: string }[] = [
  { key: "dev", label: "Desenvolvedor" },
  { key: "estudante", label: "Estudante" },
  { key: "criador", label: "Criador" },
];

const panelMotion = {
  initial: { opacity: 0, y: 12, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -12, filter: "blur(4px)" },
  transition: { duration: 0.4 },
};

export const About = () => {
  const [identity, setIdentity] = useState<IdentityKey>("dev");

  // Arrow keys move between tabs, as the tab pattern expects.
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const index = identities.findIndex((i) => i.key === identity);
    const next = identities[(index + (e.key === "ArrowRight" ? 1 : -1) + identities.length) % identities.length];
    setIdentity(next.key);
    document.getElementById(`about-tab-${next.key}`)?.focus();
  };

  return (
    <section id="about" className="pt-20 pb-32 relative scroll-mt-10">
      <div className="container max-w-6xl">
        <SectionLabel index="01">Quem sou eu?</SectionLabel>
        <h2 className="display-lg mb-14">
          <RevealWords text="Tecnologia com *propósito.*" />
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-14 lg:gap-20">
          <div>
            <FadeUp delay={0.1}>
              <div role="tablist" aria-label="Perfis" onKeyDown={onTabKey} className="flex flex-wrap gap-3 mb-10">
                {identities.map((item) => (
                  <button
                    key={item.key}
                    id={`about-tab-${item.key}`}
                    role="tab"
                    aria-selected={identity === item.key}
                    aria-controls="about-panel"
                    tabIndex={identity === item.key ? 0 : -1}
                    onClick={() => setIdentity(item.key)}
                    data-cursor={item.key === identity ? "" : "→"}
                    className={`px-5 py-2.5 text-sm font-medium tracking-wide border transition-all ${
                      identity === item.key
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </FadeUp>

            <div id="about-panel" role="tabpanel" aria-labelledby={`about-tab-${identity}`} className="min-h-[260px]">
              <AnimatePresence mode="wait">
                {identity === "dev" && (
                  <motion.div key="dev" {...panelMotion}>
                    <p className="text-lg md:text-xl text-foreground/85 leading-relaxed max-w-2xl">
                      {aboutParagraphs.dev}
                    </p>
                    <ul className="flex flex-wrap gap-2 mt-7" aria-label="Linguagens principais">
                      {["JavaScript", "Python", "React", "Java", "C++"].map((tech) => (
                        <li key={tech} className="label-sm text-muted-foreground px-3 py-1.5 border border-border">
                          {tech}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {identity === "estudante" && (
                  <motion.div key="estudante" {...panelMotion}>
                    <p className="text-lg md:text-xl text-foreground/85 leading-relaxed max-w-2xl mb-8">
                      {aboutParagraphs.estudante}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {formations.map((f) => (
                        <div key={f.title} className="p-4 border border-border">
                          <f.icon className="w-4 h-4 text-primary mb-3" aria-hidden />
                          <h3 className="font-display font-semibold text-sm mb-1">{f.title}</h3>
                          <p className="text-xs text-muted-foreground">{f.place}</p>
                          <p className="text-xs text-muted-foreground/80 mt-2">{f.period}</p>
                          <p className="text-xs text-primary-glow mt-1">{f.status}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {identity === "criador" && (
                  <motion.div key="criador" {...panelMotion}>
                    <p className="text-lg md:text-xl text-foreground/85 leading-relaxed max-w-2xl mb-7">
                      {aboutParagraphs.criador}
                    </p>
                    <a
                      href="#projects"
                      data-cursor="→"
                      className="group inline-flex items-center gap-2 label-sm text-foreground hover:text-primary transition-colors"
                    >
                      Ver todos os projetos
                      <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <dl className="grid grid-cols-3 lg:grid-cols-1 gap-4 lg:gap-0 lg:divide-y lg:divide-border lg:border-y lg:border-border self-start">
            {stats.map((s, i) => (
              <FadeUp key={s.label} delay={0.1 + i * 0.08} className="lg:py-6 flex flex-col-reverse">
                <dt className="text-xs md:text-sm text-muted-foreground mt-1">{s.label}</dt>
                <dd className="font-display text-3xl md:text-6xl font-semibold text-foreground tabular-nums tracking-tight">
                  {s.value}
                </dd>
              </FadeUp>
            ))}
          </dl>
        </div>

        <Timeline />
      </div>
    </section>
  );
};
