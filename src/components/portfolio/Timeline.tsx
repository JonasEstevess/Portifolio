import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { timeline } from "@/data/timeline";

export const Timeline = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.5"],
  });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={ref} className="relative mt-28 max-w-2xl">
      <h3 className="label-sm text-muted-foreground mb-10">Trajetória</h3>

      <div className="relative pl-8">
        <div className="absolute left-[3px] top-1 bottom-1 w-px bg-border" />
        <motion.div
          className="absolute left-[3px] top-1 w-px bg-primary origin-top"
          style={{ height: lineHeight }}
        />

        <div className="space-y-10">
          {timeline.map((event, i) => (
            <motion.div
              key={`${event.year}-${event.title}`}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="relative"
            >
              <div className="absolute -left-8 top-1.5 w-[7px] h-[7px] rounded-full bg-primary" />
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-display text-sm text-primary tabular-nums">{event.year}</span>
                <h4 className="font-display text-lg font-semibold text-foreground">{event.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{event.place}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
