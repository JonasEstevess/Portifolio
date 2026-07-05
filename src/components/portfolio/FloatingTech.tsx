import { motion, useTransform, type MotionValue } from "framer-motion";

type FloatingItem = {
  label: string;
  top: string;
  left: string;
  depth: number;
  rotate?: number;
  arrow?: boolean;
};

const items: FloatingItem[] = [
  { label: "REACT", top: "14%", left: "78%", depth: 26, rotate: -6, arrow: true },
  { label: "IA", top: "68%", left: "10%", depth: 18, rotate: 4 },
  { label: "JAVA", top: "22%", left: "8%", depth: 22, rotate: 5 },
  { label: "PYTHON", top: "80%", left: "72%", depth: 30, rotate: -3 },
  { label: "C++", top: "48%", left: "88%", depth: 14, rotate: 8 },
];

export const FloatingTech = ({
  mouseX,
  mouseY,
}: {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block" aria-hidden>
      {items.map((item, i) => (
        <FloatingLabel key={item.label} item={item} mouseX={mouseX} mouseY={mouseY} index={i} />
      ))}
    </div>
  );
};

const FloatingLabel = ({
  item,
  mouseX,
  mouseY,
  index,
}: {
  item: FloatingItem;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  index: number;
}) => {
  const dx = useTransform(mouseX, (v) => v * item.depth);
  const dy = useTransform(mouseY, (v) => v * item.depth);

  return (
    <motion.div
      className="absolute label-sm flex items-center gap-1.5 text-muted-foreground/70"
      style={{ top: item.top, left: item.left, x: dx, y: dy, rotate: item.rotate }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6 + index * 0.1 }}
    >
      <motion.span
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5 + index, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 }}
        className="flex items-center gap-1.5"
      >
        {item.label}
        {item.arrow && <span className="text-primary">↗</span>}
      </motion.span>
    </motion.div>
  );
};
