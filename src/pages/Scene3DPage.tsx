import { useState } from "react";
import { LoadingScreen } from "@/components/portfolio/LoadingScreen";
import { Scene3D } from "@/components/scene3d/Scene3D";

const Scene3DPage = () => {
  const [loading, setLoading] = useState(true);

  return (
    <>
      {loading && <LoadingScreen onDone={() => setLoading(false)} />}
      {!loading && <Scene3D />}
    </>
  );
};

export default Scene3DPage;
