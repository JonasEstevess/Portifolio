/**
 * Fixed, site-wide backdrop: a filled indigo/blue atmosphere that stays behind
 * every section as the page scrolls (not just the Hero). Slow drifting blobs
 * and a handful of rising particles keep it feeling alive without being
 * distracting. Purely decorative — pointer-events disabled, aria-hidden.
 */
export const BackgroundGlow = () => {
  const particles = Array.from({ length: 14 });

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background" aria-hidden>
      <div className="absolute inset-0 bg-gradient-hero" />

      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full bg-primary/25 blur-[140px] animate-drift-1" />
      <div className="absolute top-[35%] right-[-15%] w-[55vw] h-[55vw] max-w-[650px] max-h-[650px] rounded-full bg-primary/20 blur-[160px] animate-drift-2" />
      <div className="absolute bottom-[-15%] left-[15%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-primary-glow/15 blur-[150px] animate-drift-3" />

      <div className="absolute inset-0 grid-bg opacity-40" />

      {particles.map((_, i) => (
        <span
          key={i}
          className="absolute bottom-0 rounded-full bg-primary-glow/50 animate-particle-rise"
          style={{
            left: `${(i * 7.3) % 100}%`,
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
            animationDuration: `${18 + (i % 6) * 4}s`,
            animationDelay: `${i * 1.6}s`,
          }}
        />
      ))}
    </div>
  );
};
