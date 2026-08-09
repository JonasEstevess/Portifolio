import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Layout, Box, ArrowRight, Sparkles } from "lucide-react";
import { BackgroundGlow } from "@/components/portfolio/BackgroundGlow";
import { CustomCursor } from "@/components/portfolio/CustomCursor";
import jonasPhoto from "@/assets/jonas-hero-photo.jpeg";

const experiences = [
  {
    key: "landing",
    title: "Landing Page",
    description:
      "A experiência clássica: role a página e conheça minha trajetória, skills, projetos e contato num formato direto.",
    icon: Layout,
    href: "/landing",
    badge: "Recomendado",
  },
  {
    key: "3d",
    title: "Modelo 3D",
    description:
      "Entre num mundo em primeira pessoa e ande até pavilhões que mostram sobre mim, formação, skills e projetos.",
    icon: Box,
    href: "/3d",
    badge: "Imersivo",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.2 + i * 0.12 },
  }),
};

const Hub = () => {
  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center px-6 py-16">
      <BackgroundGlow />
      <CustomCursor />

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="relative mb-6"
        >
          <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl" />
          <img
            src={jonasPhoto}
            alt="Jonas Esteves"
            width={104}
            height={104}
            className="relative w-24 h-24 md:w-[104px] md:h-[104px] rounded-full object-cover object-top border-2 border-primary/40 shadow-elegant"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/50 label-sm text-muted-foreground mb-5"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Bem-vindo ao meu portfólio
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="display-lg mb-4"
        >
          Como você quer que seja
          <br />
          <span className="text-primary">sua experiência?</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-muted-foreground max-w-xl mb-14 text-base md:text-lg"
        >
          Escolha um dos formatos abaixo para conhecer
          minha trajetória, formação, skills e projetos.
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
          {experiences.map((exp, i) => {
            const Icon = exp.icon;
            return (
              <motion.div
                key={exp.key}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Link
                  to={exp.href}
                  data-cursor="→"
                  className="group relative flex flex-col items-start p-7 border border-border hover:border-primary/50 bg-card/40 backdrop-blur-sm text-left transition-all duration-300 h-full"
                >
                  <div className="flex items-center justify-between w-full mb-6">
                    <div className="w-11 h-11 border border-primary/30 bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="label-sm text-primary px-2.5 py-1 border border-primary/30">
                      {exp.badge}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">{exp.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    {exp.description}
                  </p>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground mt-auto">
                    Entrar
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default Hub;
