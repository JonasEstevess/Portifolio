import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { LayoutGrid, Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";

const links = [
  { id: "about", label: "Sobre" },
  { id: "projects", label: "Projetos" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contato" },
];

const EASTER_EGG_CLICKS = 5;
const EASTER_EGG_WINDOW_MS = 900;

/** Returns the id of the section currently crossing the middle of the viewport. */
const useActiveSection = (ids: string[]) => {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // The list of ids is static.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return active;
};

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [easterEgg, setEasterEgg] = useState(false);
  const clickCount = useRef(0);
  const lastClick = useRef(0);
  const active = useActiveSection(links.map((l) => l.id));

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // While the mobile menu is open: lock the page behind it and let Escape close it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!easterEgg) return;
    const t = setTimeout(() => setEasterEgg(false), 2400);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setEasterEgg(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [easterEgg]);

  const handleLogoClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const now = Date.now();
    if (now - lastClick.current > EASTER_EGG_WINDOW_MS) clickCount.current = 0;
    clickCount.current += 1;
    lastClick.current = now;
    if (clickCount.current >= EASTER_EGG_CLICKS) {
      e.preventDefault();
      clickCount.current = 0;
      setEasterEgg(true);
    }
  };

  return (
    <>
      <a href="#main" className="skip-link">
        Pular para o conteúdo
      </a>

      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-500 ${
          scrolled ? "bg-background/75 backdrop-blur-xl border-b border-border/60" : "border-b border-transparent"
        }`}
      >
        <div className="container flex items-center justify-between h-16 md:h-20">
          <a
            href="#home"
            onClick={handleLogoClick}
            aria-label="Jonas Esteves — voltar ao topo"
            className="font-display font-semibold text-base tracking-tight uppercase select-none"
          >
            Jonas<span className="text-primary">.</span>
          </a>

          <nav aria-label="Seções" className="hidden md:flex items-center gap-9 ml-auto">
            {links.map((link) => {
              const isActive = active === link.id;
              return (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`label-sm relative transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1.5 after:h-px after:bg-primary after:transition-all after:duration-300 ${
                    isActive
                      ? "text-foreground after:w-full"
                      : "text-muted-foreground hover:text-foreground after:w-0 hover:after:w-full"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
            <Link
              to="/"
              className="label-sm inline-flex items-center gap-2 px-3.5 py-2 border border-border text-foreground hover:border-primary/60 transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-primary" />
              Experiências
            </Link>
          </nav>

          <button
            type="button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden w-11 h-11 flex items-center justify-center text-foreground z-[60] relative"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <motion.div
          aria-hidden
          className="absolute bottom-0 left-0 right-0 h-px bg-primary origin-left"
          style={{ scaleX: progress }}
        />
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label="Seções"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed inset-0 z-50 bg-background flex flex-col items-start justify-center gap-1 px-8"
          >
            {links.map((link, i) => (
              <motion.a
                key={link.id}
                href={`#${link.id}`}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 + i * 0.06 }}
                className="font-display text-5xl font-semibold uppercase tracking-tight text-foreground py-2 flex items-baseline gap-3"
              >
                <span className="label-sm text-primary tabular-nums">0{i + 1}</span>
                {link.label}
              </motion.a>
            ))}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <Link to="/" className="label-sm inline-flex items-center gap-2 px-4 py-3 border border-border text-foreground">
                <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                Outras experiências
              </Link>
            </motion.div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Easter egg: click the logo 5x quickly */}
      <AnimatePresence>
        {easterEgg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEasterEgg(false)}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-mono text-center space-y-3"
            >
              <p className="text-primary text-sm">{"> SYSTEM OVERRIDE"}</p>
              <p className="text-foreground text-2xl md:text-3xl font-semibold tracking-tight">ACCESS GRANTED</p>
              <p className="text-muted-foreground text-sm">Achou o segredo. Tem um jogo inteiro escondido aqui:</p>
              <Link to="/2d" className="inline-block px-5 py-2.5 bg-foreground text-background text-sm font-sans font-medium">
                Jogar a versão 2D 🚀
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
