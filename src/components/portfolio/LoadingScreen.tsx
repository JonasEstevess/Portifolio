import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const CODE_LINES = [
  "const developer = {",
  "  name: 'Jonas Esteves',",
  "  role: 'Engenharia de Software',",
  "  school: 'FIAP',",
  "  stack: ['React', 'TypeScript', 'Python', 'Java'],",
  "  status: 'open to work',",
  "};",
  "",
  "render(<Portfolio {...developer} />);",
];

const FULL_TEXT = CODE_LINES.join("\n");
const TOTAL_DURATION = 4000;
const TYPE_DURATION = 2600;

export const LoadingScreen = ({ onDone }: { onDone: () => void }) => {
  const [typed, setTyped] = useState("");
  const [exiting, setExiting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduced);

    if (reduced) {
      setTyped(FULL_TEXT);
      const t = setTimeout(() => setExiting(true), 900);
      const t2 = setTimeout(onDone, 1400);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }

    let i = 0;
    const stepMs = TYPE_DURATION / FULL_TEXT.length;
    const typer = setInterval(() => {
      i += 1;
      setTyped(FULL_TEXT.slice(0, i));
      if (i >= FULL_TEXT.length) clearInterval(typer);
    }, stepMs);

    const exitTimer = setTimeout(() => setExiting(true), TOTAL_DURATION - 500);
    const doneTimer = setTimeout(onDone, TOTAL_DURATION);

    return () => {
      clearInterval(typer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="loading"
          exit={{ opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[200] bg-background flex items-center justify-center px-6"
        >
          <div className="absolute inset-0 bg-gradient-hero" aria-hidden />
          <div className="relative w-full max-w-lg">
            <div className="flex items-center gap-1.5 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-primary/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
            </div>
            <pre className="font-mono text-[13px] md:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap min-h-[210px]">
              {typed}
              {!reducedMotion && <span className="inline-block w-2 h-4 bg-primary ml-0.5 align-middle animate-pulse" />}
            </pre>
            <div className="mt-8 h-px w-full bg-border overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: TOTAL_DURATION / 1000, ease: "linear" }}
              />
            </div>
            <p className="label-sm text-muted-foreground mt-4">Carregando portfólio…</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
