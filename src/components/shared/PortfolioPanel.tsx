import { useState } from "react";
import { ArrowUpRight, Code2, Download, Mail, MapPin, Sparkles } from "lucide-react";
import { GitHubIcon } from "@/components/icons/GitHubIcon";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { ProjectImage } from "@/components/portfolio/ProjectImage";
import { formations, stats, aboutParagraphs } from "@/data/formations";
import { techStack, softSkills, relatedProjectsFor } from "@/data/techStack";
import { projects } from "@/data/projects";
import { timeline } from "@/data/timeline";
import { sectionById, type SectionId } from "@/data/sections";
import {
  EMAIL_DISPLAY,
  GITHUB_URL,
  LINKEDIN_URL,
  LOCATION,
  MAILTO_URL,
  WHATSAPP_URL,
} from "@/data/contact";

const identityLabels = {
  dev: "Desenvolvedor",
  estudante: "Estudante",
  criador: "Criador",
} as const;

type IdentityKey = keyof typeof identityLabels;

const Header = ({ id, title }: { id: SectionId; title: string }) => {
  const meta = sectionById(id);
  return (
    <header className="mb-6 pr-10">
      <span className="label-sm" style={{ color: meta.color }}>
        {meta.name}
      </span>
      <h2 className="font-display text-2xl md:text-3xl font-semibold mt-2">{title}</h2>
    </header>
  );
};

const AboutPanel = () => {
  const [tab, setTab] = useState<IdentityKey>("dev");
  return (
    <div>
      <Header id="about" title="Tecnologia com propósito" />
      <div role="tablist" aria-label="Perfis" className="flex flex-wrap gap-2 mb-5">
        {(Object.keys(identityLabels) as IdentityKey[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-xs font-medium border transition-colors ${
              tab === k
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {identityLabels[k]}
          </button>
        ))}
      </div>
      <p role="tabpanel" className="text-muted-foreground text-sm md:text-base leading-relaxed min-h-[7.5em]">
        {aboutParagraphs[tab]}
      </p>
      <div className="grid grid-cols-3 gap-3 mt-7">
        {stats.map((s) => (
          <div key={s.label} className="text-center border border-border p-3">
            <div className="font-display text-xl font-semibold">{s.value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FormationPanel = () => (
  <div>
    <Header id="forma" title="Trajetória acadêmica" />
    <div className="space-y-3">
      {formations.map((f) => (
        <div key={f.title} className="flex gap-3 p-3.5 border border-border">
          <f.icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
            <p className="text-xs text-muted-foreground">{f.place}</p>
            <p className="text-[11px] text-muted-foreground/80 mt-1">
              {f.period} · {f.status}
            </p>
          </div>
        </div>
      ))}
    </div>
    <ol className="mt-6 space-y-2 border-l border-border pl-4">
      {timeline.map((event) => (
        <li key={`${event.year}-${event.title}`} className="text-xs text-muted-foreground">
          <span className="text-primary font-display tabular-nums mr-2">{event.year}</span>
          <span className="text-foreground">{event.title}</span> — {event.place}
        </li>
      ))}
    </ol>
    <a
      href="/curriculo-jonas-esteves.pdf"
      download
      className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-foreground text-background text-xs font-medium"
    >
      <Download className="w-3.5 h-3.5" />
      Baixar currículo (PDF)
    </a>
  </div>
);

const SkillsPanel = () => (
  <div>
    <Header id="skills" title="Ferramentas que uso de verdade" />
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-7">
      {techStack.map((skill) => {
        const count = relatedProjectsFor(skill).length;
        return (
          <div key={skill.name} className="border border-border p-2.5 flex items-center gap-2">
            {skill.src ? (
              <img src={skill.src} alt="" width={16} height={16} loading="lazy" className="w-4 h-4 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
            )}
            <span className="text-xs text-foreground leading-tight">{skill.name}</span>
            {count > 0 && (
              <span className="ml-auto text-[10px] text-muted-foreground tabular-nums" title="Projetos que usam">
                ×{count}
              </span>
            )}
          </div>
        );
      })}
    </div>
    <span className="label-sm text-muted-foreground block mb-3">Soft Skills</span>
    <div className="flex flex-wrap gap-1.5">
      {softSkills.map((s) => (
        <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-foreground">
          {s}
        </span>
      ))}
    </div>
  </div>
);

const ProjectsPanel = () => (
  <div>
    <Header id="projects" title={`Projetos (${projects.length})`} />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {projects.map((p) => (
        <article key={p.title} className="border border-border overflow-hidden flex flex-col">
          <ProjectImage project={p} className="aspect-video w-full" />
          <div className="p-3 flex flex-col gap-2 flex-1">
            <h3 className="text-sm font-semibold text-foreground leading-snug">{p.title}</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{p.description}</p>
            <div className="flex gap-2 mt-auto pt-1">
              {p.liveUrl && (
                <a
                  href={p.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-foreground text-background text-[11px] font-medium"
                >
                  Abrir <ArrowUpRight className="w-3 h-3" />
                </a>
              )}
              <a
                href={p.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-border text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Code2 className="w-3 h-3" /> Código
              </a>
            </div>
          </div>
        </article>
      ))}
    </div>
  </div>
);

const contactLinks = [
  { icon: Mail, label: EMAIL_DISPLAY, href: MAILTO_URL },
  { icon: WhatsAppIcon, label: "WhatsApp", href: WHATSAPP_URL },
  { icon: LinkedInIcon, label: "LinkedIn", href: LINKEDIN_URL },
  { icon: GitHubIcon, label: "GitHub", href: GITHUB_URL },
];

const ContactPanel = () => (
  <div>
    <Header id="contact" title="Vamos construir algo" />
    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
      Aberto para estágios, oportunidades em tecnologia e colaborações em projetos, com disponibilidade
      para início imediato.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {contactLinks.map(({ icon: Icon, label, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 border border-border p-3.5 text-sm text-foreground hover:border-primary/50 transition-colors break-all"
        >
          <Icon className="w-4 h-4 text-primary shrink-0" />
          {label}
        </a>
      ))}
    </div>
    <p className="flex items-center gap-2 text-muted-foreground text-xs mt-5">
      <MapPin className="w-3.5 h-3.5" /> {LOCATION}
    </p>
  </div>
);

/** Section content shared by the 3D world and the 2D game, fed by the same data as the landing page. */
export const PortfolioPanel = ({ id }: { id: SectionId }) => {
  switch (id) {
    case "about":
      return <AboutPanel />;
    case "forma":
      return <FormationPanel />;
    case "skills":
      return <SkillsPanel />;
    case "projects":
      return <ProjectsPanel />;
    default:
      return <ContactPanel />;
  }
};
