import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

const Word = ({
  children,
  progress,
  range,
  accent,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  accent: boolean;
}) => {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className={`inline-block mr-[0.26em] ${accent ? "text-primary" : ""}`}>
      {children}
    </motion.span>
  );
};

/**
 * A statement that "lights up" word by word as the visitor scrolls through
 * it. The section is taller than the screen and its content sticks, so the
 * scroll distance becomes the reading pace. Phrases in *asterisks* are accented.
 */
export const ScrollStatement = ({ text, eyebrow }: { text: string; eyebrow: string }) => {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.7", "end 0.85"] });

  const words = text
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .flatMap((part) => {
      const accent = part.startsWith("*");
      return part
        .replace(/\*/g, "")
        .split(" ")
        .filter(Boolean)
        .map((word) => ({ word, accent }));
    });
  const plain = text.replace(/\*/g, "");

  return (
    <section ref={ref} className={reduced ? "py-32" : "relative h-[165vh]"} aria-label={eyebrow}>
      <div className={reduced ? "" : "sticky top-0 h-screen flex items-center"}>
        <div className="container max-w-6xl">
          <span className="label-sm text-muted-foreground block mb-8">{eyebrow}</span>
          <p
            aria-label={plain}
            className="font-display font-medium leading-[1.08] tracking-tight text-[clamp(1.75rem,4.6vw,4.75rem)]"
          >
            {words.map(({ word, accent }, i) =>
              reduced ? (
                <span key={i} aria-hidden className={`inline-block mr-[0.26em] ${accent ? "text-primary" : ""}`}>
                  {word}
                </span>
              ) : (
                <span key={i} aria-hidden>
                  <Word progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} accent={accent}>
                    {word}
                  </Word>
                </span>
              )
            )}
          </p>
        </div>
      </div>
    </section>
  );
};
