import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BackgroundGlow } from "@/components/portfolio/BackgroundGlow";
import { usePageTitle } from "@/hooks/use-page-title";

const NotFound = () => {
  const { pathname } = useLocation();
  usePageTitle("Página não encontrada");

  return (
    <main className="relative min-h-[100svh] flex items-center justify-center px-6 overflow-hidden">
      <BackgroundGlow />
      <div className="relative z-10 text-center">
        <p className="display-mega text-outline select-none" aria-hidden>
          404
        </p>
        <h1 className="font-display text-2xl md:text-4xl font-semibold mt-2 mb-3">Essa página não existe</h1>
        <p className="text-muted-foreground mb-8">
          Nada em <code className="font-mono text-foreground break-all">{pathname}</code>. O portfólio está logo ali.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-foreground text-background text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
