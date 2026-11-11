import { LoadingScreen } from "@/components/portfolio/LoadingScreen";
import { useIntroGate } from "@/hooks/use-intro-gate";
import { Scene3D } from "@/components/scene3d/Scene3D";
import { usePageTitle } from "@/hooks/use-page-title";

const Scene3DPage = () => {
  usePageTitle("Universo 3D");
  const { showIntro, finishIntro } = useIntroGate();

  return showIntro ? <LoadingScreen onDone={finishIntro} /> : <Scene3D />;
};

export default Scene3DPage;
