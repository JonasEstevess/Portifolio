import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { formations, stats } from "@/data/formations";
import { Timeline } from "./Timeline";

type IdentityKey = "dev" | "estudante" | "criador";

const identities: { key: IdentityKey; label: string }[] = [
  { key: "dev", label: "Desenvolvedor" },
  { key: "estudante", label: "Estudante" },
  { key: "criador", label: "Criador" },
];

export const About = () => {
  const [identity, setIdentity] = useState<IdentityKey>("dev");

  return (
    <section id="about" className="py-32 relative">
      <div className="container max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          <span className="label-sm text-muted-foreground">Quem sou eu?</span>
          <h2 className="display-lg mt-3">
            Tecnologia com <span className="text-primary">propósito</span>.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap gap-3 mb-10"
        >
          {identities.map((item) => (
            <button
              key={item.key}
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
        </motion.div>

        <div className="min-h-[220px]">
          <AnimatePresence mode="wait">
            {identity === "dev" && (
              <motion.div
                key="dev"
                initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                  Já adquiri habilidades em Python, SQL, desenvolvimento de web, manipulação de
                  Inteligência artificial, trabalho em equipe e metodologias ágeis. Tenho inglês
                  avançado com certificações pela Wizard e IW.
                </p>
                <div className="flex flex-wrap gap-2 mt-6">
                  {["JavaScript", "Python", "React", "Java", "C++"].map((tech) => (
                    <span key={tech} className="label-sm text-muted-foreground px-3 py-1.5 border border-border">
                      {tech}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {identity === "estudante" && (
              <motion.div
                key="estudante"
                initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
                  Me formei em Tecnologia da Informação integrado ao ensino médio pela UNASP em
                  2024, onde meu TCC ficou em 2º lugar entre mais de 25 projetos. Em 2025 passei
                  na seletiva do curso de Engenharia de Software na FIAP e hoje estou no quarto
                  semestre.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {formations.map((f) => (
                    <div key={f.title} className="p-4 border border-border">
                      <f.icon className="w-4 h-4 text-primary mb-3" />
                      <h3 className="font-display font-semibold text-sm mb-1">{f.title}</h3>
                      <p className="text-xs text-muted-foreground">{f.place}</p>
                      <p className="text-xs text-muted-foreground/70 mt-2">{f.period}</p>
                      <p className="text-xs text-primary mt-1">{f.status}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {identity === "criador" && (
              <motion.div
                key="criador"
                initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-6">
                  Busco oportunidades na área de tecnologia para desenvolver minhas aptidões —
                  colocando em prática o que aprendo através de projetos reais e experimentações.
                </p>
                <a
                  href="#projects"
                  data-cursor="→"
                  className="inline-flex items-center gap-2 label-sm text-foreground hover:text-primary transition-colors"
                >
                  Ver todos os projetos
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-3 gap-4 md:gap-8 mt-20"
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center md:text-left">
              <div className="font-display text-3xl md:text-5xl font-semibold text-foreground tabular-nums">
                {s.value}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <Timeline />
      </div>
    </section>
  );
};
