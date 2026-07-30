import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";

const links = [
  { href: "#projects", label: "Work" },
  { href: "#about", label: "About" },
  { href: "#skills", label: "Stack" },
  { href: "#contact", label: "Contact" },
];

const EASTER_EGG_CLICKS = 5;
const EASTER_EGG_WINDOW_MS = 900;

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [easterEgg, setEasterEgg] = useState(false);
  const clickCount = useRef(0);
  const lastClick = useRef(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border/60"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="container flex items-center justify-between h-16 md:h-20">
          <a
            href="#home"
            onClick={handleLogoClick}
            className="font-display font-semibold text-base tracking-tight uppercase select-none"
          >
            Jonas<span className="text-primary">.</span>
          </a>

          <nav className="hidden md:flex items-center gap-10 ml-auto">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="label-sm relative text-muted-foreground hover:text-foreground transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-foreground after:transition-all after:duration-300 hover:after:w-full"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <button
            type="button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden w-10 h-10 flex items-center justify-center text-foreground z-[60] relative"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed inset-0 z-50 bg-background flex flex-col items-start justify-center gap-2 px-8"
          >
            {links.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 + i * 0.06 }}
                className="font-display text-4xl font-semibold uppercase tracking-tight text-foreground py-3"
              >
                {link.label}
              </motion.a>
            ))}
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
              className="font-mono text-center space-y-2"
            >
              <p className="text-primary text-sm">{"> SYSTEM OVERRIDE"}</p>
              <p className="text-foreground text-2xl md:text-3xl font-semibold tracking-tight">
                ACCESS GRANTED
              </p>
              <p className="text-3xl">🚀</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
