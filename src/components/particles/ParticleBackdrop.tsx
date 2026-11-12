import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { ParticleStage, SHAPE, type ShapeIndex } from "./ParticleStage";

/** Which sculpture stands behind each section of the landing page. */
const SECTION_SHAPES: Record<string, ShapeIndex> = {
  home: SHAPE.galaxy,
  about: SHAPE.helix,
  projects: SHAPE.gallery,
  skills: SHAPE.atom,
  contact: SHAPE.plane,
};

/**
 * Fixed particle sculpture behind the landing page. It re-forms into a
 * different shape as each section scrolls into view and the cursor pushes
 * the particles around. Purely decorative: no pointer events, hidden from
 * assistive tech, and loaded lazily so three.js never delays the page text.
 */
const ParticleBackdrop = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const small = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;

    let stage: ParticleStage;
    try {
      stage = new ParticleStage(mount, { count: small ? 9000 : 22000, reducedMotion: reduced, transparent: true });
    } catch {
      return; // No WebGL: the page simply keeps its plain background.
    }

    // Beside the text on wide screens; behind it, smaller and centred, on narrow ones.
    const place = () => {
      const { innerWidth: w, innerHeight: h } = window;
      const aspect = w / h;
      stage.resize();
      if (w >= 1024 && aspect > 1.2) stage.setLayout({ x: Math.min(4.7, aspect * 2.35), y: 0.2, scale: 0.7 });
      else stage.setLayout({ x: 0, y: 0.4, scale: Math.max(0.5, Math.min(0.8, aspect * 0.95)) });
    };
    place();
    window.addEventListener("resize", place);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) stage.setChapter(SECTION_SHAPES[entry.target.id]);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    for (const id of Object.keys(SECTION_SHAPES)) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      stage.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    const onLeave = () => stage.setPointer(null);
    const onDown = () => stage.burst();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      observer.disconnect();
      stage.dispose();
    };
  }, [reduced]);

  return <div ref={mountRef} aria-hidden className="fixed inset-0 z-[1] pointer-events-none opacity-45 lg:opacity-60" />;
};

export default ParticleBackdrop;
