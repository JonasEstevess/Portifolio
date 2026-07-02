import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Two-layer custom cursor: a small dot that tracks the mouse instantly, and a
 * larger ring that follows with a spring delay. Disabled on touch devices and
 * when the user prefers reduced motion. Never replaces real click/keyboard
 * behaviour — it's purely a visual layer on top of the native cursor.
 */
export const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState("");
  const [active, setActive] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { damping: 28, stiffness: 320, mass: 0.4 });
  const ringY = useSpring(y, { damping: 28, stiffness: 320, mass: 0.4 });

  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || reducedMotion) return;

    setEnabled(true);
    document.documentElement.classList.add("custom-cursor-active");

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };

    const onOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest<HTMLElement>(
        "[data-cursor], a, button, input, textarea"
      );
      if (!target) {
        setActive(false);
        setLabel("");
        return;
      }
      setActive(true);
      setLabel(target.dataset.cursor ?? (target.tagName === "A" ? "→" : "↗"));
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[999] w-1.5 h-1.5 rounded-full bg-foreground"
        style={{ x, y, translateX: "-50%", translateY: "-50%" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[999] flex items-center justify-center rounded-full border border-foreground/40 text-[10px] tracking-widest uppercase text-foreground"
        animate={{
          width: active ? (label.length > 1 ? 64 : 44) : 32,
          height: active ? (label.length > 1 ? 64 : 44) : 32,
          backgroundColor: active ? "hsl(var(--foreground) / 0.06)" : "transparent",
        }}
        transition={{ duration: 0.2 }}
        style={{ x: ringX, y: ringY, translateX: "-50%", translateY: "-50%" }}
      >
        {active && label}
      </motion.div>
    </>
  );
};
