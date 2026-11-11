import { motion, useMotionValue, useSpring, type Variants } from "framer-motion";
import { useRef, type MouseEvent, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

const wordVariants: Variants = {
  hidden: { y: "110%" },
  visible: { y: "0%", transition: { duration: 0.9, ease: EASE } },
};

/**
 * Headline that rises word by word out of a mask the first time it scrolls
 * into view. Wrap a phrase in *asterisks* to paint it with the accent colour:
 *
 *   <RevealWords text="Projetos em *destaque.*" />
 *
 * Screen readers get the plain sentence; the animated pieces are hidden from them.
 */
export const RevealWords = ({
  text,
  className = "",
  delay = 0,
  stagger = 0.06,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) => {
  const words = text
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .flatMap((part) => {
      const accent = part.startsWith("*");
      return part
        .replace(/\*/g, "")
        .split(/(\n| )/)
        .filter((w) => w !== " " && w !== "")
        .map((word) => ({ word, accent }));
    });

  return (
    <motion.span
      className={`block ${className}`}
      aria-label={text.replace(/\*/g, "").replace(/\n/g, " ")}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
    >
      {words.map(({ word, accent }, i) =>
        word === "\n" ? (
          <br key={i} aria-hidden />
        ) : (
          <span key={i} aria-hidden className="inline-block overflow-hidden align-bottom pb-[0.14em] -mb-[0.14em] mr-[0.24em]">
            <motion.span variants={wordVariants} className={`inline-block ${accent ? "text-primary" : ""}`}>
              {word}
            </motion.span>
          </span>
        )
      )}
    </motion.span>
  );
};

/** Simple fade-and-rise for blocks of content. */
export const FadeUp = ({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-8% 0px" }}
    transition={{ duration: 0.8, delay, ease: EASE }}
  >
    {children}
  </motion.div>
);

/** Numbered eyebrow that opens every section: "02 — Projetos". */
export const SectionLabel = ({ index, children }: { index: string; children: ReactNode }) => (
  <FadeUp className="flex items-center gap-3 label-sm text-muted-foreground mb-5">
    <span className="text-primary tabular-nums">{index}</span>
    <span className="h-px w-10 bg-border" aria-hidden />
    <span>{children}</span>
  </FadeUp>
);

/**
 * Pulls its child a few pixels towards the cursor, like a magnet. Purely
 * decorative: disabled for touch and for reduced motion.
 */
export const Magnetic = ({ children, strength = 0.3 }: { children: ReactNode; strength?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * strength);
    y.set((e.clientY - rect.top - rect.height / 2) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={reset} style={{ x, y }} className="inline-block">
      {children}
    </motion.div>
  );
};
