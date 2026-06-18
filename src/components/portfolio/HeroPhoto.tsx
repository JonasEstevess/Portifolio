import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { MouseEvent } from "react";

/**
 * Big square hero portrait: falls in from above on mount, then tilts in 3D
 * toward wherever the cursor is (a "dent" impression) with a soft radial
 * shadow following the pointer to sell the depth illusion.
 */
export const HeroPhoto = ({ src, alt }: { src: string; alt: string }) => {
  const px = useMotionValue(0.5); // 0..1 across the image
  const py = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(py, [0, 1], [10, -10]), { stiffness: 150, damping: 16 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-10, 10]), { stiffness: 150, damping: 16 });
  const spotlightX = useTransform(px, (v) => `${v * 100}%`);
  const spotlightY = useTransform(py, (v) => `${v * 100}%`);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };

  const handleLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div
      initial={{ y: -420, opacity: 0, rotate: -6 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.25 }}
      className="relative w-full max-w-md mx-auto md:mx-0 md:ml-auto"
      style={{ perspective: 900 }}
    >
      <div className="absolute -inset-3 border border-primary/25" aria-hidden />
      <motion.div
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative aspect-square w-full overflow-hidden border border-border shadow-elegant"
      >
        <motion.img
          src={src}
          alt={alt}
          style={{ scale: 1.08 }}
          className="w-full h-full object-cover object-top"
        />
        {/* Radial shadow that follows the cursor, selling the "dent" illusion */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-multiply"
          style={{
            background: useTransform(
              [spotlightX, spotlightY],
              ([x, y]) =>
                `radial-gradient(circle 140px at ${x} ${y}, hsl(231 45% 3% / 0.35), transparent 70%)`
            ),
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-60"
          style={{
            background: useTransform(
              [spotlightX, spotlightY],
              ([x, y]) => `radial-gradient(circle 220px at ${x} ${y}, hsl(0 0% 100% / 0.15), transparent 65%)`
            ),
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent" />
      </motion.div>
    </motion.div>
  );
};
