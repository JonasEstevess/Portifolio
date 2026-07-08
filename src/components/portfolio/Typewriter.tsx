import { useEffect, useRef, useState } from "react";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const BlinkCursor = ({ className = "" }: { className?: string }) => (
  <span
    aria-hidden
    className={`inline-block w-[0.09em] h-[0.85em] bg-primary ml-1 align-middle animate-pulse ${className}`}
  />
);

/**
 * Types `text` out one character at a time, like it's being written live.
 * Calls onComplete once, when the last character lands.
 */
export const Typewriter = ({
  text,
  speed = 40,
  active = true,
  onComplete,
  className = "",
  cursor = true,
}: {
  text: string;
  speed?: number;
  active?: boolean;
  onComplete?: () => void;
  className?: string;
  cursor?: boolean;
}) => {
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const run = async () => {
      for (let i = 1; i <= text.length; i++) {
        if (cancelled) return;
        setCount(i);
        await sleep(speed);
      }
      if (!cancelled && !doneRef.current) {
        doneRef.current = true;
        onComplete?.();
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const finished = count >= text.length;

  return (
    <span className={className}>
      {text.slice(0, count)}
      {cursor && active && !finished && <BlinkCursor />}
    </span>
  );
};

/**
 * Scripted two-line name typing: types "JONASES" as if starting the second
 * word too soon, pauses, deletes back down to "JONAS" like a real typo being
 * fixed, then types "ESTEVES" on the line below.
 */
export const TypedName = ({
  active,
  onComplete,
}: {
  active: boolean;
  onComplete: () => void;
}) => {
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [cursorLine, setCursorLine] = useState<1 | 2>(1);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const run = async () => {
      const typo = "JONASES";
      const correct = "JONAS";
      const line2Target = "ESTEVES";

      for (let i = 1; i <= typo.length; i++) {
        if (cancelled) return;
        setLine1(typo.slice(0, i));
        await sleep(52);
      }
      await sleep(420);
      for (let len = typo.length - 1; len >= correct.length; len--) {
        if (cancelled) return;
        setLine1(typo.slice(0, len));
        await sleep(65);
      }
      await sleep(240);
      if (cancelled) return;
      setCursorLine(2);
      for (let i = 1; i <= line2Target.length; i++) {
        if (cancelled) return;
        setLine2(line2Target.slice(0, i));
        await sleep(52);
      }
      if (!cancelled) {
        setDone(true);
        onComplete();
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <>
      <span className="block">
        {line1}
        {active && cursorLine === 1 && !done && <BlinkCursor />}
      </span>
      <span className="block text-primary">
        {line2}
        {active && cursorLine === 2 && !done && <BlinkCursor />}
      </span>
    </>
  );
};
