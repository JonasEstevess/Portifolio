import { useCallback, useState } from "react";

const SEEN_KEY = "portfolio-intro-seen";

const introAlreadySeen = () => {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * The intro is a nice first impression and an annoyance the second time.
 * This gate shows it once per browser session, however many experiences the
 * visitor hops between.
 */
export const useIntroGate = () => {
  const [showIntro, setShowIntro] = useState(() => !introAlreadySeen());
  const finishIntro = useCallback(() => {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Without storage the intro simply plays again next time.
    }
    setShowIntro(false);
  }, []);
  return { showIntro, finishIntro };
};
