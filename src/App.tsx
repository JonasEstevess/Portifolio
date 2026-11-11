import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import Hub from "./pages/Hub.tsx";

// Each experience is its own chunk: visiting the hub or the landing page never
// downloads three.js.
const Index = lazy(() => import("./pages/Index.tsx"));
const Scene3DPage = lazy(() => import("./pages/Scene3DPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const RouteFallback = () => (
  <div className="fixed inset-0 bg-background flex items-center justify-center" role="status" aria-live="polite">
    <span className="label-sm text-muted-foreground animate-pulse">Carregando…</span>
  </div>
);

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <ScrollToTop />
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/landing" element={<Index />} />
        <Route path="/3d" element={<Scene3DPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
