import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { GITHUB_URL, LINKEDIN_URL, WHATSAPP_URL } from "@/data/contact";

const experiences = [
  { to: "/", label: "Início" },
  { to: "/3d", label: "Mundo 3D" },
  { to: "/2d", label: "Jogo 2D" },
];

const socials = [
  { href: GITHUB_URL, label: "GitHub" },
  { href: LINKEDIN_URL, label: "LinkedIn" },
  { href: WHATSAPP_URL, label: "WhatsApp" },
];

const linkClass = "label-sm text-muted-foreground hover:text-foreground transition-colors";

export const Footer = () => (
  <footer className="border-t border-border overflow-hidden">
    <div className="container max-w-6xl pt-14 pb-8">
      <div className="grid grid-cols-2 md:grid-cols-[1fr_auto_auto_auto] gap-10 md:gap-16">
        <p className="col-span-2 md:col-span-1 font-display text-xl md:text-2xl font-medium max-w-xs leading-snug">
          Este portfólio existe em três formatos. Já viu os outros dois?
        </p>
        <nav aria-label="Experiências" className="flex flex-col gap-3">
          <span className="label-sm text-foreground mb-1">Explorar</span>
          {experiences.map((item) => (
            <Link key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Redes" className="flex flex-col gap-3">
          <span className="label-sm text-foreground mb-1">Redes</span>
          {socials.map((item) => (
            <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {item.label}
            </a>
          ))}
        </nav>
        <a
          href="#home"
          aria-label="Voltar ao topo"
          className="hidden md:flex w-12 h-12 items-center justify-center border border-border text-foreground hover:border-primary/60 hover:-translate-y-1 transition-all self-start"
        >
          <ArrowUp className="w-4 h-4" />
        </a>
      </div>
    </div>

    <p
      className="font-display font-semibold text-outline text-center whitespace-nowrap select-none leading-[0.86] tracking-[-0.035em] text-[12.4vw] -mb-[0.12em]"
      aria-hidden
    >
      JONAS ESTEVES
    </p>

    <div className="border-t border-border relative bg-background">
      <div className="container max-w-6xl py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Jonas Esteves. Construído com cuidado e café.
        </p>
        <p className="text-xs text-muted-foreground">React · TypeScript · Three.js · Canvas</p>
      </div>
    </div>
  </footer>
);
