import { BrowserRouter, Route, Routes } from "react-router-dom";
import Hub from "./pages/Hub.tsx";
import Index from "./pages/Index.tsx";
import Scene3DPage from "./pages/Scene3DPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Hub />} />
      <Route path="/landing" element={<Index />} />
      <Route path="/3d" element={<Scene3DPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
