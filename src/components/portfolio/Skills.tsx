import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { Marquee } from "./Marquee";
import { RevealWords, SectionLabel } from "./Reveal";
import { techStack, relatedProjectsFor, softSkills, type TechItem } from "@/data/techStack";

export const Skills = () => {
  const [selected, setSelected] = useState<TechItem>(techStack[0]);
  const related = relatedProjectsFor(selected);


  return (
    <section id="skills" className="py-32 relative">
      <div className="container max-w-6xl">
        <SectionLabel index="03">Tech Stack</SectionLabel>
        <h2 className="display-lg mb-12">
          <RevealWords text="Ferramentas que *uso de verdade.*" />
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-10 items-start">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {techStack.map((skill, i) => (
              <motion.button
                key={skill.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                onMouseEnter={() => setSelected(skill)}
                onFocus={() => setSelected(skill)}
                aria-pressed={selected.name === skill.name}
                onClick={() => setSelected(skill)}
                data-cursor=""
                className={`flex items-center gap-3 p-4 border text-left transition-all ${
                  selected.name === skill.name
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {skill.isAiTool ? (
                  <Sparkles className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <img src={skill.src} alt="" width={20} height={20} loading="lazy" className="w-5 h-5 shrink-0" />
                )}
                <span className="text-sm font-medium text-foreground leading-tight">{skill.name}</span>
              </motion.button>
            ))}
          </div>

          <div aria-live="polite" className="border border-primary/25 bg-primary/5 p-6 min-h-[220px] lg:sticky lg:top-28">
            <AnimatePresence mode="wait">
              <motion.div
                key={selected.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <span className="label-sm text-primary">{selected.category}</span>
                <h3 className="font-display text-2xl font-semibold mt-2 mb-4">{selected.name}</h3>
                {related.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">Usado em:</p>
                    <ul className="space-y-1.5">
                      {related.map((title) => (
                        <li key={title} className="text-sm text-foreground">
                          <a href="#projects" className="hover:text-primary transition-colors">
                            {title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Parte do meu kit de ferramentas do dia a dia.
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-24"
        >
          <span className="label-sm text-muted-foreground block mb-6">Soft Skills</span>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-12 z-10 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 z-10 bg-gradient-to-l from-background to-transparent" />

            <Marquee speed={4} className="py-2">
              {softSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-2 mr-3 px-5 py-3 rounded-full bg-primary/15 border border-primary/40 text-foreground text-sm font-medium whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  {skill}
                </span>
              ))}
            </Marquee>
            <ul className="sr-only">
              {softSkills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
