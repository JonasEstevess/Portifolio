import { GITHUB_URL, LINKEDIN_URL } from "@/data/contact";

export const Footer = () => {
  return (
    <footer className="border-t border-border">
      <div className="container max-w-5xl py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <a href="#home" className="font-display font-semibold text-sm uppercase tracking-tight">
          Jonas<span className="text-primary">.</span>
        </a>
        <p className="text-xs text-muted-foreground order-last sm:order-none">
          © 2026 Jonas Esteves. Construído com cuidado e café.
        </p>
        <div className="flex items-center gap-4">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="label-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="label-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
};
