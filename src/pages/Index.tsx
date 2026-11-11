import { lazy, Suspense } from "react";
import { CustomCursor } from "@/components/portfolio/CustomCursor";
import { BackgroundGlow } from "@/components/portfolio/BackgroundGlow";
import { LoadingScreen } from "@/components/portfolio/LoadingScreen";
import { useIntroGate } from "@/hooks/use-intro-gate";
import { Navbar } from "@/components/portfolio/Navbar";
import { Hero } from "@/components/portfolio/Hero";
import { Marquee } from "@/components/portfolio/Marquee";
import { ScrollStatement } from "@/components/portfolio/ScrollStatement";
import { About } from "@/components/portfolio/About";
import { Projects } from "@/components/portfolio/Projects";
import { Skills } from "@/components/portfolio/Skills";
import { Contact } from "@/components/portfolio/Contact";
import { Footer } from "@/components/portfolio/Footer";
import { usePageTitle } from "@/hooks/use-page-title";

// three.js arrives after the page is interactive; until then (and without WebGL) the glow background stands alone.
const ParticleBackdrop = lazy(() => import("@/components/particles/ParticleBackdrop"));

const BAND = ["Engenharia de Software", "React", "Python", "Java", "Inteligência Artificial", "C++", "UI/UX"];

const STATEMENT =
  "Estudante de Engenharia de Software na *FIAP,* construindo produtos digitais com atenção a *detalhe* e *experiência* — colocando em prática o que aprendo através de *projetos reais.*";

const Index = () => {
  usePageTitle("Landing page");
  const { showIntro, finishIntro } = useIntroGate();

  if (showIntro) return <LoadingScreen onDone={finishIntro} />;

  return (
    <div className="min-h-screen text-foreground relative">
      <BackgroundGlow />
      <Suspense fallback={null}>
        <ParticleBackdrop />
      </Suspense>
      <div className="grain fixed inset-0 z-[1] pointer-events-none" aria-hidden />
      <CustomCursor />
      <Navbar />
      <main id="main" className="relative z-[2]">
        <Hero />

        <Marquee speed={2.4} className="border-y border-border/60 py-5 md:py-7">
          {BAND.map((item, i) => (
            <span key={item} className="flex items-center">
              <span
                className={`font-display font-semibold uppercase tracking-tight text-4xl md:text-7xl px-6 md:px-10 ${
                  i % 2 === 1 ? "text-outline" : "text-foreground"
                }`}
              >
                {item}
              </span>
              <span className="w-3 h-3 md:w-4 md:h-4 bg-primary rotate-45" />
            </span>
          ))}
        </Marquee>

        <ScrollStatement eyebrow="Em uma frase" text={STATEMENT} />
        <About />
        <Projects />
        <Skills />
        <Contact />
      </main>
      <div className="relative z-[2]">
        <Footer />
      </div>
    </div>
  );
};

export default Index;
