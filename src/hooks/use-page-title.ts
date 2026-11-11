import { useEffect } from "react";

const BASE_TITLE = "Jonas Esteves";

/** Sets a per-route document title and restores the previous one on unmount. */
export const usePageTitle = (title?: string) => {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · ${BASE_TITLE}` : previous;
    return () => {
      document.title = previous;
    };
  }, [title]);
};
