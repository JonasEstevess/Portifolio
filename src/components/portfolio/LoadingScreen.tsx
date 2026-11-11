import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

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
const TOTAL_DURATION = 3000;
const TYPE_DURATION = 2100;
const EXIT_DURATION = 450;

export const LoadingScreen = ({ onDone }: { onDone: () => void }) => {
  const [typed, setTyped] = useState("");
  const [exiting, setExiting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setExiting(true);
    setTimeout(onDone, EXIT_DURATION);
  }, [onDone]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduced);

    if (reduced) {
      setTyped(FULL_TEXT);
      const timer = setTimeout(finish, 900);
      return () => clearTimeout(timer);
    }

    let i = 0;
    const typer = setInterval(() => {
      i += 2;
      setTyped(FULL_TEXT.slice(0, i));
      if (i >= FULL_TEXT.length) clearInterval(typer);
    }, (TYPE_DURATION / FULL_TEXT.length) * 2);
    const timer = setTimeout(finish, TOTAL_DURATION - EXIT_DURATION);

    return () => {
      clearInterval(typer);
      clearTimeout(timer);
    };
  }, [finish]);

  // Any key, click or tap skips the intro.
  useEffect(() => {
    window.addEventListener("keydown", finish);
    window.addEventListener("pointerdown", finish);
    return () => {
      window.removeEventListener("keydown", finish);
      window.removeEventListener("pointerdown", finish);
    };
  }, [finish]);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="loading"
          exit={{ opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: EXIT_DURATION / 1000 }}
          className="fixed inset-0 z-[200] bg-background flex items-center justify-center px-6 cursor-pointer"
          role="status"
          aria-label="Carregando portfólio"
        >
          <div className="absolute inset-0 bg-gradient-hero" aria-hidden />
          <div className="relative w-full max-w-lg">
            <div className="flex items-center gap-1.5 mb-4" aria-hidden>
              <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-primary/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
            </div>
            <pre
              aria-hidden
              className="font-mono text-[13px] md:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap min-h-[210px]"
            >
              {typed}
              {!reducedMotion && <span className="inline-block w-2 h-4 bg-primary ml-0.5 align-middle animate-pulse" />}
            </pre>
            <div className="mt-8 h-px w-full bg-border overflow-hidden" aria-hidden>
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: (TOTAL_DURATION - EXIT_DURATION) / 1000, ease: "linear" }}
              />
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="label-sm text-muted-foreground">Carregando portfólio…</p>
              <p className="label-sm text-muted-foreground/60">Toque para pular</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
