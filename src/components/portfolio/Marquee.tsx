import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

const wrap = (min: number, max: number, value: number) => {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
};

/**
 * Endless horizontal band that speeds up with the page scroll, so it feels
 * tied to the visitor's hand instead of looping on its own. The content is
 * rendered twice and shifted by exactly half its width, which makes the loop
 * seamless. With reduced motion it is a static row.
 */
export const Marquee = ({
  children,
  speed = 3,
  reverse = false,
  className = "",
}: {
  children: ReactNode;
  /** Base speed in percent of the track per second. */
  speed?: number;
  reverse?: boolean;
  className?: string;
}) => {
  const reduced = usePrefersReducedMotion();
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 300 });
  const boost = useTransform(velocity, [-2000, 0, 2000], [5, 0, 5]);
  const x = useTransform(base, (v) => `${wrap(-50, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (reduced) return;
    const direction = reverse ? 1 : -1;
    base.set(base.get() + direction * speed * (1 + boost.get()) * (delta / 1000));
  });

  return (
    <div className={`overflow-hidden ${className}`} aria-hidden>
      <motion.div className="flex w-max whitespace-nowrap will-change-transform" style={{ x }}>
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center">{children}</div>
      </motion.div>
    </div>
  );
};
