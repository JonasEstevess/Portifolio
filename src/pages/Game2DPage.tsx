import { Game2D } from "@/components/game2d/Game2D";
import { usePageTitle } from "@/hooks/use-page-title";

const Game2DPage = () => {
  usePageTitle("Jogo 2D — Jornada do Dev");
  return <Game2D />;
};

export default Game2DPage;
