import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Modal used by the 3D world and the 2D game to show a portfolio section.
 * Handles the things a hand-rolled overlay usually forgets: dialog semantics,
 * Escape to close, initial focus, focus trap and restoring focus on close.
 */
export const SectionDialog = ({
  title,
  accent,
  onClose,
  children,
}: {
  title: string;
  accent?: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !boxRef.current) return;
      const focusable = boxRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] bg-background/70 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-2xl max-h-[84vh] overflow-y-auto bg-card border border-border p-6 md:p-9 shadow-elegant select-text font-sans text-foreground"
        style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
      >
        <button
          ref={closeRef}
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 border border-border flex items-center justify-center text-foreground hover:border-primary/60 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
};
